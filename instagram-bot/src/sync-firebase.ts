/**
 * Sync bot state summary to Firebase Firestore (REST API, no SDK needed).
 * Pushes a single document to ig_bot_status/current so the admin panel can read it.
 */

import { loadState, getTodayStats, type DailyStats, type FollowRecord, type LikeRecord, type CommentRecord } from "./state.js";
import { TARGET_ACCOUNTS, LIMITS } from "./config.js";

const PROJECT_ID = "landing-growth4u";
const APP_ID = "growth4u-public-app";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const DOC_PATH = `artifacts/${APP_ID}/public/data/ig_bot_status/current`;

// Session tracking — set by daily.ts
let _sessionStartedAt: string | null = null;

export function setSessionStart(): void {
  _sessionStartedAt = new Date().toISOString();
}

interface ActivityEntry {
  type: "follow" | "unfollow" | "like" | "comment";
  username: string;
  detail: string;   // postUrl, comment text, etc.
  timestamp: string; // ISO
}

function buildRecentActivity(state: ReturnType<typeof loadState>): ActivityEntry[] {
  const activities: ActivityEntry[] = [];

  // Last follows
  const recentFollows = state.followedUsers
    .filter((f) => !f.unfollowed)
    .slice(-30)
    .map((f: FollowRecord): ActivityEntry => ({
      type: "follow",
      username: f.username,
      detail: "",
      timestamp: f.followedAt,
    }));
  activities.push(...recentFollows);

  // Last unfollows (from the unfollowed records — find the most recent ones)
  const recentUnfollows = state.followedUsers
    .filter((f) => f.unfollowed)
    .slice(-20)
    .map((f: FollowRecord): ActivityEntry => ({
      type: "unfollow",
      username: f.username,
      detail: `followed ${f.followedAt.slice(0, 10)}`,
      timestamp: f.followedAt, // approximate — unfollow doesn't have its own timestamp
    }));
  activities.push(...recentUnfollows);

  // Last likes
  const recentLikes = state.likedPosts
    .slice(-30)
    .map((l: LikeRecord): ActivityEntry => ({
      type: "like",
      username: l.username,
      detail: l.postUrl,
      timestamp: l.likedAt,
    }));
  activities.push(...recentLikes);

  // Last comments
  const commentedPosts = (state as any).commentedPosts || [];
  const recentComments = commentedPosts
    .slice(-20)
    .map((c: CommentRecord): ActivityEntry => ({
      type: "comment",
      username: c.username,
      detail: c.comment,
      timestamp: c.commentedAt,
    }));
  activities.push(...recentComments);

  // Sort by timestamp desc, take last 50
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, 50);
}

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
  const totalComments = ((state as any).commentedPosts || []).length;

  // Last 30 days of stats
  const recentStats: DailyStats[] = state.dailyStats.slice(-30);

  // Build recent activity feed
  const recentActivity = buildRecentActivity(state);

  const now = new Date().toISOString();

  const summary = {
    poolSize: state.scrapedUsers.length,
    activeFollows,
    totalFollowed: state.followedUsers.length,
    totalUnfollowed,
    totalLikes: state.likedPosts.length,
    totalComments,
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
    recentActivity,
    // Session info
    sessionStartedAt: _sessionStartedAt || now,
    sessionEndedAt: now,
    sessionDurationMin: _sessionStartedAt
      ? Math.round((Date.now() - new Date(_sessionStartedAt).getTime()) / 60_000)
      : 0,
    targetAccounts: TARGET_ACCOUNTS,
    limits: {
      maxFollowsPerDay: LIMITS.maxFollowsPerDay,
      maxLikesPerDay: LIMITS.maxLikesPerDay,
      maxCommentsPerDay: LIMITS.maxCommentsPerDay,
      maxUnfollowsPerDay: LIMITS.maxUnfollowsPerDay,
      unfollowAfterDays: LIMITS.unfollowAfterDays,
    },
    lastRunAt: now,
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
