import { CachedMetadata, NostrLink, NostrPrefix, UserMetadata } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { ReactNode, useContext } from "react";
import { Link, LinkProps } from "react-router-dom";

import { randomSample } from "@/Utils";

export function ProfileLink({
  pubkey,
  user,
  explicitLink,
  children,
  ...others
}: {
  pubkey: string;
  user?: UserMetadata | CachedMetadata;
  explicitLink?: string;
  children?: ReactNode;
} & Omit<LinkProps, "to">) {
  const system = useContext(SnortContext);
  const relays = system.relayCache
    .getFromCache(pubkey)
    ?.relays?.filter(a => a.settings.write)
    ?.map(a => a.url);

  function profileLink() {
    if (explicitLink) {
      return explicitLink;
    }
    if (
      user?.nip05 &&
      user.nip05.endsWith(`@${CONFIG.nip05Domain}`) &&
      (!("isNostrAddressValid" in user) || user.isNostrAddressValid)
    ) {
      const [username] = user.nip05.split("@");
      return `/${username}`;
    }
    return `/${new NostrLink(
      NostrPrefix.Profile,
      pubkey,
      undefined,
      undefined,
      relays ? randomSample(relays, 3) : undefined,
    ).encode(CONFIG.profileLinkPrefix)}`;
  }

  const oFiltered = others as Record<string, unknown>;
  delete oFiltered["user"];
  delete oFiltered["link"];
  delete oFiltered["children"];
  return (
    <Link {...oFiltered} to={profileLink()} state={user}>
      {children}
    </Link>
  );
}
