import * as utils from "@noble/curves/abstract/utils";
import { base64 } from "@scure/base";

import useLogin from "@/Hooks/useLogin";
import { hmacSha256, unwrap } from "@/Utils";

export interface ImgProxySettings {
  url: string;
  key: string;
  salt: string;
}

export default function useImgProxy() {
  const settings = useLogin(s => s.appData.item.preferences.imgProxyConfig);

  return {
    proxy: (url: string, resize?: number, sha256?: string) => proxyImg(url, settings, resize, sha256),
  };
}

export function proxyImg(url: string, settings?: ImgProxySettings, resize?: number, sha256?: string) {
  const te = new TextEncoder();
  function urlSafe(s: string) {
    return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  function signUrl(u: string) {
    const result = hmacSha256(
      utils.hexToBytes(unwrap(settings).key),
      utils.hexToBytes(unwrap(settings).salt),
      te.encode(u),
    );
    return urlSafe(base64.encode(result));
  }
  if (!settings) return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.length == 0) return url;
  const opts = [];
  if (sha256) {
    opts.push(`hs:sha256:${sha256}`);
  }
  if (resize) {
    opts.push(`rs:fit:${resize}:${resize}`);
    opts.push(`dpr:${window.devicePixelRatio}`);
  }
  const urlBytes = te.encode(url);
  const urlEncoded = urlSafe(base64.encode(urlBytes));
  const path = `/${opts.join("/")}/${urlEncoded}`;
  const sig = signUrl(path);
  return `${new URL(settings.url).toString()}${sig}${path}`;
}
