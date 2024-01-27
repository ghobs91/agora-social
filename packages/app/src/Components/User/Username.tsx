import { HexKey } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import DisplayName from "./DisplayName";
import { ProfileLink } from "./ProfileLink";

export default function Username({ pubkey, onLinkVisit }: { pubkey: HexKey; onLinkVisit(): void }) {
  const user = useUserProfile(pubkey);

  return user ? (
    <ProfileLink pubkey={pubkey} onClick={onLinkVisit} user={user}>
      <DisplayName pubkey={pubkey} user={user} />
    </ProfileLink>
  ) : null;
}
