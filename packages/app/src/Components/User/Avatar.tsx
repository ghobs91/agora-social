import type { UserMetadata } from "@snort/system";
import classNames from "classnames";
import { HTMLProps, ReactNode, useMemo } from "react";

import { ProxyImg } from "@/Components/ProxyImg";
import { defaultAvatar, getDisplayName } from "@/Utils";

interface AvatarProps {
  pubkey: string;
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
  image?: string;
  imageOverlay?: ReactNode;
  icons?: ReactNode;
  showTitle?: boolean;
  className?: string;
}

const Avatar = ({
  pubkey,
  user,
  size = 48,
  onClick,
  image,
  imageOverlay,
  icons,
  className,
  showTitle = true,
  ...others
}: AvatarProps & Omit<HTMLProps<HTMLDivElement>, "onClick" | "style" | "className">) => {
  const defaultImg = defaultAvatar(pubkey);
  const url = useMemo(() => {
    if ((image?.length ?? 0) > 0) return image;
    if ((user?.picture?.length ?? 0) > 0) return user?.picture;
    return defaultImg;
  }, [user, image, pubkey]);

  const s = size ?? 120;
  const style = {} as React.CSSProperties;
  if (size) {
    style.width = `${size}px`;
    style.height = `${size}px`;
  }

  const domain = user?.nip05 && user.nip05.split("@")[1];
  const isDefault = url === defaultImg;
  return (
    <div
      onClick={onClick}
      style={style}
      className={classNames(
        "relative rounded-full aspect-square flex items-center justify-center gap-2 bg-gray",
        { "outline outline-2 outline-nostr-purple m-[2px]": isDefault },
        className,
      )}
      data-domain={domain?.toLowerCase()}
      title={showTitle ? getDisplayName(user, "") : undefined}
      {...others}>
      <ProxyImg
        className="absolute rounded-full w-full h-full object-cover"
        src={url}
        size={s}
        alt={getDisplayName(user, "")}
        promptToLoadDirectly={false}
      />
      {icons && (
        <div
          className="absolute flex items-center justify-center w-full h-full origin-center"
          style={{
            transform: "rotate(-135deg) translateY(50%)",
          }}>
          <div
            style={{
              transform: "rotate(135deg)",
            }}>
            {icons}
          </div>
        </div>
      )}
      {imageOverlay && (
        <div className="absolute rounded-full bg-black/40 w-full h-full flex items-center justify-center">
          {imageOverlay}
        </div>
      )}
    </div>
  );
};

export default Avatar;
