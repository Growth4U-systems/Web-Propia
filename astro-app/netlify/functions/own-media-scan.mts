import type { Context } from "@netlify/functions";
import * as cheerio from "cheerio";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const USER_AGENT = "Mozilla/5.0 (compatible; Growth4U-Bot/1.0)";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeFetch(
  url: string,
  timeout = 10000,
): Promise<{ ok: boolean; html: string; headers: Headers }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, html: "", headers: res.headers };
    const html = await res.text();
    return { ok: true, html, headers: res.headers };
  } catch {
    return { ok: false, html: "", headers: new Headers() };
  }
}

function extractTextWordCount(html: string): number {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text ? text.split(/\s+/).filter((w) => w.length > 0).length : 0;
}

// ─── Blog Scanner ────────────────────────────────────────────────────────────

interface BlogPost {
  url: string;
  title: string;
  date: string | null;
  wordCount: number;
  categories: string[];
}

interface BlogAnalysis {
  postCount: number;
  posts: BlogPost[];
  lastPostDate: string | null;
  avgWordCount: number;
  postingFrequency: string;
}

async function scanBlog(origin: string): Promise<BlogAnalysis> {
  const blogPatterns = ["/blog/", "/articulos/", "/recursos/", "/news/"];
  let postUrls: string[] = [];

  // Try sitemap first
  const sitemapRes = await safeFetch(`${origin}/sitemap.xml`, 5000);
  if (sitemapRes.ok) {
    const $ = cheerio.load(sitemapRes.html, { xml: true });
    $("url loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (blogPatterns.some((p) => loc.includes(p))) {
        postUrls.push(loc);
      }
    });
  }

  // If no sitemap results, try scraping blog index pages
  if (postUrls.length === 0) {
    const indexPaths = [
      "/blog",
      "/blog/",
      "/articulos",
      "/recursos",
      "/news",
      "/noticias",
      "/insights",
    ];
    for (const path of indexPaths) {
      const res = await safeFetch(`${origin}${path}`, 5000);
      if (res.ok) {
        const $ = cheerio.load(res.html);
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          const fullUrl = href.startsWith("http")
            ? href
            : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
          if (
            blogPatterns.some((p) => fullUrl.includes(p)) &&
            !fullUrl.endsWith(path) &&
            !fullUrl.endsWith(`${path}/`)
          ) {
            postUrls.push(fullUrl);
          }
        });
        if (postUrls.length > 0) break;
      }
    }
  }

  // Deduplicate
  postUrls = [...new Set(postUrls)];

  // Fetch up to 10 posts
  const postsToFetch = postUrls.slice(0, 10);
  const posts: BlogPost[] = [];

  for (const postUrl of postsToFetch) {
    const res = await safeFetch(postUrl, 8000);
    if (!res.ok) continue;

    const $ = cheerio.load(res.html);

    const title =
      $("h1").first().text().trim() ||
      $("title").first().text().trim() ||
      postUrl;

    // Extract date
    let date: string | null = null;
    const timeTags = $("time[datetime]").first().attr("datetime");
    if (timeTags) {
      date = timeTags;
    } else {
      const metaDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="date"]').attr("content") ||
        $('meta[name="publish-date"]').attr("content");
      if (metaDate) date = metaDate;
    }

    const wordCount = extractTextWordCount(res.html);

    // Extract categories
    const categories: string[] = [];
    $('meta[property="article:tag"]').each((_, el) => {
      const tag = $(el).attr("content");
      if (tag) categories.push(tag);
    });
    $('meta[property="article:section"]').each((_, el) => {
      const section = $(el).attr("content");
      if (section) categories.push(section);
    });

    posts.push({ url: postUrl, title, date, wordCount, categories });
  }

  // Calculate metrics
  const postCount = postUrls.length;
  const dates = posts
    .map((p) => p.date)
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a);

  const lastPostDate = dates.length > 0 ? new Date(dates[0]).toISOString() : null;
  const avgWordCount =
    posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.wordCount, 0) / posts.length)
      : 0;

  // Posting frequency
  let postingFrequency = "none";
  if (postCount > 0 && lastPostDate) {
    const daysSinceLastPost = Math.floor(
      (Date.now() - new Date(lastPostDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastPost <= 14 && postCount >= 4) {
      postingFrequency = "weekly";
    } else if (daysSinceLastPost <= 60 && postCount >= 2) {
      postingFrequency = "monthly";
    } else if (daysSinceLastPost <= 180) {
      postingFrequency = "sporadic";
    } else {
      postingFrequency = "inactive";
    }
  }

  return { postCount, posts, lastPostDate, avgWordCount, postingFrequency };
}

// ─── Social Discovery ────────────────────────────────────────────────────────

interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  tiktok?: string;
}

