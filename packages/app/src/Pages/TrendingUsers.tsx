import FollowListBase from "Element/FollowListBase";
import { useEffect, useState } from "react";
import { HexKey } from "@snort/nostr";

async function fetchTrendingUsers() {
    try {
      const res = await fetch(`https://api.nostr.band/v0/trending/profiles`);
      if (res.ok) {
        const responseJSON = (await res.json());
        const trendingProfilesArray: HexKey[] = [];
        responseJSON.profiles.forEach((profile: any) => {
            trendingProfilesArray.push(profile.pubkey);
        })
        return trendingProfilesArray;
      }
    } catch (e) {
      console.warn(`Failed to load link preview`);
    }
}

const TrendingUsers = () => {
  const [preview, setPreview] = useState<HexKey[] | null>();

  useEffect(() => {
    (async () => {
      const data = await fetchTrendingUsers();
      if (data) {
        setPreview(data);
      } else {
        setPreview(null);
      }
    })();
  }, []);

  if (preview === null) return null;

  return (
    <div className="main-content new-user" dir="auto">
      <h3>
        Trending Users
      </h3>
      <div dir="ltr">{<FollowListBase pubkeys={preview!} />}</div>
    </div>
  );
};

export default TrendingUsers;
