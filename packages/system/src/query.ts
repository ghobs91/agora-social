import { v4 as uuid } from "uuid";
import debug from "debug";
import { unixNowMs, unwrap } from "@snort/shared";

import { Connection, ReqFilter, Nips, TaggedNostrEvent } from ".";
import { NoteStore } from "./note-collection";
import { BuiltRawReqFilter } from "./request-builder";
import { eventMatchesFilter } from "./request-matcher";

/**
 * Tracing for relay query status
 */
class QueryTrace {
  readonly id: string;
  readonly start: number;
  sent?: number;
  eose?: number;
  close?: number;
  #wasForceClosed = false;
  readonly #fnClose: (id: string) => void;
  readonly #fnProgress: () => void;

  constructor(
    readonly relay: string,
    readonly filters: Array<ReqFilter>,
    readonly connId: string,
    fnClose: (id: string) => void,
    fnProgress: () => void,
  ) {
    this.id = uuid();
    this.start = unixNowMs();
    this.#fnClose = fnClose;
    this.#fnProgress = fnProgress;
  }

  sentToRelay() {
    this.sent = unixNowMs();
    this.#fnProgress();
  }

  gotEose() {
    this.eose = unixNowMs();
    this.#fnProgress();
  }

  forceEose() {
    this.eose = unixNowMs();
    this.#wasForceClosed = true;
    this.sendClose();
  }

  sendClose() {
    this.close = unixNowMs();
    this.#fnClose(this.id);
    this.#fnProgress();
  }

  /**
   * Time spent in queue
   */
  get queued() {
    return (this.sent === undefined ? unixNowMs() : this.#wasForceClosed ? unwrap(this.eose) : this.sent) - this.start;
  }

  /**
   * Total query runtime
   */
  get runtime() {
    return (this.eose === undefined ? unixNowMs() : this.eose) - this.start;
  }

  /**
   * Total time spent waiting for relay to respond
   */
  get responseTime() {
    return this.finished ? unwrap(this.eose) - unwrap(this.sent) : 0;
  }

  /**
   * If tracing is finished, we got EOSE or timeout
   */
  get finished() {
    return this.eose !== undefined;
  }
}

export interface QueryBase {
  /**
   * Uniquie ID of this query
   */
  id: string;

  /**
   * The query payload (REQ filters)
   */
  filters: Array<ReqFilter>;

  /**
   * List of relays to send this query to
   */
  relays?: Array<string>;
}

/**
 * Active or queued query on the system
 */
export class Query implements QueryBase {
  /**
   * Uniquie ID of this query
   */
  id: string;

  /**
   * RequestBuilder instance
   */
  fromInstance: string;

  /**
   * Which relays this query has already been executed on
   */
  #tracing: Array<QueryTrace> = [];

  /**
   * Leave the query open until its removed
   */
  #leaveOpen = false;

  /**
   * Time when this query can be removed
   */
  #cancelAt?: number;

  /**
   * Timer used to track tracing status
   */
  #checkTrace?: ReturnType<typeof setInterval>;

  /**
   * Feed object which collects events
   */
  #feed: NoteStore;

  #log = debug("Query");

  constructor(id: string, instance: string, feed: NoteStore, leaveOpen?: boolean) {
    this.id = id;
    this.#feed = feed;
    this.fromInstance = instance;
    this.#leaveOpen = leaveOpen ?? false;
    this.#checkTraces();
  }

  isOpen() {
    return this.#cancelAt === undefined && this.#leaveOpen;
  }

  canRemove() {
    return this.#cancelAt !== undefined && this.#cancelAt < unixNowMs();
  }

  /**
   * Recompute the complete set of compressed filters from all query traces
   */
  get filters() {
    return this.#tracing.flatMap(a => a.filters);
  }

  get feed() {
    return this.#feed;
  }

