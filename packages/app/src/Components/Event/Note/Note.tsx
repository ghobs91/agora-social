import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import classNames from "classnames";
import { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { LRUCache } from "typescript-lru-cache";

import { Relay } from "@/Cache";
import NoteHeader from "@/Components/Event/Note/NoteHeader";
import NoteQuote from "@/Components/Event/Note/NoteQuote";
import { NoteText } from "@/Components/Event/Note/NoteText";
import { TranslationInfo } from "@/Components/Event/Note/TranslationInfo";
import { NoteTranslation } from "@/Components/Event/Note/types";
import Username from "@/Components/User/Username";
import useModeration from "@/Hooks/useModeration";
import { chainKey } from "@/Utils/Thread/ChainKey";

import { NoteProps, NotePropsOptions } from "../EventComponent";
import HiddenNote from "../HiddenNote";
import Poll from "../Poll";
import NoteAppHandler from "./NoteAppHandler";
import NoteFooter from "./NoteFooter/NoteFooter";

const defaultOptions = {
  showHeader: true,
  showTime: true,
  showFooter: true,
  canUnpin: false,
  canUnbookmark: false,
  showContextMenu: true,
};

const canRenderAsTextNote = [EventKind.TextNote, EventKind.Polls];
const translationCache = new LRUCache<string, NoteTranslation>({ maxSize: 300 });

export function Note(props: NoteProps) {
  const { data: ev, highlight, options: opt, ignoreModeration = false, className, waitUntilInView } = props;
  const baseClassName = classNames("note min-h-[110px] flex flex-col gap-4 card", className ?? "");
  const { isEventMuted } = useModeration();
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "2000px" });
  const { ref: setSeenAtRef, inView: setSeenAtInView } = useInView({ rootMargin: "0px", threshold: 1 });
  const [showTranslation, setShowTranslation] = useState(true);
  const [translated, setTranslated] = useState<NoteTranslation | null>(translationCache.get(ev.id));
  const cachedSetTranslated = useCallback(
    (translation: NoteTranslation) => {
      translationCache.set(ev.id, translation);
      setTranslated(translation);
    },
    [ev.id],
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (setSeenAtInView) {
      timeout = setTimeout(() => {
        if (Relay instanceof WorkerRelayInterface) {
          Relay.setEventMetadata(ev.id, { seen_at: Math.round(Date.now() / 1000) });
        }
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [setSeenAtInView]);

  const optionsMerged = { ...defaultOptions, ...opt };
  const goToEvent = useGoToEvent(props, optionsMerged);

  if (!canRenderAsTextNote.includes(ev.kind)) {
    return handleNonTextNote(ev);
  }

  function content() {
    if (waitUntilInView && !inView) return null;
    return (
      <>
        {optionsMerged.showHeader && (
          <NoteHeader
            ev={ev}
            options={optionsMerged}
            setTranslated={translated === null ? cachedSetTranslated : undefined}
          />
        )}
        <div className="body" onClick={e => goToEvent(e, ev)}>
          <NoteText {...props} translated={translated} showTranslation={showTranslation} />
          {translated && <TranslationInfo translated={translated} setShowTranslation={setShowTranslation} />}
          {ev.kind === EventKind.Polls && <Poll ev={ev} zaps={[]} />}
          {optionsMerged.showFooter && (
            <div className="mt-4">
              <NoteFooter ev={ev} replyCount={props.threadChains?.get(chainKey(ev))?.length} />
            </div>
          )}
          <div ref={setSeenAtRef} />
        </div>
      </>
    );
  }

  const noteElement = (
    <div
      className={classNames(baseClassName, {
        active: highlight,
        "hover:bg-nearly-bg-background cursor-pointer": !opt?.isRoot,
      })}
      onClick={e => goToEvent(e, ev)}
      ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isEventMuted(ev) ? <HiddenNote>{noteElement}</HiddenNote> : noteElement;
}

function useGoToEvent(props: NoteProps, options: NotePropsOptions) {
  const navigate = useNavigate();
  return useCallback(
    (e: React.MouseEvent, eTarget: TaggedNostrEvent) => {
      if (options?.canClick === false) {
        return;
      }

      let target = e.target as HTMLElement | null;
      while (target) {
        if (
          target.tagName === "A" ||
          target.tagName === "BUTTON" ||
          target.classList.contains("reaction-pill") ||
          target.classList.contains("szh-menu-container")
        ) {
          return;
        }
        target = target.parentElement;
      }

      e.stopPropagation();

      // prevent navigation if selecting text
      const cellText = document.getSelection();
      if (cellText?.type === "Range") {
        return;
      }

      // custom onclick handler
      if (props.onClick) {
        props.onClick(eTarget);
        return;
      }

      // link to event
      const link = NostrLink.fromEvent(eTarget);
      if (e.metaKey) {
        window.open(`/${link.encode(CONFIG.eventLinkPrefix)}`, "_blank");
      } else {
        navigate(`/${link.encode(CONFIG.eventLinkPrefix)}`, { state: eTarget });
      }
    },
    [navigate, props, options],
  );
}

function Reaction({ ev }: { ev: TaggedNostrEvent }) {
  const reactedToTag = ev.tags.findLast(tag => tag[0] === "e");
  const pTag = ev.tags.findLast(tag => tag[0] === "p");
  if (!reactedToTag?.length) {
    return null;
  }
  const link = NostrLink.fromTag(reactedToTag, pTag?.[1]);
  return (
    <div className="note card">
      <div className="text-gray-medium font-bold">
        <Username pubkey={ev.pubkey} onLinkVisit={() => {}} />
        <span> </span>
        <FormattedMessage defaultMessage="liked" />
      </div>
      <NoteQuote link={link} />
    </div>
  );
}

function handleNonTextNote(ev: TaggedNostrEvent) {
  if (ev.kind === EventKind.Reaction) {
    return <Reaction ev={ev} />;
  } else {
    return <NoteAppHandler ev={ev} />;
  }
}
