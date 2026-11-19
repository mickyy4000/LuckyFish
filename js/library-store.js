// js/library-store.js - saving games to the library. Used by EVERY page with a heart.
// The library is a list of: { gameID, title, thumb, shelf, dateAdded }
// shelf is "wishlist", "playing" or "played".

// The names shown to the person.
const SHELF_NAMES = {
  wishlist: "Wishlist",
  playing: "Playing",
  played: "Played"
};

// If the browser blocks saving, we keep the list here until the tab closes.
let memoryLibrary = [];
let storageBlocked = false;

//1. Reading and savin
// getLibrary: returns the saved list (an empty list if nothing is saved).

function getLibrary() {
  try {
    const saved = localStorage.getItem("luckyfish.library");
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) return list;
    }
    return [];
  } catch (error) {
    storageBlocked = true;   // storage is blocked: use the temporary list
    return memoryLibrary;
  }
}

// saveLibrary: saves the whole list.
function saveLibrary(list) {
  memoryLibrary = list;
  try {
    localStorage.setItem("luckyfish.library", JSON.stringify(list));
  } catch (error) {
    storageBlocked = true;
  }
}

// 2. Changing the list
// findInLibrary - finds one game in the list or undefined if it is not there.

function findInLibrary(gameID) {
  return getLibrary().find(function (entry) {
    return String(entry.gameID) === String(gameID);
  });
}

// isWishlisted - true if the game is on the Wishlist shelf.
function isWishlisted(gameID) {
  const entry = findInLibrary(gameID);
  return entry !== undefined && entry.shelf === "wishlist";
}

// removeFromLibrar - takes game out of the list.
function removeFromLibrary(gameID) {
  const list = getLibrary().filter(function (entry) {
    return String(entry.gameID) !== String(gameID);
  });
  saveLibrary(list);
}

// addToShelf - puts a game on a shelf. If it is already saved, the old copy is replaced.
// game = { gameID, title, thumb }
function addToShelf(game, shelf) {
  removeFromLibrary(game.gameID);
  const list = getLibrary();
  list.push({
    gameID: String(game.gameID),
    title: game.title,
    thumb: game.thumb,
    shelf: shelf,
    dateAdded: Date.now()
  });
  saveLibrary(list);
}

// moveToShelf- changes which shelf a saved game is on.
function moveToShelf(gameID, shelf) {
  const list = getLibrary();
  list.forEach(function (entry) {
    if (String(entry.gameID) === String(gameID)) {
      entry.shelf = shelf;
    }
  });
  saveLibrary(list);
}

// restoreEntry - puts back a whole saved entry exactly as it was (used by Undo).
function restoreEntry(entry) {
  removeFromLibrary(entry.gameID);
  const list = getLibrary();
  list.push(entry);
  saveLibrary(list);
}

// 3. The toast (small message with Undo) 
let toastTimer;

// makeToastBox- creates the empty toast once, when the page loads.
function makeToastBox() {
  const box = document.createElement("div");
  box.id = "toast";
  box.className = "toast";
  box.setAttribute("role", "status");   // screen readers read it out
  document.body.appendChild(box);
}

// hideToast: fades the toast away.
function hideToast() {
  const box = document.querySelector("#toast");
  box.classList.remove("show");
  box.innerHTML = "";
}

// showToast shows a message. If undoFunction is given, an Undo button appears.
// The toast goes away by itself after 5 seconds. edit change 5000.

function showToast(message, undoFunction) {
  const box = document.querySelector("#toast");
  box.innerHTML = "";

  const text = document.createElement("span");
  text.textContent = message;
  box.appendChild(text);

  if (undoFunction) {
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "btn btn--small";
    undoButton.textContent = "Undo";
    undoButton.addEventListener("click", function () {
      undoFunction();
      hideToast();
    });
    box.appendChild(undoButton);
  }

  box.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

// 4. The heart button
// setHeartState makes ONE heart button look full (saved) or empty.



function setHeartState(button, saved) {
  button.setAttribute("aria-pressed", saved ? "true" : "false");
  const symbol = saved ? "&#9829;" : "&#9825;";
  if (button.classList.contains("heart-btn--wide")) {
    button.innerHTML = symbol + " Wishlist";   // the big button on Game Detail
  } else {
    button.innerHTML = symbol;
  }
}

// updateHeartButtons: refreshes every heart on the page for one game.
function updateHeartButtons(gameID) {
  const saved = isWishlisted(gameID);
  document.querySelectorAll(".heart-btn[data-gameid]").forEach(function (button) {
    if (String(button.dataset.gameid) === String(gameID)) {
      setHeartState(button, saved);
    }
  });
}

// When ANY heart is clicked: add to the Wishlist, or take it off again.

document.addEventListener("click", function (event) {
  const button = event.target.closest(".heart-btn[data-gameid]");
  if (!button) return;

  const game = {
    gameID: button.dataset.gameid,
    title: button.dataset.title,
    thumb: button.dataset.thumb
  };

  if (isWishlisted(game.gameID)) {
    // Already saved, so remove it
    const oldEntry = findInLibrary(game.gameID);
    removeFromLibrary(game.gameID);
    updateHeartButtons(game.gameID);
    showToast("Removed from Wishlist", function () {
      restoreEntry(oldEntry);
      updateHeartButtons(game.gameID);
    });
  } else {
    // Not on the Wishlist, so add it (remember where it was, for Undo)
    const oldEntry = findInLibrary(game.gameID);
    addToShelf(game, "wishlist");
    updateHeartButtons(game.gameID);
    showToast("Added to Wishlist", function () {
      if (oldEntry) {
        restoreEntry(oldEntry);
      } else {
        removeFromLibrary(game.gameID);
      }
      updateHeartButtons(game.gameID);
    });
  }
});

// Make the toast box as soon as this file loads.
makeToastBox();