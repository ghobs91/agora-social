import { dedupe, unwrap } from "@snort/shared";
import { EventKind, parseNostrLink } from "@snort/system";
import { Hour } from "Const";
import Timeline from "Element/Feed/Timeline";
import PageSpinner from "Element/PageSpinner";
import { useEventFeed } from "Feed/EventFeed";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";

export function ListFeedPage() {
  const { id } = useParams();
  const link = parseNostrLink(unwrap(id));
  const { data } = useEventFeed(link);

  if (!data) return <PageSpinner />;
  if (data.kind !== EventKind.ContactList && data.kind !== EventKind.PubkeyLists) {
    return (
      <b>
        <FormattedMessage defaultMessage="Must be a contact list or pubkey list" />
      </b>
    );
  }
  const pubkeys = dedupe(data.tags.filter(a => a[0] === "p").map(a => a[1]));
  return (
    <Timeline
      subject={{
        type: "pubkey",
        items: pubkeys,
        discriminator: "list-feed",
      }}
      postsOnly={true}
      method="TIME_RANGE"
      window={Hour * 12}
    />
  );
}
