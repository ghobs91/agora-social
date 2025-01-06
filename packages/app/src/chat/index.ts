import { unixNow, unwrap } from "@snort/shared";
import {
  encodeTLVEntries,
  EventKind,
  EventPublisher,
  NostrEvent,
  NostrPrefix,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  TLVEntry,
  TLVEntryType,
  UserMetadata,
} from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo } from "react";

import { useEmptyChatSystem } from "@/Hooks/useEmptyChatSystem";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { findTag } from "@/Utils";
import { LoginSession } from "@/Utils/Login";

import { Nip17Chats, Nip17ChatSystem } from "./nip17";
import { Nip28Chats, Nip28ChatSystem } from "./nip28";

export enum ChatType {
  PublicGroupChat = 2,
  PrivateGroupChat = 3,
  PrivateDirectMessage = 4,
}

export interface ChatMessage {
  id: string;
  from: string;
  created_at: number;
  tags: Array<Array<string>>;
  needsDecryption: boolean;
  content: string;
  decrypt: (pub: EventPublisher) => Promise<string>;
}

export interface ChatParticipant {
  type: "pubkey" | "generic";
  id: string;
  profile?: UserMetadata;
}

export interface Chat {
  type: ChatType;
  id: string;
  title?: string;
  unread: number;
  lastMessage: number;
  participants: Array<ChatParticipant>;
  messages: Array<ChatMessage>;
  createMessage(msg: string, pub: EventPublisher): Promise<Array<NostrEvent>>;
  sendMessage(ev: Array<NostrEvent>, system: SystemInterface): void | Promise<void>;
}

export interface ChatSystem {
  /**
   * Create a request for this system to get updates
   */
  subscription(session: LoginSession): RequestBuilder;

  /**
   * Create a list of chats for a given pubkey and set of events
   */
  listChats(pk: string, evs: Array<TaggedNostrEvent>): Array<Chat>;

  /**
   * Process events received from the subscription
   */
  processEvents(pub: EventPublisher, evs: Array<TaggedNostrEvent>): Promise<void>;
}

/**
 * Extract the P tag of the event
 */
export function chatTo(e: NostrEvent) {
  if (e.kind === EventKind.DirectMessage) {
    return unwrap(findTag(e, "p"));
  } else if (e.kind === EventKind.SimpleChatMessage) {
    const gt = unwrap(e.tags.find(a => a[0] === "g"));
    return `${gt[2]}${gt[1]}`;
  }
  throw new Error("Not a chat message");
}

export function inChatWith(e: NostrEvent, myPk: string) {
  if (e.pubkey === myPk) {
    return chatTo(e);
  } else {
    return e.pubkey;
  }
}

export function selfChat(e: NostrEvent, myPk: string) {
  return chatTo(e) === myPk && e.pubkey === myPk;
}

export function lastReadInChat(id: string) {
  const k = `dm:seen:${id}`;
  return parseInt(window.localStorage.getItem(k) ?? "0");
}

export function setLastReadIn(id: string) {
  const now = unixNow();
  const k = `dm:seen:${id}`;
  window.localStorage.setItem(k, now.toString());
}

export function createChatLink(type: ChatType, ...params: Array<string>) {
  switch (type) {
    case ChatType.PrivateDirectMessage: {
      if (params.length > 1) throw new Error("Must only contain one pubkey");
      return `/messages/${encodeTLVEntries(NostrPrefix.Chat17, {
        type: TLVEntryType.Author,
        length: params[0].length,
        value: params[0],
      } as TLVEntry)}`;
    }
    case ChatType.PrivateGroupChat: {
      return `/messages/${encodeTLVEntries(
        NostrPrefix.Chat17,
        ...params.map(
          a =>
            ({
              type: TLVEntryType.Author,
              length: a.length,
              value: a,
            }) as TLVEntry,
        ),
      )}`;
    }
    case ChatType.PublicGroupChat: {
      return `/messages/${Nip28ChatSystem.chatId(params[0])}`;
    }
  }
  throw new Error("Unknown chat type");
}

export function createEmptyChatObject(id: string, messages?: Array<TaggedNostrEvent>) {
  if (id.startsWith(NostrPrefix.Chat17)) {
    return Nip17ChatSystem.createChatObj(id, []);
  }
  if (id.startsWith(NostrPrefix.Chat28)) {
    return Nip28ChatSystem.createChatObj(id, messages ?? []);
  }
  throw new Error("Cant create new empty chat, unknown id");
}

export function useChatSystem(chat: ChatSystem) {
  const login = useLogin();
  const { publisher } = useEventPublisher();
  const sub = useMemo(() => {
    return chat.subscription(login);
  }, [chat, login]);
  const data = useRequestBuilder(sub);
  const { isMuted } = useModeration();

  useEffect(() => {
    if (publisher) {
      chat.processEvents(publisher, data);
    }
  }, [data, publisher]);

  return useMemo(() => {
    if (login.publicKey) {
      return chat.listChats(
        login.publicKey,
        data.filter(a => !isMuted(a.pubkey)),
      );
    }
    return [];
  }, [chat, login, data, isMuted]);
}

export function useChatSystems() {
  const nip28 = useChatSystem(Nip28Chats);
  const nip17 = useChatSystem(Nip17Chats);

  return [...nip28, ...nip17];
}

export function useChat(id: string) {
  const getStore = () => {
    if (id.startsWith(NostrPrefix.Chat17)) {
      return Nip17Chats;
    }
    if (id.startsWith(NostrPrefix.Chat28)) {
      return Nip28Chats;
    }
    throw new Error("Unsupported chat system");
  };
  const ret = useChatSystem(getStore()).find(a => a.id === id);
  const emptyChat = useEmptyChatSystem(ret === undefined ? id : undefined);
  return ret ?? emptyChat;
}
