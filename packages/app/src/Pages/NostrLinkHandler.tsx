import { NostrPrefix } from "@snort/nostr";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import Spinner from "Icons/Spinner";
import { parseNostrLink, profileLink } from "Util";
import { getNip05PubKey } from "Pages/LoginPage";
import { System } from "System";

export default function NostrLinkHandler() {
  const params = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  async function handleLink(link: string) {
    const nav = parseNostrLink(link);
    if (nav) {
      if ((nav.relays?.length ?? 0) > 0) {
        nav.relays?.map(a => System.ConnectEphemeralRelay(a));
      }
      if (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address) {
        navigate(`/e/${nav.encode()}`);
      } else if (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile) {
        navigate(`/p/${nav.encode()}`);
      }
    } else {
      try {
        const pubkey = await getNip05PubKey(`${link}@snort.social`);
        if (pubkey) {
          navigate(profileLink(pubkey));
        }
      } catch {
        //ignored
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (link.length > 0) {
      handleLink(link).catch(console.error);
    }
  }, [link]);

  return (
    <div className="flex f-center">
      {loading ? (
        <Spinner width={50} height={50} />
      ) : (
        <b className="error">
          <FormattedMessage defaultMessage="Nothing found :/" />
        </b>
      )}
    </div>
  );
}
