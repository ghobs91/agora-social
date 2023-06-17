import { useEffect, useState } from "react";
import { HexKey } from "@snort/system";
import { FormattedMessage } from "react-intl";

import FollowListBase from "Element/FollowListBase";
import PageSpinner from "Element/PageSpinner";
import NostrBandApi from "External/NostrBand";

export default function TrendingUsers() {
  const [userList, setUserList] = useState<HexKey[]>();

  async function loadTrendingUsers() {
    const api = new NostrBandApi();
    const users = await api.trendingProfiles();
    const keys = users.profiles.map(a => a.pubkey);
    setUserList(keys);
  }

  useEffect(() => {
    loadTrendingUsers().catch(console.error);
  }, []);

  if (!userList) return <PageSpinner />;

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Trending People" />
      </h3>
      <FollowListBase pubkeys={userList} showAbout={true} />
    </>
  );
}
