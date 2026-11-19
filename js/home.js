// js/home.js- the Home page: loads the top 4 deals and shows them as cards.

// The box on the page where the deals go 
const dealsArea = document.querySelector("#deals-area");
const rateNote = document.querySelector("#rate-note");


let currentGames = [];

// showSkeletons: grey shimmering boxes while the deals load.
// Edit ... change 4 to show more or fewer boxes.

function showSkeletons() {
  let html = '<ul class="game-grid">';
  for (let i = 0; i < 4; i++) {
    html += '<li class="skeleton-card"></li>';
  }
  html += "</ul>";
  dealsArea.innerHTML = html;
}

// showError - the error message with a Retry button.
function showError() {
  dealsArea.innerHTML = `
    <div class="message-box">
      <p>Couldn't load deals. Check your connection, then retry.</p>
      <button class="btn" type="button" id="retry-btn">Retry</button>
    </div>`;
  document.querySelector("#retry-btn").addEventListener("click", loadDeals);
}

// showEmpty - shown when CheapShark answers but there are no deals.
function showEmpty() {
  dealsArea.innerHTML = `
    <div class="message-box">
      <p>No deals right now. Try again later or browse all games.</p>
      <a class="btn" href="browse.html">Browse all games</a>
    </div>`;
}

// showDeals - puts all the cards on the page. Also fixes broken images.
function showDeals(games) {
  if (games.length === 0) {
    showEmpty();
    return;
  }

  // map turns each game into card HTML, join glues them into one string
  const cards = games.map(makeCardHTML).join("");
  dealsArea.innerHTML = '<ul class="game-grid">' + cards + "</ul>";

  // If a picture fails to load, swap it for a tile with the game title.
  dealsArea.querySelectorAll(".card-cover img").forEach(function (img) {
    img.addEventListener("error", function () {
      const tile = document.createElement("div");
      tile.className = "placeholder-tile";
      tile.textContent = img.alt.replace("Cover of ", "");
      img.replaceWith(tile);
    });
  });

  // The estimate note under the cards (only when showing Rand)
  if (getCurrency() === "ZAR") {
    rateNote.textContent = "Rand prices are estimates at a fixed rate of R" + USD_TO_ZAR +
      " per US$1 (" + RATE_DATE + "). The store's own price may differ.";
  } else {
    rateNote.textContent = "Prices shown in US dollars as listed by the store.";
    setupCardMotion();
  }
}

// loadDeals: gets the top 4 deals, then shows them.
// Edit-  change the 4 to show a different number of deals.
async function loadDeals() {
  showSkeletons();
  try {
    currentGames = await getTopRatedDeals(4);
    showDeals(currentGames);
  } catch (error) {
    console.log("Deals failed:", error);
    showError();
  }
}

// refreshPrices- main.js calls this when the flag button is pressed.
function refreshPrices() {
  if (currentGames.length > 0) {
    showDeals(currentGames);
  }
}

// Start when the page opens
loadDeals();

//  Replay button ( TEST )
// Clears the "already played" note and reloads the page, so the hero fish swim again.

const replayButton = document.querySelector("#replay-btn");
if (replayButton) {
  replayButton.addEventListener("click", function () {
    try {
      sessionStorage.removeItem("luckyfish.heroPlayed");
    } catch (error) {
      // storage blocked: reloading still works
    }
    window.location.reload();
  });
}