import { unixNowMs } from "@snort/shared";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { mapPlanName } from "@/Pages/subscribe/utils";
import { Birthday, Day } from "@/Utils/Const";

import useLogin from "../../Hooks/useLogin";
import { isBirthday, isChristmas, isHalloween, isStPatricksDay } from "../../Utils";
import { getCurrentSubscription } from "../../Utils/Subscription";

const getExtra = () => {
  if (isBirthday()) {
    const age = (unixNowMs() - Birthday.getTime()) / (Day * 365_000);
    return <span className="text-xs">{age.toFixed(0)}st 🎂</span>;
  }
  if (isHalloween()) return <span title="Happy Halloween!">🎃</span>;
  if (isStPatricksDay()) return <span title="Happy St. Patrick's Day!">🍀</span>;
  if (isChristmas()) return <span title="Merry Christmas!">🎄</span>;
};

export function LogoHeader({ showText = false }: { showText: boolean }) {
  const { subscriptions } = useLogin();
  const currentSubscription = getCurrentSubscription(subscriptions);

  const appName = CONFIG.appName === "iris" && isStPatricksDay() ? "Irish" : CONFIG.appName;

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const extra = getExtra();

  return (
    <Link to="/" className="logo hover:no-underline" onClick={handleLogoClick}>
      <h1 className="flex flex-row items-center md:justify-center font-bold my-0 p-0 md:mx-3 font-bold text-3xl">
        {CONFIG.navLogo && <img src={CONFIG.navLogo} className="w-8" />}
        {!CONFIG.navLogo && (
          <span className="p-3 md:p-5 text-xl md:text-3xl flex xl:hidden w-8 h-8 rounded-xl bg-dark flex items-center justify-center">
            {CONFIG.appName[0]}
          </span>
        )}
        {showText && (
          <div className="md:hidden xl:inline ml-2">
            {appName}
            {extra && <span className="ml-1">{extra}</span>}
          </div>
        )}
      </h1>
      {currentSubscription && (
        <div className="flex items-center g4 text-sm font-semibold tracking-wider xl:ml-2">
          <Icon name="diamond" size={16} className="text-pro" />
          {mapPlanName(currentSubscription.type)}
        </div>
      )}
    </Link>
  );
}
