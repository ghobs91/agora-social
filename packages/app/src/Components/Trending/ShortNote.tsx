import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { Link } from "react-router-dom";

import NoteTime from "@/Components/Event/Note/NoteTime";
import Text from "@/Components/Text/Text";
import ProfileImage from "@/Components/User/ProfileImage";

export default function ShortNote({ event }: { event: TaggedNostrEvent }) {
  // replace newlines with spaces, replace double spaces with single spaces
  const content = event.content.slice(0, 80).replace(/\n/g, " ").replace(/  +/g, " ");
  return (
    <Link to={`/${NostrLink.fromEvent(event).encode(CONFIG.eventLinkPrefix)}`} className="flex flex-col">
      <div className="flex flex-row justify-between">
        <ProfileImage pubkey={event.pubkey} size={32} showProfileCard={true} />
        <NoteTime from={event.created_at * 1000} />
      </div>
      <div className="ml-10">
        <Text
          id={event.id + "short"}
          tags={event.tags}
          creator={event.pubkey}
          content={content}
          truncate={75}
          disableMedia={true}
        />
      </div>
    </Link>
  );
}
