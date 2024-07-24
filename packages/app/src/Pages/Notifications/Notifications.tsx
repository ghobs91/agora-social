import "./Notifications.css";

import { unwrap } from "@snort/shared";
import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { AutoLoadMore } from "@/Components/Event/LoadMore";
import PageSpinner from "@/Components/PageSpinner";
import { useNotificationsView } from "@/Feed/WorkerRelayView";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { markNotificationsRead } from "@/Utils/Login";

import { getNotificationContext } from "./getNotificationContext";
import { NotificationGroup } from "./NotificationGroup";
const NotificationGraph = lazy(() => import("@/Pages/Notifications/NotificationChart"));

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 6;
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  const notifications = useNotificationsView();

  const timeKey = (ev: NostrEvent) => {
    const onHour = ev.created_at - (ev.created_at % groupInterval);
    return onHour.toString();
  };

  const myNotifications = useMemo(() => {
    return notifications
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
      .slice(0, limit)
      .filter(a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey));
  }, [notifications, login.publicKey, limit]);

  const timeGrouped = useMemo(() => {
    return myNotifications.reduce((acc, v) => {
      const key = `${timeKey(v)}:${getNotificationContext(v as TaggedNostrEvent)?.encode(CONFIG.eventLinkPrefix)}:${
        v.kind
      }`;
      if (acc.has(key)) {
        unwrap(acc.get(key)).push(v as TaggedNostrEvent);
      } else {
        acc.set(key, [v as TaggedNostrEvent]);
      }
      return acc;
    }, new Map<string, Array<TaggedNostrEvent>>());
  }, [myNotifications]);

  return (
    <>
      <div className="main-content">
        {CONFIG.features.notificationGraph && (
          <Suspense fallback={<PageSpinner />}>
            <NotificationGraph evs={notifications} />
          </Suspense>
        )}
        {login.publicKey &&
          [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}

        <AutoLoadMore
          onClick={() => {
            setLimit(l => l + 100);
          }}
        />
      </div>
    </>
  );
}
