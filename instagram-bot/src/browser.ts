import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { DATA_DIR, SELECTORS, sleep, randomDelay } from "./config.js";

const COOKIES_FILE = resolve(DATA_DIR, "cookies.json");

export async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const headless = process.env.HEADLESS === "true";
  const browser = await chromium.launch({
    headless, // headless for cron, visible for manual runs
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
    // Overwrite the `languages` property
    Object.defineProperty(navigator, "languages", {
      get: () => ["es-ES", "es", "en"],
    });
  });

  // Load saved cookies if they exist
  if (existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(readFileSync(COOKIES_FILE, "utf-8"));
      await context.addCookies(cookies);
      console.log("Loaded saved cookies");
    } catch {
      console.log("Could not load cookies, will need fresh login");
    }
  }

  const page = await context.newPage();
  return { browser, context, page };
}

export async function saveCookies(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log("Cookies saved");
}

export async function login(page: Page): Promise<boolean> {
  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
  await sleep(randomDelay(4000, 7000));

  // Handle cookie consent banner (EU/Spain)
  try {
    const cookieBtn = await page.$("button:has-text('Allow all cookies'), button:has-text('Permitir todas las cookies'), button:has-text('Allow essential and optional cookies'), button:has-text('Decline optional cookies'), button:has-text('Permitir cookies esenciales y opcionales')");
    if (cookieBtn) {
      await cookieBtn.click();
      await sleep(randomDelay(2000, 3000));
      console.log("Dismissed cookie banner");
    }
  } catch {
    // No cookie banner
  }

  // Check if already logged in
  try {
    await page.waitForSelector('svg[aria-label="Home"], svg[aria-label="Inicio"]', { timeout: 5000 });
    console.log("Already logged in via cookies");
    return true;
  } catch {
    // Not logged in, need credentials
  }

  // Wait for any input to appear on the page
  console.log("Looking for login form...");
  try {
    await page.waitForSelector("input", { timeout: 15000 });
  } catch {
    await page.screenshot({ path: resolve(DATA_DIR, "login-debug.png") });
    console.log("No inputs found. Screenshot saved to data/login-debug.png");
    return false;
  }

  // Find the username and password inputs by position (first text input = username, first password = password)
  const allInputs = await page.$$("input");
  let usernameInput = null;
  let passwordInput = null;

  for (const input of allInputs) {
    const type = await input.getAttribute("type");
    const name = await input.getAttribute("name");
    if (!usernameInput && (type === "text" || name === "username")) {
      usernameInput = input;
    }
    if (!passwordInput && (type === "password" || name === "password")) {
      passwordInput = input;
    }
  }

  if (!usernameInput || !passwordInput) {
    await page.screenshot({ path: resolve(DATA_DIR, "login-debug.png") });
    console.log(`Login form incomplete: username=${!!usernameInput}, password=${!!passwordInput}`);
    return false;
  }

  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;

  if (!username || !password) {
    console.error("Set IG_USERNAME and IG_PASSWORD environment variables");
    return false;
  }

  // Type slowly like a human
  await usernameInput.click();
  await sleep(randomDelay(300, 800));
  await page.keyboard.type(username, { delay: randomDelay(50, 150) });
  await sleep(randomDelay(500, 1500));

  await passwordInput.click();
  await sleep(randomDelay(300, 800));
  await page.keyboard.type(password, { delay: randomDelay(50, 150) });
  await sleep(randomDelay(500, 1500));

  // Click submit — try multiple selectors
  const submitBtn = await page.$("button[type='submit']") ||
    await page.$("button:has-text('Iniciar sesión')") ||
    await page.$("button:has-text('Log in')");
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.keyboard.press("Enter");
  }
  await sleep(randomDelay(5000, 8000));

  // Handle "Save Login Info?" or "Not Now" dialogs
  try {
    const notNow = await page.waitForSelector(SELECTORS.notNowButton, { timeout: 5000 });
    if (notNow) await notNow.click();
    await sleep(randomDelay(1000, 2000));
  } catch {
    // No dialog
  }

  // Try dismissing notifications dialog
  try {
    const notNow2 = await page.waitForSelector(SELECTORS.notNowButton, { timeout: 3000 });
    if (notNow2) await notNow2.click();
  } catch {
    // No dialog
  }

  // Verify login
  try {
    await page.waitForSelector('svg[aria-label="Home"], svg[aria-label="Inicio"]', { timeout: 10000 });
    console.log("Login successful");
    return true;
  } catch {
    console.error("Login failed — check credentials or 2FA");
    return false;
  }
}

export async function closeBrowser(browser: Browser, context: BrowserContext): Promise<void> {
  // Save cookies first, before closing — handle case where browser already crashed
  try {
    await saveCookies(context);
  } catch (err) {
    console.log("Could not save cookies (browser may have crashed):", (err as Error).message);
  }
  try {
    await browser.close();
  } catch {
    // Browser already closed
  }
}
