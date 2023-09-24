import { useMemo } from "react";
import { EventKind, RequestBuilder, parseZap, NostrLink, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { UserCache } from "Cache";

export default function useZapsFeed(link?: NostrLink) {
  const sub = useMemo(() => {
    if (!link) return null;
    const b = new RequestBuilder(`zaps:${link.encode()}`);
    b.withFilter().kinds([EventKind.ZapReceipt]).replyToLink([link]);
    return b;
  }, [link]);

  const zapsFeed = useRequestBuilder(NoteCollection, sub);

  const zaps = useMemo(() => {
    if (zapsFeed.data) {
      const profileZaps = zapsFeed.data.map(a => parseZap(a, UserCache)).filter(z => z.valid);
      profileZaps.sort((a, b) => b.amount - a.amount);
      return profileZaps;
    }
    return [];
  }, [zapsFeed]);

  return zaps;
}
