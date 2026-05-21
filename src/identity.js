import personaMap from "../solcon-starter/persona-map.json";
import {
  listenForNative,
  setUser as syncUserToNative,
  startWebSession,
} from "../solcon-starter/demo_bridge_entry.js";
import { loadBrazeSdk } from "./braze-loader.js";
import { refreshContentCards } from "./braze-content-cards.js";
import { switchBrazeUser } from "./braze-session.js";

export const CONFIG_ID = "us-bank";
export const DEFAULT_USER_ID =
  personaMap.defaultUserId || personaMap.personas?.[0]?.userId || "us1";

/** How long to wait for nativeUserUpdate before falling back to default (WebView). */
const NATIVE_USER_WAIT_MS = 3000;
const NATIVE_USER_POLL_MS = 50;

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

/** UI-only identity (welcome, menu) — flex-driver setDriverData equivalent. */
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

async function syncBrazeForUser(userId) {
  const trimmed = String(userId ?? "").trim();
  if (!trimmed) return null;
  const braze = await switchBrazeUser(trimmed);
  refreshContentCards(braze);
  return braze;
}

async function waitForNativeUser(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (nativeUserApplied && currentUserId) {
      return currentUserId;
    }
    await delay(NATIVE_USER_POLL_MS);
  }
  return nativeUserApplied && currentUserId ? currentUserId : null;
}

/**
 * Native → web: update UI immediately from incomingUserId, then Braze (flex pattern).
 */
export function handleNativeUserUpdate(incomingUserId) {
  const trimmed = String(incomingUserId ?? "").trim();
  if (!trimmed) return;
  nativeUserApplied = true;
  setLocalUserState(trimmed);
  syncBrazeForUser(trimmed).catch((error) => {
    console.error("[demo] Native Braze sync failed:", error);
  });
}

/**
 * Web-initiated identity: UI first, then bridge + Braze.
 */
export async function applyUserChange(userId, options = {}) {
  const { reason = "manual", syncNative = true } = options;
  const trimmed = String(userId ?? "").trim();
  if (!trimmed) {
    throw new Error("Enter a user ID.");
  }

  setLocalUserState(trimmed);

  if (syncNative) {
    if (reason === "default") {
      safeStartWebSession(trimmed);
    } else {
      safeSyncToNative(trimmed, reason);
    }
  }

  return syncBrazeForUser(trimmed);
}

export function initIdentityBridge() {
  if (nativeListenerRegistered) return;
  nativeListenerRegistered = true;
  nativeUserApplied = false;

  try {
    listenForNative((incomingUserId) => {
      handleNativeUserUpdate(incomingUserId);
    });
  } catch (error) {
    console.warn("[demo] listenForNative failed — DemoBridge missing?", error);
  }
}

/**
 * Bootstrap: browser uses full default login; WebView handshake only + wait for native id.
 */
export async function bootstrapIdentity() {
  initIdentityBridge();

  if (!isNativeContainer()) {
    await applyUserChange(DEFAULT_USER_ID, { reason: "default" });
    return;
  }

  loadBrazeSdk().catch((error) => {
    console.warn("[demo] Early Braze preload failed:", error);
  });

  safeStartWebSession(DEFAULT_USER_ID);

  const nativeUser = await waitForNativeUser(NATIVE_USER_WAIT_MS);
  if (nativeUser) {
    console.info("[demo] Identity from native:", nativeUser);
    return;
  }

  console.info("[demo] No native user within timeout; applying default:", DEFAULT_USER_ID);
  await applyUserChange(DEFAULT_USER_ID, {
    reason: "default",
    syncNative: false,
  });
}
