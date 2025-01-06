import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { forwardRef, ReactNode } from "react";

import FollowButton from "@/Components/User/FollowButton";
import ProfileImage, { ProfileImageProps } from "@/Components/User/ProfileImage";

export interface ProfilePreviewProps {
  pubkey: HexKey;
  options?: {
    about?: boolean;
  };
  profile?: UserMetadata;
  actions?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  profileImageProps?: Omit<ProfileImageProps, "pubkey" | "profile">;
}
const ProfilePreview = forwardRef<HTMLDivElement, ProfilePreviewProps>(function ProfilePreview(
  props: ProfilePreviewProps,
  ref,
) {
  const pubkey = props.pubkey;
  const user = useUserProfile(pubkey);
  const options = {
    about: true,
    ...props.options,
  };

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (props.onClick) {
      e.stopPropagation();
      e.preventDefault();
      props.onClick(e);
    }
  }

  return (
    <>
      <div className={classNames("flex items-center justify-between", props.className)} ref={ref} onClick={handleClick}>
        <ProfileImage
          pubkey={pubkey}
          profile={props.profile}
          className="overflow-hidden"
          displayNameClassName="min-w-0"
          subHeader={
            options.about && (
              <div className="text-sm text-secondary whitespace-nowrap text-ellipsis overflow-hidden">
                {user?.about}
              </div>
            )
          }
          {...props.profileImageProps}
        />
        {props.actions ?? (
          <div className="whitespace-nowrap">
            <FollowButton pubkey={pubkey} />
          </div>
        )}
      </div>
    </>
  );
});

export default ProfilePreview;
