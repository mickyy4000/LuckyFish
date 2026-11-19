// js/main.js-code shared by every page, the menu and the currency button.

// 1. Find the elements 
const menuButton = document.querySelector("#menu-btn");
const menuOverlay = document.querySelector("#site-menu");
const currencyButton = document.querySelector("#currency-btn");

//2. The menu 
// openMenu -dshow the overlay, stop the page scrolling, move keyboard focus into the menu.

function openMenu() {
  menuOverlay.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");   // tells screen readers the menu is open
  menuButton.setAttribute("aria-label", "Close menu");
  document.body.classList.add("menu-open");           // CSS stops the page behind from scrolling
  menuOverlay.querySelector("a").focus();             // focus the first link
}

// closeMenu- hide the overlay and put everything back.
function closeMenu() {
  menuOverlay.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open menu");
  document.body.classList.remove("menu-open");
}

// Clicking the menu button opens it, or closes it if it is already open.


menuButton.addEventListener("click", function () {
  if (menuOverlay.hidden) {
    openMenu();
  } else {
    closeMenu();
  }
});

// Clicking the dark area outside the links closes the menu.
menuOverlay.addEventListener("click", function (event) {
  if (event.target === menuOverlay) {
    closeMenu();
  }
});

// Keyboard: Escape closes the menu, and Tab stays inside it while it is open.
document.addEventListener("keydown", function (event) {
  if (menuOverlay.hidden) {
    return;  // menu is closed, so do nothing
  }
  if (event.key === "Escape") {
    closeMenu();
    menuButton.focus();
  }
  if (event.key === "Tab") {
    // The items cycle through: the menu button plus the four links
    const items = [menuButton].concat(Array.from(menuOverlay.querySelectorAll("a")));
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

//  3. The currency button 
// getCurrency: returns "ZAR" or "USD". in localStorage.

function getCurrency() {
  try {
    return localStorage.getItem("luckyfish.currency") || "ZAR";
  } catch (error) {
    return "ZAR";   // storage blocked: use the default
  }
}

// setCurrency: save the choice, update the button and refresh prices if a page has that function.
function setCurrency(code) {
  try {
    localStorage.setItem("luckyfish.currency", code);
  } catch (error) {
    // storage blocked: the choice only lasts until the page reloads
  }
  updateCurrencyButton(code);
  if (typeof refreshPrices === "function") {
    refreshPrices();   // each page defines this later (Block 4 onwards)
  }
}

// updateCurrencyButton - shows the right pressed state and label for screen readers.
function updateCurrencyButton(code) {
  if (code === "USD") {
    currencyButton.setAttribute("aria-pressed", "true");
    currencyButton.setAttribute("aria-label", "Showing prices in US dollars. Switch to Rand");
  } else {
    currencyButton.setAttribute("aria-pressed", "false");
    currencyButton.setAttribute("aria-label", "Showing prices in Rand. Switch to US dollars");
  }
}

currencyButton.addEventListener("click", function () {
  setCurrency(getCurrency() === "ZAR" ? "USD" : "ZAR");
});

// When the page loads, show the saved choice on the button.
updateCurrencyButton(getCurrency());