import * as cheerio from "cheerio";

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const USER_AGENT = "Mozilla/5.0 (compatible; Growth4U-Bot/1.0)";

async function checkResourceExists(
  url: string,
): Promise<{ exists: boolean; url: string }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    return { exists: res.ok, url };
  } catch {
    return { exists: false, url };
  }
}

export default async function handler(req: Request) {
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

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`;
    }

    const parsedUrl = new URL(targetUrl);

    // Fetch main page
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Meta title
    const metaTitle = $("title").first().text().trim();
    const metaTitleLength = metaTitle.length;

    // 2. Meta description
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() || "";
    const metaDescriptionLength = metaDescription.length;

    // 3. Viewport meta tag
    const hasViewport = $('meta[name="viewport"]').length > 0;

    // 4. Images
    const totalImages = $("img").length;
    let imagesWithoutAlt = 0;
    $("img").each((_, el) => {
      const alt = $(el).attr("alt");
      if (!alt || alt.trim() === "") {
        imagesWithoutAlt++;
      }
    });

    // 5. Internal vs external links
    let internalLinks = 0;
    let externalLinks = 0;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.startsWith(parsedUrl.origin)
      ) {
        internalLinks++;
      } else if (href.startsWith("http")) {
        externalLinks++;
      }
    });

    // 6. H1 count
    const h1Count = $("h1").length;

    // 7. Canonical link
    const canonical = $('link[rel="canonical"]').attr("href") || null;

    // 8. Structured data (JSON-LD)
    const structuredDataTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (data["@type"]) {
          if (Array.isArray(data["@type"])) {
            structuredDataTypes.push(...data["@type"]);
          } else {
            structuredDataTypes.push(data["@type"]);
          }
        }
        if (data["@graph"] && Array.isArray(data["@graph"])) {
          for (const item of data["@graph"]) {
            if (item["@type"]) {
              if (Array.isArray(item["@type"])) {
                structuredDataTypes.push(...item["@type"]);
              } else {
                structuredDataTypes.push(item["@type"]);
              }
            }
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    // 9. robots.txt
    const robotsCheck = await checkResourceExists(
      `${parsedUrl.origin}/robots.txt`,
    );

    // 10. sitemap.xml
    const sitemapPaths = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap-index.xml",
    ];
    let sitemapFound = false;
    let sitemapUrl = "";
    for (const path of sitemapPaths) {
      const result = await checkResourceExists(`${parsedUrl.origin}${path}`);
      if (result.exists) {
        sitemapFound = true;
        sitemapUrl = result.url;
        break;
      }
    }

    // 11. HTTPS check
    const isHttps = parsedUrl.protocol === "https:";

    // 12. Open Graph tags
    const ogTitle = $('meta[property="og:title"]').attr("content") || null;
    const ogDescription =
      $('meta[property="og:description"]').attr("content") || null;
    const ogImage = $('meta[property="og:image"]').attr("content") || null;

    // 13. Hreflang tags
    const hreflangTags: { lang: string; href: string }[] = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangTags.push({
        lang: $(el).attr("hreflang") || "",
        href: $(el).attr("href") || "",
      });
    });

    // 14. Word count
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText
      ? bodyText.split(/\s+/).filter((w) => w.length > 0).length
      : 0;

    // 15. Heading counts
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    const audit = {
      url: targetUrl,
      scannedAt: new Date().toISOString(),
      metaTitle: metaTitle,
      metaTitleLength,
      metaDescription: metaDescription,
      metaDescriptionLength,
      hasViewport,
      totalImages,
      imagesWithoutAlt,
      internalLinks,
      externalLinks,
      h1Count,
      h2Count,
      h3Count,
      hasCanonical: !!canonical,
      hasRobotsTxt: robotsCheck.exists,
      hasSitemap: sitemapFound,
      isHttps,
      structuredDataTypes,
      ogTitle: ogTitle || '',
      ogDescription: ogDescription || '',
      ogImage: ogImage || '',
      hreflangTags: hreflangTags.map(t => `${t.lang}: ${t.href}`),
      wordCount,
    };

    return Response.json(audit, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
