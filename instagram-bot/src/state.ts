import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { DATA_DIR } from "./config.js";

export interface FollowRecord {
  username: string;
  followedAt: string; // ISO date
  unfollowed?: boolean;
  followedBack?: boolean;
}

export interface LikeRecord {
  username: string;
  postUrl: string;
  likedAt: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  likes: number;
  follows: number;
  unfollows: number;
  comments: number;
}

interface State {
  scrapedUsers: string[];          // Usernames pool to engage with
  followedUsers: FollowRecord[];   // Follow tracking
  likedPosts: LikeRecord[];       // Like history
  dailyStats: DailyStats[];       // Daily counters
  blacklist: string[];             // Never interact with these
}

const STATE_FILE = resolve(DATA_DIR, "state.json");

function defaultState(): State {
  return {
    scrapedUsers: [],
    followedUsers: [],
    likedPosts: [],
    dailyStats: [],
    blacklist: [],
  };
}

export function loadState(): State {
  if (!existsSync(STATE_FILE)) return defaultState();
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as State;
  } catch {
    return defaultState();
  }
}

export function saveState(state: State): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayStats(state: State): DailyStats {
  const d = today();
  let stats = state.dailyStats.find((s) => s.date === d);
  if (!stats) {
    stats = { date: d, likes: 0, follows: 0, unfollows: 0, comments: 0 };
    state.dailyStats.push(stats);
  }
  return stats;
}

export function addScrapedUsers(state: State, usernames: string[]): number {
  const existing = new Set(state.scrapedUsers);
  const blackSet = new Set(state.blacklist);
  const newUsers = usernames.filter((u) => !existing.has(u) && !blackSet.has(u));
  state.scrapedUsers.push(...newUsers);
  return newUsers.length;
}

export function recordFollow(state: State, username: string): void {
  state.followedUsers.push({ username, followedAt: new Date().toISOString() });
  getTodayStats(state).follows++;
}

export function recordUnfollow(state: State, username: string): void {
  const record = state.followedUsers.find((f) => f.username === username && !f.unfollowed);
  if (record) record.unfollowed = true;
  getTodayStats(state).unfollows++;
}

export function recordLike(state: State, username: string, postUrl: string): void {
  state.likedPosts.push({ username, postUrl, likedAt: new Date().toISOString() });
  getTodayStats(state).likes++;
}

export function isAlreadyLiked(state: State, postUrl: string): boolean {
  return state.likedPosts.some((l) => l.postUrl === postUrl);
}

export function isAlreadyFollowed(state: State, username: string): boolean {
  return state.followedUsers.some((f) => f.username === username);
}

export function getUsersToUnfollow(state: State): string[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 4); // 4 days ago
  return state.followedUsers
    .filter((f) => !f.unfollowed && !f.followedBack && new Date(f.followedAt) < cutoff)
    .map((f) => f.username);
}

// Pick random users from the pool that we haven't interacted with recently
export function pickUsersForLiking(state: State, count: number): string[] {
  const recentLikes = new Set(
    state.likedPosts
      .filter((l) => Date.now() - new Date(l.likedAt).getTime() < 7 * 86400_000)
      .map((l) => l.username)
  );
  const pool = state.scrapedUsers.filter((u) => !recentLikes.has(u));
  // Shuffle and pick
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function pickUsersForFollowing(state: State, count: number): string[] {
  const alreadyFollowed = new Set(state.followedUsers.map((f) => f.username));
  const pool = state.scrapedUsers.filter((u) => !alreadyFollowed.has(u));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
