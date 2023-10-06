import { useIntl } from "react-intl";
import { Nip46Signer, KeyStorage } from "@snort/system";

import { EmailRegex, MnemonicRegex } from "Const";
import { LoginSessionType, LoginStore } from "Login";
import { generateBip39Entropy, entropyToPrivateKey } from "nip6";
import { getNip05PubKey } from "Pages/LoginPage";
import { bech32ToHex } from "SnortUtils";
import { unwrap } from "@snort/shared";

export default function useLoginHandler() {
  const { formatMessage } = useIntl();
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  async function doLogin(key: string, pin: (key: string) => Promise<KeyStorage>) {
    const insecureMsg = formatMessage({
      defaultMessage:
        "Can't login with private key on an insecure connection, please use a Nostr key manager extension instead",
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
      const hexKey = await getNip05PubKey(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
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
