import { ExternalStore, FeedCache, dedupe } from "@snort/shared";
import { RequestBuilder, NostrEvent, EventKind, SystemInterface } from "@snort/system";
import { unwrap } from "SnortUtils";
import { Chat, ChatSystem, ChatType, lastReadInChat } from "chat";

export class Nip29ChatSystem extends ExternalStore<Array<Chat>> implements ChatSystem {
  readonly #cache: FeedCache<NostrEvent>;

  constructor(cache: FeedCache<NostrEvent>) {
    super();
    this.#cache = cache;
  }

  takeSnapshot(): Chat[] {
    return this.listChats();
  }

  subscription(id: string) {
    const gs = id.split("/", 2);
    const rb = new RequestBuilder(`nip29:${id}`);
    const last = this.listChats().find(a => a.id === id)?.lastMessage;
    rb.withFilter()
      .relay(`wss://${gs[0]}`)
      .kinds([EventKind.SimpleChatMessage])
      .tag("g", [`/${gs[1]}`])
      .since(last);
    rb.withFilter()
      .relay(`wss://${gs[0]}`)
      .kinds([EventKind.SimpleChatMetadata])
      .tag("d", [`/${gs[1]}`]);
    return rb;
  }

  async onEvent(evs: NostrEvent[]) {
    const msg = evs.filter(a => a.kind === EventKind.SimpleChatMessage);
    if (msg.length > 0) {
      await this.#cache.bulkSet(msg);
      this.notifyChange();
    }
  }

  listChats(): Chat[] {
    const allMessages = this.#nip29Chats();
    const groups = dedupe(
      allMessages
        .map(a => a.tags.find(b => b[0] === "g"))
        .filter(a => a !== undefined)
        .map(a => unwrap(a))
        .map(a => `${a[2]}${a[1]}`)
    );
    return groups.map(g => {
      const [relay, channel] = g.split("/", 2);
      const messages = allMessages.filter(
        a => `${a.tags.find(b => b[0] === "g")?.[2]}${a.tags.find(b => b[0] === "g")?.[1]}` === g
      );
      const lastRead = lastReadInChat(g);
      return {
        type: ChatType.PublicGroupChat,
        id: g,
        unread: messages.reduce((acc, v) => (v.created_at > lastRead ? acc++ : acc), 0),
        lastMessage: messages.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
        messages,
        createMessage: (msg, pub) => {
          return pub.generic(eb => {
            return eb
              .kind(EventKind.SimpleChatMessage)
              .tag(["g", `/${channel}`, relay])
              .content(msg);
          });
        },
        sendMessage: async (ev: NostrEvent, system: SystemInterface) => {
          await system.WriteOnceToRelay(`wss://${relay}`, ev);
        },
      } as Chat;
    });
  }

  #nip29Chats() {
    return this.#cache.snapshot().filter(a => a.kind === EventKind.SimpleChatMessage);
  }
}
