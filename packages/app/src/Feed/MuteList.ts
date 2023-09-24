import { useMemo } from "react";
import { HexKey, TaggedNostrEvent, Lists, EventKind, NoteCollection, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { getNewest } from "SnortUtils";
import useLogin from "Hooks/useLogin";

export default function useMutedFeed(pubkey?: HexKey) {
  const { publicKey, muted } = useLogin();
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const b = new RequestBuilder(`muted:${pubkey.slice(0, 12)}`);
    b.withFilter().authors([pubkey]).kinds([EventKind.PubkeyLists]).tag("d", [Lists.Muted]);
    return b;
  }, [pubkey]);

  const mutedFeed = useRequestBuilder(NoteCollection, sub);

  const mutedList = useMemo(() => {
    if (pubkey && mutedFeed.data) {
      return getMuted(mutedFeed.data, pubkey);
    }
    return [];
  }, [mutedFeed, pubkey]);

  return isMe ? muted.item : mutedList;
}

export function getMutedKeys(rawNotes: TaggedNostrEvent[]): {
  createdAt: number;
  keys: HexKey[];
  raw?: TaggedNostrEvent;
} {
  const newest = getNewest(rawNotes);
  if (newest) {
    const { created_at, tags } = newest;
    const keys = tags.filter(t => t[0] === "p").map(t => t[1]);
    return {
      raw: newest,
      keys,
      createdAt: created_at,
    };
  }
  return { createdAt: 0, keys: [] };
}

export function getMuted(feed: readonly TaggedNostrEvent[], pubkey: HexKey): HexKey[] {
  const lists = feed.filter(a => a.kind === EventKind.PubkeyLists && a.pubkey === pubkey);
  return getMutedKeys(lists).keys;
}
