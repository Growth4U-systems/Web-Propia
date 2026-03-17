import type { Page } from "playwright";
import { LIMITS, sleep, randomDelay } from "./config.js";
import {
  loadState, saveState, recordFollow, recordUnfollow,
  getTodayStats, pickUsersForFollowing, getUsersToUnfollow,
} from "./state.js";

async function followUser(page: Page, username: string): Promise<boolean> {
  console.log(`  Following @${username}...`);

  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "domcontentloaded" });
  await sleep(randomDelay(2000, 4000));

  // Check if account exists
  const notFound = await page.evaluate(() => {
    return document.body.innerText.includes("Sorry, this page isn't available") ||
      document.body.innerText.includes("Esta página no está disponible");
  });
  if (notFound) {
    console.log(`  @${username} not found, skipping`);
    return false;
  }

  // Check if already following
  const alreadyFollowing = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      const text = btn.textContent?.trim() || "";
      if (text === "Following" || text === "Siguiendo" || text === "Requested" || text === "Solicitado") {
        return true;
      }
    }
    return false;
  });

  if (alreadyFollowing) {
    console.log(`  Already following @${username}`);
    return false;
  }

  // Find Follow button
  const followed = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      const text = btn.textContent?.trim() || "";
      if (text === "Follow" || text === "Seguir") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  });

  if (followed) {
    await sleep(randomDelay(1000, 2000));
    console.log(`  Followed @${username}`);
    return true;
  }

  console.log(`  Follow button not found for @${username}`);
  return false;
}

async function unfollowUser(page: Page, username: string): Promise<"unfollowed" | "not_following" | "failed"> {
  console.log(`  Unfollowing @${username}...`);

  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "domcontentloaded" });
  await sleep(randomDelay(2000, 4000));

  // Check if profile page loaded (not a 404 or unavailable page)
  const pageState = await page.evaluate(() => {
    const text = document.body.innerText;
    if (text.includes("Sorry, this page isn't available") || text.includes("Esta página no está disponible")) {
      return "not_found";
    }
    return "ok";
  });

  if (pageState === "not_found") {
    console.log(`  @${username} not found (deleted account)`);
    return "not_following"; // treat as done — no point retrying
  }

  // Click "Following" button — try multiple detection strategies
  const clickedFollowing = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      const text = btn.textContent?.trim() || "";
      // Match: Following, Siguiendo, Requested, Solicitado
      if (text === "Following" || text === "Siguiendo" || text === "Requested" || text === "Solicitado") {
        (btn as HTMLButtonElement).click();
        return "clicked";
      }
    }
    // Fallback: look for aria-label or title attributes
    for (const btn of btns) {
      const aria = btn.getAttribute("aria-label") || "";
      const title = btn.getAttribute("title") || "";
      if (aria.includes("Following") || aria.includes("Siguiendo") || title.includes("Following") || title.includes("Siguiendo")) {
        (btn as HTMLButtonElement).click();
        return "clicked";
      }
    }
    // Check if we see a "Follow" button — means we're NOT following this user
    for (const btn of btns) {
      const text = btn.textContent?.trim() || "";
      if (text === "Follow" || text === "Seguir") {
        return "not_following";
      }
    }
    return "not_found";
  });

  if (clickedFollowing === "not_following") {
    console.log(`  Not following @${username} (already unfollowed or never followed)`);
    return "not_following";
  }

  if (clickedFollowing !== "clicked") {
    console.log(`  Could not find following button for @${username}`);
    return "failed";
  }

  await sleep(randomDelay(1000, 2000));

  // Click "Unfollow" in the confirmation dialog
  const unfollowed = await page.evaluate(() => {
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      const text = btn.textContent?.trim() || "";
      if (text === "Unfollow" || text === "Dejar de seguir") {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    // Fallback: look for red/destructive button in dialog
    const dialog = document.querySelector("div[role='dialog']");
    if (dialog) {
      const dialogBtns = dialog.querySelectorAll("button");
      for (const btn of dialogBtns) {
        const style = window.getComputedStyle(btn);
        // Red text buttons are typically the destructive action
        if (style.color.includes("237") || style.color.includes("ed4956")) {
          (btn as HTMLButtonElement).click();
          return true;
        }
      }
    }
    return false;
  });

  if (unfollowed) {
    await sleep(randomDelay(1000, 2000));
    console.log(`  Unfollowed @${username}`);
    return "unfollowed";
  }

  // Close any open dialog
  await page.keyboard.press("Escape");
  console.log(`  Could not confirm unfollow for @${username}`);
  return "failed";
}

