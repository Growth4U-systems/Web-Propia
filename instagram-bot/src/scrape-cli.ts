import "dotenv/config";
import { launchBrowser, login, closeBrowser } from "./browser.js";
import { scrapeFollowers } from "./scraper.js";
import { TARGET_ACCOUNTS, sleep, randomDelay } from "./config.js";

// CLI: npm run scrape [account1] [account2] ...
// Or: npm run scrape (scrapes all target accounts)

async function main() {
  const args = process.argv.slice(2);
  const accounts = args.length > 0 ? args : TARGET_ACCOUNTS;

  console.log(`Will scrape followers from: ${accounts.join(", ")}`);

  const { browser, context, page } = await launchBrowser();

  try {
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.error("Login failed");
      await closeBrowser(browser, context);
      process.exit(1);
    }

    for (const account of accounts) {
      await scrapeFollowers(page, account);
      await sleep(randomDelay(10_000, 20_000));
    }
  } catch (err) {
    console.error("Scrape error:", err);
  } finally {
    await closeBrowser(browser, context);
  }
}

main();
