import { HexKey, TaggedNostrEvent } from "@snort/system";
import { ChangeEvent, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import { UserCache } from "@/Cache";
import Note from "@/Components/Event/EventComponent";
import useLogin from "@/Hooks/useLogin";

import messages from "../messages";

interface BookmarksProps {
  pubkey: HexKey;
  bookmarks: readonly TaggedNostrEvent[];
}

const Bookmarks = ({ pubkey, bookmarks }: BookmarksProps) => {
  const [onlyPubkey, setOnlyPubkey] = useState<HexKey | "all">("all");
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const ps = useMemo(() => {
    return [...new Set(bookmarks.map(ev => ev.pubkey))];
  }, [bookmarks]);
  const options = useMemo(
    () => ({ showTime: false, showBookmarked: true, canUnbookmark: publicKey === pubkey }),
    [publicKey, pubkey],
  );

  function renderOption(p: HexKey) {
    const profile = UserCache.getFromCache(p);
    return profile ? <option value={p}>{profile?.display_name || profile?.name}</option> : null;
  }

  return (
    <>
      <div className="flex-end p">
        <select
          disabled={ps.length <= 1}
          value={onlyPubkey}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setOnlyPubkey(e.target.value)}>
          <option value="all">
            <FormattedMessage {...messages.All} />
          </option>
          {ps.map(renderOption)}
        </select>
      </div>
      {bookmarks
        .filter(b => (onlyPubkey === "all" ? true : b.pubkey === onlyPubkey))
        .map(n => {
          return <Note key={n.id} data={n} options={options} />;
        })}
    </>
  );
};

export default Bookmarks;
