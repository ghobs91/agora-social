import { DefaultPreferences, updateAppData, UserPreferences } from "@/Utils/Login";

import useLogin from "./useLogin";

export default function usePreferences<T = UserPreferences>(selector?: (v: UserPreferences) => T): T {
  const defaultSelector = (v: UserPreferences) => v as unknown as T;
  return useLogin(s => {
    const pref = s.state.appdata?.preferences ?? {
      ...DefaultPreferences,
      ...CONFIG.defaultPreferences,
    };

    return (selector || defaultSelector)(pref);
  });
}

export function useAllPreferences() {
  const { id, pref } = useLogin(s => {
    const pref = s.state.appdata?.preferences ?? {
      ...DefaultPreferences,
      ...CONFIG.defaultPreferences,
    };

    return {
      id: s.id,
      pref: pref,
    };
  });
  return {
    preferences: pref,
    update: async (data: UserPreferences) => {
      await updateAppData(id, d => {
        return { ...d, preferences: data };
      });
    },
  };
}
