import { bytesToHex } from "@noble/curves/abstract/utils";
import { getPublicKey } from "@snort/shared";
import { EventExt } from "./event-ext";
import { Nip4WebCryptoEncryptor } from "./impl/nip4";
import { Nip44Encryptor } from "./impl/nip44";
import { NostrEvent, NotSignedNostrEvent } from "./nostr";
import { randomBytes } from "@noble/hashes/utils";

export type SignerSupports = "nip04" | "nip44" | string;

export interface EventSigner {
  init(): Promise<void>;
  getPubKey(): Promise<string> | string;
  nip4Encrypt(content: string, key: string): Promise<string>;
  nip4Decrypt(content: string, otherKey: string): Promise<string>;
  nip44Encrypt(content: string, key: string): Promise<string>;
  nip44Decrypt(content: string, otherKey: string): Promise<string>;
  sign(ev: NostrEvent | NotSignedNostrEvent): Promise<NostrEvent>;
  get supports(): Array<SignerSupports>;
}

export class PrivateKeySigner implements EventSigner {
  #publicKey: string;
  #privateKey: string;

  constructor(privateKey: string | Uint8Array) {
    if (typeof privateKey === "string") {
      this.#privateKey = privateKey;
    } else {
      this.#privateKey = bytesToHex(privateKey);
    }
    this.#publicKey = getPublicKey(this.#privateKey);
  }

  /**
   * Generate a new private key
   */
  static random() {
    const k = randomBytes(32);
    return new PrivateKeySigner(k);
  }

  get supports(): string[] {
    return ["nip04", "nip44"];
  }

  get privateKey() {
    return this.#privateKey;
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  getPubKey(): string {
    return this.#publicKey;
  }

  async nip4Encrypt(content: string, otherKey: string) {
    const enc = new Nip4WebCryptoEncryptor(this.privateKey, otherKey);
    return await enc.encryptData(content);
  }

  async nip4Decrypt(content: string, otherKey: string) {
    const enc = new Nip4WebCryptoEncryptor(this.privateKey, otherKey);
    return await enc.decryptData(content);
  }

  async nip44Encrypt(content: string, otherKey: string) {
    const enc = new Nip44Encryptor(this.#privateKey, otherKey);
    return enc.encryptData(content);
  }

  async nip44Decrypt(content: string, otherKey: string) {
    const enc = new Nip44Encryptor(this.#privateKey, otherKey);
    return enc.decryptData(content);
  }

  sign(ev: NostrEvent): Promise<NostrEvent> {
    EventExt.sign(ev, this.#privateKey);
    return Promise.resolve(ev);
  }
}
