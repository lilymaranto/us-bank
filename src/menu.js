import "./menu.css";
import {
  applyUserChange,
  DEFAULT_USER_ID,
  getCurrentUserId,
} from "./identity.js";

function syncMenuUserInput() {
  const input = document.getElementById("menu-user-id");
  if (input) input.value = getCurrentUserId();
}

function setMenuError(message) {
  const errorEl = document.getElementById("menu-user-error");
  if (!errorEl) return;
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function dismissMenuAndShowAccounts(switchTab) {
  const panel = document.getElementById("view-menu");
  panel?.classList.remove("menu--open");
  if (panel) panel.hidden = true;
  switchTab?.("accounts");
  window.scrollTo(0, 0);
}

export function initMenu(switchTab) {
  const panel = document.getElementById("view-menu");
  const menuBtn = document.getElementById("dashboard-hero-menu");
  const back = document.getElementById("menu-back");
  const changeBtn = document.getElementById("menu-change-user");
  const userInput = document.getElementById("menu-user-id");
  const logoutBtn = document.getElementById("menu-logout");

  const openMenu = () => {
    syncMenuUserInput();
    setMenuError("");
    panel?.classList.add("menu--open");
    if (panel) panel.hidden = false;
  };

  const closeMenu = () => {
    panel?.classList.remove("menu--open");
    if (panel) panel.hidden = true;
  };

  menuBtn?.addEventListener("click", openMenu);
  back?.addEventListener("click", closeMenu);

  changeBtn?.addEventListener("click", async () => {
    const nextUser = userInput?.value?.trim() ?? "";
    if (!nextUser) {
      setMenuError("Enter a user ID.");
      userInput?.focus();
      return;
    }

    setMenuError("");
    changeBtn.disabled = true;

    try {
      await applyUserChange(nextUser, { reason: "manual" });
      dismissMenuAndShowAccounts(switchTab);
    } catch (error) {
      console.error("[demo] User change failed:", error);
      setMenuError(
        error?.message === "Enter a user ID."
          ? error.message
          : "Unable to switch user. Try again.",
      );
    } finally {
      changeBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    changeBtn.disabled = true;

    try {
      await applyUserChange(DEFAULT_USER_ID, { reason: "manual" });
      dismissMenuAndShowAccounts(switchTab);
    } catch (error) {
      console.error("[demo] Reset to default user failed:", error);
    } finally {
      changeBtn.disabled = false;
    }
  });

  userInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      changeBtn?.click();
    }
  });
}
