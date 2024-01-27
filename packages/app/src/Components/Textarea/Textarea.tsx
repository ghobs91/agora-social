import "@webscopeio/react-textarea-autocomplete/style.css";
import "./Textarea.css";

import { NostrPrefix } from "@snort/system";
import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete";
import { useIntl } from "react-intl";
import TextareaAutosize from "react-textarea-autosize";

import Avatar from "@/Components/User/Avatar";
import Nip05 from "@/Components/User/Nip05";
import { FuzzySearchResult } from "@/Db/FuzzySearch";
import { userSearch } from "@/Hooks/useProfileSearch";
import { hexToBech32 } from "@/Utils";
import searchEmoji from "@/Utils/emoji-search";

import messages from "../messages";

interface EmojiItemProps {
  name: string;
  char: string;
}

const EmojiItem = ({ entity: { name, char } }: { entity: EmojiItemProps }) => {
  return (
    <div className="emoji-item">
      <div className="emoji">{char}</div>
      <div className="emoji-name">{name}</div>
    </div>
  );
};

const UserItem = (metadata: FuzzySearchResult) => {
  const { pubkey, display_name, nip05, ...rest } = metadata;
  return (
    <div key={pubkey} className="user-item">
      <div className="user-picture">
        <Avatar pubkey={pubkey} user={metadata} />
      </div>
      <div className="user-details">
        <strong>{display_name || rest.name}</strong>
        <Nip05 nip05={nip05} pubkey={pubkey} />
      </div>
    </div>
  );
};

interface TextareaProps {
  autoFocus: boolean;
  className?: string;
  placeholder?: string;
  onChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void;
  value: string;
  onFocus(): void;
  onKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>): void;
  onDragOver?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDragLeave?(ev: React.DragEvent<HTMLTextAreaElement>): void;
  onDrop?(ev: React.DragEvent<HTMLTextAreaElement>): void;
}

const Textarea = (props: TextareaProps) => {
  const { formatMessage } = useIntl();

  const userDataProvider = (token: string) => {
    return userSearch(token).slice(0, 10);
  };

  const emojiDataProvider = async (token: string) => {
    return (await searchEmoji(token)).slice(0, 5).map(({ name, char }) => ({ name, char }));
  };

  return (
    // @ts-expect-error If anybody can figure out how to type this, please do
    <ReactTextareaAutocomplete
      dir="auto"
      {...props}
      loadingComponent={() => <span>Loading...</span>}
      placeholder={props.placeholder ?? formatMessage(messages.NotePlaceholder)}
      textAreaComponent={TextareaAutosize}
      trigger={{
        ":": {
          dataProvider: emojiDataProvider,
          component: EmojiItem,
          output: (item: EmojiItemProps) => item.char,
        },
        "@": {
          afterWhitespace: true,
          dataProvider: userDataProvider,
          component: (props: { entity: FuzzySearchResult }) => <UserItem {...props.entity} />,
          output: (item: { pubkey: string }) => `@${hexToBech32(NostrPrefix.PublicKey, item.pubkey)}`,
        },
      }}
    />
  );
};

export default Textarea;
