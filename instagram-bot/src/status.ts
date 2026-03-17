import { loadState, getTodayStats } from "./state.js";

const state = loadState();
const stats = getTodayStats(state);

console.log("\n--- Instagram Bot Status ---\n");
console.log(`Pool size: ${state.scrapedUsers.length} scraped users`);
console.log(`Total followed: ${state.followedUsers.length}`);
console.log(`  - Active follows: ${state.followedUsers.filter((f) => !f.unfollowed).length}`);
console.log(`  - Unfollowed: ${state.followedUsers.filter((f) => f.unfollowed).length}`);
console.log(`Total likes: ${state.likedPosts.length}`);
console.log(`Blacklisted: ${state.blacklist.length}`);
console.log(`\nToday (${stats.date}):`);
console.log(`  Follows: ${stats.follows}`);
console.log(`  Unfollows: ${stats.unfollows}`);
console.log(`  Likes: ${stats.likes}`);
console.log(`  Comments: ${stats.comments}`);
console.log(`\nLast 7 days:`);
const last7 = state.dailyStats.slice(-7);
for (const day of last7) {
  console.log(`  ${day.date}: ${day.follows}F ${day.unfollows}UF ${day.likes}L ${day.comments || 0}C`);
}
console.log("");
