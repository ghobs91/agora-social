import { fetchNostrAddress, unwrap } from "@snort/shared";
import { KeyStorage, Nip46Signer } from "@snort/system";
import { useIntl } from "react-intl";

import { bech32ToHex } from "@/Utils";
import { EmailRegex, MnemonicRegex } from "@/Utils/Const";
import { LoginSessionType, LoginStore } from "@/Utils/Login";
import { entropyToPrivateKey, generateBip39Entropy } from "@/Utils/nip6";

export default function useLoginHandler() {
  const { formatMessage } = useIntl();
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  async function doLogin(key: string, pin: (key: string) => Promise<KeyStorage>) {
    const insecureMsg = formatMessage({
      defaultMessage:
        "Can't login with private key on an insecure connection, please use a Nostr key manager extension instead",
      id: "iXPL0Z",
    });
    // private key logins
    if (key.startsWith("nsec")) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      const hexKey = bech32ToHex(key);
      if (hexKey.length === 64) {
        LoginStore.loginWithPrivateKey(await pin(hexKey));
        return;
      } else {
        throw new Error("INVALID PRIVATE KEY");
      }
    } else if (key.match(MnemonicRegex)?.length === 24) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      const ent = generateBip39Entropy(key);
      const hexKey = entropyToPrivateKey(ent);
      LoginStore.loginWithPrivateKey(await pin(hexKey));
      return;
    } else if (key.length === 64) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      LoginStore.loginWithPrivateKey(await pin(key));
      return;
    }

    // public key logins
    if (key.startsWith("npub")) {
      const hexKey = bech32ToHex(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
    } else if (key.match(EmailRegex)) {
      const [name, domain] = key.split("@");
      const json = await fetchNostrAddress(name, domain);
      if (!json) {
        throw new Error("Invalid nostr address");
      }
      const match = Object.keys(json.names).find(n => {
        return n.toLowerCase() === name.toLowerCase();
      });
      if (!match) {
        throw new Error("Invalid nostr address");
      }
      const pubkey = json.names[match];

      if (json.nip46) {
        const bunkerRelays = json.nip46[json.names["_"]];
        const nip46 = new Nip46Signer(`bunker://${pubkey}?relay=${encodeURIComponent(bunkerRelays[0])}`);
        nip46.on("oauth", url => {
          window.open(url, CONFIG.appNameCapitalized, "width=600,height=800,popup=yes");
        });
        await nip46.init();

        const loginPubkey = await nip46.getPubKey();
        LoginStore.loginWithPubkey(
          loginPubkey,
          LoginSessionType.Nip46,
          undefined,
          nip46.relays,
          await pin(unwrap(nip46.privateKey)),
        );
        nip46.close();
      } else {
        LoginStore.loginWithPubkey(pubkey, LoginSessionType.PublicKey);
      }
    } else if (key.startsWith("bunker://")) {
      const nip46 = new Nip46Signer(key);
      await nip46.init();

      const loginPubkey = await nip46.getPubKey();
      LoginStore.loginWithPubkey(
        loginPubkey,
        LoginSessionType.Nip46,
        undefined,
        nip46.relays,
        await pin(unwrap(nip46.privateKey)),
      );
      nip46.close();
    } else {
      throw new Error("INVALID PRIVATE KEY");
    }
  }

  return {
    doLogin,
  };
}
