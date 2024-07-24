import "./Copy.css";

import classNames from "classnames";

import Icon from "@/Components/Icons/Icon";
import { useCopy } from "@/Hooks/useCopy";

export interface CopyProps {
  text: string;
  maxSize?: number;
  className?: string;
  showText?: boolean;
  mask?: string;
}
export default function Copy({ text, maxSize = 32, className, showText, mask }: CopyProps) {
  const { copy, copied } = useCopy();
  const sliceLength = maxSize / 2;
  const displayText = mask ? mask.repeat(text.length) : text;
  const trimmed =
    displayText.length > maxSize
      ? `${displayText.slice(0, sliceLength)}...${displayText.slice(-sliceLength)}`
      : displayText;

  return (
    <div className={classNames("copy flex pointer g8 items-center", className)} onClick={() => copy(text)}>
      {(showText ?? true) && <span className="copy-body">{trimmed}</span>}
      <span className="icon" style={{ color: copied ? "var(--success)" : "var(--highlight)" }}>
        {copied ? <Icon name="check" size={14} /> : <Icon name="copy-solid" size={14} />}
      </span>
    </div>
  );
}
