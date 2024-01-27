import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

interface AccountNameProps {
  name?: string;
  link?: boolean;
}

export default function AccountName({ name = "", link = true }: AccountNameProps) {
  const navigate = useNavigate();
  return (
    <>
      <div>
        <FormattedMessage defaultMessage="Username" id="JCIgkj" />: <b>{name}</b>
      </div>
      <div>
        <FormattedMessage defaultMessage="Short link" id="rx1i0i" />:{" "}
        {link ? (
          <a
            href={`https://iris.to/${name}`}
            onClick={e => {
              e.preventDefault();
              navigate(`/${name}`);
            }}>
            iris.to/{name}
          </a>
        ) : (
          <>iris.to/{name}</>
        )}
      </div>
      <div>
        <FormattedMessage defaultMessage="Nostr address (nip05)" id="BjNwZW" />: <b>{name}@iris.to</b>
      </div>
    </>
  );
}
