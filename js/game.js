// js/game.js - the Game Detail page.
// The address looks like game.html?id=123. Read the 123 and load that game.

//1. Find the elements
const titleHeading = document.querySelector("#game-title");
const gameMeta = document.querySelector("#game-meta");
const coverArea = document.querySelector("#cover-area");
const detailTag = document.querySelector("#detail-tag");
const detailBadge = document.querySelector("#detail-badge");
const descArea = document.querySelector("#desc-area");
const lowestArea = document.querySelector("#lowest-area");
const scoreArea = document.querySelector("#score-area");
const offersArea = document.querySelector("#offers-area");
const galleryArea = document.querySelector("#gallery-area");
const rateNote = document.querySelector("#rate-note");

const gameID = new URLSearchParams(window.location.search).get("id");

// Things to remember
let lastData = null;        // CheapShark answer
let rawgInfo = null;        // RAWG answer
let dealScores = null;      // CheapShark scores (Steam rating)
let scoresRequested = false;
let gameTitle = "";

// 2. Dates 
// niceDate: CheapShark gives dates as seconds. 1700000000 -> "14 November 2023"
function niceDate(seconds) {
  return new Date(seconds * 1000).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

//  3. Cover picture 
// showCover: portrait picture. If it fails, the landscape one, then a title tile.
function showCover() {
  const info = lastData.info;
  const url = coverURL(info.steamAppID, info.thumb);
  coverArea.innerHTML = '<img src="' + url + '" data-fallback="' + info.thumb + '" alt="Cover art for ' + cleanText(gameTitle) + '">';
  fixBrokenImages(coverArea);
}

//  4. Prices 
// showPriceError: "Price unavailable" with Retry. The rest of the page still works.
function showPriceError() {
  detailTag.hidden = true;
  detailBadge.hidden = true;
  lowestArea.innerHTML = "";
  offersArea.innerHTML = `
    <div class="message-box">
      <p>Price unavailable right now.</p>
      <button class="btn" type="button" id="price-retry">Retry</button>
    </div>`;
  document.querySelector("#price-retry").addEventListener("click", loadPrice);
}

// showRateNote: the estimate note at the bottom.
function showRateNote() {
  if (getCurrency() === "ZAR") {
    rateNote.textContent = "Rand prices are estimates at a fixed rate of R" + USD_TO_ZAR +
      " per US$1 (" + RATE_DATE + "). The store's own price may differ.";
  } else {
    rateNote.textContent = "Prices shown in US dollars as listed by the store.";
  }
}

// showPrices - draws the lowest price, the tag, the price badge and the Buy buttons.

function showPrices(data) {
  const offers = data.deals.filter(function (deal) {
    return STORE_NAMES[deal.storeID];
  });
  offers.sort(function (a, b) {
    return parseFloat(a.price) - parseFloat(b.price);
  });

  // Lowest price ever seen ( under the description)
  const lowest = data.cheapestPriceEver;
  lowestArea.innerHTML = lowest
    ? `<p><strong>Lowest price seen (any tracked store):</strong> ${showPrice(lowest.price)} (${formatUSD(lowest.price)} listed) on ${niceDate(lowest.date)}</p>`
    : "";

  showRateNote();
  showScores();

  if (offers.length === 0) {
    detailTag.hidden = true;
    detailBadge.hidden = true;
    offersArea.innerHTML = '<p class="small-note">Not listed at Steam, GOG or Epic Games right now.</p>';
    return;
  }

  const best = offers[0];
  const savings = Math.round(parseFloat(best.savings));

  // Fish tag and price badge on the cover
  detailTag.innerHTML = '<span class="tag-text">-' + savings + '%</span>';
  detailTag.setAttribute("aria-label", savings + " percent off");
  detailTag.hidden = false;
  detailBadge.innerHTML = '<span class="price-old">' + showPriceShort(best.retailPrice) + '</span> <span class="price-now">' + showPriceShort(best.price) + "</span>";
  detailBadge.hidden = false;

  // One Buy button per store, with its own price underneath
  const buttons = offers.map(function (deal) {
    const store = storeName(deal.storeID);
    return `
      <div class="buy-item">
        <a class="btn" href="${buyLink(deal.dealID)}" target="_blank" rel="noopener noreferrer">Buy at ${store}<span class="visually-hidden"> (opens in new tab)</span></a>
        <span class="buy-price">${showPriceShort(deal.price)}</span>
        <span class="small-note">${formatUSD(deal.price)} listed</span>
      </div>`;
  }).join("");

  const saved = isWishlisted(gameID);
  const heart = `
    <div class="buy-item">
      <button class="heart-btn heart-btn--wide" type="button" id="detail-heart" data-gameid="${gameID}" data-title="${cleanText(gameTitle)}" data-thumb="${data.info.thumb}" aria-pressed="${saved}">${saved ? "&#9829;" : "&#9825;"} Wishlist</button>
    </div>`;

  let oneStoreNote = "";
  if (offers.length === 1) {
    oneStoreNote = '<p class="small-note">Only listed at one store right now.</p>';
  }

  offersArea.innerHTML = '<div class="buy-list">' + heart + buttons + "</div>" + oneStoreNote;

  // Steam rating comes from the best deal (asked for once)
  loadScores(best.dealID);
}

// loadPrice- gets the game from CheapShark. Everything else waits for the title.
async function loadPrice() {
  if (!gameID) {
    titleHeading.textContent = "No game chosen";
    coverArea.innerHTML = "";
    offersArea.innerHTML = '<div class="message-box"><p>Pick a game from Browse first.</p><a class="btn" href="browse.html">Browse all games</a></div>';
    return;
  }

  offersArea.innerHTML = '<div class="skeleton-card"></div>';
  try {
    const data = await getGame(gameID);
    if (!data || !data.info || !data.deals) {
      throw new Error("Game data was missing");
    }
    lastData = data;
    gameTitle = data.info.title;

    titleHeading.textContent = gameTitle;
    document.title = "Lucky Fish | " + gameTitle;
    showCover();
    showPrices(data);

    // Only load the extra info once (it does not depend on prices)
    if (descArea.innerHTML === "") {
      loadInfo();
    }
  } catch (error) {
    console.log("Price failed:", error);
    showPriceError();
  }
}

// 5. Scores (three figures, out of 5) 
// loadScores: asks CheapShark for the Steam rating. If it fails show N/A.

async function loadScores(dealID) {
  if (scoresRequested) return;
  scoresRequested = true;
  try {
    dealScores = await getDealInfo(dealID);
  } catch (error) {
    dealScores = null;
  }
  showScores();
}

// scoreHTML: one figure with its logo and name underneath.
function scoreHTML(number, name, logoFile) {
  return `<div class="score"><span class="score-number">${number}</span><img src="assets/images/${logoFile}" alt=""><span class="score-name">${name}</span></div>`;
}

// showScores: Metacritic (out of 100), Steam (percent) and RAWG (out of 5) -- all shown out of 5.
function showScores() {
  let metacritic = "N/A";
  let steam = "N/A";
  let rawg = "N/A";
  if (rawgInfo && rawgInfo.metacritic > 0) metacritic = (rawgInfo.metacritic / 20).toFixed(1);
  if (dealScores && Number(dealScores.steamRatingPercent) > 0) steam = (Number(dealScores.steamRatingPercent) / 20).toFixed(1);
  if (rawgInfo && rawgInfo.rating > 0) rawg = rawgInfo.rating.toFixed(1);

  scoreArea.innerHTML = '<div class="score-row" role="group" aria-label="Scores out of 5">' +
    scoreHTML(metacritic, "Metacritic", "logo-metacritic.svg") +
    scoreHTML(steam, "Steam", "logo-steam.svg") +
    scoreHTML(rawg, "RAWG", "logo-rawg.svg") + "</div>";
}

// 6. RAWG info (description + screenshots)
// showInfoNote: "More info unavailable" (with Retry if RAWG failed).

function showInfoNote(withRetry) {
  let html = '<p class="small-note">More info unavailable.</p>';
  if (withRetry) {
    html += '<button class="btn btn--small" type="button" id="info-retry">Retry</button>';
  }
  descArea.innerHTML = html;
  galleryArea.innerHTML = "";
  if (withRetry) {
    document.querySelector("#info-retry").addEventListener("click", loadInfo);
  }
}

// showInfo-- release date and genres under the title, description, screenshots.
function showInfo(info) {
  let description = info.description;
  if (description.length > 700) {
    description = description.slice(0, 700) + "...";
  }

  const bits = [];
  if (info.released) bits.push("Released " + info.released);
  if (info.genres.length > 0) bits.push(info.genres.join(", "));
  gameMeta.textContent = bits.join(" | ");

  descArea.innerHTML = "<p>" + (escapeHTML(description) || "No description available.") + "</p>";

  if (info.screenshots.length > 0) {
    const shots = info.screenshots.slice(0, 4).map(function (url, index) {
      return '<li><img src="' + url + '" alt="Screenshot ' + (index + 1) + " of " + cleanText(gameTitle) + '" loading="lazy"></li>';
    }).join("");
    galleryArea.innerHTML = '<h2>Screenshots</h2><ul class="gallery">' + shots + "</ul>";
    galleryArea.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () { img.parentElement.remove(); });
    });
  } else {
    galleryArea.innerHTML = "";
  }
}

// loadInfo: asks RAWG. If it fails, prices stay on the page.
async function loadInfo() {
  descArea.innerHTML = '<div class="skeleton-card"></div>';
  try {
    rawgInfo = await getRawgInfo(gameTitle);
    if (!rawgInfo) {
      showInfoNote(false);
    } else {
      showInfo(rawgInfo);
    }
  } catch (error) {
    console.log("RAWG failed:", error);
    rawgInfo = null;
    showInfoNote(true);
  }
  showScores();
}

// 7. Flag button 
// refreshPrices  main.js calls this when the flag button is pressed.
function refreshPrices() {
  if (lastData) {
    showPrices(lastData);
  }
}

// 8. Start 
loadPrice();