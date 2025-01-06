import { mapEventToProfile, NostrLink, TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import NostrIcon from "@/Components/Icons/Nostrich";
import KindName from "@/Components/kind-name";
import Avatar from "@/Components/User/Avatar";
import DisplayName from "@/Components/User/DisplayName";
import useAppHandler from "@/Hooks/useAppHandler";

export default function NoteAppHandler({ ev }: { ev: TaggedNostrEvent }) {
  const handlers = useAppHandler(ev.kind);
  const link = NostrLink.fromEvent(ev);

  const profiles = handlers.apps
    .filter(a => a.tags.find(b => b[0] === "web" && b[2] === "nevent"))
    .map(a => ({ profile: mapEventToProfile(a), event: a }))
    .filter(a => a.profile)
    .slice(0, 5);

  return (
    <div className="card flex flex-col gap-3">
      <small>
        <FormattedMessage
          defaultMessage="Sorry, we dont understand this event kind ({name}), please try one of the following apps instead!"
          values={{
            name: <KindName kind={ev.kind} />,
          }}
        />
      </small>
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => {
          window.open(`nostr:${link.encode()}`, "_blank");
        }}>
        <div className="flex items-center gap-2">
          <NostrIcon width={40} />
          <FormattedMessage defaultMessage="Native App" />
        </div>
        <Icon name="link" />
      </div>
      {profiles.map(a => (
        <div
          className="flex justify-between items-center cursor-pointer"
          key={a.event.id}
          onClick={() => {
            const webHandler = a.event.tags.find(a => a[0] === "web" && a[2] === "nevent")?.[1];
            if (webHandler) {
              window.open(webHandler.replace("<bech32>", link.encode()), "_blank");
            }
          }}>
          <div className="flex items-center gap-2">
            <Avatar size={40} pubkey={a.event.pubkey} user={a.profile} />
            <div>
              <DisplayName pubkey={a.event.pubkey} user={a.profile} />
            </div>
          </div>
          <Icon name="link" />
        </div>
      ))}
    </div>
  );
}