function discoverSocials(
  $: cheerio.CheerioAPI,
): SocialProfiles {
  const socials: SocialProfiles = {};

  const patterns: { key: keyof SocialProfiles; regex: RegExp }[] = [
    { key: "linkedin", regex: /linkedin\.com\/company/i },
    { key: "twitter", regex: /(?:twitter\.com|x\.com)\//i },
    { key: "instagram", regex: /instagram\.com\//i },
    { key: "youtube", regex: /youtube\.com\/(?:channel|c|@)/i },
    { key: "facebook", regex: /facebook\.com\//i },
    { key: "tiktok", regex: /tiktok\.com\/@/i },
  ];

  // From <a> tags
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    for (const { key, regex } of patterns) {
      if (!socials[key] && regex.test(href)) {
        socials[key] = href;
      }
    }
  });

  // From JSON-LD sameAs
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const sameAs: string[] = Array.isArray(data.sameAs)
        ? data.sameAs
        : data["@graph"]
          ? data["@graph"].flatMap(
              (item: Record<string, unknown>) =>
                Array.isArray(item.sameAs) ? item.sameAs : [],
            )
          : [];
      for (const url of sameAs) {
        if (typeof url !== "string") continue;
        for (const { key, regex } of patterns) {
          if (!socials[key] && regex.test(url)) {
            socials[key] = url;
          }
        }
      }
    } catch {
      // ignore
    }
  });

  return socials;
}

// ─── Tech Stack Detection ────────────────────────────────────────────────────

interface TechStack {
  cms: string[];
  analytics: string[];
  cdn: string[];
  framework: string[];
  hosting: string[];
  tagManager: string[];
}

