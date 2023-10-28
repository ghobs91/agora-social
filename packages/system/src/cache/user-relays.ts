import { UsersRelays } from ".";
import { DexieTableLike, FeedCache } from "@snort/shared";

export class UserRelaysCache extends FeedCache<UsersRelays> {
  constructor(table?: DexieTableLike<UsersRelays>) {
    super("UserRelays", table);
  }

  key(of: UsersRelays): string {
    return of.pubkey;
  }

  override async preload(follows?: Array<string>): Promise<void> {
    await super.preload();
    if (follows) {
      await this.buffer(follows);
    }
  }

  newest(): number {
    let ret = 0;
    this.cache.forEach(v => (ret = v.created_at > ret ? v.created_at : ret));
    return ret;
  }

  takeSnapshot(): Array<UsersRelays> {
    return [...this.cache.values()];
  }
}
