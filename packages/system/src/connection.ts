import { v4 as uuid } from "uuid";
import debug from "debug";
import WebSocket from "isomorphic-ws";
import { unwrap, ExternalStore, unixNowMs, dedupe } from "@snort/shared";

import { DefaultConnectTimeout } from "./const";
import { ConnectionStats } from "./connection-stats";
import { NostrEvent, ReqCommand, ReqFilter, TaggedNostrEvent, u256 } from "./nostr";
import { RelayInfo } from "./relay-info";
import EventKind from "./event-kind";

export type AuthHandler = (challenge: string, relay: string) => Promise<NostrEvent | undefined>;

/**
 * Relay settings
 */
export interface RelaySettings {
  read: boolean;
  write: boolean;
}

export interface OkResponse {
  ok: boolean;
  id: string;
  relay: string;
  message?: string;
}

/**
 * Snapshot of connection stats
 */
export interface ConnectionStateSnapshot {
  connected: boolean;
  disconnects: number;
  avgLatency: number;
  events: {
    received: number;
    send: number;
  };
  settings?: RelaySettings;
  info?: RelayInfo;
  pendingRequests: Array<string>;
  activeRequests: Array<string>;
  id: string;
  ephemeral: boolean;
  address: string;
}

export class Connection extends ExternalStore<ConnectionStateSnapshot> {
  #log: debug.Debugger;
  #ephemeralCheck?: ReturnType<typeof setInterval>;
  #activity: number = unixNowMs();
  #expectAuth = false;

  Id: string;
  Address: string;
  Socket: WebSocket | null = null;

  PendingRaw: Array<object> = [];
  PendingRequests: Array<{
    cmd: ReqCommand;
    cb: () => void;
  }> = [];
  ActiveRequests = new Set<string>();

  Settings: RelaySettings;
  Info?: RelayInfo;
  ConnectTimeout: number = DefaultConnectTimeout;
  Stats: ConnectionStats = new ConnectionStats();
  HasStateChange: boolean = true;
  IsClosed: boolean;
  ReconnectTimer?: ReturnType<typeof setTimeout>;
  EventsCallback: Map<u256, (msg: Array<string | boolean>) => void>;
  OnConnected?: (wasReconnect: boolean) => void;
  OnEvent?: (sub: string, e: TaggedNostrEvent) => void;
  OnEose?: (sub: string) => void;
  OnDisconnect?: (code: number) => void;
  Auth?: AuthHandler;
  AwaitingAuth: Map<string, boolean>;
  Authed = false;
  Ephemeral: boolean;
  Down = true;

  constructor(addr: string, options: RelaySettings, auth?: AuthHandler, ephemeral: boolean = false) {
    super();
    this.Id = uuid();
    this.Address = addr;
    this.Settings = options;
    this.IsClosed = false;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.Auth = auth;
    this.Ephemeral = ephemeral;
    this.#log = debug("Connection").extend(addr);
  }

  async Connect() {
    try {
      if (this.Info === undefined) {
        const u = new URL(this.Address);
        const rsp = await fetch(`${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`, {
          headers: {
            accept: "application/nostr+json",
          },
        });
        if (rsp.ok) {
          const data = await rsp.json();
          for (const [k, v] of Object.entries(data)) {
            if (v === "unset" || v === "" || v === "~") {
              data[k] = undefined;
            }
          }
          this.Info = data;
        }
      }
    } catch {
      // ignored
    }

    const wasReconnect = this.Socket !== null && !this.IsClosed;
    if (this.Socket) {
      this.Id = uuid();
      this.Socket.onopen = null;
      this.Socket.onmessage = null;
      this.Socket.onerror = null;
      this.Socket.onclose = null;
      this.Socket = null;
    }
    this.IsClosed = false;
    this.Socket = new WebSocket(this.Address);
    this.Socket.onopen = () => this.OnOpen(wasReconnect);
    this.Socket.onmessage = e => this.OnMessage(e);
    this.Socket.onerror = e => this.OnError(e);
    this.Socket.onclose = e => this.OnClose(e);
  }

  Close() {
    this.IsClosed = true;
    this.Socket?.close();
    this.notifyChange();
  }

  OnOpen(wasReconnect: boolean) {
    this.ConnectTimeout = DefaultConnectTimeout;
    this.#log(`Open!`);
    this.Down = false;
    this.#setupEphemeral();
    this.OnConnected?.(wasReconnect);
    this.#sendPendingRaw();
  }

