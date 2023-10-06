import "./index.css";
import "@szhsin/react-menu/dist/index.css";
import "./fonts/inter.css";

import { compress, expand_filter, flat_merge, get_diff, pow, default as wasmInit } from "@snort/system-wasm";
import WasmPath from "@snort/system-wasm/pkg/system_wasm_bg.wasm";

import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  NostrSystem,
  ProfileLoaderService,
  QueryOptimizer,
  FlatReqFilter,
  ReqFilter,
  PowMiner,
  NostrEvent,
} from "@snort/system";
import { SnortContext } from "@snort/system-react";

import * as serviceWorkerRegistration from "serviceWorkerRegistration";
import { IntlProvider } from "IntlProvider";
import { unwrap } from "SnortUtils";
import Layout from "Pages/Layout";
import LoginPage from "Pages/LoginPage";
import ProfilePage from "Pages/ProfilePage";
import { RootRoutes, RootTabRoutes } from "Pages/Root";
import NotificationsPage from "Pages/Notifications";
import SettingsPage, { SettingsRoutes } from "Pages/SettingsPage";
import ErrorPage from "Pages/ErrorPage";
import NostrAddressPage from "Pages/NostrAddressPage";
import MessagesPage from "Pages/MessagesPage";
import DonatePage from "Pages/DonatePage";
import SearchPage from "Pages/SearchPage";
import HelpPage from "Pages/HelpPage";
import { NewUserRoutes } from "Pages/new";
import { WalletRoutes } from "Pages/WalletPage";
import NostrLinkHandler from "Pages/NostrLinkHandler";
import { ThreadRoute } from "Element/Event/Thread";
import { SubscribeRoutes } from "Pages/subscribe";
import ZapPoolPage from "Pages/ZapPool";
import DebugPage from "Pages/Debug";
import { db } from "Db";
import { preload, RelayMetrics, UserCache, UserRelays } from "Cache";
import { LoginStore } from "Login";
import { SnortDeckLayout } from "Pages/DeckLayout";
import FreeNostrAddressPage from "./Pages/FreeNostrAddressPage";

const WasmQueryOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expand_filter(f) as Array<FlatReqFilter>;
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    return get_diff(prev, next) as Array<FlatReqFilter>;
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flat_merge(all) as Array<ReqFilter>;
  },
  compress: (all: Array<ReqFilter>) => {
    return compress(all) as Array<ReqFilter>;
  },
} as QueryOptimizer;

export class WasmPowWorker implements PowMiner {
  minePow(ev: NostrEvent, target: number): Promise<NostrEvent> {
    const res = pow(ev, target);
    return Promise.resolve(res);
  }
}

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relayCache: UserRelays,
  profileCache: UserCache,
  relayMetrics: RelayMetrics,
  queryOptimizer: WasmQueryOptimizer,
  authHandler: async (c, r) => {
    const { id } = LoginStore.snapshot();
    const pub = LoginStore.getPublisher(id);
    if (pub) {
      return await pub.nip42Auth(c, r);
    }
  },
});

/**
 * Singleton user profile loader
 */
export const ProfileLoader = new ProfileLoaderService(System, UserCache);

serviceWorkerRegistration.register();

async function initSite() {
  await wasmInit(WasmPath);
  const login = LoginStore.takeSnapshot();
  db.ready = await db.isAvailable();
  if (db.ready) {
    await preload(login.follows.item);
  }

  for (const [k, v] of Object.entries(login.relays.item)) {
    System.ConnectToRelay(k, v);
  }
  try {
    if ("registerProtocolHandler" in window.navigator) {
      window.navigator.registerProtocolHandler("web+nostr", `${window.location.protocol}//${window.location.host}/%s`);
      console.info("Registered protocol handler for 'web+nostr'");
    }
  } catch (e) {
    console.error("Failed to register protocol handler", e);
  }

  // inject analytics script
  // <script defer data-domain="snort.social" src="http://analytics.v0l.io/js/script.js"></script>
  if (login.preferences.telemetry ?? true) {
    const sc = document.createElement("script");
    sc.src = "https://analytics.v0l.io/js/script.js";
    sc.defer = true;
    sc.setAttribute("data-domain", "snort.social");
    document.head.appendChild(sc);
  }
  return null;
}

let didInit = false;
export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    loader: async () => {
      if (!didInit) {
        didInit = true;
        return await initSite();
      }
      return null;
    },
    children: [
      ...RootRoutes,
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/help",
        element: <HelpPage />,
      },
      {
        path: "/e/:id",
        element: <ThreadRoute />,
      },
      {
        path: "/p/:id",
        element: <ProfilePage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
        children: SettingsRoutes,
      },
      {
        path: "/free-nostr-address",
        element: <FreeNostrAddressPage />,
      },
      {
        path: "/nostr-address",
        element: <NostrAddressPage />,
      },
      {
        path: "/messages/:id?",
        element: <MessagesPage />,
      },
      {
        path: "/donate",
        element: <DonatePage />,
      },
      {
        path: "/search/:keyword?",
        element: <SearchPage />,
      },
      {
        path: "/zap-pool",
        element: <ZapPoolPage />,
      },
      ...NewUserRoutes,
      ...WalletRoutes,
      ...SubscribeRoutes,
      {
        path: "/debug",
        element: <DebugPage />,
      },
      {
        path: "/*",
        element: <NostrLinkHandler />,
      },
    ],
  },
  {
    path: "/deck",
    element: <SnortDeckLayout />,
    loader: async () => {
      if (!didInit) {
        didInit = true;
        return await initSite();
      }
      return null;
    },
    children: RootTabRoutes,
  },
]);

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")));
root.render(
  <StrictMode>
    <IntlProvider>
      <SnortContext.Provider value={System}>
        <RouterProvider router={router} />
      </SnortContext.Provider>
    </IntlProvider>
  </StrictMode>,
);
