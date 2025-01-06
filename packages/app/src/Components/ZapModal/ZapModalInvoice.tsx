import { LNWallet, ZapTargetResult } from "@snort/wallet";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import Copy from "@/Components/Copy/Copy";
import QrCode from "@/Components/QrCode";

export function ZapModalInvoice(props: {
  invoice: Array<ZapTargetResult>;
  wallet?: LNWallet;
  notice?: ReactNode;
  onInvoicePaid: () => void;
}) {
  return (
    <div className="flex flex-col items-center g12 txt-center">
      {props.notice && <b className="error">{props.notice}</b>}
      {props.invoice.map(v => (
        <>
          <QrCode data={v.pr} link={`lightning:${v.pr}`} />
          <div className="flex flex-col g12">
            <Copy text={v.pr} maxSize={26} className="items-center" />
            <a href={`lightning:${v.pr}`}>
              <button type="button">
                <FormattedMessage defaultMessage="Open Wallet" />
              </button>
            </a>
          </div>
        </>
      ))}
    </div>
  );
}
