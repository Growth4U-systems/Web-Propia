/**
 * Sync bot state summary to Firebase Firestore (REST API, no SDK needed).
 * Pushes a single document to ig_bot_status/current so the admin panel can read it.
 */

import { loadState, getTodayStats, type DailyStats } from "./state.js";
import { TARGET_ACCOUNTS, LIMITS } from "./config.js";

const PROJECT_ID = "landing-growth4u";
const APP_ID = "growth4u-public-app";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const DOC_PATH = `artifacts/${APP_ID}/public/data/ig_bot_status/current`;

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function syncToFirebase(): Promise<void> {
  const state = loadState();
  const todayStats = getTodayStats(state);
  const activeFollows = state.followedUsers.filter((f) => !f.unfollowed).length;
  const totalUnfollowed = state.followedUsers.filter((f) => f.unfollowed).length;

  // Last 30 days of stats
  const recentStats: DailyStats[] = state.dailyStats.slice(-30);

  const summary = {
    poolSize: state.scrapedUsers.length,
    activeFollows,
    totalFollowed: state.followedUsers.length,
    totalUnfollowed,
    totalLikes: state.likedPosts.length,
    blacklistCount: state.blacklist.length,
    todayStats: {
      date: todayStats.date,
      follows: todayStats.follows,
      unfollows: todayStats.unfollows,
      likes: todayStats.likes,
      comments: todayStats.comments,
    },
    dailyStats: recentStats.map((d) => ({
      date: d.date,
      follows: d.follows,
      unfollows: d.unfollows,
      likes: d.likes,
      comments: d.comments,
    })),
    targetAccounts: TARGET_ACCOUNTS,
    limits: {
      maxFollowsPerDay: LIMITS.maxFollowsPerDay,
      maxLikesPerDay: LIMITS.maxLikesPerDay,
      maxCommentsPerDay: LIMITS.maxCommentsPerDay,
      maxUnfollowsPerDay: LIMITS.maxUnfollowsPerDay,
      unfollowAfterDays: LIMITS.unfollowAfterDays,
    },
    lastRunAt: new Date().toISOString(),
  };

  // Build Firestore fields
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(summary)) {
    fields[k] = toFirestoreValue(v);
  }

  const url = `${FIRESTORE_BASE}/${DOC_PATH}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Firebase sync failed (${res.status}):`, text);
  } else {
    console.log("✅ State synced to Firebase");
  }
}
