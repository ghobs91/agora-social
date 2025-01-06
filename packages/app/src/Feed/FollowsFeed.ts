import { EventKind, HexKey, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useFollowsFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`follows:for`);
    if (pubkey) {
      b.withFilter().kinds([EventKind.ContactList]).authors([pubkey]);
    }
    return b;
  }, [pubkey]);

  const contactFeed = useRequestBuilder(sub);
  return useMemo(() => {
    return getFollowing(contactFeed ?? [], pubkey);
  }, [contactFeed, pubkey]);
}

export function getFollowing(notes: readonly TaggedNostrEvent[], pubkey?: HexKey) {
  const contactLists = notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
  const pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
  return [...new Set(pTags?.flat())];
}
