import type { Page } from "playwright";
import { LIMITS, sleep, randomDelay } from "./config.js";
import { loadState, saveState, getTodayStats, pickUsersForLiking, recordComment } from "./state.js";

// Comments — all Spanish since we target Spain audience
const COMMENTS = [
  // Aprobación general
  "Muy buen punto, me lo guardo",
  "Excelente perspectiva, no lo habia pensado asi",
  "Gran contenido, justo lo que necesitaba leer hoy",
  "Interesante enfoque, totalmente de acuerdo",
  "Me quedo con esto, muy util",
  "Buen contenido, se nota la experiencia",
  "Justo estaba buscando info sobre esto, gracias",
  "Muy buena reflexion, comparto al 100%",
  "Tremendo aporte, gracias por compartirlo",
  "Me encanta este tipo de contenido, seguimos aprendiendo",
  // Marketing / Growth
  "Esto aplica mucho en growth, gracias por compartir",
  "Genial, esto es aplicable para cualquier startup",
  "Esto lo voy a implementar esta semana",
  "Cuanto valor en un solo post, crack",
  "Esto deberian enseñarlo en todas las escuelas de negocio",
  "Top, me viene genial para mi estrategia actual",
  "Brutal, esto es oro puro para marketers",
  "Lo mejor que he leido hoy sobre el tema",
  "Estoy aplicando algo parecido y funciona increible",
  "Muy acertado, poca gente habla de esto",
  // Engagement personal
  "Me lo guardo para releerlo con calma",
  "Gracias por compartir, se aprende mucho contigo",
  "Cada post tuyo es una clase magistral",
  "Me identifico mucho con esto, gran reflexion",
  "Necesitaba leer esto hoy, mil gracias",
  "Que gran aporte, lo comparto con mi equipo",
  "Esto confirma lo que estaba pensando, gracias",
  "Pedazo de contenido, como siempre",
  "Tomando notas de todo esto, gracias",
  "Esto va directo a mis guardados",
  // Preguntas / curiosidad
  "Muy interesante, tienes algun recurso mas sobre esto?",
  "Me gustaria profundizar en esto, brutal resumen",
  "Esto da para un post entero, que buena idea",
  "Super claro y directo, asi da gusto aprender",
  "Que bien explicado, ojalá mas contenido asi",
  // Emojis naturales
  "Totalmente de acuerdo, puro valor 🙌",
  "Juegazo de post, lo guardo 🔥",
  "Brutal contenido como siempre 👏",
  "Esto es ORO, gracias por compartir 💎",
  "Contenido de calidad, se agradece mucho 👌",
];

function pickComment(): string {
  return COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
}

async function commentOnPost(page: Page, postUrl: string, comment?: string): Promise<boolean> {
  await page.goto(postUrl, { waitUntil: "domcontentloaded" });
  await sleep(randomDelay(3000, 5000));

  // Click comment icon to focus
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

  // Find comment textarea
  const commentBox = await page.$("textarea[aria-label*='comment'], textarea[aria-label*='comentario'], textarea[placeholder*='comment'], textarea[placeholder*='comentario'], form textarea");

  if (!commentBox) {
    console.log(`    Comment box not found on ${postUrl}`);
    return false;
  }

  await commentBox.click();
  await sleep(randomDelay(500, 1000));

  const text = comment || pickComment();
  await page.keyboard.type(text, { delay: randomDelay(30, 80) });
  await sleep(randomDelay(1000, 2000));

  // Click "Post" / "Publicar"
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

  if (!posted) {
    await page.keyboard.press("Enter");
  }

  await sleep(randomDelay(2000, 4000));
  console.log(`    Commented: "${text}"`);
  return true;
}

export async function runCommentSession(page: Page): Promise<void> {
  console.log("\n--- COMMENT SESSION ---");
  const state = loadState();
  const todayStats = getTodayStats(state);
  saveState(state);

  const commentsToday = todayStats.comments || 0;
  const remaining = LIMITS.maxCommentsPerDay - commentsToday;

  if (remaining <= 0) {
    console.log("Daily comment limit already reached");
    return;
  }

  // Pick users to comment on
  const users = pickUsersForLiking(state, remaining);
  if (users.length === 0) {
    console.log("No users in pool to comment on. Run scraper first.");
    return;
  }

  console.log(`Will comment on up to ${Math.min(users.length, remaining)} posts`);
  let totalCommented = 0;

  for (const username of users) {
    if (totalCommented >= remaining) break;

    console.log(`  Visiting @${username} for comment...`);
    await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(2000, 4000));

    // Check if private
    const isPrivate = await page.evaluate(() =>
      document.body.innerText.includes("This account is private") ||
      document.body.innerText.includes("Esta cuenta es privada")
    );
    if (isPrivate) {
      console.log(`  @${username} is private, skipping`);
      continue;
    }

    // Get first post
    const firstPost = await page.evaluate(() => {
      const link = document.querySelector("a[href*='/p/']");
      return link ? link.getAttribute("href") : null;
    });

    if (!firstPost) {
      console.log(`  No posts for @${username}`);
      continue;
    }

    const postUrl = `https://www.instagram.com${firstPost}`;
    try {
      const comment = pickComment();
      const success = await commentOnPost(page, postUrl, comment);

      if (success) {
        totalCommented++;
        const freshState = loadState();
        recordComment(freshState, username, postUrl, comment);
        saveState(freshState);
      }
    } catch (err) {
      console.log(`  Error commenting on @${username}: ${err}`);
    }

    await sleep(randomDelay(LIMITS.commentCooldownMin, LIMITS.commentCooldownMax));
  }

  console.log(`Comment session complete: ${totalCommented} comments today`);
}
