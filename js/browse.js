// js/browse.js -- the Browse page: search, filters, sort and Load more.

// 1. Find the elements 
const gridArea = document.querySelector("#grid-area");
const loadMoreWrap = document.querySelector("#load-more-wrap");
const loadMoreButton = document.querySelector("#load-more-btn");
const statusText = document.querySelector("#status-text");
const rateNote = document.querySelector("#rate-note");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#browse-search");
const priceSelect = document.querySelector("#price-select");
const ratingSelect = document.querySelector("#rating-select");
const sortSelect = document.querySelector("#sort-select");
const chipButtons = document.querySelectorAll(".chip");

// 2. Things to remember 
const PAGE_SIZE = 12;          // Edit: how many deals each load brings
let allGames = [];             // every game shown so far
let pageNumber = 0;            // which page of results user is on
let selectedStore = STORE_IDS; // "1,7,25" = all stores
let requestNumber = 0;         // used to ignore old, slow answers
let searchTimer;               // used for the 400 ms wait while typing

// 3. States: loading, error, empty 
// showSkeletons: shimmering boxes while loading.
function showSkeletons() {
  let html = '<ul class="game-grid">';
  for (let i = 0; i < 8; i++) {
    html += '<li class="skeleton-card"></li>';
  }
  html += "</ul>";
  gridArea.innerHTML = html;
  statusText.textContent = "Scanning stores...";
}

// showError: error message with a Retry button.
function showError() {
  statusText.textContent = "";
  gridArea.innerHTML = `
    <div class="message-box">
      <p>Search didn't complete. Check your connection, then retry.</p>
      <button class="btn" type="button" id="retry-btn">Retry</button>
    </div>`;
  document.querySelector("#retry-btn").addEventListener("click", function () {
    loadGames(true);
  });
}

// showEmpty: no games matched. The message depends on whether they searched.
function showEmpty() {
  const term = searchInput.value.trim();
  let message = "No deals at these stores. Clear filters to see all stores.";
  if (term !== "") {
    message = "No games found for \"" + escapeHTML(term) + "\". Check the spelling or use fewer words.";
  }
  statusText.textContent = "";
  gridArea.innerHTML = `
    <div class="message-box">
      <p>${message}</p>
      <button class="btn" type="button" id="clear-btn">Clear filters</button>
    </div>`;
  document.querySelector("#clear-btn").addEventListener("click", clearFilters);
}

//  4. Reading the filters 
// readFilters: collects what the person chose into one object.
// The price list is in Rand, so we convert to US dollars for CheapShark.
function readFilters() {
  const range = priceSelect.value.split(",");   // e.g. "100,300" -> ["100","300"]
  const lowerRand = Number(range[0]);
  const upperRand = Number(range[1]);
  return {
    title: searchInput.value.trim(),
    lowerUSD: Math.round((lowerRand / USD_TO_ZAR) * 100) / 100,
    upperUSD: Math.round((upperRand / USD_TO_ZAR) * 100) / 100,
    minScore: Number(ratingSelect.value),
    sortBy: sortSelect.value
  };
}

// clearFilters: puts every filter back to normal and reloads.
function clearFilters() {
  searchInput.value = "";
  priceSelect.value = "0,0";
  ratingSelect.value = "0";
  sortSelect.value = "Savings";
  selectedStore = STORE_IDS;
  chipButtons.forEach(function (chip) {
    chip.setAttribute("aria-pressed", chip.dataset.store === STORE_IDS ? "true" : "false");
  });
  loadGames(true);
}

//  5. Grouping by game 
// addGames: adds new games to allGames. If a game is already there
// (same gameID, different store), we keep only the cheapest deal.

function addGames(newGames) {
  newGames.forEach(function (game) {
    const existing = allGames.find(function (g) {
      return g.gameID === game.gameID;
    });
    if (!existing) {
      allGames.push(game);
    } else if (game.salePriceUSD < existing.salePriceUSD) {
      allGames[allGames.indexOf(existing)] = game;
    }
  });
}

