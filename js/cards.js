// js/cards.js - card code shared by Home and Browse.

// cleanText - makes a title safe to put inside an attribute like alt="..."
function cleanText(text) {
  return String(text).replace(/"/g, "&quot;");
}

// escapeHTML - makes text typed by the person safe to show on the page.
function escapeHTML(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// coverURL- Steam's PORTRAIT cover for a game. If we have no Steam number, use the small landscape picture.
// Edit: this is where the portrait pictures come from.

function coverURL(steamAppID, thumb) {
  if (steamAppID && steamAppID !== "0") {
    return "https://cdn.akamai.steamstatic.com/steam/apps/" + steamAppID + "/library_600x900.jpg";
  }
  return thumb;
}

// makeCardHTML- builds the HTML for ONE game card (Home AND Browse).
// Order- cover, title, price strip, "listed" line, Buy button + heart.
// Edit here to change what a card shows.

function makeCardHTML(game) {
  const store = storeName(game.storeID);
  const title = cleanText(game.title);
  const detailLink = "game.html?id=" + game.gameID;
  const saved = isWishlisted(game.gameID);
  const cover = coverURL(game.steamAppID, game.thumb);

  return `
    <li class="game-card">
      <div class="card-cover">
        <a href="${detailLink}" tabindex="-1" aria-hidden="true">
          <img src="${cover}" data-fallback="${game.thumb}" alt="Cover of ${title}" loading="lazy">
        </a>
        <span class="discount-tag" aria-label="${game.savingsPct} percent off"><span class="tag-text">-${game.savingsPct}%</span></span>
      </div>
      <h3><a href="${detailLink}">${game.title}</a></h3>
      <p class="price-strip">
        <span class="visually-hidden">Was </span><span class="price-strip-old">${showPriceShort(game.normalPriceUSD)}</span>
        <span class="price-strip-divider" aria-hidden="true">|</span>
        <span class="visually-hidden">now </span><span class="price-strip-now">${showPriceShort(game.salePriceUSD)}</span>
      </p>
      <p class="price-listed">${formatUSD(game.salePriceUSD)} listed</p>
      <div class="card-actions">
        <a class="btn btn--small" href="${buyLink(game.dealID)}" target="_blank" rel="noopener noreferrer">Buy at ${store}<span class="visually-hidden"> (opens in new tab)</span></a>
        <button class="heart-btn" type="button" data-gameid="${game.gameID}" data-title="${title}" data-thumb="${game.thumb}"
                aria-pressed="${saved}" aria-label="Wishlist: ${title}">${saved ? "&#9829;" : "&#9825;"}</button>
      </div>
    </li>`;
}

// fixBrokenImages: if the portrait picture fails, try the landscape one.
// If that fails too, swap in a tile with the game title.

function fixBrokenImages(container) {
  container.querySelectorAll("img[data-fallback]").forEach(function (img) {
    img.addEventListener("error", function () {
      if (!img.dataset.tried && img.dataset.fallback) {
        img.dataset.tried = "yes";
        img.src = img.dataset.fallback;
        return;
      }
      const tile = document.createElement("div");
      tile.className = "placeholder-tile";
      tile.textContent = img.alt.replace("Cover of ", "").replace("Cover art for ", "");
      img.replaceWith(tile);
    });
  });
}