import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import FollowListBase from "@/Components/User/FollowListBase";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useProfileSearch from "@/Hooks/useProfileSearch";
import { debounce } from "@/Utils";

const NOTES = 0;
const PROFILES = 1;

const Profiles = ({ keyword }: { keyword: string }) => {
  const results = useProfileSearch(keyword);
  const ids = useMemo(() => results.map(r => r.pubkey), [results]);
  const content = keyword ? (
    <FollowListBase
      pubkeys={ids}
      profilePreviewProps={{
        options: { about: true },
      }}
    />
  ) : (
    <TrendingUsers />
  );
  return <div className="px-3">{content}</div>;
};

const SearchPage = () => {
  const params = useParams();
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState<string>(params.keyword ?? "");
  const [keyword, setKeyword] = useState<string>(params.keyword ?? "");
  // tabs
  const SearchTab = [
    { text: formatMessage({ defaultMessage: "Notes", id: "7+Domh" }), value: NOTES },
    { text: formatMessage({ defaultMessage: "People", id: "Tpy00S" }), value: PROFILES },
  ];
  const [tab, setTab] = useState<Tab>(SearchTab[0]);
  const navigate = useNavigate();

  useEffect(() => {
    if (keyword === params.keyword) return;
    if (keyword) {
      // "navigate" changing only url
      navigate(`/search/${encodeURIComponent(keyword)}`);
    } else {
      navigate(`/search`);
    }
  }, [keyword]);

  useEffect(() => {
    setKeyword(params.keyword ?? "");
    setSearch(params.keyword ?? ""); // Also update the search input field
  }, [params.keyword]);

  useEffect(() => {
    return debounce(500, () => setKeyword(search));
  }, [search]);

  const subject = useMemo(() => {
    return {
      type: "post_keyword",
      items: [keyword],
      discriminator: keyword,
    } as TimelineSubject;
  }, [keyword]);

  function tabContent() {
    if (tab.value === PROFILES) {
      return <Profiles keyword={keyword} />;
    }

    if (!keyword) {
      return <TrendingNotes />;
    }

    return <Timeline key={keyword} subject={subject} postsOnly={false} method={"LIMIT_UNTIL"} />;
  }

  return (
    <div className="main-content">
      <div className="p flex flex-col g8">
        <input
          type="text"
          className="w-max"
          placeholder={formatMessage({ defaultMessage: "Search...", id: "0BUTMv" })}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <TabSelectors tabs={SearchTab} tab={tab} setTab={setTab} />
      </div>
      {tabContent()}
    </div>
  );
};

export default SearchPage;
