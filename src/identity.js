import personaMap from "../solcon-starter/persona-map.json";
import {
  listenForNative,
  setUser as syncUserToNative,
  startWebSession,
} from "../solcon-starter/demo_bridge_entry.js";
import { refreshContentCards } from "./braze-content-cards.js";
import { switchBrazeUser } from "./braze-session.js";

export const CONFIG_ID = "us-bank";
export const DEFAULT_USER_ID =
  personaMap.defaultUserId || personaMap.personas?.[0]?.userId || "us1";

/** Wait for native flush / nativeUserUpdate before applying web default. */
const NATIVE_BOOTSTRAP_DEFER_MS = 400;

const personaByUserId = new Map(
  (personaMap.personas || []).map((persona) => [persona.userId, persona]),
);

let currentUserId = "";
let nativeListenerRegistered = false;
let nativeUserApplied = false;

export function getCurrentUserId() {
  return currentUserId;
}

export function isNativeContainer() {
  return Boolean(window.DemoBridge);
}

export function getWelcomeFirstName(userId) {
  const persona = personaByUserId.get(userId);
  if (persona?.firstName) return persona.firstName;
  const base = userId.split(/[@.]/)[0];
  if (!base) return "there";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function updateWelcome(userId) {
  const welcome = document.getElementById("dashboard-welcome");
  if (welcome) {
    welcome.textContent = `Welcome, ${getWelcomeFirstName(userId)}.`;
  }
}

function syncMenuUserInput() {
  const input = document.getElementById("menu-user-id");
  if (input) input.value = currentUserId;
}

/** UI-only identity (welcome, menu field) without Braze or bridge traffic. */
function setLocalUserState(userId) {
  const trimmed = String(userId ?? "").trim();
  if (!trimmed) return;
  currentUserId = trimmed;
  updateWelcome(trimmed);
  syncMenuUserInput();
}

function safeStartWebSession(userId) {
  try {
    startWebSession({ userId, configId: CONFIG_ID });
    console.info("[demo] Doppel bridge startWebSession:", userId);
  } catch (error) {
    console.warn("[demo] startWebSession failed — DemoBridge missing?", error);
  }
}

function safeSyncToNative(userId, reason = "manual") {
  try {
    syncUserToNative(userId, reason);
    console.info("[demo] Doppel bridge setUser:", userId, reason);
  } catch (error) {
    console.warn("[demo] setUser failed — DemoBridge missing?", error);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Native → web updates (mid-session, reopen, prefer-native). Mirrors flex-driver
 * handleNativeUserUpdate: apply Braze/UI only; do not echo back to native.
 */
export async function handleNativeUserUpdate(incomingUserId) {
  const trimmed = String(incomingUserId ?? "").trim();
  if (!trimmed) return;
  nativeUserApplied = true;
  return applyUserChange(trimmed, { reason: "manual", syncNative: false });
}

/**
 * Single entry for web-initiated identity changes: Braze, welcome UI, menu field, Doppel sync.
 */
export async function applyUserChange(userId, options = {}) {
  const { reason = "manual", syncNative = true } = options;
  const trimmed = String(userId ?? "").trim();
  if (!trimmed) {
    throw new Error("Enter a user ID.");
  }

  if (syncNative) {
    if (reason === "default") {
      safeStartWebSession(trimmed);
    } else {
      safeSyncToNative(trimmed, reason);
    }
  }

  const braze = await switchBrazeUser(trimmed);
  refreshContentCards(braze);

  currentUserId = trimmed;
  updateWelcome(trimmed);
  syncMenuUserInput();

  return braze;
}

export function initIdentityBridge() {
  if (nativeListenerRegistered) return;
  nativeListenerRegistered = true;
  nativeUserApplied = false;

  try {
    listenForNative((incomingUserId) => {
      handleNativeUserUpdate(incomingUserId).catch((error) => {
        console.error("[demo] Native user sync failed:", error);
      });
    });
  } catch (error) {
    console.warn("[demo] listenForNative failed — DemoBridge missing?", error);
  }
}

/**
 * Bootstrap: browser runs full default login; MasqV2 WebView handshake only,
 * then waits for native user before falling back to default.
 */
export async function bootstrapIdentity() {
  initIdentityBridge();

  if (!isNativeContainer()) {
    await applyUserChange(DEFAULT_USER_ID, { reason: "default" });
    return;
  }

  safeStartWebSession(DEFAULT_USER_ID);
  setLocalUserState(DEFAULT_USER_ID);

  await delay(NATIVE_BOOTSTRAP_DEFER_MS);

  if (!nativeUserApplied) {
    await applyUserChange(DEFAULT_USER_ID, {
      reason: "default",
      syncNative: false,
    });
  }
}
