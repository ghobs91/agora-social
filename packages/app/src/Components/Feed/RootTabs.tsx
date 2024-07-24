import "./RootTabs.css";

import { unwrap } from "@snort/shared";
import { EventKind } from "@snort/system";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { rootTabItems } from "@/Components/Feed/RootTabItems";
import Icon from "@/Components/Icons/Icon";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes";

export function RootTabs({ base = "/" }: { base: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const defaultRootTab = usePreferences(s => s.defaultRootTab);

  const hashTags = tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1]);
  const menuItems = useMemo(() => rootTabItems(base, pubKey, hashTags), [base, pubKey, tags]);

  let defaultTab: RootTabRoutePath;
  if (pubKey) {
    defaultTab = defaultRootTab;
  } else {
    defaultTab = `trending/notes`;
  }
  const initialPathname = location.pathname === "/" ? defaultTab : location.pathname;
  const initialRootType = menuItems.find(a => a.path === initialPathname)?.tab || defaultTab;

  const [rootType, setRootType] = useState<RootTabRoutePath>(initialRootType);

  useEffect(() => {
    const currentTab = menuItems.find(a => a.path === location.pathname)?.tab;
    if (currentTab && currentTab !== rootType) {
      setRootType(currentTab);
    }
  }, [location.pathname, menuItems, rootType]);

  function currentMenuItem() {
    if (location.pathname.startsWith(`${base}/t/`)) {
      return (
        <>
          <Icon name="hash" />
          {location.pathname.split("/").slice(-1)}
        </>
      );
    }
    return menuItems.find(a => a.tab === rootType)?.element ?? menuItems[0].element;
  }

  return (
    <div className="root-type">
      <Menu
        menuButton={
          <button type="button">
            {currentMenuItem()}
            <Icon name="chevronDown" />
          </button>
        }
        align="center"
        menuClassName={() => "ctx-menu"}>
        <div className="close-menu-container">
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        {menuItems
          .filter(a => a.show)
          .map(a => (
            <MenuItem
              key={a.tab}
              onClick={() => {
                navigate(a.path);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}>
              {a.element}
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
}
