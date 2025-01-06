import { HexKey } from "@snort/system";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import ProfilePreview, { ProfilePreviewProps } from "@/Components/User/ProfilePreview";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";

import AsyncButton from "../Button/AsyncButton";
import messages from "../messages";

export interface FollowListBaseProps {
  pubkeys: HexKey[];
  title?: ReactNode;
  showFollowAll?: boolean;
  className?: string;
  actions?: ReactNode;
  profilePreviewProps?: Omit<ProfilePreviewProps, "pubkey">;
}

export default function FollowListBase({
  pubkeys,
  title,
  showFollowAll,
  className,
  actions,
  profilePreviewProps,
}: FollowListBaseProps) {
  const control = useFollowsControls();
  const login = useLogin();

  async function followAll() {
    await control.addFollow(pubkeys);
  }

  return (
    <div className="flex flex-col gap-2">
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
        {pubkeys?.slice(0, 20).map(a => <ProfilePreview pubkey={a} key={a} {...profilePreviewProps} />)}
      </div>
    </div>
  );
}
