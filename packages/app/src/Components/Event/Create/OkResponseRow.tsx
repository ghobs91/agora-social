import { sanitizeRelayUrl, unwrap } from "@snort/shared";
import { OkResponse } from "@snort/system";
import { useState } from "react";
import { useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import IconButton from "@/Components/Button/IconButton";
import Icon from "@/Components/Icons/Icon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { saveRelays } from "@/Pages/settings/saveRelays";
import { getRelayName } from "@/Utils";
import { removeRelay } from "@/Utils/Login";

export function OkResponseRow({ rsp, close }: { rsp: OkResponse; close: () => void }) {
  const [r, setResult] = useState(rsp);
  const { formatMessage } = useIntl();
  const { publisher, system } = useEventPublisher();
  const login = useLogin();

  async function removeRelayFromResult(r: OkResponse) {
    if (publisher) {
      removeRelay(login, unwrap(sanitizeRelayUrl(r.relay)));
      await saveRelays(system, publisher, login.relays.item);
    }
    close();
  }

  async function retryPublish(r: OkResponse) {
    const rsp = await system.WriteOnceToRelay(unwrap(sanitizeRelayUrl(r.relay)), r.event);
    setResult(rsp);
  }

  return (
    <div className="flex items-center g16">
      <div className="flex flex-col grow g4">
        <b>{getRelayName(r.relay)}</b>
        {r.message && <small>{r.message}</small>}
      </div>
      {!r.ok && (
        <div className="flex g8">
          <AsyncButton
            onClick={() => retryPublish(r)}
            className="p4 br-compact flex items-center secondary"
            title={formatMessage({
              defaultMessage: "Retry publishing",
              id: "9kSari",
            })}>
            <Icon name="refresh-ccw-01" />
          </AsyncButton>
          <AsyncButton
            onClick={() => removeRelayFromResult(r)}
            className="p4 br-compact flex items-center secondary"
            title={formatMessage({
              defaultMessage: "Remove from my relays",
              id: "UJTWqI",
            })}>
            <Icon name="trash-01" className="trash-icon" />
          </AsyncButton>
        </div>
      )}
      <IconButton icon={{ name: "x" }} onClick={close} />
    </div>
  );
}
