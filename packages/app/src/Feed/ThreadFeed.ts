import { EventKind, Nip10, NostrLink, RequestBuilder } from "@snort/system";
import { SnortContext, useRequestBuilder } from "@snort/system-react";
import { useContext, useEffect, useMemo, useState } from "react";

import { randomSample } from "@/Utils";

export default function useThreadFeed(link: NostrLink) {
  const [root, setRoot] = useState<NostrLink>();
  const [rootRelays, setRootRelays] = useState<Array<string>>();
  const [allEvents, setAllEvents] = useState<Array<NostrLink>>([]);
  const system = useContext(SnortContext);

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${link.id.slice(0, 12)}`);
    sub.withOptions({
      leaveOpen: true,
    });
    sub.withFilter().link(link);
    if (root) {
      sub
        .withFilter()
        .link(root)
        .relay(rootRelays ?? []);
    }
    const grouped = [link, ...allEvents].reduce(
      (acc, v) => {
        acc[v.type] ??= [];
        acc[v.type].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrLink>>,
    );

    for (const v of Object.values(grouped)) {
      sub
        .withFilter()
        .kinds([EventKind.TextNote])
        .replyToLink(v)
        .relay(rootRelays ?? []);
    }
    return sub;
  }, [allEvents, link, root, rootRelays]);

  const store = useRequestBuilder(sub);

  useEffect(() => {
    if (store) {
      const links = store
        .map(a => [
          NostrLink.fromEvent(a),
          ...a.tags.filter(a => a[0] === "e" || a[0] === "a").map(v => NostrLink.fromTag(v)),
        ])
        .flat();
      setAllEvents(links);

      // load the thread structure from the current note
      const current = store.find(a => link.matchesEvent(a));
      if (current) {
        const t = Nip10.parseThread(current);
        if (t) {
          const rootOrReplyAsRoot = t?.root ?? t?.replyTo;
          if (rootOrReplyAsRoot) {
            setRoot(rootOrReplyAsRoot);
          }
        } else {
          setRoot(link);
        }
      }
    }
  }, [link, store, store.length]);

  useEffect(() => {
    if (root) {
      const rootEvent = store?.find(a => root.matchesEvent(a));
      if (rootEvent) {
        system.relayCache.buffer([rootEvent.pubkey]).then(() => {
          const relays = system.relayCache.getFromCache(rootEvent.pubkey);

          if (relays) {
            const readRelays = randomSample(
              relays.relays.filter(a => a.settings.read).map(a => a.url),
              3,
            );
            if (root.relays) {
              readRelays.push(...root.relays);
            }
            setRootRelays(readRelays);
          }
        });
      }
    }
  }, [link, root, store, store.length, system.relayCache]);

  return store ?? [];
}
