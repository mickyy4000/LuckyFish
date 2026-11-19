// js/api.js - Cheapshark.

// 1. Fetch helper 
// fetchJSON - gets data from a web address. Gives up after 8 seconds.
// If it fails, it waits 2 seconds and tries one more time (from PRD).

async function fetchJSON(url, tryAgain = true) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();   // cancels the request
  }, 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error("Server answered with status " + response.status);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timer);
    if (tryAgain) {
      // wait 2 seconds, then try once more
      await new Promise(function (done) { setTimeout(done, 2000); });
      return fetchJSON(url, false);
    }
    throw error;   // the page that called us shows the error message
  }
}

// Saving answers for a while (cache) ----------

function getCached(key, minutes) {
  try {
    const saved = sessionStorage.getItem("luckyfish." + key);
    if (!saved) return null;
    const item = JSON.parse(saved);
    const ageInMinutes = (Date.now() - item.time) / 60000;
    if (ageInMinutes > minutes) return null;
    return item.data;
  } catch (error) {
    return null;   // storage blocked
  }
}

// setCached - saves an answer with the current time.
function setCached(key, data) {
  try {
    sessionStorage.setItem("luckyfish." + key, JSON.stringify({ time: Date.now(), data: data }));
  } catch (error) {
    // storage blocked or full
  }
}

// 3. Prices 
// formatUSD - 15.99 -> "US$15.99"

function formatUSD(usd) {
  return "US$" + Number(usd).toFixed(2);
}

// formatZAR: 15.99 -> "approx. R262" (uses the fixed rate in config.js)

function formatZAR(usd) {
  return "approx. R" + Math.round(Number(usd) * USD_TO_ZAR);
}

// showPrice: gives the price text for whichever currency the flag button chose.
// getCurrency() lives in main.js.

function showPrice(usd) {
  if (getCurrency() === "USD") {
    return formatUSD(usd);
  }
  return formatZAR(usd);
}

//4. Tidy up CheapShark data 
// makeGame: turns one deal from CheapShark into simple object,
// every page reads prices the same way.

function makeGame(deal) {
  return {
    gameID: deal.gameID,
    steamAppID: deal.steamAppID,
    title: deal.title,
    thumb: deal.thumb,
    salePriceUSD: parseFloat(deal.salePrice),
    normalPriceUSD: parseFloat(deal.normalPrice),
    savingsPct: Math.round(parseFloat(deal.savings)),
    storeID: deal.storeID,
    dealID: deal.dealID,
    metacritic: deal.metacriticScore,
    steamRating: deal.steamRatingPercent
  };
}

// isGoodDeal - true if the deal has the basics we need. Bad ones get skipped.
function isGoodDeal(deal) {
  return deal && deal.title && deal.dealID && !isNaN(parseFloat(deal.salePrice));
}

// 5. CheapShark functions 
// getDeals - the deals list (Home and Browse).
// pageSize = how many deals, pageNumber = which page (starts at 0),
// storeIDs = which stores (default: our three).
// Returns a list of game objects. Saved for 10 minutes.

async function getDeals(pageSize = 8, pageNumber = 0, storeIDs = STORE_IDS) {
  const key = "deals-" + pageSize + "-" + pageNumber + "-" + storeIDs;
  const saved = getCached(key, 10);
  if (saved) return saved;

  const url = CHEAPSHARK_API + "/deals?sortBy=Savings&pageSize=" + pageSize +
              "&pageNumber=" + pageNumber + "&storeID=" + storeIDs;
  const data = await fetchJSON(url);
  const games = data.filter(isGoodDeal).map(makeGame);
  setCached(key, games);
  return games;
}

// getStores - list of all stores.
async function getStores() {
  try {
    const saved = JSON.parse(localStorage.getItem("luckyfish.stores"));
    if (saved && Date.now() - saved.time < 24 * 60 * 60 * 1000) {
      return saved.data;
    }
  } catch (error) {
    // storage blocked - carry on and fetch
  }
  const data = await fetchJSON(CHEAPSHARK_API + "/stores");
  try {
    localStorage.setItem("luckyfish.stores", JSON.stringify({ time: Date.now(), data: data }));
  } catch (error) {
    // skip saving
  }
  return data;
}

// searchGames - search by title (Browse page). Saved for 10 minutes.
async function searchGames(title, limit = 20) {
  const key = "search-" + title.toLowerCase() + "-" + limit;
  const saved = getCached(key, 10);
  if (saved) return saved;

  const url = CHEAPSHARK_API + "/games?title=" + encodeURIComponent(title) + "&limit=" + limit;
  const data = await fetchJSON(url);
  setCached(key, data);
  return data;
}

// getGame - everything about one game (Game Detail page).
// info, cheapestPriceEver (price, date), deals (one per store).
async function getGame(gameID) {
  const key = "game-" + gameID;
  const saved = getCached(key, 10);
  if (saved) return saved;

  const data = await fetchJSON(CHEAPSHARK_API + "/games?id=" + gameID);
  setCached(key, data);
  return data;
}

