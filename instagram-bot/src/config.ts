import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(__dirname, "..", "data");

// Target accounts to scrape followers from
// Cuentas de marketing, growth y startups DE ESPAÑA — audiencia relevante
export const TARGET_ACCOUNTS = [
  // Marketing digital España
  "romuald.fons",        // Romuald Fons — SEO, comunidad muy activa
  "vilmanunez",          // Vilma Nuñez — marketing digital
  "juanmerodio",         // Juan Merodio — marketing digital
  "claudioinacio",       // Claudio Inacio — social media marketing
  "luismvillanueva",     // Luis M. Villanueva — SEO España
  "marketingandweb",     // Miguel Florido — marketing digital
  "borjagiron",          // Borja Girón — marketing digital
  // Growth / Startups España
  "reaborges",
  "faborges",
  "thepowermbas",        // ThePower — business school digital España
  "iaborges",
  // Emprendimiento España
  "escueladevideomarketing", // Video marketing España
  "carloselias.es",      // Emprendimiento digital
  "miloradigital",       // Marketing digital España
];

// Rate limits — aggressive, 2 sessions per day
// Target: 10K followers in 30 days
export const LIMITS = {
  // Likes
  maxLikesPerHour: 60,
  maxLikesPerDay: 500,
  likeCooldownMin: 15_000,   // 15 seconds
  likeCooldownMax: 45_000,   // 45 seconds

  // Follows — 250/day × 2 sessions = up to 500 follows
  maxFollowsPerDay: 250,
  followCooldownMin: 20_000,  // 20 seconds
  followCooldownMax: 60_000,  // 1 minute

  // Unfollows
  unfollowAfterDays: 3,
  maxUnfollowsPerDay: 250,
  unfollowCooldownMin: 10_000,
  unfollowCooldownMax: 30_000,

  // Comments — 80/day, high engagement
  maxCommentsPerDay: 80,
  commentCooldownMin: 60_000,  // 1 minute
  commentCooldownMax: 180_000, // 3 minutes

  // Scraping
  maxFollowersToScrape: 800,
  scrollCooldownMin: 1_500,
  scrollCooldownMax: 3_500,

  // Session
  sessionMaxMinutes: 240, // 4 hours per session
};

// Selectors — Instagram DOM (may need updating if IG changes layout)
export const SELECTORS = {
  loginUsername: "input[name='username'], input[aria-label*='usuario'], input[aria-label*='móvil'], input[aria-label*='correo'], input[aria-label*='phone'], input[aria-label*='username'], input[aria-label*='email']",
  loginPassword: "input[name='password'], input[aria-label*='ontraseña'], input[aria-label*='assword'], input[type='password']",
  loginButton: "button[type='submit'], button:has-text('Iniciar sesión'), button:has-text('Log In'), button:has-text('Log in')",
  notNowButton: "button:has-text('Not Now'), button:has-text('Ahora no')",
  followButton: "button:has-text('Follow'), button:has-text('Seguir')",
  followingButton: "button:has-text('Following'), button:has-text('Siguiendo')",
  unfollowConfirm: "button:has-text('Unfollow'), button:has-text('Dejar de seguir')",
  likeButton: 'svg[aria-label="Like"], svg[aria-label="Me gusta"]',
  followersLink: 'a[href$="/followers/"]',
  followersList: "div[role='dialog'] ul",
  followerItem: "div[role='dialog'] ul li",
  postLink: "a[href*='/p/']",
};

export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
