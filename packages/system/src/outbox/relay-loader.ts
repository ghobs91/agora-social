import { EventKind, RequestBuilder, TaggedNostrEvent, UsersRelays } from "..";
import { unixNowMs } from "@snort/shared";
import { RelayListCacheExpire } from "../const";
import { BackgroundLoader } from "../background-loader";
import { parseRelaysFromKind } from ".";

export class RelayMetadataLoader extends BackgroundLoader<UsersRelays> {
  override name(): string {
    return "RelayMetadataLoader";
  }

  override onEvent(e: Readonly<TaggedNostrEvent>): UsersRelays | undefined {
    const relays = parseRelaysFromKind(e);
    if (!relays) return;
    return {
      relays: relays,
      pubkey: e.pubkey,
      created: e.created_at,
      loaded: unixNowMs(),
    };
  }

  override getExpireCutoff(): number {
    return unixNowMs() - RelayListCacheExpire;
  }

  protected override buildSub(missing: string[]): RequestBuilder {
    const rb = new RequestBuilder("relay-loader");
    rb.withOptions({
      skipDiff: true,
      timeout: 10000,
      outboxPickN: 4,
    });
    rb.withFilter().authors(missing).kinds([EventKind.Relays, EventKind.ContactList]);
    return rb;
  }

  protected override makePlaceholder(key: string): UsersRelays | undefined {
    return {
      relays: [],
      pubkey: key,
      created: 0,
      loaded: this.getExpireCutoff() + 300000,
    };
  }
}