export async function runFollowSession(page: Page): Promise<void> {
  console.log("\n--- FOLLOW SESSION ---");
  const state = loadState();
  const todayStats = getTodayStats(state);
  saveState(state);

  const remaining = LIMITS.maxFollowsPerDay - todayStats.follows;
  if (remaining <= 0) {
    console.log("Daily follow limit already reached");
    return;
  }

  const users = pickUsersForFollowing(state, remaining);
  if (users.length === 0) {
    console.log("No users in pool to follow. Run scraper first.");
    return;
  }

  console.log(`Will follow up to ${users.length} users (${remaining} remaining today)`);
  let totalFollowed = 0;

  for (const username of users) {
    const freshState = loadState();
    if (getTodayStats(freshState).follows >= LIMITS.maxFollowsPerDay) {
      console.log("Daily follow limit reached");
      break;
    }

    try {
      const success = await followUser(page, username);
      if (success) {
        const s = loadState();
        recordFollow(s, username);
        saveState(s);
        totalFollowed++;
      }
    } catch (err) {
      console.log(`  Error following @${username}: ${err}`);
    }

    await sleep(randomDelay(LIMITS.followCooldownMin, LIMITS.followCooldownMax));
  }

  console.log(`Follow session complete: ${totalFollowed} users followed today`);
}

export async function runUnfollowSession(page: Page): Promise<void> {
  console.log("\n--- UNFOLLOW SESSION ---");
  const state = loadState();
  const todayStats = getTodayStats(state);
  saveState(state);

  const remaining = LIMITS.maxUnfollowsPerDay - todayStats.unfollows;
  if (remaining <= 0) {
    console.log("Daily unfollow limit already reached");
    return;
  }

  const usersToUnfollow = getUsersToUnfollow(state).slice(0, remaining);
  if (usersToUnfollow.length === 0) {
    console.log("No users to unfollow yet (need to wait 4+ days after following)");
    return;
  }

  console.log(`Will unfollow ${usersToUnfollow.length} users who didn't follow back`);
  let totalUnfollowed = 0;
  let consecutiveNotFollowing = 0;

  for (const username of usersToUnfollow) {
    // If we get 10+ consecutive "not following", likely logged out or restricted — abort
    if (consecutiveNotFollowing >= 10) {
      console.log("⚠ 10 consecutive 'not following' — likely session issue, aborting unfollows");
      // Mark all remaining as unfollowed to prevent infinite retry loop
      const s = loadState();
      for (const u of usersToUnfollow) {
        const record = s.followedUsers.find((f) => f.username === u && !f.unfollowed);
        if (record) record.unfollowed = true;
      }
      saveState(s);
      console.log(`Marked ${usersToUnfollow.length} stale records as unfollowed`);
      break;
    }

    try {
      const result = await unfollowUser(page, username);

      const s = loadState();
      if (result === "unfollowed") {
        recordUnfollow(s, username);
        totalUnfollowed++;
        consecutiveNotFollowing = 0;
      } else if (result === "not_following") {
        // Mark as unfollowed so we don't retry forever
        const record = s.followedUsers.find((f) => f.username === username && !f.unfollowed);
        if (record) record.unfollowed = true;
        consecutiveNotFollowing++;
      } else {
        // "failed" — increment fail counter on the record
        const record = s.followedUsers.find((f) => f.username === username && !f.unfollowed);
        if (record) {
          const attempts = ((record as any).unfollowAttempts || 0) + 1;
          (record as any).unfollowAttempts = attempts;
          // After 3 failed attempts, give up
          if (attempts >= 3) {
            record.unfollowed = true;
            console.log(`  Giving up on @${username} after ${attempts} attempts`);
          }
        }
        consecutiveNotFollowing = 0;
      }
      saveState(s);
    } catch (err) {
      console.log(`  Error unfollowing @${username}: ${err}`);
    }

    await sleep(randomDelay(LIMITS.unfollowCooldownMin, LIMITS.unfollowCooldownMax));
  }

  console.log(`Unfollow session complete: ${totalUnfollowed} users unfollowed today`);
}
