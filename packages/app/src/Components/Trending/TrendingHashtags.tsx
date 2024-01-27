import classNames from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useLocale } from "@/Components/IntlProvider/useLocale";
import PageSpinner from "@/Components/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import useCachedFetch from "@/Hooks/useCachedFetch";
import { HashTagHeader } from "@/Pages/HashTagsPage";

import { ErrorOrOffline } from "../ErrorOrOffline";

export default function TrendingHashtags({
  title,
  count = Infinity,
  short,
}: {
  title?: ReactNode;
  count?: number;
  short?: boolean;
}) {
  const { lang } = useLocale();
  const api = new NostrBandApi();
  const trendingHashtagsUrl = api.trendingHashtagsUrl(lang);
  const storageKey = `nostr-band-${trendingHashtagsUrl}`;

  const {
    data: hashtags,
    error,
    isLoading,
  } = useCachedFetch(trendingHashtagsUrl, storageKey, data => data.hashtags.slice(0, count));

  if (error && !hashtags) return <ErrorOrOffline error={error} onRetry={() => {}} className="p" />;
  if (isLoading) return <PageSpinner />;

  return (
    <>
      {title}
      {hashtags.map(a => {
        if (short) {
          return (
            <div className="my-1 font-bold" key={a.hashtag}>
              <Link to={`/t/${a.hashtag}`}>#{a.hashtag}</Link>
            </div>
          );
        } else {
          return (
            <HashTagHeader
              key={a.hashtag}
              tag={a.hashtag}
              events={a.posts}
              className={classNames("bb", { p: !short })}
            />
          );
        }
      })}
    </>
  );
}
