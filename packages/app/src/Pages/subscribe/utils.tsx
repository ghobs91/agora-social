import { FormattedMessage } from "react-intl";

import { SubscriptionError, SubscriptionErrorCode } from "@/External/SnortApi";
import { LockedFeatures, SubscriptionType } from "@/Utils/Subscription";

export function mapPlanName(id: number) {
  switch (id) {
    case SubscriptionType.Supporter:
      return <FormattedMessage defaultMessage="FAN" />;
    case SubscriptionType.Premium:
      return <FormattedMessage defaultMessage="PRO" />;
  }
}

export function mapFeatureName(k: LockedFeatures) {
  switch (k) {
    case LockedFeatures.MultiAccount:
      return <FormattedMessage defaultMessage="Multi account support" />;
    case LockedFeatures.NostrAddress:
      return <FormattedMessage defaultMessage="Snort nostr address" />;
    case LockedFeatures.Badge:
      return <FormattedMessage defaultMessage="Supporter Badge" />;
    case LockedFeatures.DeepL:
      return <FormattedMessage defaultMessage="DeepL translations" />;
    case LockedFeatures.RelayRetention:
      return <FormattedMessage defaultMessage="Unlimited note retention on Snort relay" />;
    case LockedFeatures.RelayBackup:
      return <FormattedMessage defaultMessage="Downloadable backups from Snort relay" />;
    case LockedFeatures.RelayAccess:
      return <FormattedMessage defaultMessage="Write access to Snort relay, with 1 year of event retention" />;
    case LockedFeatures.LNProxy:
      return <FormattedMessage defaultMessage="LN Address Proxy" />;
    case LockedFeatures.EmailBridge:
      return <FormattedMessage defaultMessage="Email <> DM bridge for your Snort nostr address" />;
  }
}

export function mapSubscriptionErrorCode(c: SubscriptionError) {
  switch (c.code) {
    case SubscriptionErrorCode.InternalError:
      return <FormattedMessage defaultMessage="Internal error: {msg}" values={{ msg: c.message }} />;
    case SubscriptionErrorCode.SubscriptionActive:
      return <FormattedMessage defaultMessage="You subscription is still active, you can't renew yet" />;
    case SubscriptionErrorCode.Duplicate:
      return (
        <FormattedMessage
          defaultMessage="You already have a subscription of this type, please renew or pay"
          id="NAuFNH"
        />
      );
    default:
      return c.message;
  }
}
