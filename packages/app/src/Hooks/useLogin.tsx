import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

import { LoginSession, LoginStore } from "@/Utils/Login";

export default function useLogin<T = LoginSession>(selector?: (v: LoginSession) => T) {
  const defaultSelector = (v: LoginSession) => v as unknown as T;

  return useSyncExternalStoreWithSelector<LoginSession, T>(
    s => LoginStore.hook(s),
    () => LoginStore.snapshot(),
    undefined,
    selector || defaultSelector,
  );
}
