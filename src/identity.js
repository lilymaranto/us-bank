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

const personaByUserId = new Map(
  (personaMap.personas || []).map((persona) => [persona.userId, persona]),
);

let currentUserId = "";
let nativeListenerRegistered = false;
let latestSyncRequest = "";

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

/**
 * Native → web updates (mid-session, reopen, prefer-native).
 * Updates UI immediately, then syncs Braze.
 */
export async function handleNativeUserUpdate(incomingUserId) {
  const trimmed = String(incomingUserId ?? "").trim();
  if (!trimmed) return;
  
  // IMMEDIATELY update UI state
  setLocalUserState(trimmed);
  latestSyncRequest = trimmed;

  try {
    const braze = await switchBrazeUser(trimmed);
    if (latestSyncRequest !== trimmed) return braze; // Guard against concurrent changes
    refreshContentCards(braze);
    return braze;
  } catch (err) {
    console.error("[demo] Failed to switch Braze user on native update", err);
  }
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

  // IMMEDIATELY update UI state
  setLocalUserState(trimmed);
  latestSyncRequest = trimmed;

  if (syncNative) {
    if (reason === "default") {
      safeStartWebSession(trimmed);
    } else {
      safeSyncToNative(trimmed, reason);
    }
  }

  // If a synchronous native bridge callback overrode the UI, bail out before Braze sync
  if (latestSyncRequest !== trimmed) {
    console.info(`[demo] applyUserChange for ${trimmed} preempted by ${latestSyncRequest}`);
    return;
  }

  const braze = await switchBrazeUser(trimmed);
  if (latestSyncRequest !== trimmed) return braze; // Guard against concurrent changes
  refreshContentCards(braze);

  return braze;
}

export function initIdentityBridge() {
  if (nativeListenerRegistered) return;
  nativeListenerRegistered = true;

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
 * Bootstrap: Start session with default, set UI immediately.
 * Native bridge will reply via listenForNative if it has a different user.
 */
export async function bootstrapIdentity() {
  console.info("[demo] Bootstrapping identity. Latest race-condition guard is active.");
  initIdentityBridge();

  // Apply default user. This safely handles synchronous native replies because
  // applyUserChange checks `latestSyncRequest` before syncing Braze.
  await applyUserChange(DEFAULT_USER_ID, { reason: "default" });
}
