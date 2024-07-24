import { FeedCache } from "@snort/shared";
import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useNavigate } from "react-router-dom";

import { GiftsCache, Relay, RelayMetrics } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import useLogin from "@/Hooks/useLogin";
import { WorkerRelayInterface } from "@snort/worker-relay";

export function CacheSettings() {
  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage defaultMessage="Cache" />
      </h3>
      <RelayCacheStats />
      <CacheDetails cache={RelayMetrics} name={<FormattedMessage defaultMessage="Relay Metrics" />} />
      <CacheDetails cache={GiftsCache} name={<FormattedMessage defaultMessage="Gift Wraps" />} />
    </div>
  );
}

function CacheDetails<T>({ cache, name }: { cache: FeedCache<T>; name: ReactNode }) {
  const snapshot = useSyncExternalStore(
    c => cache.hook(c, "*"),
    () => cache.snapshot(),
  );

  return (
    <div className="flex justify-between br p bg-superdark">
      <div className="flex flex-col g4">
        {name}
        <small>
          <FormattedMessage
            defaultMessage="{count} ({count2} in memory)"
            values={{
              count: <FormattedNumber value={cache.keysOnTable().length} />,
              count2: <FormattedNumber value={snapshot.length} />,
            }}
          />
        </small>
      </div>
      <div>
        <AsyncButton onClick={() => cache.clear()}>
          <FormattedMessage defaultMessage="Clear" />
        </AsyncButton>
      </div>
    </div>
  );
}

function RelayCacheStats() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myEvents, setMyEvents] = useState<number>(0);
  const login = useLogin();
  const navigate = useNavigate();

  useEffect(() => {
    if (Relay instanceof WorkerRelayInterface) {
      Relay.summary().then(setCounts);
      if (login.publicKey) {
        Relay.count(["REQ", "my", { authors: [login.publicKey] }]).then(setMyEvents);
      }
    }
  }, []);

  return (
    <div className="flex justify-between br p bg-superdark">
      <div className="flex flex-col g4 w-64">
        <FormattedMessage defaultMessage="Worker Relay" />
        {myEvents && (
          <p>
            <FormattedMessage
              defaultMessage="My events: {n}"
              values={{
                n: <FormattedNumber value={myEvents} />,
              }}
            />
          </p>
        )}
        <table className="text-secondary">
          <thead>
            <tr>
              <th className="text-left">
                <FormattedMessage defaultMessage="Kind" />
              </th>
              <th className="text-left">
                <FormattedMessage defaultMessage="Count" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(counts)
              .sort(([, a], [, b]) => (a > b ? -1 : 1))
              .map(([k, v]) => {
                return (
                  <tr key={k}>
                    <td>
                      <FormattedNumber value={Number(k)} />
                    </td>
                    <td>
                      <FormattedNumber value={v} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2">
        <AsyncButton onClick={() => {}}>
          <FormattedMessage defaultMessage="Clear" />
        </AsyncButton>
        <AsyncButton
          onClick={async () => {
            const data = await Relay.dump();
            const url = URL.createObjectURL(
              new File([data], "snort.db", {
                type: "application/octet-stream",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "snort.db";
            a.click();
          }}>
          <FormattedMessage defaultMessage="Dump" />
        </AsyncButton>
        <AsyncButton onClick={() => navigate("/cache-debug")}>
          <FormattedMessage defaultMessage="Debug" />
        </AsyncButton>
      </div>
    </div>
  );
}
