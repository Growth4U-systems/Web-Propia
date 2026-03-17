import "dotenv/config";
import { launchBrowser, login, closeBrowser } from "./browser.js";
import { sleep, randomDelay } from "./config.js";

// Demo: visit one profile, follow, like a post, and leave a comment
// Run: npx tsx src/demo.ts <username>

const COMMENTS = [
  "Muy interesante, gracias por compartir",
  "Gran contenido, me lo guardo",
  "Buen punto, esto aplica mucho en growth",
  "Excelente perspectiva",
  "Esto es muy util, gracias",
];

async function demo(targetUsername: string) {
  console.log(`\n=== DEMO: Full interaction with @${targetUsername} ===\n`);

  const { browser, context, page } = await launchBrowser();

  try {
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.error("Login failed");
      return;
    }

    console.log("\n--- Step 1: Navigate to profile ---");
    await page.goto(`https://www.instagram.com/${targetUsername}/`, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(3000, 5000));

    // Check if profile exists
    const notFound = await page.evaluate(() =>
      document.body.innerText.includes("Sorry, this page") ||
      document.body.innerText.includes("Esta página no está disponible")
    );
    if (notFound) {
      console.log(`@${targetUsername} not found!`);
      return;
    }

    const isPrivate = await page.evaluate(() =>
      document.body.innerText.includes("This account is private") ||
      document.body.innerText.includes("Esta cuenta es privada")
    );
    if (isPrivate) {
      console.log(`@${targetUsername} is private, can only follow`);
    }

    console.log(`Profile @${targetUsername} loaded`);
    await page.screenshot({ path: `data/demo-1-profile.png` });
    console.log("Screenshot: data/demo-1-profile.png");
    await sleep(2000);

    // --- FOLLOW ---
    console.log("\n--- Step 2: Follow ---");
    const alreadyFollowing = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const text = btn.textContent?.trim() || "";
        if (text === "Following" || text === "Siguiendo" || text === "Requested" || text === "Solicitado") return true;
      }
      return false;
    });

    if (alreadyFollowing) {
      console.log("Already following, skipping");
    } else {
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
        await sleep(randomDelay(2000, 3000));
        console.log("Followed!");
        await page.screenshot({ path: `data/demo-2-followed.png` });
        console.log("Screenshot: data/demo-2-followed.png");
      } else {
        console.log("Follow button not found");
      }
    }

    if (isPrivate) {
      console.log("Account is private — can't like or comment. Done.");
      return;
    }

    // --- LIKE ---
    console.log("\n--- Step 3: Like a post ---");
    // Get first post link
    const firstPost = await page.evaluate(() => {
      const link = document.querySelector("a[href*='/p/']");
      return link ? link.getAttribute("href") : null;
    });

    if (!firstPost) {
      console.log("No posts found");
      return;
    }

    await page.goto(`https://www.instagram.com${firstPost}`, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(3000, 5000));
    console.log(`Opened post: ${firstPost}`);
    await page.screenshot({ path: `data/demo-3-post.png` });
    console.log("Screenshot: data/demo-3-post.png");

    // Check if already liked
    const alreadyLiked = await page.evaluate(() => {
      return !!document.querySelector('svg[aria-label="Unlike"], svg[aria-label="Ya no me gusta"]');
    });

    if (alreadyLiked) {
      console.log("Post already liked");
    } else {
      const liked = await page.evaluate(() => {
        const svg = document.querySelector('svg[aria-label="Like"], svg[aria-label="Me gusta"]');
        if (svg) {
          const btn = svg.closest("button") || svg.parentElement;
          if (btn) { (btn as HTMLElement).click(); return true; }
        }
        return false;
      });
      if (liked) {
        await sleep(randomDelay(1500, 3000));
        console.log("Liked!");
        await page.screenshot({ path: `data/demo-4-liked.png` });
        console.log("Screenshot: data/demo-4-liked.png");
      } else {
        console.log("Like button not found");
      }
    }

    // --- COMMENT ---
    console.log("\n--- Step 4: Comment ---");
    await sleep(randomDelay(2000, 4000));

    // Find comment input — try clicking the comment icon first to focus
    const commentIconClicked = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label="Comment"], svg[aria-label="Comentar"], svg[aria-label="Comentario"]');
      if (svg) {
        const btn = svg.closest("button") || svg.parentElement;
        if (btn) { (btn as HTMLElement).click(); return true; }
      }
      return false;
    });

    if (commentIconClicked) {
      await sleep(randomDelay(1000, 2000));
    }

    // Find the comment textarea/input
    const commentBox = await page.$("textarea[aria-label*='comment'], textarea[aria-label*='comentario'], textarea[placeholder*='comment'], textarea[placeholder*='comentario'], form textarea");

    if (commentBox) {
      await commentBox.click();
      await sleep(randomDelay(500, 1000));

      const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
      await page.keyboard.type(comment, { delay: randomDelay(30, 80) });
      await sleep(randomDelay(1000, 2000));

      console.log(`Typed comment: "${comment}"`);
      await page.screenshot({ path: `data/demo-5-comment-typed.png` });
      console.log("Screenshot: data/demo-5-comment-typed.png");

      // Click "Post" / "Publicar" button
      const posted = await page.evaluate(() => {
        const btns = document.querySelectorAll("button, div[role='button']");
        for (const btn of btns) {
          const text = btn.textContent?.trim() || "";
          if (text === "Post" || text === "Publicar") {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      // Also try pressing Enter/Submit
      if (!posted) {
        await page.keyboard.press("Enter");
      }

      await sleep(randomDelay(2000, 4000));
      console.log("Comment posted!");
      await page.screenshot({ path: `data/demo-6-commented.png` });
      console.log("Screenshot: data/demo-6-commented.png");
    } else {
      console.log("Comment box not found — might need to scroll down or comments are disabled");
    }

    console.log("\n=== DEMO COMPLETE ===");
    console.log("Check data/demo-*.png for screenshots of each step\n");

  } catch (err) {
    console.error("Demo error:", err);
    await page.screenshot({ path: `data/demo-error.png` }).catch(() => {});
  } finally {
    await closeBrowser(browser, context);
  }
}

const target = process.argv[2] || "growthdesigners";
demo(target);
