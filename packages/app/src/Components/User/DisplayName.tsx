import "./DisplayName.css";

import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { useMemo } from "react";

import { getDisplayNameOrPlaceHolder } from "@/Utils";

interface DisplayNameProps {
  pubkey: HexKey;
  user?: UserMetadata | undefined;
  className?: string;
}

const DisplayName = ({ pubkey, user, className }: DisplayNameProps) => {
  const profile = useUserProfile(user ? undefined : pubkey) ?? user;
  const [name, isPlaceHolder] = useMemo(() => getDisplayNameOrPlaceHolder(profile, pubkey), [profile, pubkey]);

  return <span className={classNames(className, { placeholder: isPlaceHolder })}>{name}</span>;
};

export default DisplayName;