// 6. Showing the cards 
// showGames: draws every game in allGames.
function showGames() {
  if (allGames.length === 0) {
    showEmpty();
    return;
  }
  const cards = allGames.map(makeCardHTML).join("");
  gridArea.innerHTML = '<ul class="game-grid">' + cards + "</ul>";
  fixBrokenImages(gridArea);
  statusText.textContent = "Showing " + allGames.length + " games";

  if (getCurrency() === "ZAR") {
    rateNote.textContent = "Rand prices are estimates at a fixed rate of R" + USD_TO_ZAR +
      " per US$1 (" + RATE_DATE + "). The store's own price may differ.";
  } else {
    rateNote.textContent = "Prices shown in US dollars as listed by the store.";
    setupCardMotion();
  }
}

//  7. Loading from CheapShark 
// loadGames: startOver = true means a fresh search (page 0).
// startOver = false means the Load more button (next page, added to the list).
async function loadGames(startOver) {
  requestNumber = requestNumber + 1;
  const thisRequest = requestNumber;

  if (startOver) {
    pageNumber = 0;
    allGames = [];
    loadMoreWrap.hidden = true;
    showSkeletons();
  } else {
    pageNumber = pageNumber + 1;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading...";
  }

  try {
    const f = readFilters();
    const result = await searchDeals(f.title, selectedStore, f.lowerUSD, f.upperUSD,
                                     f.minScore, f.sortBy, pageNumber, PAGE_SIZE);
    if (thisRequest !== requestNumber) return;   // newer search started, ignore this 
    addGames(result.games);
    showGames();
    loadMoreWrap.hidden = result.rawCount < PAGE_SIZE;   // no more pages left
  } catch (error) {
    console.log("Browse failed:", error);
    if (thisRequest !== requestNumber) return;
    if (startOver) {
      showError();
    } else {
      pageNumber = pageNumber - 1;
      statusText.textContent = "Couldn't load more games. Press Load more to try again.";
    }
  }

  loadMoreButton.disabled = false;
  loadMoreButton.textContent = "Load more";
}

// refreshPrices - main.js calls this when the flag button is pressed.
function refreshPrices() {
  if (allGames.length > 0) {
    showGames();
  }
}

// 8. Listening for the person
// Typing: wait 400 ms after the last key, then search.

searchInput.addEventListener("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function () {
    loadGames(true);
  }, 400);
});

// Pressing Search or Enter: search straight away.
searchForm.addEventListener("submit", function (event) {
  event.preventDefault();   // stops the page reloading
  clearTimeout(searchTimer);
  loadGames(true);
});

// Store chips
chipButtons.forEach(function (chip) {
  chip.addEventListener("click", function () {
    selectedStore = chip.dataset.store;
    chipButtons.forEach(function (other) {
      other.setAttribute("aria-pressed", other === chip ? "true" : "false");
    });
    loadGames(true);
  });
});

// The three drop-downs
priceSelect.addEventListener("change", function () { loadGames(true); });
ratingSelect.addEventListener("change", function () { loadGames(true); });
sortSelect.addEventListener("change", function () { loadGames(true); });

// Load more button
loadMoreButton.addEventListener("click", function () { loadGames(false); });

// 9. Start 
// If the person came from the Home search bar, the address looks like browse.html?q=hades.
// This reads the "q" part and puts it in the search box.

const startWord = new URLSearchParams(window.location.search).get("q");
if (startWord) {
  searchInput.value = startWord;
}
// ---------- The "x" button ----------
// updateClearButton: shows the x only when there is something typed.
const clearSearchButton = document.querySelector("#clear-search");
function updateClearButton() {
  clearSearchButton.hidden = searchInput.value === "";
}
searchInput.addEventListener("input", updateClearButton);

// Pressing the x: empty the box, search again, put the cursor back in the box.
clearSearchButton.addEventListener("click", function () {
  searchInput.value = "";
  updateClearButton();
  clearTimeout(searchTimer);
  loadGames(true);
  searchInput.focus();
});

updateClearButton();
loadGames(true);