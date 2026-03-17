import "dotenv/config";
import { launchBrowser, login, closeBrowser, saveCookies } from "./browser.js";
import { scrapeFollowers } from "./scraper.js";
import { runLikeSession } from "./liker.js";
import { runFollowSession, runUnfollowSession } from "./follower.js";
import { runCommentSession } from "./commenter.js";
import { loadState, getTodayStats } from "./state.js";
import { TARGET_ACCOUNTS, LIMITS, sleep, randomDelay } from "./config.js";
import { syncToFirebase, setSessionStart } from "./sync-firebase.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

async function main() {
  const startTime = Date.now();
  setSessionStart();
  console.log(`\n========================================`);
  console.log(`Instagram Bot — ${new Date().toLocaleString("es-ES")}`);
  console.log(`Target: 10K followers in 30 days`);
  console.log(`========================================\n`);

  const { browser, context, page } = await launchBrowser();

  try {
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.error("Login failed. Exiting.");
      await closeBrowser(browser, context);
      process.exit(1);
    }

    await sleep(randomDelay(3000, 8000));

    // Step 1: Keep the pool stocked — scrape from multiple targets if needed
    const state = loadState();
    const poolNeeded = 500;
    if (state.scrapedUsers.length < poolNeeded) {
      console.log(`\nPool is low (${state.scrapedUsers.length}/${poolNeeded}), scraping...`);
      // Scrape from 2 random targets
      const shuffled = [...TARGET_ACCOUNTS].sort(() => Math.random() - 0.5);
      for (const target of shuffled.slice(0, 2)) {
        await scrapeFollowers(page, target);
        await sleep(randomDelay(10_000, 20_000));
        if (Date.now() - startTime > LIMITS.sessionMaxMinutes * 60_000) break;
      }
    }

    // Step 2: Unfollow users who didn't follow back (frees up follow capacity)
    await runUnfollowSession(page);
    await saveCookies(context).catch(() => {}); // periodic save
    if (Date.now() - startTime > LIMITS.sessionMaxMinutes * 60_000) {
      printStats(startTime);
      await closeBrowser(browser, context);
      return;
    }
    await sleep(randomDelay(10_000, 20_000));

    // Step 3: Follow new users (main growth driver)
    await runFollowSession(page);
    await saveCookies(context).catch(() => {}); // periodic save
    if (Date.now() - startTime > LIMITS.sessionMaxMinutes * 60_000) {
      printStats(startTime);
      await closeBrowser(browser, context);
      return;
    }
    await sleep(randomDelay(10_000, 20_000));

    // Step 4: Like posts (engagement + visibility)
    await runLikeSession(page);
    await saveCookies(context).catch(() => {}); // periodic save
    if (Date.now() - startTime > LIMITS.sessionMaxMinutes * 60_000) {
      printStats(startTime);
      await closeBrowser(browser, context);
      return;
    }
    await sleep(randomDelay(10_000, 20_000));

    // Step 5: Comment on posts (highest engagement signal)
    await runCommentSession(page);

    printStats(startTime);
    await syncToFirebase().catch((e: unknown) => console.error("Firebase sync error:", e));
  } catch (err) {
    console.error("Bot error:", err);
    await syncToFirebase().catch(() => {}); // sync even on error
  } finally {
    try {
      await closeBrowser(browser, context);
    } catch (e) {
      console.error("Error closing browser:", e);
    }
  }
}

function printStats(startTime: number) {
  const finalState = loadState();
  const stats = getTodayStats(finalState);
  const activeFollows = finalState.followedUsers.filter((f) => !f.unfollowed).length;
  console.log(`\n========================================`);
  console.log(`Session complete!`);
  console.log(`Today's stats:`);
  console.log(`  Follows: ${stats.follows}`);
  console.log(`  Unfollows: ${stats.unfollows}`);
  console.log(`  Likes: ${stats.likes}`);
  console.log(`  Comments: ${stats.comments}`);
  console.log(`  Active follows: ${activeFollows}`);
  console.log(`  Pool size: ${finalState.scrapedUsers.length}`);
  console.log(`  Duration: ${Math.round((Date.now() - startTime) / 60_000)} min`);
  console.log(`========================================\n`);
}

main();
