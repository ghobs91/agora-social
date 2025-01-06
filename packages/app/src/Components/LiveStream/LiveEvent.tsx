import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { lazy, Suspense, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { findTag } from "@/Utils";
import { extractStreamInfo } from "@/Utils/stream";

import NoteAppHandler from "../Event/Note/NoteAppHandler";
import ProfileImage from "../User/ProfileImage";
const LiveKitRoom = lazy(() => import("./livekit"));

export function LiveEvent({ ev }: { ev: TaggedNostrEvent }) {
  const service = ev.tags.find(a => a[0] === "streaming")?.at(1);
  function inner() {
    if (service?.endsWith(".m3u8")) {
      return <LiveStreamEvent ev={ev} />;
    } else if (service?.startsWith("wss+livekit://")) {
      return (
        <Suspense>
          <LiveKitRoom ev={ev} canJoin={true} />
        </Suspense>
      );
    }
    return <NoteAppHandler ev={ev} />;
  }

  return inner();
}

function LiveStreamEvent({ ev }: { ev: TaggedNostrEvent }) {
  const { title, status, starts, host } = extractStreamInfo(ev);
  const [play, setPlay] = useState(false);

  function statusLine() {
    switch (status) {
      case "live": {
        return (
          <div className="flex g4 items-center">
            <Icon name="signal-01" />
            <b className="uppercase">
              <FormattedMessage defaultMessage="Live" />
            </b>
          </div>
        );
      }
      case "ended": {
        return (
          <b className="uppercase">
            <FormattedMessage defaultMessage="Ended" />
          </b>
        );
      }
      case "planned": {
        return (
          <b className="uppercase">
            {new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(
              new Date(Number(starts) * 1000),
            )}
          </b>
        );
      }
    }
  }

  function cta() {
    const link = `https://zap.stream/${NostrLink.fromEvent(ev).encode()}`;
    switch (status) {
      case "live": {
        return (
          <button className="nowrap" onClick={() => setPlay(true)}>
            <FormattedMessage defaultMessage="Watch Stream" />
          </button>
        );
      }
      case "ended": {
        if (findTag(ev, "recording")) {
          return (
            <Link to={link} target="_blank">
              <button className="nowrap">
                <FormattedMessage defaultMessage="Watch Replay" />
              </button>
            </Link>
          );
        }
      }
    }
  }
  if (play) {
    const link = `https://zap.stream/embed/${NostrLink.fromEvent(ev).encode()}`;
    return (
      <iframe
        src={link}
        width="100%"
        style={{
          aspectRatio: "16/9",
        }}
      />
    );
  }
  return (
    <div className="sm:flex g12 br p24 bg-primary items-center">
      <div>
        <ProfileImage pubkey={host!} showUsername={false} size={56} />
      </div>
      <div className="flex flex-col g8 grow">
        <div className="font-semibold text-3xl">{title}</div>
        <div>{statusLine()}</div>
      </div>
      <div>{cta()}</div>
    </div>
  );
}
