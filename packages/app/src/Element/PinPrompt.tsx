import useLogin from "Hooks/useLogin";
import "./PinPrompt.css";
import { ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import useEventPublisher from "Hooks/useEventPublisher";
import { LoginStore, createPublisher, sessionNeedsPin } from "Login";
import { unwrap } from "@snort/shared";
import { EventPublisher, InvalidPinError, PinEncrypted, PinEncryptedPayload } from "@snort/system";
import { DefaultPowWorker } from "index";
import Modal from "./Modal";
import AsyncButton from "./AsyncButton";

export function PinPrompt({
  onResult,
  onCancel,
  subTitle,
}: {
  onResult: (v: string) => Promise<void>;
  onCancel: () => void;
  subTitle?: ReactNode;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { formatMessage } = useIntl();

  async function submitPin() {
    if (pin.length < 4) {
      setError(
        formatMessage({
          defaultMessage: "Pin too short",
        }),
      );
      return;
    }
    setError("");

    try {
      await onResult(pin);
    } catch (e) {
      console.error(e);
      if (e instanceof InvalidPinError) {
        setError(
          formatMessage({
            defaultMessage: "Incorrect pin",
          }),
        );
      } else if (e instanceof Error) {
        setError(e.message);
      }
    } finally {
      setPin("");
    }
  }

  return (
    <Modal id="pin" onClose={() => onCancel()}>
      <div className="flex-column g12">
        <h2>
          <FormattedMessage defaultMessage="Enter Pin" />
        </h2>
        {subTitle}
        <input
          type="number"
          onChange={e => setPin(e.target.value)}
          value={pin}
          autoFocus={true}
          maxLength={20}
          minLength={4}
        />
        {error && <b className="error">{error}</b>}
        <div className="flex g8">
          <button type="button" onClick={() => onCancel()}>
            <FormattedMessage defaultMessage="Cancel" />
          </button>
          <AsyncButton type="button" onClick={() => submitPin()}>
            <FormattedMessage defaultMessage="Submit" />
          </AsyncButton>
        </div>
      </div>
    </Modal>
  );
}

export function LoginUnlock() {
  const login = useLogin();
  const publisher = useEventPublisher();

  async function encryptMigration(pin: string) {
    const k = unwrap(login.privateKey);
    const newPin = await PinEncrypted.create(k, pin);

    const pub = EventPublisher.privateKey(k);
    if (login.preferences.pow) {
      pub.pow(login.preferences.pow, DefaultPowWorker);
    }
    LoginStore.setPublisher(login.id, pub);
    LoginStore.updateSession({
      ...login,
      readonly: false,
      privateKeyData: newPin,
      privateKey: undefined,
    });
  }

  async function unlockSession(pin: string) {
    const key = new PinEncrypted(unwrap(login.privateKeyData) as PinEncryptedPayload);
    await key.decrypt(pin);
    const pub = createPublisher(login, key);
    if (pub) {
      if (login.preferences.pow) {
        pub.pow(login.preferences.pow, DefaultPowWorker);
      }
      LoginStore.setPublisher(login.id, pub);
      LoginStore.updateSession({
        ...login,
        readonly: false,
        privateKeyData: key,
      });
    }
  }

  function makeSessionReadonly() {
    LoginStore.updateSession({
      ...login,
      readonly: true,
    });
  }

  if (login.publicKey && !publisher && sessionNeedsPin(login) && !login.readonly) {
    if (login.privateKey !== undefined) {
      return (
        <PinPrompt
          subTitle={
            <p>
              <FormattedMessage defaultMessage="Enter a pin to encrypt your private key, you must enter this pin every time you open Snort." />
            </p>
          }
          onResult={encryptMigration}
          onCancel={() => {
            // nothing
          }}
        />
      );
    }
    return (
      <PinPrompt
        subTitle={
          <p>
            <FormattedMessage defaultMessage="Enter pin to unlock your private key" />
          </p>
        }
        onResult={unlockSession}
        onCancel={() => {
          makeSessionReadonly();
        }}
      />
    );
  }
}