function detectTechStack(
  html: string,
  headers: Headers,
): TechStack {
  const stack: TechStack = {
    cms: [],
    analytics: [],
    cdn: [],
    framework: [],
    hosting: [],
    tagManager: [],
  };

  // CMS
  const cmsPatterns: [string, RegExp][] = [
    ["WordPress", /wp-content|wp-includes/i],
    ["Shopify", /cdn\.shopify/i],
    ["Wix", /wix\.com|parastorage/i],
    ["Squarespace", /squarespace\.com|static1\.squarespace/i],
    ["Webflow", /webflow\.com/i],
    ["HubSpot", /hubspot\.com|hs-scripts/i],
    ["Ghost", /ghost\.org|ghost\.io/i],
    ["Drupal", /drupal\.org|drupal\.js/i],
  ];
  for (const [name, regex] of cmsPatterns) {
    if (regex.test(html)) stack.cms.push(name);
  }

  // Analytics
  const analyticsPatterns: [string, RegExp][] = [
    ["GA4", /G-[A-Z0-9]+/],
    ["Universal Analytics", /UA-\d+-\d+/],
    ["Hotjar", /hotjar\.com|hj\(/i],
    ["Mixpanel", /mixpanel\.com/i],
    ["Plausible", /plausible\.io/i],
    ["Clarity", /clarity\.ms/i],
    ["Meta Pixel", /fbq\(|facebook\.net\/en_US\/fbevents/i],
    ["LinkedIn Insight", /snap\.licdn\.com|_linkedin_partner_id/i],
  ];
  for (const [name, regex] of analyticsPatterns) {
    if (regex.test(html)) stack.analytics.push(name);
  }

  // CDN
  if (headers.get("cf-ray") || headers.get("server")?.includes("cloudflare")) {
    stack.cdn.push("Cloudflare");
  }
  if (
    html.includes("cloudfront.net") ||
    headers.get("x-amz-cf-id") !== null
  ) {
    stack.cdn.push("CloudFront");
  }
  if (headers.get("x-served-by")?.includes("cache-") || headers.get("via")?.includes("Fastly")) {
    stack.cdn.push("Fastly");
  }

  // Framework
  const frameworkPatterns: [string, RegExp][] = [
    ["Next.js", /__next|_next\//i],
    ["Nuxt", /__nuxt|_nuxt\//i],
    ["Gatsby", /gatsby/i],
    ["React", /react/i],
    ["Vue", /vue\.js|__vue/i],
    ["Angular", /ng-version|angular/i],
  ];
  for (const [name, regex] of frameworkPatterns) {
    if (regex.test(html)) stack.framework.push(name);
  }

  // Hosting
  if (headers.get("x-vercel-id")) {
    stack.hosting.push("Vercel");
  }
  if (headers.get("x-nf-request-id")) {
    stack.hosting.push("Netlify");
  }
  if (headers.get("server")?.includes("GitHub.com")) {
    stack.hosting.push("GitHub Pages");
  }

  // Tag Manager
  if (/GTM-[A-Z0-9]+/.test(html)) {
    stack.tagManager.push("Google Tag Manager");
  }

  return stack;
}

// ─── Schema Types ────────────────────────────────────────────────────────────

function extractSchemaTypes($: cheerio.CheerioAPI): string[] {
  const types: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const extractTypes = (obj: Record<string, unknown>) => {
        if (obj["@type"]) {
          if (Array.isArray(obj["@type"])) {
            types.push(...obj["@type"]);
          } else {
            types.push(obj["@type"] as string);
          }
        }
        if (obj["@graph"] && Array.isArray(obj["@graph"])) {
          for (const item of obj["@graph"]) {
            extractTypes(item as Record<string, unknown>);
          }
        }
      };
      extractTypes(data);
    } catch {
      // ignore
    }
  });
  return [...new Set(types)];
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function calculateScores(
  blog: BlogAnalysis,
  socials: SocialProfiles,
  techStack: TechStack,
  schemaTypes: string[],
  hasSameAs: boolean,
): {
  content: number;
  social: number;
  technical: number;
  overall: number;
} {
  // Content Score (0-100)
  let content = 0;
  if (blog.postCount > 0) content += 30;
  if (blog.postCount >= 50) content += 20;
  else if (blog.postCount >= 20) content += 15;
  else if (blog.postCount >= 10) content += 10;
  else if (blog.postCount >= 1) content += 5;

  if (blog.lastPostDate) {
    const days = Math.floor(
      (Date.now() - new Date(blog.lastPostDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days <= 7) content += 20;
    else if (days <= 30) content += 15;
    else if (days <= 90) content += 10;
    else if (days <= 180) content += 5;
  }

  if (blog.avgWordCount >= 1500) content += 15;
  else if (blog.avgWordCount >= 1000) content += 10;
  else if (blog.avgWordCount >= 500) content += 7;
  else if (blog.avgWordCount > 0) content += 4;

  // Category diversity
  const allCategories = new Set(blog.posts.flatMap((p) => p.categories));
  if (allCategories.size >= 5) content += 15;
  else if (allCategories.size >= 3) content += 10;
  else if (allCategories.size >= 1) content += 5;
  content = Math.min(content, 100);

  // Social Score (0-100)
  const platformCount = Object.keys(socials).length;
  const social = Math.round((platformCount / 6) * 100);

  // Technical Score (0-100)
  let technical = 0;

  // Schema types (critical schemas * 6, max 30)
  const criticalSchemas = [
    "Organization",
    "WebSite",
    "WebPage",
    "Article",
    "BreadcrumbList",
    "FAQPage",
    "Product",
    "LocalBusiness",
  ];
  const foundCritical = schemaTypes.filter((t) =>
    criticalSchemas.includes(t),
  ).length;
  technical += Math.min(foundCritical * 6, 30);

  if (techStack.cms.length > 0) technical += 15;
  if (techStack.analytics.length > 0) technical += 15;
  if (techStack.cdn.length > 0) technical += 10;
  if (techStack.tagManager.length > 0) technical += 10;

  // E-E-A-T author schemas
  const eeatSchemas = ["Person", "Author", "ProfilePage"];
  if (schemaTypes.some((t) => eeatSchemas.includes(t))) {
    technical += 10;
  }

  // sameAs in schema
  if (hasSameAs) technical += 10;
  technical = Math.min(technical, 100);

  const overall = Math.round(
    content * 0.35 + social * 0.3 + technical * 0.35,
  );

  return { content, social, technical, overall };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  try {
    const { url } = (await req.json()) as { url: string };

    if (!url) {
      return Response.json(
        { error: "url is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`;
    }

    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;

    // Fetch main page
    const mainRes = await safeFetch(targetUrl, 15000);
    if (!mainRes.ok) {
      return Response.json(
        { error: `Failed to fetch URL: ${targetUrl}` },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const $ = cheerio.load(mainRes.html);

    // Run analyses
    const [blog, socials, techStack, schemaTypes] = await Promise.all([
      scanBlog(origin),
      Promise.resolve(discoverSocials($)),
      Promise.resolve(detectTechStack(mainRes.html, mainRes.headers)),
      Promise.resolve(extractSchemaTypes($)),
    ]);

    // Check for sameAs in JSON-LD
    let hasSameAs = false;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (data.sameAs) hasSameAs = true;
        if (data["@graph"]) {
          for (const item of data["@graph"] as Record<string, unknown>[]) {
            if (item.sameAs) hasSameAs = true;
          }
        }
      } catch {
        // ignore
      }
    });

    const scores = calculateScores(
      blog,
      socials,
      techStack,
      schemaTypes,
      hasSameAs,
    );

    const result = {
      url: targetUrl,
      scannedAt: new Date().toISOString(),
      blog,
      socials,
      techStack,
      schemaTypes,
      scores,
    };

    return Response.json(result, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
