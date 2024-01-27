import { EventKind, HexKey, parseRelayTags, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useRelaysFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`relays:${pubkey.slice(0, 12)}`);
    b.withFilter().authors([pubkey]).kinds([EventKind.Relays]);
    return b;
  }, [pubkey]);

  const relays = useRequestBuilder(sub);
  return parseRelayTags(relays[0]?.tags.filter(a => a[0] === "r") ?? []);
}
