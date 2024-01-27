import { unwrap } from "@snort/shared";
import { EventKind, parseNostrLink } from "@snort/system";
import { useEffect, useSyncExternalStore } from "react";

import { LeadersStore } from "@/Cache/CommunityLeadersStore";

import { useLinkList } from "./useLists";

export function useCommunityLeaders() {
  const link = CONFIG.communityLeaders ? parseNostrLink(unwrap(CONFIG.communityLeaders).list) : undefined;

  const list = useLinkList("leaders", rb => {
    if (link) {
      rb.withFilter().kinds([EventKind.FollowSet]).link(link);
    }
  });

  useEffect(() => {
    LeadersStore.setLeaders(list.map(a => a.id));
  }, [list]);
}

export function useCommunityLeader(pubkey?: string) {
  const store = useSyncExternalStore(
    c => LeadersStore.hook(c),
    () => LeadersStore.snapshot(),
  );

  return pubkey && store.includes(pubkey);
}
