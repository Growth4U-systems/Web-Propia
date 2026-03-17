import type { Page } from "playwright";
import { LIMITS, sleep, randomDelay } from "./config.js";
import { loadState, saveState, addScrapedUsers } from "./state.js";

export async function scrapeFollowers(page: Page, targetAccount: string): Promise<string[]> {
  console.log(`Scraping followers of @${targetAccount}...`);

  await page.goto(`https://www.instagram.com/${targetAccount}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("load").catch(() => {});
  await sleep(randomDelay(2000, 4000));

  // Click on followers count to open the dialog
  const followersLink = await page.$(`a[href="/${targetAccount}/followers/"]`);
  if (!followersLink) {
    console.log(`Could not find followers link for @${targetAccount}`);
    return [];
  }

  await followersLink.click();
  await sleep(randomDelay(2000, 4000));

  // Wait for the followers dialog/list to appear
  await page.waitForSelector("div[role='dialog']", { timeout: 10000 });
  await sleep(randomDelay(2000, 4000)); // longer wait for content to load

  const usernames: Set<string> = new Set();
  let noNewCount = 0;
  const maxNoNew = 15; // give up after 15 scrolls with no new users

  while (usernames.size < LIMITS.maxFollowersToScrape && noNewCount < maxNoNew) {
    // Extract usernames from visible list items
    const newUsers = await page.evaluate(() => {
      const dialog = document.querySelector("div[role='dialog']");
      if (!dialog) return [];
      const links = dialog.querySelectorAll("a[href^='/']");
      const users: string[] = [];
      const skipNames = new Set(["explore", "accounts", "reels", "stories", "p", "direct"]);
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.match(/^\/[a-zA-Z0-9._]+\/$/)) {
          const username = href.replace(/\//g, "");
          if (!skipNames.has(username) && username.length > 1) {
            users.push(username);
          }
        }
      });
      return users;
    });

    const before = usernames.size;
    newUsers.forEach((u) => usernames.add(u));

    if (usernames.size === before) {
      noNewCount++;
    } else {
      noNewCount = 0;
    }

    // Scroll the dialog — find the scrollable container
    // Instagram uses nested divs; we need the one with actual scroll overflow
    await page.evaluate(() => {
      const dialog = document.querySelector("div[role='dialog']");
      if (!dialog) return;

      // Strategy 1: find div with computed overflow-y: scroll/auto AND actual scrollable content
      let scrollContainer: HTMLElement | null = null;
      const allDivs = dialog.querySelectorAll("div");
      for (const div of allDivs) {
        const style = window.getComputedStyle(div);
        const overflowY = style.overflowY;
        if ((overflowY === "scroll" || overflowY === "auto") && div.scrollHeight > div.clientHeight + 20) {
          // Prefer the one with the most content (largest scrollHeight)
          if (!scrollContainer || div.scrollHeight > scrollContainer.scrollHeight) {
            scrollContainer = div as HTMLElement;
          }
        }
      }

      if (scrollContainer) {
        scrollContainer.scrollTop += 1500;
        return;
      }

      // Strategy 2: find any div with scrollHeight > clientHeight
      for (const div of allDivs) {
        if (div.scrollHeight > div.clientHeight + 50) {
          (div as HTMLElement).scrollTop += 1500;
          return;
        }
      }

      // Strategy 3: scroll the dialog itself
      (dialog as HTMLElement).scrollTop += 1500;
    });

    await sleep(randomDelay(LIMITS.scrollCooldownMin, LIMITS.scrollCooldownMax));

    // Log progress every 5 scrolls or when new users found
    if (noNewCount === 0 || noNewCount % 5 === 0) {
      console.log(`  Scraped ${usernames.size} users so far... (stalls: ${noNewCount})`);
    }
  }

  // Close dialog
  await page.keyboard.press("Escape");
  await sleep(randomDelay(1000, 2000));

  const result = Array.from(usernames);
  console.log(`Scraped ${result.length} followers from @${targetAccount}`);

  // Save to state
  const state = loadState();
  const added = addScrapedUsers(state, result);
  saveState(state);
  console.log(`Added ${added} new users to pool (total: ${state.scrapedUsers.length})`);

  return result;
}
