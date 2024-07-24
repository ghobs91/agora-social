import { SafeSync, SafeSyncEvents } from "./safe-sync";
import { EventBuilder, EventSigner, NostrEvent, NostrLink, SystemInterface } from "..";
import debug from "debug";
import EventEmitter from "eventemitter3";

export class JsonEventSync<T> extends EventEmitter<SafeSyncEvents> {
  #log = debug("JsonEventSync");
  #sync: SafeSync;
  #json: T;

  constructor(
    initValue: T,
    readonly link: NostrLink,
    readonly encrypt: boolean,
  ) {
    super();
    this.#sync = new SafeSync(link);
    this.#json = initValue;

    this.#sync.on("change", () => this.emit("change"));
  }

  get json(): Readonly<T> {
    const ret = { ...this.#json };
    return Object.freeze(ret);
  }

  async sync(signer: EventSigner | undefined, system: SystemInterface) {
    const res = await this.#sync.sync(system);
    this.#log("Sync result %O", res);
    if (res) {
      if (this.encrypt) {
        if (!signer) return;
        this.#json = JSON.parse(await signer.nip4Decrypt(res.content, await signer.getPubKey())) as T;
      } else {
        this.#json = JSON.parse(res.content) as T;
      }
    }
    return res;
  }

  /**
   * Update the json content in the event
   * @param val
   * @param signer
   */
  async updateJson(val: T, signer: EventSigner, system: SystemInterface) {
    this.#log("Updating: %O", val);
    let next = this.#sync.value ? ({ ...this.#sync.value } as NostrEvent) : undefined;
    let isNew = false;
    if (!next) {
      // create a new event if we already did sync and still undefined
      if (this.#sync.didSync) {
        const eb = new EventBuilder();
        eb.fromLink(this.link);
        next = eb.build();
        isNew = true;
      } else {
        throw new Error("Cannot update with no previous value");
      }
    }

    next.content = JSON.stringify(val);
    if (this.encrypt) {
      next.content = await signer.nip4Encrypt(next.content, await signer.getPubKey());
    }

    await this.#sync.update(next, signer, system, !isNew);
    this.#json = val;
  }
}
