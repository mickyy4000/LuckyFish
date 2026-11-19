// js/config.js - settings used by every page.

// RAWG key ( https://rawg.io/apidocs).
const RAWG_KEY = "bdc03be7d65b474e94156f5eb5e78112";

// Fixed exchange rate: 1 US dollar = this many Rand.
const USD_TO_ZAR = 16.39;

// The date this rate is from. Shown next to prices as the estimate note.
const RATE_DATE = "28 September 2026";

// CheapShark web addresses
const CHEAPSHARK_API = "https://www.cheapshark.com/api/1.0";
const CHEAPSHARK_REDIRECT = "https://www.cheapshark.com/redirect?dealID=";

// RAWG web address
const RAWG_API = "https://api.rawg.io/api";

// The stores we show. The numbers are CheapShark store IDs.
// Steam = 1, GOG = 7, Epic Games = 25.
const STORE_IDS = "1,7,25";
const STORE_NAMES = {
  "1": "Steam",
  "7": "GOG",
  "25": "Epic Games"
};