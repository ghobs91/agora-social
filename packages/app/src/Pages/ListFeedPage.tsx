import { dedupe, unwrap } from "@snort/shared";
import { EventKind, parseNostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import PageSpinner from "@/Components/PageSpinner";
import { Hour } from "@/Utils/Const";

export function ListFeedPage() {
  const { id } = useParams();
  const link = parseNostrLink(unwrap(id));
  const { data } = useEventFeed(link);
  const subject = useMemo(
    () => ({
      type: "pubkey",
      items: pubkeys,
      discriminator: "list-feed",
    }),
    [pubkeys],
  );

  if (!data) return <PageSpinner />;
  if (data.kind !== EventKind.ContactList && data.kind !== EventKind.FollowSet) {
    return (
      <b>
        <FormattedMessage defaultMessage="Must be a contact list or pubkey list" id="vB3oQ/" />
      </b>
    );
  }
  const pubkeys = dedupe(data.tags.filter(a => a[0] === "p").map(a => a[1]));
  return <Timeline subject={subject} postsOnly={true} method="TIME_RANGE" window={Hour * 12} />;
}
