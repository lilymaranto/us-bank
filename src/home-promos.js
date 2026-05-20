import {
  dismissContentCard,
  logContentCardClick,
  logContentCardImpressions,
  onHomeCardsUpdated,
} from "./braze-content-cards.js";
import { loadBrazeSdk } from "./braze-loader.js";

const CASH_PLUS_CARD_IMAGE = "/cash-plus-card.png";
const CARD_QUIZ_IMAGE = "/ards.png";

const STATIC_PROMOS = [
  {
    id: "static-card-quiz",
    title: "Find Your Perfect Card",
    text: "Take a quick quiz to get personalized recommendations",
    variant: "card-art",
    image: CARD_QUIZ_IMAGE,
    customEvent: "card_quiz",
  },
  {
    id: "static-cash-plus",
    tag: "Cash+ card",
    title: "$250 bonus - Limited time offer!",
    text: "Plus earn up to 5% cash back on two categories you choose.",
    variant: "card-art",
    image: CASH_PLUS_CARD_IMAGE,
  },
  {
    id: "static-balance",
    tag: "Balance transfer",
    tagPill: true,
    title: "You're invited: 0% Promotional APR offer.",
    text: "Offer invitation for card ending in 4983.",
    variant: "envelope",
  },
];

function getPromoTag(card) {
  return (
    card.extras?.link_text ||
    card.extras?.linkText ||
    card.extras?.tag ||
    card.extras?.category ||
    "Offer"
  );
}

function getPromoTitle(card) {
  return card.title || card.extras?.title || "";
}

function getPromoDescription(card) {
  return card.description || card.cardDescription || "";
}

function getPromoImage(card) {
  return (
    card.imageUrl ||
    card.image ||
    card.extras?.image ||
    CASH_PLUS_CARD_IMAGE
  );
}

function getPromoUrl(card) {
  return card.url || card.link || card.extras?.url || "#";
}

function createStaticPromo(promo) {
  const article = document.createElement("article");
  article.className = `dashboard-card dashboard-promo${
    promo.variant === "envelope" ? " dashboard-promo--balance" : ""
  }${promo.customEvent ? " dashboard-promo--interactive" : ""}`;
  article.dataset.staticPromo = promo.id;

  const tagClass = promo.tagPill
    ? "dashboard-promo__tag dashboard-promo__tag--pill"
    : "dashboard-promo__tag";

  article.innerHTML = `
    <button type="button" class="dashboard-promo__close" aria-label="Dismiss">×</button>
    <span class="${tagClass}"></span>
    <div class="dashboard-promo__copy">
      <h2 class="dashboard-promo__title"></h2>
      <p class="dashboard-promo__text"></p>
    </div>
  `;

  const tagEl = article.querySelector(".dashboard-promo__tag");
  if (promo.tag) {
    tagEl.textContent = promo.tag;
  } else {
    tagEl.hidden = true;
  }
  article.querySelector(".dashboard-promo__title").textContent = promo.title;
  article.querySelector(".dashboard-promo__text").textContent = promo.text;

  if (promo.variant === "gradient-card") {
    const art = document.createElement("div");
    art.className = "dashboard-promo__card-art";
    art.setAttribute("aria-hidden", "true");
    article.appendChild(art);
  } else if (promo.variant === "card-art" && promo.image) {
    const img = document.createElement("img");
    img.className =
      promo.image === CARD_QUIZ_IMAGE
        ? "dashboard-promo__image dashboard-promo__image--quiz"
        : "dashboard-promo__image";
    img.src = promo.image;
    img.alt = promo.title;
    article.appendChild(img);
  } else if (promo.variant === "envelope") {
    const envelope = document.createElement("div");
    envelope.className = "dashboard-promo__envelope";
    envelope.setAttribute("aria-hidden", "true");
    envelope.innerHTML = '<span class="dashboard-promo__envelope-letter"></span>';
    article.appendChild(envelope);
  }

  article.querySelector(".dashboard-promo__close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    article.remove();
  });

  if (promo.customEvent) {
    article.addEventListener("click", async (event) => {
      if (event.target.closest(".dashboard-promo__close")) return;
      const braze = await loadBrazeSdk();
      if (typeof braze.logCustomEvent === "function") {
        braze.logCustomEvent(promo.customEvent);
      }
    });
  }

  return article;
}

function createBrazePromo(card, braze) {
  const url = getPromoUrl(card);
  const link = document.createElement("a");
  link.href = url;
  link.className = "dashboard-card dashboard-promo dashboard-promo--braze";
  link.rel = "noopener noreferrer";
  if (url.startsWith("http")) {
    link.target = "_blank";
  }

  const imageUrl = getPromoImage(card);

  link.innerHTML = `
    <button type="button" class="dashboard-promo__close" aria-label="Dismiss">×</button>
    <span class="dashboard-promo__tag"></span>
    <div class="dashboard-promo__copy">
      <h2 class="dashboard-promo__title"></h2>
      <p class="dashboard-promo__text"></p>
    </div>
    <img class="dashboard-promo__image" src="" alt="" />
  `;

  link.querySelector(".dashboard-promo__tag").textContent = getPromoTag(card);
  link.querySelector(".dashboard-promo__title").textContent = getPromoTitle(card);
  link.querySelector(".dashboard-promo__text").textContent = getPromoDescription(card);

  const img = link.querySelector(".dashboard-promo__image");
  img.src = imageUrl;
  img.alt = getPromoTitle(card);

  link.querySelector(".dashboard-promo__close")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissContentCard(braze, card);
  });

  link.addEventListener("click", (event) => {
    if (event.target.closest(".dashboard-promo__close")) return;
    logContentCardClick(braze, card);
    if (!url || url === "#") {
      event.preventDefault();
    }
  });

  return link;
}

function renderHomeCarousel(homeCards) {
  const carousel = document.getElementById("dashboard-promo-carousel");
  if (!carousel) return;

  loadBrazeSdk().then((braze) => {
    const fragment = document.createDocumentFragment();

    if (homeCards.length) {
      logContentCardImpressions(braze, homeCards);
    }

    homeCards.forEach((card) => {
      fragment.appendChild(createBrazePromo(card, braze));
    });

    STATIC_PROMOS.forEach((promo) => {
      fragment.appendChild(createStaticPromo(promo));
    });

    carousel.innerHTML = "";
    carousel.appendChild(fragment);
  });
}

export function initHomePromos() {
  onHomeCardsUpdated((cards) => {
    renderHomeCarousel(cards);
  });
}
