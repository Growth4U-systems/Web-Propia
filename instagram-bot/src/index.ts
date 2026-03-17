// Entry point — same as daily.ts but can also be used for one-off runs
export { scrapeFollowers } from "./scraper.js";
export { runLikeSession } from "./liker.js";
export { runFollowSession, runUnfollowSession } from "./follower.js";
export { launchBrowser, login, closeBrowser } from "./browser.js";
export { loadState, saveState } from "./state.js";

// When run directly, execute the daily routine
import "./daily.js";
