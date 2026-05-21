import "./notifications.css";
import {
  dismissContentCard,
  onInboxCardsUpdated,
  refreshContentCards,
} from "./braze-content-cards.js";
import { loadBrazeSdk } from "./braze-loader.js";

const STATIC_NOTIFICATIONS = [
  {
    id: "static-transfer",
    title: "Your Transfer request was received.",
    description: "Confirmation of online account activity",
    date: "May 4",
  },
  {
    id: "static-letter",
    title: "Letter/Notice dated 04/08/2026 for account 2770",
    description: "New document available in your account",
    date: "April 8",
  },
];

let brazeRef = null;

function formatTodayLong() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatTodayShort() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function getCardTitle(card) {
  return (
    card.title ||
    card.extras?.title ||
    card.extras?.notification_title ||
    "Statement Available"
  );
}

function getCardDescription(card) {
  if (card.description) return card.description;
  if (card.cardDescription) return card.cardDescription;
  const account = card.extras?.account || card.extras?.account_number || "1856";
  return `Statement through ${formatTodayLong()} for account ${account}`;
}

function createNotificationRow({ title, description, date, card, isBraze }) {
  if (isBraze) {
    const swipe = document.createElement("li");
    swipe.className = "notification-swipe";
    swipe.dataset.cardId = card.id;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "notification-row";
    row.innerHTML = `
      <span class="notification-row__icon" aria-hidden="true">i</span>
      <span class="notification-row__dot" aria-hidden="true"></span>
      <span class="notification-row__body">
        <span class="notification-row__title"></span>
        <span class="notification-row__desc"></span>
      </span>
      <span class="notification-row__date"></span>
      <span class="notification-row__chevron" aria-hidden="true"></span>
    `;
    row.querySelector(".notification-row__title").textContent = title;
    row.querySelector(".notification-row__desc").textContent = description;
    row.querySelector(".notification-row__date").textContent = date;

    row.addEventListener("click", async () => {
      if (title === "Security alert: New device login") {
        const braze = brazeRef || (await loadBrazeSdk());
        if (typeof braze.logCustomEvent === "function") {
          braze.logCustomEvent("security_alert");
        }
      }
    });

    swipe.appendChild(row);
    attachSwipeHandlers(swipe, row, card);
    return swipe;
  }

  const li = document.createElement("li");
  li.className = "notification-row--static";
  const row = document.createElement("button");
  row.type = "button";
  row.className = "notification-row";
  row.innerHTML = `
    <span class="notification-row__icon" aria-hidden="true">i</span>
    <span class="notification-row__dot" aria-hidden="true"></span>
    <span class="notification-row__body">
      <span class="notification-row__title"></span>
      <span class="notification-row__desc"></span>
    </span>
    <span class="notification-row__date"></span>
    <span class="notification-row__chevron" aria-hidden="true"></span>
  `;
  row.querySelector(".notification-row__title").textContent = title;
  row.querySelector(".notification-row__desc").textContent = description;
  row.querySelector(".notification-row__date").textContent = date;
  li.appendChild(row);
  return li;
}

function attachSwipeHandlers(swipeEl, rowEl, card) {
  let startX = 0;
  let currentX = 0;
  const deleteWidth = 88;

  const setTranslate = (x) => {
    const offset = Math.max(-deleteWidth, Math.min(0, x));
    rowEl.style.transform = `translateX(${offset}px)`;
  };

  const onStart = (clientX) => {
    startX = clientX;
    currentX = 0;
    rowEl.style.transition = "none";
  };

  const onMove = (clientX) => {
    const delta = clientX - startX;
    if (delta < 0) {
      currentX = delta;
      setTranslate(delta);
    }
  };

  const onEnd = async () => {
    rowEl.style.transition = "transform 0.15s ease-out";
    if (currentX < -deleteWidth * 0.55) {
      const braze = brazeRef || (await loadBrazeSdk());
      dismissContentCard(braze, card);
      return;
    }
    setTranslate(0);
    currentX = 0;
  };

  rowEl.addEventListener(
    "touchstart",
    (e) => onStart(e.touches[0].clientX),
    { passive: true },
  );
  rowEl.addEventListener(
    "touchmove",
    (e) => onMove(e.touches[0].clientX),
    { passive: true },
  );
  rowEl.addEventListener("touchend", onEnd);

  rowEl.addEventListener("mousedown", (e) => {
    onStart(e.clientX);
    const onMouseMove = (ev) => onMove(ev.clientX);
    const onMouseUp = () => {
      onEnd();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function renderInboxList(cards) {
  const list = document.getElementById("notifications-list");
  if (!list) return;

  list.innerHTML = "";

  cards.forEach((card) => {
    list.appendChild(
      createNotificationRow({
        title: getCardTitle(card),
        description: getCardDescription(card),
        date: formatTodayShort(),
        card,
        isBraze: true,
      }),
    );
  });

  STATIC_NOTIFICATIONS.forEach((item) => {
    list.appendChild(
      createNotificationRow({
        title: item.title,
        description: item.description,
        date: item.date,
        isBraze: false,
      }),
    );
  });
}

function updateBellBadge(inboxCards) {
  const badge = document.getElementById("notifications-bell-badge");
  const bell = document.getElementById("notifications-bell");
  if (!badge || !bell) return;

  const hasInboxCards = inboxCards.length > 0;
  badge.hidden = !hasInboxCards;
  bell.setAttribute(
    "aria-label",
    hasInboxCards ? "Notifications, new items" : "Notifications",
  );
}

export function initNotifications(getBraze, switchTab) {
  const panel = document.getElementById("view-notifications");
  const dashboard = document.getElementById("dashboard");
  const bell = document.getElementById("notifications-bell");
  const back = document.getElementById("notifications-back");

  onInboxCardsUpdated((cards) => {
    updateBellBadge(cards);
    renderInboxList(cards);
  });

  const openNotifications = async () => {
    const braze = await getBraze();
    brazeRef = braze;
    refreshContentCards(braze);
    panel.classList.add("notifications--open");
    panel.hidden = false;
    dashboard.classList.add("dashboard--notifications");
    document.querySelectorAll(".app-view--active").forEach((view) => {
      view.style.visibility = "hidden";
    });
  };

  const closeNotifications = () => {
    panel.classList.remove("notifications--open");
    panel.hidden = true;
    dashboard.classList.remove("dashboard--notifications");
    document.querySelectorAll(".app-view").forEach((view) => {
      view.style.visibility = "";
    });
    switchTab?.("accounts");
    window.scrollTo(0, 0);
    document.getElementById("view-accounts")?.scrollTo(0, 0);
  };

  bell?.addEventListener("click", openNotifications);
  back?.addEventListener("click", closeNotifications);
}
