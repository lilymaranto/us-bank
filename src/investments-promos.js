import {
  dismissContentCard,
  logContentCardClick,
  logContentCardImpressions,
  onInvestmentsCardsUpdated,
} from "./braze-content-cards.js";
import { loadBrazeSdk } from "./braze-loader.js";

function getPromoTitle(card) {
  return card.title || card.extras?.title || "";
}

function getPromoDescription(card) {
  return card.description || card.cardDescription || "";
}

function getPromoUrl(card) {
  return card.url || card.link || card.extras?.url || "#";
}

function createBrazePromo(card, braze) {
  const url = getPromoUrl(card);
  const link = document.createElement("a");
  link.href = url;
  link.className = "investments-promo-card";
  link.rel = "noopener noreferrer";
  if (url.startsWith("http")) {
    link.target = "_blank";
  }

  link.innerHTML = `
    <button type="button" class="investments-promo__close" aria-label="Dismiss">×</button>
    <div class="investments-promo__copy">
      <h2 class="investments-promo__title"></h2>
      <p class="investments-promo__text"></p>
    </div>
    <div class="investments-promo__btn-container">
      <span class="investments-promo__btn">Explore Recommendations →</span>
    </div>
  `;

  link.querySelector(".investments-promo__title").textContent = getPromoTitle(card);
  link.querySelector(".investments-promo__text").textContent = getPromoDescription(card);

  link.querySelector(".investments-promo__close")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissContentCard(braze, card);
  });

  link.addEventListener("click", (event) => {
    if (event.target.closest(".investments-promo__close")) return;
    logContentCardClick(braze, card);
    if (!url || url === "#") {
      event.preventDefault();
    }
  });

  return link;
}

function renderInvestmentsCards(investmentsCards) {
  const container = document.getElementById("investments-promo-container");
  if (!container) return;

  loadBrazeSdk().then((braze) => {
    const fragment = document.createDocumentFragment();

    if (investmentsCards.length) {
      logContentCardImpressions(braze, investmentsCards);
    }

    investmentsCards.forEach((card) => {
      fragment.appendChild(createBrazePromo(card, braze));
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}

export function initInvestmentsPromos() {
  onInvestmentsCardsUpdated((cards) => {
    renderInvestmentsCards(cards);
  });
}
