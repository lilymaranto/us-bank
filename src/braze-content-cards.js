const LOCATIONS = {
  inbox: "inbox",
  home: "home",
};

const dismissedCardIds = new Set();
let latestInboxCards = [];
let latestHomeCards = [];
const inboxListeners = new Set();
const homeListeners = new Set();

function getCardLocation(card) {
  return String(card?.extras?.location ?? card?.extras?.Location ?? "").toLowerCase();
}

function filterCardsByLocation(cards = [], location) {
  return cards.filter(
    (card) =>
      getCardLocation(card) === location &&
      !card.dismissed &&
      !dismissedCardIds.has(card.id),
  );
}

function applyCardUpdate(cards = []) {
  latestInboxCards = filterCardsByLocation(cards, LOCATIONS.inbox);
  latestHomeCards = filterCardsByLocation(cards, LOCATIONS.home);
  inboxListeners.forEach((cb) => cb(latestInboxCards));
  homeListeners.forEach((cb) => cb(latestHomeCards));
}

export function onInboxCardsUpdated(callback) {
  inboxListeners.add(callback);
  callback(latestInboxCards);
  return () => inboxListeners.delete(callback);
}

export function onHomeCardsUpdated(callback) {
  homeListeners.add(callback);
  callback(latestHomeCards);
  return () => homeListeners.delete(callback);
}

export function setupContentCardsSubscription(braze) {
  braze.subscribeToContentCardsUpdates((updates) => {
    applyCardUpdate(updates.cards);
  });

  if (typeof braze.getCachedContentCards === "function") {
    const cached = braze.getCachedContentCards();
    if (cached?.cards) {
      applyCardUpdate(cached.cards);
    }
  }
}

export function refreshContentCards(braze) {
  if (typeof braze.requestContentCardsRefresh === "function") {
    braze.requestContentCardsRefresh();
  }
}

export function resetContentCardsState() {
  dismissedCardIds.clear();
  latestInboxCards = [];
  latestHomeCards = [];
  inboxListeners.forEach((cb) => cb(latestInboxCards));
  homeListeners.forEach((cb) => cb(latestHomeCards));
}

export function dismissContentCard(braze, card) {
  if (!card?.id) return;
  dismissedCardIds.add(card.id);
  if (typeof braze.logContentCardDismissal === "function") {
    braze.logContentCardDismissal(card);
  }
  if (typeof braze.getCachedContentCards === "function") {
    const cached = braze.getCachedContentCards();
    applyCardUpdate(cached?.cards ?? []);
  } else {
    latestInboxCards = latestInboxCards.filter((c) => c.id !== card.id);
    latestHomeCards = latestHomeCards.filter((c) => c.id !== card.id);
    inboxListeners.forEach((cb) => cb(latestInboxCards));
    homeListeners.forEach((cb) => cb(latestHomeCards));
  }
}

export function logContentCardClick(braze, card) {
  if (typeof braze.logContentCardClick === "function") {
    braze.logContentCardClick(card);
  }
}

export function logContentCardImpressions(braze, cards) {
  if (cards.length && typeof braze.logContentCardImpressions === "function") {
    braze.logContentCardImpressions(cards);
  }
}

export function getInboxCards() {
  return latestInboxCards;
}

export function getHomeCards() {
  return latestHomeCards;
}
