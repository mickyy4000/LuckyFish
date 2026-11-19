// js/library.js -the My Library page has three shelves with saved games.

// 1. Find the elements
const shelfArea = document.querySelector("#shelf-area");
const shelfTabs = document.querySelectorAll(".chip");
const storageNote = document.querySelector("#storage-note");
const rateNote = document.querySelector("#rate-note");

let currentShelf = "wishlist";   // which shelf is showing
let drawNumber = 0;              // used to ignore old, slow price answers

// The little icons next to each shelf name.

const SHELF_ICONS = {
  wishlist: "&#9829;&#xFE0E;",
  playing: "&#9654;&#xFE0E;",
  played: "&#10004;&#xFE0E;"
};


// What the empty message says for each shelf. 
const EMPTY_TEXT = {
  wishlist: "Nothing in your Wishlist yet. Add a game from Deals.",
  playing: "Nothing in Playing yet. Move a game here when you start it.",
  played: "Nothing in Played yet. Move a game here when you finish it."
};

//  2. The shelf buttons (with counts) 
// updateTabs- writes "Wishlist (2)" on each tab and marks the current one.


function updateTabs(allGames) {
  shelfTabs.forEach(function (tab) {
    const shelf = tab.dataset.shelf;
    const count = allGames.filter(function (g) { return g.shelf === shelf; }).length;
    tab.innerHTML = '<span class="shelf-icon shelf-icon--' + shelf + '" aria-hidden="true">' + SHELF_ICONS[shelf] + "</span>&nbsp; " + SHELF_NAMES[shelf] + " (" + count + ")";
    tab.setAttribute("aria-pressed", shelf === currentShelf ? "true" : "false");
  });
}

// 3. One row
// makeRowHTML -  builds the HTML for one saved game (icon buttons across from the cover).
function makeRowHTML(game) {
  const title = escapeHTML(game.title);
  const link = "game.html?id=" + game.gameID;

  let shelfButtons = "";
  ["wishlist", "playing", "played"].forEach(function (shelf) {
    const pressed = game.shelf === shelf ? "true" : "false";
    shelfButtons += `<button class="shelf-btn" type="button" data-gameid="${game.gameID}" data-shelf="${shelf}" aria-pressed="${pressed}" title="Move to ${SHELF_NAMES[shelf]}"><span aria-hidden="true">${SHELF_ICONS[shelf]}</span><span class="visually-hidden">${SHELF_NAMES[shelf]}: ${title}</span></button>`;
  });

  return `
    <li class="library-row">
      <img src="${game.thumb}" alt="" loading="lazy">
      <div class="row-main">
        <h3><a href="${link}">${title}</a></h3>
        <p class="row-price" data-gameid="${game.gameID}">Getting price...</p>
      </div>
      <div class="row-actions">
        ${shelfButtons}
        <button class="shelf-btn shelf-btn--remove" type="button" data-gameid="${game.gameID}" data-remove="yes">Remove<span class="visually-hidden">: ${title}</span></button>
      </div>
    </li>`;
}

// 4. Prices (always fetched fresh, never saved) 
// fillPrices: asks CheapShark for each game's price and fills it in.
// One failing does not stop the others (allSettled).

async function fillPrices(list) {
  const thisDraw = drawNumber;
  const answers = await Promise.allSettled(list.map(function (game) {
    return getGame(game.gameID);
  }));
  if (thisDraw !== drawNumber) return;   // the shelf changed, ignore!!!

  answers.forEach(function (answer, index) {
    const game = list[index];
    const spot = shelfArea.querySelector('.row-price[data-gameid="' + game.gameID + '"]');
    if (!spot) return;

    if (answer.status === "rejected") {
      spot.innerHTML = 'Price unavailable right now. <button class="btn btn--small retry-price" type="button">Retry</button>';
      spot.querySelector(".retry-price").addEventListener("click", function () {
        spot.textContent = "Getting price...";
        fillPrices([game]);
      });
      return;
    }

    // Keep offers from our stores, cheapest first
    const offers = (answer.value.deals || []).filter(function (deal) {
      return STORE_NAMES[deal.storeID];
    });
    offers.sort(function (a, b) { return parseFloat(a.price) - parseFloat(b.price); });

    if (offers.length === 0) {
      spot.textContent = "Not listed at Steam, GOG or Epic Games right now.";
      return;
    }
    const best = offers[0];
    const store = storeName(best.storeID);
      spot.innerHTML = `<span class="price-box"><span class="price-strike">${showPriceShort(best.retailPrice)}</span> | ${showPriceShort(best.price)}</span>
      <span class="small-note">(${formatUSD(best.price)} listed)</span>
      <a class="btn btn--small" href="${buyLink(best.dealID)}" target="_blank" rel="noopener noreferrer">Buy at ${store}<span class="visually-hidden"> (opens in new tab)</span></a>`;
  });
}

// 5. Drawing the shelf 
// showShelf: draws the current shelf (rows or the empty message).
// showShelf: draws the current shelf (rows or the empty message with picture).

function showShelf() {
  drawNumber = drawNumber + 1;
  const all = getLibrary();
  updateTabs(all);
  storageNote.hidden = !storageBlocked;

  const list = all.filter(function (game) { return game.shelf === currentShelf; });

  if (list.length === 0) {
    shelfArea.innerHTML = `
      <div class="message-box">
        <img class="empty-art" src="assets/images/empty-library.svg" alt="A fishing line with no catch">
        <p>${EMPTY_TEXT[currentShelf]}</p>
        <a class="btn" href="browse.html">Browse deals</a>
      </div>`;
    rateNote.textContent = "";
    return;
  }

  shelfArea.innerHTML = '<ul class="library-list">' + list.map(makeRowHTML).join("") + "</ul>";

  if (getCurrency() === "ZAR") {
    rateNote.textContent = "Rand prices are estimates at a fixed rate of R" + USD_TO_ZAR +
      " per US$1 (" + RATE_DATE + "). The store's own price may differ.";
  } else {
    rateNote.textContent = "Prices shown in US dollars as listed by the store.";
  }
  fillPrices(list);
}

// refreshPrices-- main.js calls this when the flag button is pressed.
function refreshPrices() {
  showShelf();
}

// 6. Listening for the person 
// Shelf tabs at the top
shelfTabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    currentShelf = tab.dataset.shelf;
    showShelf();
  });
});

// Buttons inside the rows (move to a shelf or remove)

shelfArea.addEventListener("click", function (event) {
  const button = event.target.closest(".shelf-btn");
  if (!button) return;

  const entry = findInLibrary(button.dataset.gameid);
  if (!entry) return;

  if (button.dataset.remove === "yes") {
    // Remove, with Undo
    removeFromLibrary(entry.gameID);
    showShelf();
    showToast("Removed from your library", function () {
      restoreEntry(entry);
      showShelf();
    });
    return;
  }

  // Move to another shelf, with Undo
  const newShelf = button.dataset.shelf;
  const oldShelf = entry.shelf;
  if (newShelf === oldShelf) return;   // already there
  moveToShelf(entry.gameID, newShelf);
  showShelf();
  showToast("Moved to " + SHELF_NAMES[newShelf], function () {
    moveToShelf(entry.gameID, oldShelf);
    showShelf();
  });
});

//  7. Start 
showShelf();