  handleEvent(sub: string, e: TaggedNostrEvent) {
    for (const t of this.#tracing) {
      if (t.id === sub) {
        if (t.filters.some(v => eventMatchesFilter(e, v))) {
          this.feed.add(e);
        } else {
          this.#log("Event did not match filter, rejecting %O", e);
        }
        break;
      }
    }
  }

  /**
   * This function should be called when this Query object and FeedStore is no longer needed
   */
  cancel() {
    this.#cancelAt = unixNowMs() + 5_000;
  }

  uncancel() {
    this.#cancelAt = undefined;
  }

  cleanup() {
    this.#stopCheckTraces();
  }

  /**
   * Insert a new trace as a placeholder
   */
  insertCompletedTrace(subq: BuiltRawReqFilter, data: Readonly<Array<TaggedNostrEvent>>) {
    const qt = new QueryTrace(
      subq.relay,
      subq.filters,
      "",
      () => {
        // nothing to close
      },
      () => {
        // nothing to progress
      },
    );
    qt.sentToRelay();
    qt.gotEose();
    this.#tracing.push(qt);
    this.feed.add(data);
    return qt;
  }

  sendToRelay(c: Connection, subq: BuiltRawReqFilter) {
    if (!this.#canSendQuery(c, subq)) {
      return;
    }
    return this.#sendQueryInternal(c, subq);
  }

  connectionLost(id: string) {
    this.#tracing.filter(a => a.connId == id).forEach(a => a.forceEose());
  }

  connectionRestored(c: Connection) {
    if (this.isOpen()) {
      for (const qt of this.#tracing) {
        if (qt.relay === c.Address) {
          c.QueueReq(["REQ", qt.id, ...qt.filters], () => qt.sentToRelay());
        }
      }
    }
  }

  sendClose() {
    for (const qt of this.#tracing) {
      qt.sendClose();
    }
    this.cleanup();
  }

  eose(sub: string, conn: Readonly<Connection>) {
    const qt = this.#tracing.find(a => a.id === sub && a.connId === conn.Id);
    qt?.gotEose();
    if (!this.#leaveOpen) {
      qt?.sendClose();
    }
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    const thisProgress = this.#tracing.reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / this.#tracing.length;
    if (isNaN(thisProgress)) {
      return 0;
    }
    return thisProgress;
  }

  #onProgress() {
    const isFinished = this.progress === 1;
    if (this.feed.loading !== isFinished) {
      this.#log("%s loading=%s, progress=%d, traces=%O", this.id, this.feed.loading, this.progress, this.#tracing);
      this.feed.loading = isFinished;
    }
  }

  #stopCheckTraces() {
    if (this.#checkTrace) {
      clearInterval(this.#checkTrace);
    }
  }

  #checkTraces() {
    this.#stopCheckTraces();
    this.#checkTrace = setInterval(() => {
      for (const v of this.#tracing) {
        if (v.runtime > 5_000 && !v.finished) {
          v.forceEose();
        }
      }
    }, 500);
  }

  #canSendQuery(c: Connection, q: BuiltRawReqFilter) {
    if (q.relay && q.relay !== c.Address) {
      return false;
    }
    if (!q.relay && c.Ephemeral) {
      this.#log("Cant send non-specific REQ to ephemeral connection %O %O %O", q, q.relay, c);
      return false;
    }
    if (q.filters.some(a => a.search) && !c.SupportsNip(Nips.Search)) {
      this.#log("Cant send REQ to non-search relay", c.Address);
      return false;
    }
    return true;
  }

  #sendQueryInternal(c: Connection, q: BuiltRawReqFilter) {
    const qt = new QueryTrace(
      c.Address,
      q.filters,
      c.Id,
      x => c.CloseReq(x),
      () => this.#onProgress(),
    );
    this.#tracing.push(qt);
    c.QueueReq(["REQ", qt.id, ...qt.filters], () => qt.sentToRelay());
    return qt;
  }
}
