// Centralized identity sync entrypoint for SolCon builds.
// Callers import { startWebSession, setUser, listenForNative } from this file.
// Do not call DemoBridge.* elsewhere; keep changeUser routing single-threaded.

const ensureBridge = () => {
  if (!window.DemoBridge) {
    throw new Error("DemoBridge missing: ensure demo_bridge_utility.js is injected");
  }
};

let currentConfigId = null;

export function startWebSession({ userId, configId }) {
  ensureBridge();
  currentConfigId = configId;
  window.DemoBridge.startSession({ userId, configId, reason: "default" });
}

export function setUser(userId, reason = "manual") {
  ensureBridge();
  if (!userId) return;
  if (currentConfigId) window.DemoBridge.setConfigId(currentConfigId);
  window.DemoBridge.startSession({ userId, configId: currentConfigId, reason });
}

export function listenForNative(changeUserFn) {
  ensureBridge();
  if (typeof changeUserFn !== "function") {
    throw new Error("listenForNative requires changeUserFn(userId)");
  }
  window.DemoBridge.initNativeListener((incomingUserId, detail) => {
    if (!incomingUserId) return;
    changeUserFn(incomingUserId, detail);
  });
}