  OnClose(e: WebSocket.CloseEvent) {
    if (this.ReconnectTimer) {
      clearTimeout(this.ReconnectTimer);
      this.ReconnectTimer = undefined;
    }

    // remote server closed the connection, dont re-connect
    if (e.code === 4000) {
      this.IsClosed = true;
      this.#log(`Closed! (Remote)`);
    } else if (!this.IsClosed) {
      this.ConnectTimeout = this.ConnectTimeout * 2;
      this.#log(
        `Closed (code=${e.code}), trying again in ${(this.ConnectTimeout / 1000).toFixed(0).toLocaleString()} sec`,
      );
      this.ReconnectTimer = setTimeout(() => {
        this.Connect();
      }, this.ConnectTimeout);
      this.Stats.Disconnects++;
    } else {
      this.#log(`Closed!`);
      this.ReconnectTimer = undefined;
    }

    this.OnDisconnect?.(e.code);
    this.#reset();
    this.notifyChange();
  }

  OnMessage(e: WebSocket.MessageEvent) {
    this.#activity = unixNowMs();
    if ((e.data as string).length > 0) {
      const msg = JSON.parse(e.data as string) as Array<string | NostrEvent | boolean>;
      const tag = msg[0] as string;
      switch (tag) {
        case "AUTH": {
          if (this.#expectAuth) {
            this.#onAuthAsync(msg[1] as string)
              .then(() => this.#sendPendingRaw())
              .catch(this.#log);
            this.Stats.EventsReceived++;
            this.notifyChange();
          } else {
            this.#log("Ignoring unexpected AUTH request");
          }
          break;
        }
        case "EVENT": {
          this.OnEvent?.(msg[1] as string, {
            ...(msg[2] as NostrEvent),
            relays: [this.Address],
          });
          this.Stats.EventsReceived++;
          this.notifyChange();
          break;
        }
        case "EOSE": {
          this.OnEose?.(msg[1] as string);
          break;
        }
        case "OK": {
          // feedback to broadcast call
          this.#log(`OK: %O`, msg);
          const id = msg[1] as string;
          const cb = this.EventsCallback.get(id);
          if (cb) {
            this.EventsCallback.delete(id);
            cb(msg as Array<string | boolean>);
          }
          break;
        }
        case "NOTICE": {
          this.#log(`NOTICE: ${msg[1]}`);
          break;
        }
        default: {
          this.#log(`Unknown tag: ${tag}`);
          break;
        }
      }
    }
  }

  OnError(e: WebSocket.Event) {
    this.#log("Error: %O", e);
    this.notifyChange();
  }

  /**
   * Send event on this connection
   */
  SendEvent(e: NostrEvent) {
    if (!this.Settings.write) {
      return;
    }
    const req = ["EVENT", e];
    this.#sendJson(req);
    this.Stats.EventsSent++;
    this.notifyChange();
  }

  /**
   * Send event on this connection and wait for OK response
   */
  async SendAsync(e: NostrEvent, timeout = 5000) {
    return await new Promise<OkResponse>((resolve, reject) => {
      if (!this.Settings.write) {
        reject(new Error("Not a write relay"));
        return;
      }

      if (this.EventsCallback.has(e.id)) {
        resolve({
          ok: false,
          id: e.id,
          relay: this.Address,
          message: "Duplicate request",
        });
        return;
      }
      const t = setTimeout(() => {
        this.EventsCallback.delete(e.id);
        resolve({
          ok: false,
          id: e.id,
          relay: this.Address,
          message: "Timeout waiting for OK response",
        });
      }, timeout);

      this.EventsCallback.set(e.id, msg => {
        clearTimeout(t);
        const [_, id, accepted, message] = msg;
        resolve({
          ok: accepted as boolean,
          id: id as string,
          relay: this.Address,
          message: message as string | undefined,
        });
      });

      const req = ["EVENT", e];
      this.#sendJson(req);
      this.Stats.EventsSent++;
      this.notifyChange();
    });
  }

  /**
   * Using relay document to determine if this relay supports a feature
   */
  SupportsNip(n: number) {
    return this.Info?.supported_nips?.some(a => a === n) ?? false;
  }

  /**
   * Queue or send command to the relay
   * @param cmd The REQ to send to the server
   */
  QueueReq(cmd: ReqCommand, cbSent: () => void) {
    const requestKinds = dedupe(
      cmd
        .slice(2)
        .map(a => (a as ReqFilter).kinds ?? [])
        .flat(),
    );
    const ExpectAuth = [EventKind.DirectMessage, EventKind.GiftWrap];
    if (ExpectAuth.some(a => requestKinds.includes(a)) && !this.#expectAuth) {
      this.#expectAuth = true;
      this.#log("Setting expectAuth flag %o", requestKinds);
    }
    if (this.ActiveRequests.size >= this.#maxSubscriptions) {
      this.PendingRequests.push({
        cmd,
        cb: cbSent,
      });
      this.#log("Queuing: %O", cmd);
    } else {
      this.ActiveRequests.add(cmd[1]);
      this.#sendJson(cmd);
      cbSent();
    }
    this.notifyChange();
  }

  CloseReq(id: string) {
    if (this.ActiveRequests.delete(id)) {
      this.#sendJson(["CLOSE", id]);
      this.OnEose?.(id);
      this.#SendQueuedRequests();
    }
    this.notifyChange();
  }

  takeSnapshot(): ConnectionStateSnapshot {
    return {
      connected: this.Socket?.readyState === WebSocket.OPEN,
      events: {
        received: this.Stats.EventsReceived,
        send: this.Stats.EventsSent,
      },
      avgLatency:
        this.Stats.Latency.length > 0
          ? this.Stats.Latency.reduce((acc, v) => acc + v, 0) / this.Stats.Latency.length
          : 0,
      disconnects: this.Stats.Disconnects,
      info: this.Info,
      id: this.Id,
      pendingRequests: [...this.PendingRequests.map(a => a.cmd[1])],
      activeRequests: [...this.ActiveRequests],
      ephemeral: this.Ephemeral,
      address: this.Address,
    };
  }

  #SendQueuedRequests() {
    const canSend = this.#maxSubscriptions - this.ActiveRequests.size;
    if (canSend > 0) {
      for (let x = 0; x < canSend; x++) {
        const p = this.PendingRequests.shift();
        if (p) {
          this.ActiveRequests.add(p.cmd[1]);
          this.#sendJson(p.cmd);
          p.cb();
          this.#log("Sent pending REQ %O", p.cmd);
        }
      }
    }
  }

  #reset() {
    // reset connection Id on disconnect, for query-tracking
    this.Id = uuid();
    this.#expectAuth = false;
    this.ActiveRequests.clear();
    this.PendingRequests = [];
    this.PendingRaw = [];
    this.notifyChange();
  }

  #sendJson(obj: object) {
    const authPending = !this.Authed && (this.AwaitingAuth.size > 0 || this.Info?.limitation?.auth_required === true);
    if (!this.Socket || this.Socket?.readyState !== WebSocket.OPEN || authPending) {
      this.PendingRaw.push(obj);
      if (this.Socket?.readyState === WebSocket.CLOSED && this.Ephemeral && this.IsClosed) {
        this.Connect();
      }
      return false;
    }

    this.#sendPendingRaw();
    this.#sendOnWire(obj);
  }

  #sendPendingRaw() {
    while (this.PendingRaw.length > 0) {
      const next = this.PendingRaw.shift();
      if (next) {
        this.#sendOnWire(next);
      }
    }
  }

  #sendOnWire(obj: unknown) {
    if (this.Socket?.readyState !== WebSocket.OPEN) {
      throw new Error(`Socket is not open, state is ${this.Socket?.readyState}`);
    }
    const json = JSON.stringify(obj);
    this.#activity = unixNowMs();
    this.Socket.send(json);
    return true;
  }

  async #onAuthAsync(challenge: string): Promise<void> {
    const authCleanup = () => {
      this.AwaitingAuth.delete(challenge);
    };
    if (!this.Auth) {
      throw new Error("Auth hook not registered");
    }
    this.AwaitingAuth.set(challenge, true);
    const authEvent = await this.Auth(challenge, this.Address);
    if (!authEvent) {
      authCleanup();
      throw new Error("No auth event");
    }

    return await new Promise(resolve => {
      const t = setTimeout(() => {
        authCleanup();
        resolve();
      }, 10_000);

      this.EventsCallback.set(authEvent.id, msg => {
        clearTimeout(t);
        authCleanup();
        if (msg.length > 3 && msg[2] === true) {
          this.Authed = true;
        }
        resolve();
      });

      this.#sendOnWire(["AUTH", authEvent]);
    });
  }

  get #maxSubscriptions() {
    return this.Info?.limitation?.max_subscriptions ?? 25;
  }

  #setupEphemeral() {
    if (this.Ephemeral) {
      if (this.#ephemeralCheck) {
        clearInterval(this.#ephemeralCheck);
        this.#ephemeralCheck = undefined;
      }
      this.#ephemeralCheck = setInterval(() => {
        const lastActivity = unixNowMs() - this.#activity;
        if (lastActivity > 30_000 && !this.IsClosed) {
          if (this.ActiveRequests.size > 0) {
            this.#log("Inactive connection has %d active requests! %O", this.ActiveRequests.size, this.ActiveRequests);
          } else {
            this.Close();
          }
        }
      }, 5_000);
    }
  }
}
