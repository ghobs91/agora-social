import { EventKind, NostrLink, parseRelayTags, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { usePrevious } from "@uidotdev/usehooks";
import { useEffect, useMemo } from "react";

import { Nip28ChatSystem } from "@/chat/nip28";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { bech32ToHex, debounce, getNewest, getNewestEventTagsByKey, unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import {
  addSubscription,
  LoginStore,
  setAppData,
  setBlocked,
  setBookmarked,
  setFollows,
  setMuted,
  setPinned,
  setRelays,
  setTags,
  SnortAppData,
} from "@/Utils/Login";
import { SubscriptionEvent } from "@/Utils/Subscription";
/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey, follows } = login;
  const { publisher, system } = useEventPublisher();

  useEffect(() => {
    system.checkSigs = login.appData.item.preferences.checkSigs;
  }, [login]);

  const previous = usePrevious(login.appData.item);
  // write appdata after 10s of no changes
  useEffect(() => {
    if (!previous || JSON.stringify(previous) === JSON.stringify(login.appData.item)) {
      return;
    }
    return debounce(10_000, async () => {
      if (publisher && login.appData.item) {
        const ev = await publisher.appData(login.appData.item, "snort");
        await system.BroadcastEvent(ev);
      }
    });
  }, [previous]);

  const subLogin = useMemo(() => {
    if (!login || !pubKey) return null;

    const b = new RequestBuilder(`login:${pubKey.slice(0, 12)}`);
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter()
      .authors([pubKey])
      .kinds([
        EventKind.ContactList,
        EventKind.Relays,
        EventKind.MuteList,
        EventKind.PinList,
        EventKind.BookmarksList,
        EventKind.InterestsList,
        EventKind.PublicChatsList,
      ]);
    if (CONFIG.features.subscriptions && !login.readonly) {
      b.withFilter().authors([pubKey]).kinds([EventKind.AppData]).tag("d", ["snort"]);
      b.withFilter()
        .relay("wss://relay.snort.social/")
        .kinds([EventKind.SnortSubscriptions])
        .authors([bech32ToHex(SnortPubKey)])
        .tag("p", [pubKey])
        .limit(10);
    }

    return b;
  }, [login]);

  const loginFeed = useRequestBuilder(subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed) {
      const contactList = getNewest(loginFeed.filter(a => a.kind === EventKind.ContactList));
      if (contactList) {
        const pTags = contactList.tags.filter(a => a[0] === "p").map(a => a[1]);
        setFollows(login.id, pTags, contactList.created_at * 1000);
      }

      const relays = getNewest(loginFeed.filter(a => a.kind === EventKind.Relays));
      if (relays) {
        const parsedRelays = parseRelayTags(relays.tags.filter(a => a[0] === "r")).map(a => [a.url, a.settings]);
        setRelays(login, Object.fromEntries(parsedRelays), relays.created_at * 1000);
      }

      if (publisher) {
        const subs = loginFeed.filter(
          a => a.kind === EventKind.SnortSubscriptions && a.pubkey === bech32ToHex(SnortPubKey),
        );
        Promise.all(
          subs.map(async a => {
            const dx = await publisher.decryptDm(a);
            if (dx) {
              const ex = JSON.parse(dx);
              return {
                id: a.id,
                ...ex,
              } as SubscriptionEvent;
            }
          }),
        ).then(a => addSubscription(login, ...a.filter(a => a !== undefined).map(unwrap)));

        const appData = getNewest(loginFeed.filter(a => a.kind === EventKind.AppData));
        if (appData) {
          publisher.decryptGeneric(appData.content, appData.pubkey).then(d => {
            setAppData(login, JSON.parse(d) as SnortAppData, appData.created_at * 1000);
          });
        }
      }
    }
  }, [loginFeed, publisher]);

  async function handleMutedFeed(mutedFeed: TaggedNostrEvent[]) {
    const latest = getNewest(mutedFeed);
    if (!latest) return;

    const muted = NostrLink.fromTags(latest.tags);
    setMuted(
      login,
      muted.map(a => a.id),
      latest.created_at * 1000,
    );

    if (latest?.content && publisher && pubKey) {
      try {
        const privMutes = await publisher.nip4Decrypt(latest.content, pubKey);
        const blocked = JSON.parse(privMutes) as Array<Array<string>>;
        const keys = blocked.filter(a => a[0] === "p").map(a => a[1]);
        setBlocked(login, keys, latest.created_at * 1000);
      } catch (error) {
        console.debug("Failed to parse mute list", error, latest);
      }
    }
  }

  function handlePinnedFeed(pinnedFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(pinnedFeed, "e");
    if (newest) {
      setPinned(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleTagFeed(tagFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(tagFeed, "t");
    if (newest) {
      setTags(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleBookmarkFeed(bookmarkFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      setBookmarked(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handlePublicChatsListFeed(bookmarkFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      LoginStore.updateSession({
        ...login,
        extraChats: newest.keys.map(Nip28ChatSystem.chatId),
      });
    }
  }

  useEffect(() => {
    if (loginFeed) {
      const mutedFeed = loginFeed.filter(a => a.kind === EventKind.MuteList);
      handleMutedFeed(mutedFeed);

      const pinnedFeed = loginFeed.filter(a => a.kind === EventKind.PinList);
      handlePinnedFeed(pinnedFeed);

      const tagsFeed = loginFeed.filter(a => a.kind === EventKind.InterestsList);
      handleTagFeed(tagsFeed);

      const bookmarkFeed = loginFeed.filter(a => a.kind === EventKind.BookmarksList);
      handleBookmarkFeed(bookmarkFeed);

      const publicChatsFeed = loginFeed.filter(a => a.kind === EventKind.PublicChatsList);
      handlePublicChatsListFeed(publicChatsFeed);
    }
  }, [loginFeed]);

  useEffect(() => {
    system.profileLoader.TrackKeys(follows.item); // always track follows profiles
  }, [follows.item]);
}
