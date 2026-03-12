import type { Context } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Helpers ──────────────────────────────────────────────────

function stream(encoder: TextEncoder, controller: ReadableStreamDefaultController, type: string, data: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`));
}

/** Run a promise with periodic keepalive SSE heartbeats to prevent connection timeout */
async function withKeepalive<T>(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  promise: Promise<T>,
  intervalMs = 5000,
): Promise<T> {
  const interval = setInterval(() => {
    try {
      controller.enqueue(encoder.encode(`: keepalive\n\n`));
    } catch { /* controller may be closed */ }
  }, intervalMs);
  try {
    return await promise;
  } finally {
    clearInterval(interval);
  }
}

/** Check if hostname is a private/internal IP */
function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".internal")) return true;
  if (hostname.startsWith("[") || hostname === "::1") return true;
  if (hostname.startsWith("127.") || hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("169.254.")) return true;
  // 172.16.0.0/12 = 172.16.* through 172.31.*
  const parts = hostname.split(".");
  if (parts[0] === "172" && parts.length === 4) {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function serperSearch(query: string, num = 10): Promise<{ organic: Array<Record<string, string>> }> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { organic: [] };
  return res.json();
}

async function serperNews(query: string, num = 10): Promise<{ news: Array<Record<string, string>> }> {
  const res = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { news: [] };
  return res.json();
}

async function crawl(url: string): Promise<{ text: string; pages: string[]; title: string; htmlPages: string[] }> {
  const pages: string[] = [];
  const htmlPages: string[] = [];
  let allText = "";
  let title = "";

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const html = await resp.text();
    htmlPages.push(html);

    // Extract <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    allText = text.slice(0, 8000);
    pages.push(resp.url);

    // Extract subpage links
    const linkRegex = /href=["']([^"']+)["']/gi;
    const origin = new URL(url).origin;
    const subpages: string[] = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith("/") && !href.startsWith("//")) {
        const full = origin + href;
        if (!subpages.includes(full) && full !== url && !full.includes("#")) {
          subpages.push(full);
        }
      }
    }

    for (const sub of subpages.slice(0, 3)) {
      try {
        const subResp = await fetch(sub, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(8_000),
        });
        const subHtml = await subResp.text();
        htmlPages.push(subHtml);
        const subText = subHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (subText.length > 100) {
          allText += "\n\n---\n\n" + subText.slice(0, 2000);
          pages.push(sub);
        }
      } catch (e) { console.warn("Subpage crawl failed:", sub, e); }
    }
  } catch (e) {
    console.warn("Crawl failed, using Serper fallback:", e);
    try {
      const results = await serperSearch(`site:${new URL(url).hostname}`, 10);
      allText = (results.organic || []).map(r => `${r.title}: ${r.snippet}`).join("\n").slice(0, 8000);
      pages.push(url + " (via serper fallback)");
    } catch (e2) { console.warn("Serper fallback also failed:", e2); }
  }

  return { text: allText.slice(0, 12000), pages, title, htmlPages };
}

// ── SEO Technical Audit (adapted from SanchoCMO seo-audit skill) ──

interface SeoSignals {
  // Meta tags
  title: { present: boolean; content: string; length: number };
  meta_description: { present: boolean; content: string; length: number };
  canonical: { present: boolean; url: string };
  meta_robots: { present: boolean; content: string };
  // Open Graph
  og_tags: { title: boolean; description: boolean; image: boolean };
  // Heading structure
  h1: { count: number; contents: string[] };
  h2_count: number;
  // Technical
  https: boolean;
  viewport: boolean;
  lang: string | null;
  schema_types: string[];
  // Images
  images: { total: number; with_alt: number; without_alt: number };
  // Links
  internal_links: number;
  external_links: number;
  // Server-side checks
  robots_txt: { accessible: boolean; content: string; has_sitemap_ref: boolean };
  sitemap: { accessible: boolean; url_count: number; urls: string[] };
  // Analytics & tracking
  analytics: {
    ga4: boolean;
    gtm: boolean;
    meta_pixel: boolean;
    hotjar: boolean;
    clarity: boolean;
    hubspot: boolean;
    intercom: boolean;
    segment: boolean;
    other_trackers: string[];
  };
}

function extractSeoSignals(html: string, url: string): Omit<SeoSignals, "robots_txt" | "sitemap"> {
  const parsedUrl = new URL(url);

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleContent = titleMatch?.[1]?.trim() || "";

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const descContent = descMatch?.[1]?.trim() || "";

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);

  // Meta robots
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);

  // Open Graph
  const ogTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
  const ogDesc = /<meta[^>]*property=["']og:description["']/i.test(html);
  const ogImage = /<meta[^>]*property=["']og:image["']/i.test(html);

  // Headings
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h1Contents = h1Matches.map(h => h.replace(/<[^>]+>/g, "").trim());
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;

  // Schema.org / JSON-LD types
  const schemaTypes: string[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let schemaMatch;
  while ((schemaMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(schemaMatch[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"]) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          schemaTypes.push(...types);
        }
      }
    } catch (e) { console.warn("Invalid JSON-LD:", e); }
  }

  // Images
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const withAlt = imgTags.filter(img => /alt=["'][^"']+["']/i.test(img)).length;

  // Links
  const linkMatches = html.match(/href=["']([^"']+)["']/gi) || [];
  const origin = parsedUrl.origin;
  let internal = 0, external = 0;
  for (const l of linkMatches) {
    const href = l.match(/href=["']([^"']+)["']/i)?.[1] || "";
    if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (href.startsWith("/") || href.startsWith(origin)) {
      internal++;
    } else if (href.startsWith("http")) {
      external++;
    }
  }

  // Viewport
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);

  // Lang
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);

  // Analytics & tracking detection (from SanchoCMO analytics-tracking skill)
  const hasGA4 = /gtag\(|G-[A-Z0-9]+|googletagmanager\.com\/gtag/i.test(html);
  const hasGTM = /GTM-[A-Z0-9]+|googletagmanager\.com\/gtm/i.test(html);
  const hasMetaPixel = /fbq\(|facebook\.com\/tr|connect\.facebook\.net\/en_US\/fbevents/i.test(html);
  const hasHotjar = /hotjar\.com|hj\(|_hjSettings/i.test(html);
  const hasClarity = /clarity\.ms|microsoft\.com\/clarity/i.test(html);
  const hasHubspot = /js\.hs-scripts\.com|hs-banner\.com|hubspot\.com/i.test(html);
  const hasIntercom = /intercom\.io|intercomSettings|Intercom\(/i.test(html);
  const hasSegment = /cdn\.segment\.com|analytics\.js|segment\.io/i.test(html);

  const otherTrackers: string[] = [];
  if (/plausible\.io/i.test(html)) otherTrackers.push("Plausible");
  if (/fathom\.js|usefathom\.com/i.test(html)) otherTrackers.push("Fathom");
  if (/mixpanel\.com|mixpanel\.init/i.test(html)) otherTrackers.push("Mixpanel");
  if (/amplitude\.com|amplitude\.init/i.test(html)) otherTrackers.push("Amplitude");
  if (/heap\.io|heap\.load/i.test(html)) otherTrackers.push("Heap");
  if (/posthog\.com|posthog\.init/i.test(html)) otherTrackers.push("PostHog");
  if (/crisp\.chat/i.test(html)) otherTrackers.push("Crisp");
  if (/drift\.com|driftt\.com/i.test(html)) otherTrackers.push("Drift");
  if (/tawk\.to/i.test(html)) otherTrackers.push("Tawk.to");
  if (/linkedin\.com\/insight|snap\.licdn\.com/i.test(html)) otherTrackers.push("LinkedIn Insight");
  if (/ads\.twitter\.com|static\.ads-twitter\.com/i.test(html)) otherTrackers.push("Twitter Ads");
  if (/googleads\.g\.doubleclick\.net|google-analytics\.com|adservice\.google/i.test(html)) otherTrackers.push("Google Ads");

  return {
    title: { present: !!titleContent, content: titleContent, length: titleContent.length },
    meta_description: { present: !!descContent, content: descContent, length: descContent.length },
    canonical: { present: !!canonicalMatch, url: canonicalMatch?.[1] || "" },
    meta_robots: { present: !!robotsMatch, content: robotsMatch?.[1] || "" },
    og_tags: { title: ogTitle, description: ogDesc, image: ogImage },
    h1: { count: h1Contents.length, contents: h1Contents },
    h2_count: h2Count,
    https: parsedUrl.protocol === "https:",
    viewport: hasViewport,
    lang: langMatch?.[1] || null,
    schema_types: schemaTypes,
    images: { total: imgTags.length, with_alt: withAlt, without_alt: imgTags.length - withAlt },
    internal_links: internal,
    external_links: external,
    analytics: {
      ga4: hasGA4,
      gtm: hasGTM,
      meta_pixel: hasMetaPixel,
      hotjar: hasHotjar,
      clarity: hasClarity,
      hubspot: hasHubspot,
      intercom: hasIntercom,
      segment: hasSegment,
      other_trackers: otherTrackers,
    },
  };
}

async function checkRobotsSitemap(origin: string): Promise<{ robots_txt: SeoSignals["robots_txt"]; sitemap: SeoSignals["sitemap"] }> {
  const results = {
    robots_txt: { accessible: false, content: "", has_sitemap_ref: false },
    sitemap: { accessible: false, url_count: 0, urls: [] as string[] },
  };

  // Check robots.txt
  try {
    const robotsResp = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5_000) });
    if (robotsResp.ok) {
      const content = await robotsResp.text();
      if (content.length < 50_000 && !content.includes("<!DOCTYPE") && !content.includes("<html")) {
        results.robots_txt = {
          accessible: true,
          content: content.slice(0, 2000),
          has_sitemap_ref: /sitemap/i.test(content),
        };
      }
    }
  } catch { /* timeout or network error */ }

  // Check sitemap.xml
  try {
    const sitemapResp = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5_000) });
    if (sitemapResp.ok) {
      const content = await sitemapResp.text();
      if (content.includes("<urlset") || content.includes("<sitemapindex")) {
        const urlMatches = content.match(/<loc>([^<]+)<\/loc>/gi) || [];
        const urls = urlMatches.map(m => m.replace(/<\/?loc>/gi, "")).slice(0, 50);
        results.sitemap = {
          accessible: true,
          url_count: urlMatches.length,
          urls,
        };
      }
    }
  } catch { /* timeout or network error */ }

  return results;
}

// ── Social Profile Extraction (adapted from SanchoCMO smart-discovery) ──

type SocialPlatform = "linkedin" | "instagram" | "facebook" | "twitter" | "youtube" | "tiktok";

interface DiscoveredProfile {
  platform: SocialPlatform;
  url: string;
  handle: string;
  confidence: "high" | "medium";
}

const SOCIAL_PATTERNS: Array<{
  platform: SocialPlatform;
  patterns: RegExp[];
  handleExtractor: (url: string) => string;
}> = [
  {
    platform: "linkedin",
    patterns: [/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+\/?/g],
    handleExtractor: (url) => url.match(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/)?.[1] || "",
  },
  {
    platform: "instagram",
    patterns: [/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?/g],
    handleExtractor: (url) => url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/)?.[1] || "",
  },
  {
    platform: "facebook",
    patterns: [/https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?/g],
    handleExtractor: (url) => url.match(/facebook\.com\/([a-zA-Z0-9._-]+)/)?.[1] || "",
  },
  {
    platform: "twitter",
    patterns: [/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/?/g],
    handleExtractor: (url) => url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/)?.[1] || "",
  },
  {
    platform: "youtube",
    patterns: [/https?:\/\/(?:www\.)?youtube\.com\/(?:@[a-zA-Z0-9_-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+)\/?/g],
    handleExtractor: (url) => {
      const m = url.match(/youtube\.com\/(?:@([a-zA-Z0-9_-]+)|channel\/([a-zA-Z0-9_-]+)|c\/([a-zA-Z0-9_-]+))/);
      return m?.[1] || m?.[2] || m?.[3] || "";
    },
  },
  {
    platform: "tiktok",
    patterns: [/https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?/g],
    handleExtractor: (url) => url.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/)?.[1] || "",
  },
];

const EXCLUDED_HANDLES = new Set([
  "share", "sharer", "intent", "hashtag", "home", "watch", "results",
  "login", "signup", "about", "help", "settings", "explore", "trending",
  "channel", "user", "p", "reel", "stories", "direct",
]);

function extractSocialFromHtml(html: string, seen: Set<SocialPlatform>): DiscoveredProfile[] {
  const profiles: DiscoveredProfile[] = [];
  for (const config of SOCIAL_PATTERNS) {
    if (seen.has(config.platform)) continue;
    for (const pattern of config.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[0].replace(/\/$/, "");
        const handle = config.handleExtractor(url);
        if (handle && !EXCLUDED_HANDLES.has(handle.toLowerCase())) {
          seen.add(config.platform);
          profiles.push({ platform: config.platform, url, handle, confidence: "high" });
          break;
        }
      }
    }
  }
  return profiles;
}

function extractSocialFromJsonLd(html: string, seen: Set<SocialPlatform>): DiscoveredProfile[] {
  const profiles: DiscoveredProfile[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const sameAs = item.sameAs || [];
        const urls = Array.isArray(sameAs) ? sameAs : [sameAs];
        for (const url of urls) {
          if (typeof url !== "string") continue;
          for (const config of SOCIAL_PATTERNS) {
            if (seen.has(config.platform)) continue;
            for (const p of config.patterns) {
              p.lastIndex = 0;
              if (p.test(url)) {
                const handle = config.handleExtractor(url);
                if (handle && !EXCLUDED_HANDLES.has(handle.toLowerCase())) {
                  seen.add(config.platform);
                  profiles.push({ platform: config.platform, url: url.replace(/\/$/, ""), handle, confidence: "high" });
                }
              }
            }
          }
        }
      }
    } catch (e) { console.warn("Invalid JSON-LD:", e); }
  }
  return profiles;
}

/** Extract all social profiles from multiple HTML pages */
function discoverSocialProfiles(htmlPages: string[]): DiscoveredProfile[] {
  const seen = new Set<SocialPlatform>();
  const profiles: DiscoveredProfile[] = [];
  for (const html of htmlPages) {
    profiles.push(...extractSocialFromHtml(html, seen));
    profiles.push(...extractSocialFromJsonLd(html, seen));
  }
  return profiles;
}

// ── Brand Name Detection (heuristic) ──────────────────────────

function detectBrandName(title: string, domain: string): string {
  const domainPrefix = domain.split(".")[0];

  if (title) {
    // Split on common title separators
    const segment = title.split(/\s[-|—·:]\s|\s[-|—·:]|[-|—·:]\s/)[0].trim();
    if (segment.length > 0 && segment.length < 60) {
      // If the segment looks like a domain (contains dot), use domain prefix instead
      if (segment.includes(".") && !segment.includes(" ")) {
        return domainPrefix.charAt(0).toUpperCase() + domainPrefix.slice(1);
      }
      return segment;
    }
  }

  // Fallback: capitalize the domain prefix
  return domainPrefix.charAt(0).toUpperCase() + domainPrefix.slice(1);
}

// ── Heuristic Scoring ─────────────────────────────────────────

const SKIP_DOMAINS = new Set([
  "g2.com", "capterra.com", "clutch.co", "trustpilot.com", "linkedin.com",
  "facebook.com", "twitter.com", "x.com", "youtube.com", "wikipedia.org",
  "medium.com", "reddit.com", "hubspot.com", "google.com", "bing.com",
  "sortlist.com", "appvizer.com", "comparably.com", "goodfirms.co",
  "themanifest.com", "designrush.com", "pinterest.com", "tiktok.com",
  "quora.com", "amazon.com", "indeed.com", "glassdoor.com",
]);

function cap100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

interface ScoringData {
  thirdPartyMentions: number;
  newsMentions: number;
  ownDomainInTop10: number;
  brandInCategory: boolean;
  indexedPages: number;
  sitemapUrlCount: number;
  reviewSiteMentions: number;
  hasG2: boolean;
  hasTrustpilot: boolean;
  hasCapterra: boolean;
  hasCrunchbase: boolean;
  socialProfileCount: number;
  founderLinkedInFound: boolean;
  seoData: SeoSignals;
  content: string;
  allLinks: string[];
  hasBlog: boolean;
}

function scoreBorrowedTrust(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  if (d.thirdPartyMentions > 0) { score += 15; }
  if (d.thirdPartyMentions > 3) { score += 10; }
  if (d.thirdPartyMentions > 7) { score += 10; }
  if (d.newsMentions > 0) { score += 15; }
  if (d.newsMentions > 3) { score += 10; }
  if (d.hasG2 || d.hasTrustpilot || d.hasCapterra) { score += 10; }
  if (d.hasCrunchbase) { score += 10; }
  if (d.brandInCategory) { score += 10; }

  // Findings
  if (d.thirdPartyMentions > 0) {
    findings.push(`${d.thirdPartyMentions} menciones de terceros encontradas en Google`);
  } else {
    findings.push("Sin menciones de terceros en Google");
  }

  if (d.newsMentions > 0) {
    findings.push(`${d.newsMentions} menciones en Google News`);
  } else {
    findings.push("Sin menciones en Google News");
  }

  const reviewPlatforms: string[] = [];
  if (d.hasG2) reviewPlatforms.push("G2");
  if (d.hasTrustpilot) reviewPlatforms.push("Trustpilot");
  if (d.hasCapterra) reviewPlatforms.push("Capterra");
  if (d.hasCrunchbase) reviewPlatforms.push("Crunchbase");
  if (reviewPlatforms.length > 0) {
    findings.push(`Presente en: ${reviewPlatforms.join(", ")}`);
  } else {
    findings.push("No encontrada en plataformas de review (G2, Trustpilot, Capterra, Crunchbase)");
  }

  return { score: cap100(score), findings };
}

function scoreSerpTrust(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  if (d.ownDomainInTop10 >= 1) { score += 15; }
  if (d.ownDomainInTop10 >= 3) { score += 10; }
  if (d.ownDomainInTop10 >= 5) { score += 10; }
  if (d.brandInCategory) { score += 15; }
  if (d.indexedPages > 5) { score += 10; }
  if (d.sitemapUrlCount > 20) { score += 10; }
  if (d.reviewSiteMentions > 0) { score += 10; }
  // No negative sentiment check — assume positive if no negative signals
  score += 10;

  findings.push(`Dominio propio aparece ${d.ownDomainInTop10} veces en top 10 para búsqueda de marca`);
  findings.push(d.brandInCategory
    ? "La marca aparece en resultados de búsqueda de categoría"
    : "La marca NO aparece en resultados de búsqueda de categoría");
  findings.push(`${d.indexedPages} páginas indexadas encontradas en Google${d.sitemapUrlCount > 0 ? `, ${d.sitemapUrlCount} URLs en sitemap` : ""}`);

  return { score: cap100(score), findings };
}

function scoreBrandAssets(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  // +10 per social profile, max +40
  const socialBonus = Math.min(40, d.socialProfileCount * 10);
  score += socialBonus;

  if (d.founderLinkedInFound) { score += 15; }
  if (d.hasG2 || d.hasTrustpilot || d.hasCapterra) { score += 10; }
  if (d.seoData.schema_types.includes("Organization") || d.seoData.schema_types.includes("LocalBusiness")) { score += 10; }
  if (d.seoData.og_tags.title && d.seoData.og_tags.image) { score += 15; }

  findings.push(`${d.socialProfileCount} perfiles sociales detectados`);
  findings.push(d.founderLinkedInFound
    ? "LinkedIn del fundador/CEO encontrado en Google"
    : "LinkedIn del fundador/CEO no encontrado");
  findings.push(d.seoData.og_tags.title && d.seoData.og_tags.image
    ? "Open Graph configurado (title + image)"
    : "Open Graph incompleto — los shares en redes sociales no se verán bien");

  return { score: cap100(score), findings };
}

function scoreGeoPresence(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  if (d.brandInCategory) { score += 15; }
  if (d.seoData.schema_types.length > 0) { score += 10; }
  if (d.indexedPages > 10) { score += 10; }
  if (d.thirdPartyMentions > 3) { score += 10; }
  if (d.hasG2 || d.hasTrustpilot || d.hasCapterra) { score += 10; }
  if (d.newsMentions > 0) { score += 10; }
  if (d.socialProfileCount >= 3) { score += 10; }
  if (d.hasBlog) { score += 15; }

  findings.push(d.brandInCategory
    ? "La marca aparece en resultados de categoría, aumentando probabilidad de citación por IAs"
    : "La marca NO aparece en resultados de categoría — baja probabilidad de ser citada por IAs");
  findings.push(d.hasBlog
    ? "Blog/sección de contenidos detectada — señal positiva para indexación por LLMs"
    : "No se detectó blog o sección de contenidos — los LLMs priorizan marcas con contenido publicado");
  findings.push(d.seoData.schema_types.length > 0
    ? `Datos estructurados detectados (${d.seoData.schema_types.join(", ")}) — facilita la comprensión por IAs`
    : "Sin datos estructurados (schema.org) — dificulta la comprensión por IAs");

  return { score: cap100(score), findings };
}

function scoreOutboundReadiness(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  const titleGoodLength = d.seoData.title.present && d.seoData.title.length >= 30 && d.seoData.title.length <= 60;
  if (titleGoodLength) { score += 15; }
  else if (d.seoData.title.present) { score += 8; }

  const descGoodLength = d.seoData.meta_description.present && d.seoData.meta_description.length >= 120 && d.seoData.meta_description.length <= 160;
  if (descGoodLength) { score += 15; }
  else if (d.seoData.meta_description.present) { score += 8; }

  if (d.seoData.h1.count === 1) { score += 10; }

  const ctaKeywords = /contacto|demo|prueba|registro|signup|trial|contact|book|agendar|reservar|solicitar|empezar/i;
  if (ctaKeywords.test(d.content)) { score += 10; }

  if (d.seoData.og_tags.title && d.seoData.og_tags.description && d.seoData.og_tags.image) { score += 10; }

  if (d.hasBlog) { score += 10; }

  const leadCaptureKeywords = /formulario|newsletter|suscrib|email.*input|input.*email|lead.*magnet|descarg|ebook|whitepaper|guía gratuita|free guide/i;
  if (leadCaptureKeywords.test(d.content)) { score += 10; }

  if (d.seoData.h2_count > 2) { score += 10; }

  // Findings
  if (d.seoData.title.present) {
    findings.push(`Title tag presente (${d.seoData.title.length} chars)${titleGoodLength ? " con longitud óptima" : d.seoData.title.length < 30 ? " — demasiado corto" : " — demasiado largo"}`);
  } else {
    findings.push("Sin title tag — problema grave de SEO y conversión");
  }

  if (d.seoData.meta_description.present) {
    findings.push(`Meta description presente (${d.seoData.meta_description.length} chars)${descGoodLength ? " con longitud óptima" : ""}`);
  } else {
    findings.push("Sin meta description — reduce CTR en Google");
  }

  if (ctaKeywords.test(d.content)) {
    findings.push("CTAs detectados en el contenido (contacto/demo/prueba)");
  } else {
    findings.push("No se detectaron CTAs claros en el contenido");
  }

  return { score: cap100(score), findings };
}

function scoreDemandEngine(d: ScoringData): { score: number; findings: string[] } {
  let score = 10;
  const findings: string[] = [];

  if (d.seoData.https) { score += 10; }
  if (d.seoData.robots_txt.accessible) { score += 10; }
  if (d.seoData.sitemap.accessible) { score += 10; }
  if (d.seoData.canonical.present) { score += 10; }
  if (d.seoData.schema_types.length > 0) { score += 10; }
  if (d.seoData.analytics.ga4 || d.seoData.analytics.gtm) { score += 10; }
  if (d.seoData.analytics.meta_pixel || d.seoData.analytics.other_trackers.some(t => /ads|twitter ads|linkedin insight/i.test(t))) { score += 10; }
  if (d.seoData.analytics.hotjar || d.seoData.analytics.clarity) { score += 10; }
  if (d.seoData.analytics.hubspot || d.seoData.analytics.intercom || d.seoData.analytics.other_trackers.some(t => /crisp|drift|tawk/i.test(t))) { score += 10; }
  if (d.seoData.viewport) { score += 10; }

  // Analytics finding
  const detectedTrackers: string[] = [];
  if (d.seoData.analytics.ga4) detectedTrackers.push("GA4");
  if (d.seoData.analytics.gtm) detectedTrackers.push("GTM");
  if (d.seoData.analytics.meta_pixel) detectedTrackers.push("Meta Pixel");
  if (d.seoData.analytics.hotjar) detectedTrackers.push("Hotjar");
  if (d.seoData.analytics.clarity) detectedTrackers.push("Clarity");
  if (d.seoData.analytics.hubspot) detectedTrackers.push("HubSpot");
  if (d.seoData.analytics.intercom) detectedTrackers.push("Intercom");
  detectedTrackers.push(...d.seoData.analytics.other_trackers);

  if (detectedTrackers.length > 0) {
    findings.push(`Analytics detectados: ${detectedTrackers.join(", ")}`);
  } else {
    findings.push("Sin analytics detectados — no se puede medir ni optimizar nada");
  }

  // Technical SEO finding
  const techItems: string[] = [];
  if (d.seoData.robots_txt.accessible) techItems.push("robots.txt");
  if (d.seoData.sitemap.accessible) techItems.push(`sitemap (${d.seoData.sitemap.url_count} URLs)`);
  if (d.seoData.canonical.present) techItems.push("canonical");
  if (d.seoData.schema_types.length > 0) techItems.push("schema.org");
  if (techItems.length > 0) {
    findings.push(`SEO técnico: ${techItems.join(", ")}`);
  } else {
    findings.push("SEO técnico mínimo — sin robots.txt, sitemap, canonical ni schema");
  }

  findings.push(d.seoData.https ? "HTTPS activo" : "Sin HTTPS — problema grave de seguridad y SEO");

  return { score: cap100(score), findings };
}

// ── Main Handler ─────────────────────────────────────────────

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return new Response("", { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  let body: { url?: string; name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  if (!body.url?.trim()) return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

  const fullUrl = body.url.startsWith("http") ? body.url : `https://${body.url}`;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fullUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  // SSRF protection
  const hostname = parsedUrl.hostname;
  if (isPrivateHost(hostname)) {
    return new Response(JSON.stringify({ error: "Private URLs not allowed" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const domain = hostname.replace("www.", "");

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Crawl
        stream(encoder, controller, "step", { step: "crawl", message: `Crawling ${fullUrl}...` });
        const { text: content, pages, title, htmlPages } = await crawl(fullUrl);
        for (const p of pages) {
          stream(encoder, controller, "detail", { message: `  GET ${p}` });
        }
        stream(encoder, controller, "detail", { message: `  ✓ ${content.length} chars extraídos` });
        if (title) {
          stream(encoder, controller, "detail", { message: `  Title: "${title}"` });
        }

        // Step 1.5: SEO Technical Audit
        stream(encoder, controller, "step", { step: "seo", message: "Auditoría SEO técnica..." });
        const seoHtml = htmlPages[0] || "";
        const seoSignals = extractSeoSignals(seoHtml, fullUrl);
        const { robots_txt, sitemap } = await checkRobotsSitemap(new URL(fullUrl).origin);
        const seoData: SeoSignals = { ...seoSignals, robots_txt, sitemap };

        // Stream SEO findings
        const seoIcon = (ok: boolean) => ok ? "✅" : "❌";
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.https)} HTTPS` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.title.present)} Title (${seoData.title.length} chars): "${seoData.title.content.slice(0, 60)}"` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.meta_description.present)} Meta description (${seoData.meta_description.length} chars)` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.h1.count === 1)} H1 tags: ${seoData.h1.count}${seoData.h1.count > 0 ? ` → "${seoData.h1.contents[0]?.slice(0, 50)}"` : ""}` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.canonical.present)} Canonical tag` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.viewport)} Viewport meta` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.og_tags.title && seoData.og_tags.image)} Open Graph (title: ${seoData.og_tags.title}, desc: ${seoData.og_tags.description}, img: ${seoData.og_tags.image})` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.schema_types.length > 0)} Schema.org: ${seoData.schema_types.length > 0 ? seoData.schema_types.join(", ") : "ninguno"}` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.robots_txt.accessible)} robots.txt${seoData.robots_txt.accessible ? ` (sitemap ref: ${seoData.robots_txt.has_sitemap_ref ? "SÍ" : "NO"})` : ""}` });
        stream(encoder, controller, "detail", { message: `  ${seoIcon(seoData.sitemap.accessible)} sitemap.xml${seoData.sitemap.accessible ? ` (${seoData.sitemap.url_count} URLs)` : ""}` });
        stream(encoder, controller, "detail", { message: `  Imágenes: ${seoData.images.total} total, ${seoData.images.with_alt} con alt, ${seoData.images.without_alt} sin alt` });
        stream(encoder, controller, "detail", { message: `  Links internos: ${seoData.internal_links} | externos: ${seoData.external_links}` });
        if (seoData.lang) stream(encoder, controller, "detail", { message: `  Idioma: ${seoData.lang}` });
        // Analytics detection
        const trackers = [
          seoData.analytics.ga4 && "GA4",
          seoData.analytics.gtm && "GTM",
          seoData.analytics.meta_pixel && "Meta Pixel",
          seoData.analytics.hotjar && "Hotjar",
          ...seoData.analytics.other_trackers,
        ].filter(Boolean);
        stream(encoder, controller, "detail", { message: `  ${seoIcon(trackers.length > 0)} Analytics: ${trackers.length > 0 ? trackers.join(", ") : "ninguno detectado"}` });

        // Step 2: Detect brand name (heuristic from title/meta/domain)
        stream(encoder, controller, "step", { step: "sector", message: "Detectando marca..." });
        const brandName = detectBrandName(title, domain);
        const categorySearchQuery = `"${brandName}" alternatives competitors`;

        stream(encoder, controller, "detail", { message: `  Marca: ${brandName}` });
        stream(encoder, controller, "detail", { message: `  Sector: sector desconocido` });
        stream(encoder, controller, "detail", { message: `  Búsqueda categoría: ${categorySearchQuery}` });

        // Step 3: SERP — Brand queries + Category queries
        const serpQueries = [
          { label: "Búsqueda de marca", q: `"${brandName}"` },
          { label: "Menciones terceros", q: `"${brandName}" -site:${domain}` },
          { label: "Reviews y comparativas", q: `"${brandName}" (review OR comparativa OR vs OR alternativa OR opiniones)` },
          { label: "Búsqueda de categoría", q: categorySearchQuery },
          { label: "Indexación del sitio", q: `site:${domain}` },
        ];

        // Run all SERP queries in parallel for speed
        stream(encoder, controller, "step", { step: "serp", message: `Ejecutando ${serpQueries.length} búsquedas SERP en paralelo...` });
        const serpPromises = serpQueries.map(sq => serperSearch(sq.q, 10));
        const serpDataResults = await Promise.all(serpPromises);

        const serpResults: Record<string, Array<Record<string, string>>> = {};
        for (let i = 0; i < serpQueries.length; i++) {
          const sq = serpQueries[i];
          const results = serpDataResults[i].organic || [];
          serpResults[sq.label] = results;
          stream(encoder, controller, "step", { step: "serp", message: `SERP: ${sq.label}` });
          stream(encoder, controller, "detail", { message: `  Query: ${sq.q}` });
          stream(encoder, controller, "detail", { message: `  ${results.length} resultados encontrados` });
          for (const r of results.slice(0, 5)) {
            stream(encoder, controller, "detail", { message: `  → ${r.title?.slice(0, 70)}` });
            stream(encoder, controller, "detail", { message: `    ${r.link}` });
          }
          if (results.length > 5) {
            stream(encoder, controller, "detail", { message: `  ... +${results.length - 5} más` });
          }
        }

        // Check if brand appears in category search results
        const categoryResults = serpResults["Búsqueda de categoría"] || [];
        const brandInCategory = categoryResults.some(r =>
          r.title?.toLowerCase().includes(brandName.toLowerCase()) ||
          r.link?.includes(domain) ||
          r.snippet?.toLowerCase().includes(brandName.toLowerCase())
        );
        stream(encoder, controller, "detail", { message: `  ✓ Marca en resultados de categoría: ${brandInCategory ? "SÍ" : "NO"}` });

        stream(encoder, controller, "step", { step: "serp", message: "Google News..." });
        const newsData = await serperNews(`"${brandName}"`, 10);
        const newsResults = newsData.news || [];
        stream(encoder, controller, "detail", { message: `  ${newsResults.length} noticias encontradas` });
        for (const n of newsResults.slice(0, 3)) {
          stream(encoder, controller, "detail", { message: `  → [${n.source || "?"}] ${n.title?.slice(0, 60)}` });
        }

        // Step 4: Social profiles (HTML first, Serper fallback) + review platforms
        stream(encoder, controller, "step", { step: "social", message: "Extrayendo perfiles sociales del sitio web..." });

        // Phase 1: Extract social links from crawled HTML (high confidence)
        const discoveredProfiles = discoverSocialProfiles(htmlPages);
        for (const p of discoveredProfiles) {
          stream(encoder, controller, "detail", { message: `  ✅ ${p.platform} (del sitio): ${p.url}` });
        }

        // Phase 2: Serper fallback for social platforms NOT found in HTML
        const foundPlatforms = new Set(discoveredProfiles.map(p => p.platform));
        const socialFallbacks: Array<{ platform: string; q: string }> = [];
        if (!foundPlatforms.has("linkedin")) socialFallbacks.push({ platform: "LinkedIn", q: `site:linkedin.com/company "${domain}"` });
        if (!foundPlatforms.has("twitter")) socialFallbacks.push({ platform: "Twitter/X", q: `site:twitter.com "${domain}" OR site:x.com "${domain}"` });
        if (!foundPlatforms.has("youtube")) socialFallbacks.push({ platform: "YouTube", q: `site:youtube.com "${domain}" OR site:youtube.com "${brandName}"` });
        if (!foundPlatforms.has("instagram")) socialFallbacks.push({ platform: "Instagram", q: `site:instagram.com "${domain}"` });

        // Phase 3: Review platforms (always via Serper — not in HTML)
        const reviewChecks = [
          { platform: "G2", q: `site:g2.com "${brandName}"` },
          { platform: "Trustpilot", q: `site:trustpilot.com "${brandName}"` },
          { platform: "Capterra", q: `site:capterra.com "${brandName}"` },
          { platform: "Crunchbase", q: `site:crunchbase.com "${brandName}"` },
        ];

        // Phase 4: Founder LinkedIn visibility — skip since we have no founder name without LLM
        // (We cannot detect founder name heuristically)

        // Run all Serper checks in parallel (fallback socials + reviews)
        const allChecks = [...socialFallbacks, ...reviewChecks];
        if (socialFallbacks.length > 0) {
          stream(encoder, controller, "step", { step: "social", message: `Buscando ${socialFallbacks.length} perfiles no encontrados en HTML + reviews...` });
        } else {
          stream(encoder, controller, "step", { step: "social", message: "Verificando plataformas de reviews..." });
        }

        const checkPromises = allChecks.map(c => serperSearch(c.q, 3));
        const checkResults = await Promise.all(checkPromises);

        const socialPresence: Record<string, { found: boolean; url?: string; snippet?: string; confidence?: string }> = {};

        // Add HTML-discovered profiles (high confidence)
        for (const p of discoveredProfiles) {
          socialPresence[p.platform] = { found: true, url: p.url, confidence: "high" };
        }

        // Add Serper results (fallback socials + reviews)
        for (let i = 0; i < allChecks.length; i++) {
          const check = allChecks[i];
          const results = checkResults[i].organic || [];
          const found = results.length > 0;
          const isFallback = i < socialFallbacks.length;
          socialPresence[check.platform] = {
            found,
            url: results[0]?.link,
            snippet: results[0]?.snippet?.slice(0, 100),
            confidence: isFallback ? "medium" : undefined,
          };
          const icon = found ? "✅" : "❌";
          const source = isFallback ? " (Serper)" : "";
          stream(encoder, controller, "detail", { message: `  ${icon} ${check.platform}${source}: ${found ? results[0]?.link : "No encontrado"}` });
        }

        const ownDomainCount = (serpResults["Búsqueda de marca"] || []).filter(r => r.link?.includes(domain)).length;
        const indexedPages = (serpResults["Indexación del sitio"] || []).length;

        stream(encoder, controller, "step", { step: "serp", message: "Resumen SERP" });
        stream(encoder, controller, "detail", { message: `  Dominio propio en top 10: ${ownDomainCount} resultados` });
        stream(encoder, controller, "detail", { message: `  Páginas indexadas: ${indexedPages}+ encontradas` });
        stream(encoder, controller, "detail", { message: `  Menciones terceros: ${(serpResults["Menciones terceros"] || []).length} resultados` });
        stream(encoder, controller, "detail", { message: `  Reviews/comparativas: ${(serpResults["Reviews y comparativas"] || []).length} resultados` });
        stream(encoder, controller, "detail", { message: `  Noticias: ${newsResults.length} resultados` });
        stream(encoder, controller, "detail", { message: `  Aparece en búsqueda de categoría: ${brandInCategory ? "SÍ" : "NO"}` });

        // Step 5: GEO — heuristic based on SERP signals (no LLM calls)
        stream(encoder, controller, "step", { step: "geo", message: "Evaluando presencia GEO (heurística basada en señales SERP)..." });

        const brandMentionedByLlm = brandInCategory;
        const competitorsMentioned: string[] = [];
        for (const r of categoryResults) {
          if (!r.link?.includes(domain) && r.link) {
            try {
              const compUrl = new URL(r.link);
              const compDom = compUrl.hostname.replace(/^www\./, "");
              if (!SKIP_DOMAINS.has(compDom)) {
                const name = r.title?.split(/[-–|·:]/)[0]?.trim() || compDom;
                if (!competitorsMentioned.includes(name)) {
                  competitorsMentioned.push(name);
                }
              }
            } catch { /* skip invalid URLs */ }
          }
        }

        stream(encoder, controller, "detail", { message: `  Marca probable en LLMs (basado en SERP): ${brandMentionedByLlm ? "SÍ" : "NO"}` });
        if (competitorsMentioned.length > 0) {
          stream(encoder, controller, "detail", { message: `  Competidores en resultados de categoría: ${competitorsMentioned.slice(0, 5).join(", ")}` });
        }

        // Step 6: Competitor mini-analysis — pick first non-directory domain from category SERP
        let competitorData: { name: string; website: string; brand_serp: number; category_serp: boolean; indexed_pages: number; has_g2: boolean; has_trustpilot: boolean; social_profiles: number } | null = null;

        stream(encoder, controller, "step", { step: "competitor", message: "Buscando competidor principal desde SERP..." });

        let comp: { name: string; website: string } = { name: "", website: "" };

        // Pick the first non-directory domain from category SERP results
        for (const r of categoryResults) {
          const link = r.link || "";
          if (!link.includes(domain) && link.match(/^https?:\/\/[^/]+/)) {
            try {
              const compUrl = new URL(link);
              const compDom = compUrl.hostname.replace(/^www\./, "");
              if (!SKIP_DOMAINS.has(compDom)) {
                const rawName = r.title?.split(/[-–|·:]/)[0]?.trim() || compDom;
                comp = { name: rawName, website: compDom };
                break;
              }
            } catch { /* skip invalid URLs */ }
          }
        }

        if (comp.name) {
          stream(encoder, controller, "detail", { message: `  Competidor seleccionado: ${comp.name} (${comp.website})` });
        } else {
          stream(encoder, controller, "detail", { message: `  No se encontró competidor directo en los resultados SERP` });
        }

        if (comp.name && comp.website) {
          stream(encoder, controller, "step", { step: "competitor", message: `Analizando competidor: ${comp.name}...` });
          const compDomain = comp.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

          // Run 3 competitor queries in parallel
          const [compBrand, compSite, compReviews] = await Promise.all([
            serperSearch(`"${comp.name}"`, 10),
            serperSearch(`site:${compDomain}`, 10),
            Promise.all([
              serperSearch(`site:g2.com "${comp.name}"`, 3),
              serperSearch(`site:trustpilot.com "${comp.name}"`, 3),
            ]),
          ]);

          const compOwnDomain = (compBrand.organic || []).filter(r => r.link?.includes(compDomain)).length;
          const compInCategory = categoryResults.some(r =>
            r.title?.toLowerCase().includes(comp.name.toLowerCase()) ||
            r.link?.includes(compDomain) ||
            r.snippet?.toLowerCase().includes(comp.name.toLowerCase())
          );

          // Count social profiles from competitor's brand SERP
          const socialDomains = ["linkedin.com", "twitter.com", "x.com", "instagram.com", "youtube.com", "facebook.com"];
          const compSocialCount = (compBrand.organic || []).filter(r =>
            socialDomains.some(sd => r.link?.includes(sd))
          ).length;

          competitorData = {
            name: comp.name,
            website: comp.website,
            brand_serp: compOwnDomain,
            category_serp: compInCategory,
            indexed_pages: (compSite.organic || []).length,
            has_g2: (compReviews[0].organic || []).length > 0,
            has_trustpilot: (compReviews[1].organic || []).length > 0,
            social_profiles: compSocialCount,
          };

          stream(encoder, controller, "detail", { message: `  Dominio propio en SERP: ${competitorData.brand_serp} resultados` });
          stream(encoder, controller, "detail", { message: `  En búsqueda de categoría: ${competitorData.category_serp ? "SÍ" : "NO"}` });
          stream(encoder, controller, "detail", { message: `  Páginas indexadas: ${competitorData.indexed_pages}+` });
          stream(encoder, controller, "detail", { message: `  G2: ${competitorData.has_g2 ? "SÍ" : "NO"} | Trustpilot: ${competitorData.has_trustpilot ? "SÍ" : "NO"}` });
          stream(encoder, controller, "detail", { message: `  Perfiles sociales en SERP: ${competitorData.social_profiles}` });
        }

        // Step 7: Heuristic scoring
        stream(encoder, controller, "step", { step: "analysis", message: "Calculando Trust Score (heurístico)..." });

        // Detect if site has a blog from crawled links
        const allLinks = pages.join(" ");
        const hasBlog = /\/blog/i.test(allLinks) || /\/blog/i.test(seoHtml);

        // Count social profiles (from HTML + Serper)
        const socialPlatforms: SocialPlatform[] = ["linkedin", "instagram", "facebook", "twitter", "youtube", "tiktok"];
        let socialProfileCount = 0;
        for (const plat of socialPlatforms) {
          // Check HTML-discovered
          if (foundPlatforms.has(plat)) { socialProfileCount++; continue; }
          // Check Serper fallback (platform names differ slightly)
          const platKey = plat === "twitter" ? "Twitter/X" : plat === "linkedin" ? "LinkedIn" : plat === "youtube" ? "YouTube" : plat === "instagram" ? "Instagram" : plat;
          if (socialPresence[platKey]?.found) { socialProfileCount++; }
        }

        const hasG2 = socialPresence["G2"]?.found || false;
        const hasTrustpilot = socialPresence["Trustpilot"]?.found || false;
        const hasCapterra = socialPresence["Capterra"]?.found || false;
        const hasCrunchbase = socialPresence["Crunchbase"]?.found || false;
        const founderLinkedInFound = socialPresence["Founder LinkedIn"]?.found || false;

        const scoringData: ScoringData = {
          thirdPartyMentions: (serpResults["Menciones terceros"] || []).length,
          newsMentions: newsResults.length,
          ownDomainInTop10: ownDomainCount,
          brandInCategory,
          indexedPages,
          sitemapUrlCount: seoData.sitemap.url_count,
          reviewSiteMentions: (serpResults["Reviews y comparativas"] || []).length,
          hasG2,
          hasTrustpilot,
          hasCapterra,
          hasCrunchbase,
          socialProfileCount,
          founderLinkedInFound,
          seoData,
          content,
          allLinks: pages,
          hasBlog,
        };

        const borrowedTrust = scoreBorrowedTrust(scoringData);
        const serpTrust = scoreSerpTrust(scoringData);
        const brandAssets = scoreBrandAssets(scoringData);
        const geoPresence = scoreGeoPresence(scoringData);
        const outboundReadiness = scoreOutboundReadiness(scoringData);
        const demandEngine = scoreDemandEngine(scoringData);

        const trustScore = Math.round(
          borrowedTrust.score * 0.20 +
          serpTrust.score * 0.20 +
          brandAssets.score * 0.20 +
          geoPresence.score * 0.10 +
          outboundReadiness.score * 0.15 +
          demandEngine.score * 0.15
        );

        // Generate top_gaps from lowest-scoring pillars and missing elements
        const pillarScores = [
          { key: "borrowed_trust", label: "Confianza de terceros", score: borrowedTrust.score },
          { key: "serp_trust", label: "Presencia SERP", score: serpTrust.score },
          { key: "brand_assets", label: "Activos de marca", score: brandAssets.score },
          { key: "geo_presence", label: "Presencia GEO/IA", score: geoPresence.score },
          { key: "outbound_readiness", label: "Preparación outbound", score: outboundReadiness.score },
          { key: "demand_engine", label: "Motor de demanda", score: demandEngine.score },
        ].sort((a, b) => a.score - b.score);

        const topGaps: string[] = [];
        // Add gaps from specific missing elements
        if (!brandInCategory) topGaps.push("No aparece en búsquedas de categoría — necesita estrategia de contenido y backlinks");
        if (scoringData.thirdPartyMentions === 0) topGaps.push("Sin menciones de terceros en Google — necesita PR y relaciones con medios");
        if (!hasG2 && !hasTrustpilot && !hasCapterra) topGaps.push("Sin presencia en plataformas de review (G2, Trustpilot, Capterra)");
        if (!seoData.sitemap.accessible) topGaps.push("Sin sitemap.xml — Google no puede indexar el sitio eficientemente");
        if (socialProfileCount < 2) topGaps.push("Presencia mínima en redes sociales — necesita activar perfiles");
        if (!seoData.analytics.ga4 && !seoData.analytics.gtm) topGaps.push("Sin analytics detectados — no se puede medir ni optimizar");
        if (!seoData.meta_description.present) topGaps.push("Sin meta description — reduce CTR en resultados de Google");
        if (!hasBlog) topGaps.push("Sin blog o sección de contenidos — pierde oportunidades de tráfico orgánico y citación por IAs");
        if (scoringData.newsMentions === 0) topGaps.push("Sin menciones en prensa — necesita estrategia de PR");

        // Trim to top 5
        const finalGaps = topGaps.slice(0, 5);
        // If we have fewer than 3 gaps, add generic ones from lowest pillars
        while (finalGaps.length < 3) {
          const lowest = pillarScores.find(p => !finalGaps.some(g => g.toLowerCase().includes(p.label.toLowerCase())));
          if (lowest) {
            finalGaps.push(`${lowest.label} tiene score bajo (${lowest.score}/100) — requiere atención prioritaria`);
          } else {
            break;
          }
        }

        // SERP highlight
        const serpHighlight = ownDomainCount >= 5
          ? `Fuerte presencia SERP: ${ownDomainCount} resultados propios en top 10, ${indexedPages}+ páginas indexadas`
          : ownDomainCount >= 1
            ? `Presencia SERP moderada: ${ownDomainCount} resultados propios en top 10, ${indexedPages}+ páginas indexadas`
            : `Presencia SERP débil: sin resultados propios destacados en top 10, ${indexedPages}+ páginas indexadas`;

        // GEO highlight
        const geoHighlight = brandMentionedByLlm
          ? "La marca aparece en resultados de categoría — buena base para citación por IAs generativas"
          : "La marca NO aparece en resultados de categoría — baja probabilidad de ser citada por ChatGPT, Perplexity, etc.";

        // Missing sources
        const missingSources: string[] = [];
        if (!hasG2) missingSources.push("G2");
        if (!hasTrustpilot) missingSources.push("Trustpilot");
        if (!hasCapterra) missingSources.push("Capterra");
        if (!hasCrunchbase) missingSources.push("Crunchbase");
        if (scoringData.newsMentions === 0) missingSources.push("Medios de prensa");
        if (!hasBlog) missingSources.push("Blog propio con contenido indexable");

        // Competitor comparison
        let competitorComparison: { competitor_name: string; competitor_advantage: string; brand_advantage: string; key_gap: string } | null = null;
        if (competitorData) {
          const compAdvantages: string[] = [];
          const brandAdvantages: string[] = [];

          if (competitorData.brand_serp > ownDomainCount) compAdvantages.push(`${competitorData.brand_serp} resultados propios en SERP vs ${ownDomainCount}`);
          else if (ownDomainCount > competitorData.brand_serp) brandAdvantages.push(`${ownDomainCount} resultados propios en SERP vs ${competitorData.brand_serp}`);

          if (competitorData.indexed_pages > indexedPages) compAdvantages.push(`${competitorData.indexed_pages}+ páginas indexadas vs ${indexedPages}+`);
          else if (indexedPages > competitorData.indexed_pages) brandAdvantages.push(`${indexedPages}+ páginas indexadas vs ${competitorData.indexed_pages}+`);

          if (competitorData.has_g2 && !hasG2) compAdvantages.push("Tiene presencia en G2");
          if (competitorData.has_trustpilot && !hasTrustpilot) compAdvantages.push("Tiene presencia en Trustpilot");
          if (competitorData.social_profiles > socialProfileCount) compAdvantages.push(`${competitorData.social_profiles} perfiles sociales visibles vs ${socialProfileCount}`);
          else if (socialProfileCount > competitorData.social_profiles) brandAdvantages.push(`${socialProfileCount} perfiles sociales vs ${competitorData.social_profiles}`);

          if (hasG2 && !competitorData.has_g2) brandAdvantages.push("Tiene presencia en G2");
          if (hasTrustpilot && !competitorData.has_trustpilot) brandAdvantages.push("Tiene presencia en Trustpilot");

          competitorComparison = {
            competitor_name: competitorData.name,
            competitor_advantage: compAdvantages.length > 0 ? compAdvantages.join("; ") : "Sin ventajas claras detectadas sobre la marca analizada",
            brand_advantage: brandAdvantages.length > 0 ? brandAdvantages.join("; ") : "Sin ventajas claras detectadas sobre el competidor",
            key_gap: compAdvantages.length > 0
              ? `Mientras ${brandName} tiene ${ownDomainCount} resultados propios en SERP, ${competitorData.name} tiene ${competitorData.brand_serp}. ${competitorData.has_g2 && !hasG2 ? `Además, ${competitorData.name} ya está en G2.` : ""}`
              : `Ambos tienen presencia SERP similar — la diferenciación vendrá del contenido y la confianza de terceros`,
          };
        }

        // Verdict
        const lowestPillar = pillarScores[0].label;
        const secondLowest = pillarScores[1].label;
        let verdict: string;
        if (trustScore >= 70) {
          verdict = `Buena presencia digital con margen de mejora en ${lowestPillar}`;
        } else if (trustScore >= 40) {
          verdict = `Presencia digital intermedia. Priorizar ${lowestPillar} y ${secondLowest}`;
        } else {
          verdict = `Presencia digital débil. Se necesita trabajo urgente en ${lowestPillar}`;
        }

        // One-liner from meta description or title
        const oneLiner = seoData.meta_description.content || seoData.title.content || `Empresa en ${domain}`;

        // Determine business type heuristically
        const contentLower = content.toLowerCase();
        let businessType = "Mixed";
        if (/b2b|enterprise|empresas|saas|plataforma para empresas|software para/i.test(contentLower)) {
          businessType = "B2B";
        } else if (/b2c|consumidor|usuario|tienda|ecommerce|e-commerce|comprar|precio/i.test(contentLower)) {
          businessType = "B2C";
        }

        const result = {
          company_name: brandName,
          business_type: businessType,
          one_liner: oneLiner.slice(0, 200),
          trust_score: trustScore,
          pillars: {
            borrowed_trust: borrowedTrust,
            serp_trust: serpTrust,
            brand_assets: brandAssets,
            geo_presence: geoPresence,
            outbound_readiness: outboundReadiness,
            demand_engine: demandEngine,
          },
          top_gaps: finalGaps,
          serp_highlight: serpHighlight,
          geo_highlight: geoHighlight,
          missing_sources: missingSources,
          competitor_comparison: competitorComparison,
          verdict,
        };

        stream(encoder, controller, "result", { data: result });

        // Update GHL contact with trust_score (fire-and-forget)
        if (body.email?.trim() && result.trust_score != null) {
          const ghlApiKey = process.env.GHL_API_KEY;
          const ghlLocationId = process.env.GHL_LOCATION_ID;
          if (ghlApiKey && ghlLocationId) {
            (async () => {
              try {
                // 1. Find contact by email
                const searchResp = await fetch(
                  `https://services.leadconnectorhq.com/contacts/?locationId=${ghlLocationId}&query=${encodeURIComponent(body.email!.trim())}`,
                  {
                    headers: {
                      "Authorization": `Bearer ${ghlApiKey}`,
                      "Version": "2021-07-28",
                    },
                    signal: AbortSignal.timeout(5_000),
                  }
                );
                const searchData = await searchResp.json();
                const contactId = searchData?.contacts?.[0]?.id;
                if (!contactId) return;

                // 2. Update contact with trust_score custom field
                await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
                  method: "PUT",
                  headers: {
                    "Authorization": `Bearer ${ghlApiKey}`,
                    "Content-Type": "application/json",
                    "Version": "2021-07-28",
                  },
                  body: JSON.stringify({
                    customFields: [
                      { id: "M743ieZHoFWSBBRliMB6", value: result.trust_score },
                    ],
                  }),
                  signal: AbortSignal.timeout(5_000),
                });
              } catch (err) {
                console.warn("GHL trust_score update failed:", err);
              }
            })();
          }
        }

      } catch (err) {
        stream(encoder, controller, "error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
};
