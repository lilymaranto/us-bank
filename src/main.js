import "./styles.css";
import "./dashboard.css";
import "./investments.css";
import "./transfer-pay.css";
import "./products-offers.css";
import "./plan-track.css";
import { loadBrazeSdk } from "./braze-loader.js";
import { bootstrapIdentity } from "./identity.js";
import { initNotifications } from "./notifications.js";
import { initHomePromos } from "./home-promos.js";
import { initMenu } from "./menu.js";

const TAB_VIEWS = {
  accounts: "view-accounts",
  transfer: "view-transfer-pay",
  plan: "view-plan-track",
  products: "view-products-offers",
  investments: "view-investments",
};

function switchTab(tabId) {
  const viewId = TAB_VIEWS[tabId];
  if (!viewId) return;

  document.querySelectorAll(".app-view").forEach((view) => {
    const isActive = view.id === viewId;
    view.classList.toggle("app-view--active", isActive);
    view.hidden = !isActive;
  });

  document.querySelectorAll(".tab-bar__item").forEach((btn) => {
    btn.classList.toggle("tab-bar__item--active", btn.dataset.tab === tabId);
  });

  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.scrollTop = 0;
  }
}

async function logInvestmentsTabClick() {
  const braze = await loadBrazeSdk();
  if (typeof braze.logCustomEvent === "function") {
    braze.logCustomEvent("clicked_investments");
  }
}

function initTabBar() {
  document.querySelectorAll(".tab-bar__item[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      if (tabId === "investments") {
        logInvestmentsTabClick();
      }
      if (TAB_VIEWS[tabId]) {
        switchTab(tabId);
      }
    });
  });
}

async function bootstrap() {
  try {
    await bootstrapIdentity();
  } catch (error) {
    console.error("[demo] Bootstrap failed:", error);
  }

  switchTab("accounts");
  window.scrollTo(0, 0);
}

initTabBar();
initNotifications(loadBrazeSdk, switchTab);
initHomePromos();
initMenu(switchTab);
bootstrap();
