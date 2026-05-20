import { loadBrazeSdk } from "./braze-loader.js";
import {
  resetContentCardsState,
  setupContentCardsSubscription,
} from "./braze-content-cards.js";

const BRAZE_API_KEY = "23c3829a-21a9-44fe-9247-dc8c48efa204";
const BRAZE_BASE_URL = "sdk.iad-03.braze.com";

let brazeInitialized = false;

export async function switchBrazeUser(username) {
  const braze = await loadBrazeSdk();
  const userId = username.trim();
  if (!userId) {
    throw new Error("Enter a user ID.");
  }

  if (brazeInitialized) {
    braze.changeUser(userId);
    braze.openSession();
    resetContentCardsState();
    console.info("[demo] Braze user switched to:", userId);
    return braze;
  }

  braze.initialize(BRAZE_API_KEY, {
    baseUrl: BRAZE_BASE_URL,
    enableLogging: import.meta.env.DEV,
    allowUserSuppliedJavascript: true,
  });

  setupContentCardsSubscription(braze);
  braze.automaticallyShowInAppMessages();
  braze.changeUser(userId);
  braze.openSession();

  brazeInitialized = true;
  console.info("[demo] Braze SDK initialized for user:", userId);
  return braze;
}
