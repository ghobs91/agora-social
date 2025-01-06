import { CachedMetadata, NostrLink, UserMetadata } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext } from "react";

import { randomSample } from "@/Utils";

export function useProfileLink(pubkey?: string, user?: UserMetadata | CachedMetadata) {
  const system = useContext(SnortContext);
  if (!pubkey) return "#";
  const relays = system.relayCache
    .getFromCache(pubkey)
    ?.relays?.filter(a => a.settings.write)
    ?.map(a => a.url);

  if (
    user?.nip05 &&
    user.nip05.endsWith(`@${CONFIG.nip05Domain}`) &&
    (!("isNostrAddressValid" in user) || user.isNostrAddressValid)
  ) {
    const [username] = user.nip05.split("@");
    return `/${username}`;
  }
  const link = NostrLink.profile(pubkey, relays ? randomSample(relays, 3) : undefined);
  return `/${link.encode(CONFIG.profileLinkPrefix)}`;
}
