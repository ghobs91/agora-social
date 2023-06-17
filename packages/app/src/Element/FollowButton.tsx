import "./FollowButton.css";
import { FormattedMessage } from "react-intl";
import { HexKey } from "@snort/system";

import useEventPublisher from "Feed/EventPublisher";
import { parseId } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import AsyncButton from "Element/AsyncButton";
import { System } from "index";

import messages from "./messages";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const publisher = useEventPublisher();
  const { follows, relays } = useLogin();
  const isFollowing = follows.item.includes(pubkey);
  const baseClassname = `${props.className} follow-button`;

  async function follow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList([pubkey, ...follows.item], relays.item);
      System.BroadcastEvent(ev);
    }
  }

  async function unfollow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList(
        follows.item.filter(a => a !== pubkey),
        relays.item
      );
      System.BroadcastEvent(ev);
    }
  }

  return (
    <AsyncButton
      className={isFollowing ? `${baseClassname} secondary` : baseClassname}
      onClick={() => (isFollowing ? unfollow(pubkey) : follow(pubkey))}>
      {isFollowing ? <FormattedMessage {...messages.Unfollow} /> : <FormattedMessage {...messages.Follow} />}
    </AsyncButton>
  );
}