// buyLink - the address for a Buy button.
function buyLink(dealID) {
  return CHEAPSHARK_REDIRECT + dealID;
}

// storeName: turns a store number into a name, e.g. "1" -> "Steam".
function storeName(storeID) {
  return STORE_NAMES[storeID] || "Store";
}

// 7. Browse search
// searchDeals - the deals list with filters (Browse page).
// title - words typed (can be empty), storeIDs = e.g. "1,7,25",
// lowerUSD / upperUSD - price range in US dollars (0 = no limit),
// minScore - minimum Metacritic score (0 = any), sortBy = "Savings", "Price", "Title" or "Metacritic".
// Returns { games: [...], rawCount: how many deals CheapShark sent }. Saved for 10 minutes?

async function searchDeals(title, storeIDs, lowerUSD, upperUSD, minScore, sortBy, pageNumber, pageSize) {
  let url = CHEAPSHARK_API + "/deals?sortBy=" + sortBy +
            "&pageSize=" + pageSize + "&pageNumber=" + pageNumber +
            "&storeID=" + storeIDs;

  if (title) { url += "&title=" + encodeURIComponent(title); }
  if (lowerUSD > 0) { url += "&lowerPrice=" + lowerUSD; }
  if (upperUSD > 0) { url += "&upperPrice=" + upperUSD; }
  if (minScore > 0) { url += "&metacritic=" + minScore; }

  const saved = getCached(url, 10);
  if (saved) return saved;

  const data = await fetchJSON(url);
  const result = {
    games: data.filter(isGoodDeal).map(makeGame),
    rawCount: data.length
  };
  setCached(url, result);
  return result;
}

// 8. RAWG (extra game info) 
// getRawgInfo: finds the game on RAWG by title, then gets its details and screenshots.
// Returns one simple object, or null if RAWG has no match. Saved for 10 minutes.
// Edit- change the 4 screenshot limit in game.js, not here.

async function getRawgInfo(title) {
  const key = "rawg-" + title.toLowerCase();
  const saved = getCached(key, 10);
  if (saved) return saved;

  // Step A: find the game's RAWG id
  const search = await fetchJSON(RAWG_API + "/games?key=" + RAWG_KEY +
                                 "&search=" + encodeURIComponent(title) + "&page_size=1");
  if (!search.results || search.results.length === 0) {
    return null;   // no match
  }
  const id = search.results[0].id;

  // Step B- get details and screenshots at the same time.
  // allSettled means one failing does not stop the other.

  const answers = await Promise.allSettled([
    fetchJSON(RAWG_API + "/games/" + id + "?key=" + RAWG_KEY),
    fetchJSON(RAWG_API + "/games/" + id + "/screenshots?key=" + RAWG_KEY)
  ]);
  const detail = answers[0].status === "fulfilled" ? answers[0].value : null;
  const shots = answers[1].status === "fulfilled" ? answers[1].value : null;

  if (!detail) {
    throw new Error("RAWG details failed");
  }

  const info = {
    description: detail.description_raw || "",
    metacritic: detail.metacritic || 0,        // out of 100
    rating: detail.rating || 0,                // already out of 5
    released: detail.released || "",
    genres: (detail.genres || []).map(function (g) { return g.name; }),
    image: detail.background_image || "",
    screenshots: shots && shots.results ? shots.results.map(function (s) { return s.image; }) : []
  };
  setCached(key, info);
  return info;
}

// 9. Extra helpers .1
// showPriceShort: price WITHOUT the word "approx." (used on cards). 15.99 -> "R262" or "US$15.99"

function showPriceShort(usd) {
  if (getCurrency() === "USD") {
    return formatUSD(usd);
  }
  return "R" + Math.round(Number(usd) * USD_TO_ZAR);
}

// getDealInfo: extra scores for one deal (Steam rating). Used on Game Detail.
async function getDealInfo(dealID) {
  const key = "dealinfo-" + dealID;
  const saved = getCached(key, 10);
  if (saved) return saved;

  const data = await fetchJSON(CHEAPSHARK_API + "/deals?id=" + dealID);
  const info = data.gameInfo || {};
  setCached(key, info);
  return info;
}

// 10. Top rated deals (Home page)
// getTopRatedDeals: the highest Metacritic scored games that are on sale right now.
// We ask for 30 deals, skip repeats of the same game, and keep the first `count`.
// Edit- change 4 to show a different number.

async function getTopRatedDeals(count = 4) {
  const key = "toprated-" + count;
  const saved = getCached(key, 10);
  if (saved) return saved;

  const url = CHEAPSHARK_API + "/deals?sortBy=Metacritic&desc=1&onSale=1&pageSize=30&storeID=" + STORE_IDS;
  const data = await fetchJSON(url);

  const seen = [];
  const games = [];
  data.filter(isGoodDeal).forEach(function (deal) {
    if (games.length >= count) return;          // enoigh
    if (seen.includes(deal.gameID)) return;     // same game from another store, skip
    seen.push(deal.gameID);
    games.push(makeGame(deal));
  });

  setCached(key, games);
  return games;
}
