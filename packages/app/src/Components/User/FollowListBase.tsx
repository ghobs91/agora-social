import { dedupe } from "@snort/shared";
import { HexKey } from "@snort/system";
import { ReactNode, useMemo } from "react";
import { FormattedMessage } from "react-intl";

import ProfilePreview from "@/Components/User/ProfilePreview";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { setFollows } from "@/Utils/Login";

import AsyncButton from "../Button/AsyncButton";
import messages from "../messages";

export interface FollowListBaseProps {
  pubkeys: HexKey[];
  title?: ReactNode;
  showFollowAll?: boolean;
  showAbout?: boolean;
  className?: string;
  actions?: ReactNode;
  profileActions?: (pk: string) => ReactNode;
}

export default function FollowListBase({
  pubkeys,
  title,
  showFollowAll,
  showAbout,
  className,
  actions,
  profileActions,
}: FollowListBaseProps) {
  const { publisher, system } = useEventPublisher();
  const { id, follows } = useLogin(s => ({ id: s.id, follows: s.follows }));
  const login = useLogin();

  const profilePreviewOptions = useMemo(() => ({ about: showAbout, profileCards: true }), [showAbout]);

  async function followAll() {
    if (publisher) {
      const newFollows = dedupe([...pubkeys, ...follows.item]);
      const ev = await publisher.contactList(newFollows.map(a => ["p", a]));
      setFollows(id, newFollows, ev.created_at);
      await system.BroadcastEvent(ev);
    }
  }

  return (
    <div className="flex flex-col g8">
      {(showFollowAll ?? true) && (
        <div className="flex items-center">
          <div className="grow font-bold">{title}</div>
          {actions}
          <AsyncButton className="transparent" type="button" onClick={() => followAll()} disabled={login.readonly}>
            <FormattedMessage {...messages.FollowAll} />
          </AsyncButton>
        </div>
      )}
      <div className={className}>
        {pubkeys?.map((a, index) => (
          <ProfilePreview
            pubkey={a}
            key={a}
            options={profilePreviewOptions}
            actions={profileActions?.(a)}
            waitUntilInView={index > 10}
          />
        ))}
      </div>
    </div>
  );
}
