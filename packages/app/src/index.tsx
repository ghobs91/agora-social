import "./index.css";
import "@szhsin/react-menu/dist/index.css";
import "@/assets/fonts/inter.css";

import { unixNowMs } from "@snort/shared";
import { EventBuilder } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouteObject, RouterProvider } from "react-router-dom";

import { preload, UserCache } from "@/Cache";
import { ThreadRoute } from "@/Components/Event/Thread/ThreadRoute";
import { IntlProvider } from "@/Components/IntlProvider/IntlProvider";
import { addCachedMetadataToFuzzySearch } from "@/Db/FuzzySearch";
import { AboutPage } from "@/Pages/About";
import { DebugPage } from "@/Pages/CacheDebug";
import { SnortDeckLayout } from "@/Pages/Deck/DeckLayout";
import DonatePage from "@/Pages/Donate/DonatePage";
import ErrorPage from "@/Pages/ErrorPage";
import FreeNostrAddressPage from "@/Pages/FreeNostrAddressPage";
import HelpPage from "@/Pages/HelpPage";
import Layout from "@/Pages/Layout";
import { ListFeedPage } from "@/Pages/ListFeedPage";
import MessagesPage from "@/Pages/Messages/MessagesPage";
import NostrAddressPage from "@/Pages/NostrAddressPage";
import NostrLinkHandler from "@/Pages/NostrLinkHandler";
import NotificationsPage from "@/Pages/Notifications/Notifications";
import { OnboardingRoutes } from "@/Pages/onboarding";
import ProfilePage from "@/Pages/Profile/ProfilePage";
import { RootRoutes } from "@/Pages/Root/RootRoutes";
import { RootTabRoutes } from "@/Pages/Root/RootTabRoutes";
import SearchPage from "@/Pages/SearchPage";
import SettingsRoutes from "@/Pages/settings/Routes";
import { SubscribeRoutes } from "@/Pages/subscribe";
import WalletPage from "@/Pages/wallet";
import { WalletReceivePage } from "@/Pages/wallet/receive";
import { WalletSendPage } from "@/Pages/wallet/send";
import ZapPoolPage from "@/Pages/ZapPool/ZapPool";
import { System } from "@/system";
import { storeRefCode, unwrap } from "@/Utils";
import { Wallets } from "@/Wallet";
import { setupWebLNWalletConfig } from "@/Wallet";

import { LoginStore } from "./Utils/Login";

async function initSite() {
  EventBuilder.ClientTag = [
    "client",
    "snort",
    "31990:84de35e2584d2b144aae823c9ed0b0f3deda09648530b93d1a2a146d1dea9864:app-profile",
  ];
  storeRefCode();

  setupWebLNWalletConfig(Wallets);

  //db.ready = await db.isAvailable();

  const login = LoginStore.snapshot();
  preload(login.state.follows).then(async () => {
    queueMicrotask(async () => {
      const start = unixNowMs();
      await System.PreloadSocialGraph(login.state.follows, login.publicKey);
      console.debug(
        `Social graph loaded in ${(unixNowMs() - start).toFixed(2)}ms`,
        System.config.socialGraphInstance.size(),
      );
    });

    for (const ev of UserCache.snapshot()) {
      try {
        addCachedMetadataToFuzzySearch(ev);
      } catch (e) {
        console.error("Failed to handle metadata event from sql db", e);
      }
    }
  });

  // cleanup
  //Relay.delete(["REQ", "cleanup", { kinds: [1, 7, 9735], until: unixNow() - Day * 30 }]);

  return null;
}

let didInit = false;
const mainRoutes = [
  ...RootRoutes,
  {
    path: "/cache-debug",
    element: <DebugPage />,
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
    path: "/list-feed/:id",
    element: <ListFeedPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    path: "/wallet",
    element: (
      <div className="p">
        <WalletPage showHistory={true} />
      </div>
    ),
  },
  {
    path: "/wallet/send",
    element: <WalletSendPage />,
  },
  {
    path: "/wallet/receive",
    element: <WalletReceivePage />,
  },
  ...OnboardingRoutes,
  ...SettingsRoutes,
] as Array<RouteObject>;

if (CONFIG.features.zapPool) {
  mainRoutes.push({
    path: "/zap-pool",
    element: <ZapPoolPage />,
  });
}

if (CONFIG.features.subscriptions) {
  mainRoutes.push(...SubscribeRoutes);
}

// add catch all route
mainRoutes.push({
  path: "/:link",
  element: <NostrLinkHandler />,
});

const routes = [
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
    children: mainRoutes,
  },
] as Array<RouteObject>;

if (CONFIG.features.deck) {
  routes.push({
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
  } as RouteObject);
}

const router = createBrowserRouter(routes);

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

// Use react-helmet instead?
document.title = CONFIG.appTitle;
