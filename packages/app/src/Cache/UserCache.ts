import FeedCache from "Cache/FeedCache";
import { db } from "Db";
import { MetadataCache } from "Cache";
import { LNURL } from "LNURL";
import { fetchNip05Pubkey } from "Nip05/Verifier";

class UserProfileCache extends FeedCache<MetadataCache> {
  #zapperQueue: Array<{ pubkey: string; lnurl: string }> = [];
  #nip5Queue: Array<{ pubkey: string; nip05: string }> = [];

  constructor() {
    super("UserCache", db.users);
    this.#processZapperQueue();
    this.#processNip5Queue();
  }

  key(of: MetadataCache): string {
    return of.pubkey;
  }

  async search(q: string): Promise<Array<MetadataCache>> {
    if (db.ready) {
      // on-disk cache will always have more data
      return (
        await db.users
          .where("npub")
          .startsWithIgnoreCase(q)
          .or("name")
          .startsWithIgnoreCase(q)
          .or("display_name")
          .startsWithIgnoreCase(q)
          .or("nip05")
          .startsWithIgnoreCase(q)
          .toArray()
      ).slice(0, 5);
    } else {
      return [...this.cache.values()]
        .filter(user => {
          const profile = user as MetadataCache;
          return (
            profile.name?.includes(q) ||
            profile.npub?.includes(q) ||
            profile.display_name?.includes(q) ||
            profile.nip05?.includes(q)
          );
        })
        .slice(0, 5);
    }
  }

  /**
   * Try to update the profile metadata cache with a new version
   * @param m Profile metadata
   * @returns
   */
  async update(m: MetadataCache) {
    const existing = this.getFromCache(m.pubkey);
    const updateType = (() => {
      if (!existing) {
        return "new_profile";
      }
      if (existing.created < m.created) {
        return "updated_profile";
      }
      if (existing && existing.loaded < m.loaded) {
        return "refresh_profile";
      }
      return "no_change";
    })();
    console.debug(`Updating ${m.pubkey} ${updateType}`, m);
    if (updateType !== "no_change") {
      const writeProfile = {
        ...existing,
        ...m,
      };
      await this.#setItem(writeProfile);
      if (updateType !== "refresh_profile") {
        const lnurl = m.lud16 ?? m.lud06;
        if (lnurl) {
          this.#zapperQueue.push({
            pubkey: m.pubkey,
            lnurl,
          });
        }
      }
      if (m.nip05) {
        this.#nip5Queue.push({
          pubkey: m.pubkey,
          nip05: m.nip05,
        });
      }
    }
    return updateType;
  }

  takeSnapshot(): MetadataCache[] {
    return [];
  }

  async #setItem(m: MetadataCache) {
    this.cache.set(m.pubkey, m);
    if (db.ready) {
      await db.users.put(m);
      this.onTable.add(m.pubkey);
    }
    this.notifyChange([m.pubkey]);
  }

  async #processZapperQueue() {
    await this.#batchQueue(
      this.#zapperQueue,
      async i => {
        const svc = new LNURL(i.lnurl);
        await svc.load();
        const p = this.getFromCache(i.pubkey);
        if (p) {
          this.#setItem({
            ...p,
            zapService: svc.zapperPubkey,
          });
        }
      },
      5
    );

    setTimeout(() => this.#processZapperQueue(), 1_000);
  }

  async #processNip5Queue() {
    await this.#batchQueue(
      this.#nip5Queue,
      async i => {
        const [name, domain] = i.nip05.split("@");
        const nip5pk = await fetchNip05Pubkey(name, domain);
        const p = this.getFromCache(i.pubkey);
        if (p) {
          this.#setItem({
            ...p,
            isNostrAddressValid: i.pubkey === nip5pk,
          });
        }
      },
      5
    );

    setTimeout(() => this.#processNip5Queue(), 1_000);
  }

  async #batchQueue<T>(queue: Array<T>, proc: (v: T) => Promise<void>, batchSize = 3) {
    const batch = [];
    while (queue.length > 0) {
      const i = queue.shift();
      if (i) {
        batch.push(
          (async () => {
            try {
              await proc(i);
            } catch {
              console.warn("Failed to process item", i);
            }
            batch.pop(); // pop any
          })()
        );
        if (batch.length === batchSize) {
          await Promise.all(batch);
        }
      } else {
        await Promise.all(batch);
      }
    }
  }
}

export const UserCache = new UserProfileCache();
