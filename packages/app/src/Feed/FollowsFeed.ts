import { EventKind, HexKey, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useLogin from "@/Hooks/useLogin";

export default function useFollowsFeed(pubkey?: HexKey) {
  const { publicKey, follows } = useLogin(s => ({ publicKey: s.publicKey, follows: s.state.follows }));
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const b = new RequestBuilder(`follows:${pubkey.slice(0, 12)}`);
    b.withFilter().kinds([EventKind.ContactList]).authors([pubkey]);
    return b;
  }, [isMe, pubkey]);

  const contactFeed = useRequestBuilder(sub);
  return useMemo(() => {
    if (isMe) {
      return follows;
    }

    return getFollowing(contactFeed ?? [], pubkey);
  }, [isMe, contactFeed, follows, pubkey]);
}

export function getFollowing(notes: readonly TaggedNostrEvent[], pubkey?: HexKey) {
  const contactLists = notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
  const pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
  return [...new Set(pTags?.flat())];
}
