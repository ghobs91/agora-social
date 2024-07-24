import { unwrap } from "@snort/shared";
import { EventKind, NostrLink, NostrPrefix, parseNostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import classNames from "classnames";
import React, { useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import { rootTabItems } from "@/Components/Feed/RootTabItems";
import { RootTabs } from "@/Components/Feed/RootTabs";
import Icon from "@/Components/Icons/Icon";
import DisplayName from "@/Components/User/DisplayName";
import useLogin from "@/Hooks/useLogin";
import { LogoHeader } from "@/Pages/Layout/LogoHeader";
import NotificationsHeader from "@/Pages/Layout/NotificationsHeader";
import { bech32ToHex } from "@/Utils";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = decodeURIComponent(location.pathname.split("/")[1]);

  const nostrLink = useMemo(() => {
    try {
      return parseNostrLink(pageName);
    } catch (e) {
      return undefined;
    }
  }, [pageName]);

  const { publicKey, tags } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestsList),
  }));

  const isRootTab = useMemo(() => {
    // todo: clean this up, its also in other places
    const hashTags = tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1]);
    return (
      location.pathname === "/" || rootTabItems("", publicKey, hashTags).some(item => item.path === location.pathname)
    );
  }, [location.pathname, publicKey, tags]);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const handleBackButtonClick = () => {
    const idx = window.history.state?.idx;
    if (idx === undefined || idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const showBackButton = location.pathname !== "/" && !isRootTab;

  let title: React.ReactNode = <span className="capitalize">{pageName}</span>;
  if (location.pathname.startsWith("/search/")) {
    const searchTerm = decodeURIComponent(location.pathname.split("/search/")[1]);
    title = (
      <>
        <FormattedMessage defaultMessage="Search" />: {searchTerm}
      </>
    );
  } else if (nostrLink) {
    if (nostrLink.type === NostrPrefix.Event || nostrLink.type === NostrPrefix.Note) {
      title = <NoteTitle link={nostrLink} />;
    } else if (nostrLink.type === NostrPrefix.PublicKey || nostrLink.type === NostrPrefix.Profile) {
      try {
        title = <DisplayName pubkey={bech32ToHex(pageName)} />;
      } catch (e) {
        console.error(e);
      }
    }
  } else if (location.pathname.startsWith("/t/")) {
    title = <span>#{location.pathname.split("/").slice(-1)}</span>;
  }

  return (
    <header
      className={classNames(
        { "md:hidden": pageName === "messages" },
        "flex justify-between items-center self-stretch gap-6 sticky top-0 z-10 bg-bg-color md:bg-header md:bg-opacity-50 md:backdrop-blur-lg",
      )}>
      <div
        onClick={handleBackButtonClick}
        className={classNames({ hidden: !showBackButton }, "p-2 md:p-3 cursor-pointer")}>
        <Icon name="arrowBack" />
      </div>
      {!showBackButton && (
        <div className="p-2 md:p-0 md:invisible">
          <LogoHeader showText={false} />
        </div>
      )}
      {isRootTab && <RootTabs base="" />}
      {!isRootTab && (
        <div
          onClick={scrollUp}
          className="cursor-pointer flex-1 text-center p-2 overflow-hidden whitespace-nowrap truncate md:text-lg">
          {title}
        </div>
      )}
      <div className="md:invisible">
        <NotificationsHeader />
      </div>
    </header>
  );
}

function NoteTitle({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  const values = useMemo(() => {
    return { name: <DisplayName pubkey={ev?.pubkey ?? ""} /> };
  }, [ev?.pubkey]);

  if (!ev?.pubkey) {
    return <FormattedMessage defaultMessage="Note" />;
  }

  return (
    <>
      <FormattedMessage defaultMessage="Note by {name}" values={values} />
    </>
  );
}
