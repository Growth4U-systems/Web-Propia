import type { Page } from "playwright";
import { LIMITS, sleep, randomDelay } from "./config.js";
import { loadState, saveState, recordLike, isAlreadyLiked, getTodayStats, pickUsersForLiking } from "./state.js";

async function likeUserPosts(page: Page, username: string): Promise<number> {
  console.log(`  Visiting @${username}...`);

  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "domcontentloaded" });
  await sleep(randomDelay(2000, 4000));

  // Check if account is private
  const isPrivate = await page.evaluate(() => {
    return document.body.innerText.includes("This account is private") ||
      document.body.innerText.includes("Esta cuenta es privada");
  });

  if (isPrivate) {
    console.log(`  @${username} is private, skipping`);
    return 0;
  }

  // Get first 3 post links
  const postLinks = await page.evaluate(() => {
    const links = document.querySelectorAll("a[href*='/p/']");
    return Array.from(links)
      .slice(0, 3)
      .map((a) => a.getAttribute("href")!)
      .filter(Boolean);
  });

  if (postLinks.length === 0) {
    console.log(`  No posts found for @${username}`);
    return 0;
  }

  const state = loadState();
  let liked = 0;

  // Like 1-2 posts max per user
  const postsToLike = postLinks.slice(0, randomDelay(1, 2));

  for (const postHref of postsToLike) {
    const postUrl = `https://www.instagram.com${postHref}`;

    if (isAlreadyLiked(state, postUrl)) {
      console.log(`  Already liked ${postUrl}, skipping`);
      continue;
    }

    const todayStats = getTodayStats(state);
    if (todayStats.likes >= LIMITS.maxLikesPerDay) {
      console.log("  Daily like limit reached");
      saveState(state);
      return liked;
    }

    await page.goto(postUrl, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(2000, 4000));

    // Check if already liked
    const alreadyLiked = await page.evaluate(() => {
      const unlikeSvg = document.querySelector('svg[aria-label="Unlike"], svg[aria-label="Ya no me gusta"]');
      return !!unlikeSvg;
    });

    if (alreadyLiked) {
      console.log(`  Post already liked in IG`);
      recordLike(state, username, postUrl);
      saveState(state);
      continue;
    }

    // Find and click the like button
    const likeBtn = await page.$('svg[aria-label="Like"], svg[aria-label="Me gusta"]');
    if (likeBtn) {
      // Click the parent button/span
      const parent = await likeBtn.evaluateHandle((el) => el.closest("button") || el.parentElement);
      if (parent) {
        await (parent as any).click();
        await sleep(randomDelay(1000, 2000));

        recordLike(state, username, postUrl);
        saveState(state);
        liked++;
        console.log(`  Liked post ${postHref}`);
      }
    } else {
      console.log(`  Like button not found for ${postHref}`);
    }

    // Wait between likes
    await sleep(randomDelay(LIMITS.likeCooldownMin, LIMITS.likeCooldownMax));
  }

  return liked;
}

export async function runLikeSession(page: Page): Promise<void> {
  console.log("\n--- AUTO LIKER SESSION ---");
  const state = loadState();
  const todayStats = getTodayStats(state);
  saveState(state);

  const remaining = LIMITS.maxLikesPerDay - todayStats.likes;
  if (remaining <= 0) {
    console.log("Daily like limit already reached");
    return;
  }

  // Pick users to like — estimate ~1.5 likes per user
  const usersNeeded = Math.ceil(remaining / 1.5);
  const users = pickUsersForLiking(state, usersNeeded);

  if (users.length === 0) {
    console.log("No users in pool to like. Run scraper first.");
    return;
  }

  console.log(`Will visit ${users.length} profiles (${remaining} likes remaining today)`);
  let totalLiked = 0;
  let hourLikes = 0;
  let hourStart = Date.now();

  for (const username of users) {
    // Check hourly limit
    if (Date.now() - hourStart > 3600_000) {
      hourLikes = 0;
      hourStart = Date.now();
    }
    if (hourLikes >= LIMITS.maxLikesPerHour) {
      console.log("Hourly like limit reached, waiting...");
      await sleep(randomDelay(60_000, 120_000));
      hourLikes = 0;
      hourStart = Date.now();
    }

    const freshState = loadState();
    if (getTodayStats(freshState).likes >= LIMITS.maxLikesPerDay) {
      console.log("Daily like limit reached");
      break;
    }

    try {
      const liked = await likeUserPosts(page, username);
      totalLiked += liked;
      hourLikes += liked;
    } catch (err) {
      console.log(`  Error liking @${username}: ${err}`);
    }

    // Random delay between users
    await sleep(randomDelay(10_000, 30_000));
  }

  console.log(`Like session complete: ${totalLiked} posts liked today`);
}
