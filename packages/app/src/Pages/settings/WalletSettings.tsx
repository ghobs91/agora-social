import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import LndLogo from "@/assets/img/lnd-logo.png";
import AlbyIcon from "@/Components/Icons/Alby";
import BlueWallet from "@/Components/Icons/BlueWallet";
//import CashuIcon from "@/Components/Icons/Cashu";
import Icon from "@/Components/Icons/Icon";
import NWCIcon from "@/Components/Icons/NWC";
import { getAlbyOAuth } from "@/Pages/settings/wallet/utils";

const WalletRow = (props: {
  logo: ReactNode;
  name: ReactNode;
  url: string;
  desc?: ReactNode;
  onClick?: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 bg-[--gray-superdark] rounded-xl hover:bg-[--gray-ultradark]"
      onClick={() => {
        if (props.onClick) {
          props.onClick();
        } else {
          if (props.url.startsWith("http")) {
            window.location.href = props.url;
          } else {
            navigate(props.url);
          }
        }
      }}>
      <div className="rounded-xl aspect-square h-[4rem] bg-[--gray-dark] p-3 flex items-center justify-center">
        {props.logo}
      </div>
      <div className="flex flex-col gap-1 grow justify-center">
        <div className="text-xl font-bold">{props.name}</div>
        <div className="text-sm text-secondary">{props.desc}</div>
      </div>
      <Icon name="arrowFront" />
    </div>
  );
};

const WalletSettings = () => {
  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Connect Wallet" />
      </h3>
      <div className="flex flex-col gap-3 cursor-pointer">
        <WalletRow
          logo={<NWCIcon width={64} height={64} />}
          name="Nostr Wallet Connect"
          url="/settings/wallet/nwc"
          desc={<FormattedMessage defaultMessage="Native nostr wallet connection" />}
        />
        <WalletRow
          logo={<img src={LndLogo} />}
          name="LND via LNC"
          url="/settings/wallet/lnc"
          desc={<FormattedMessage defaultMessage="Connect to your own LND node with Lightning Node Connect" />}
        />
        <WalletRow
          logo={<BlueWallet width={64} height={64} />}
          name="LNDHub"
          url="/settings/wallet/lndhub"
          desc={<FormattedMessage defaultMessage="Generic LNDHub wallet (BTCPayServer / Alby / LNBits)" />}
        />
        {/*<WalletRow
          logo={<CashuIcon size={64} />}
          name="Cashu"
          url="/settings/wallet/cashu"
          desc={<FormattedMessage defaultMessage="Cashu mint wallet"  />}
        />*/}
        {CONFIG.alby && (
          <WalletRow
            logo={<AlbyIcon size={64} />}
            name="Alby"
            url={""}
            onClick={() => {
              const alby = getAlbyOAuth();
              window.location.href = alby.getAuthUrl();
            }}
            desc={<FormattedMessage defaultMessage="Alby wallet connection" />}
          />
        )}
      </div>
    </>
  );
};

export default WalletSettings;
