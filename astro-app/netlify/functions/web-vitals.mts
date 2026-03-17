import type { Context } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const PAGESPEED_BASE =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function fetchWithRetry(
  url: string,
  retries = 2,
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });

      if (res.status === 429 && attempt < retries) {
        const backoff = (attempt + 1) * 5000; // 5s, 10s
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `PageSpeed API error (${res.status}): ${text.slice(0, 500)}`,
        );
      }

      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const backoff = (attempt + 1) * 5000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}

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
    const body = (await req.json()) as {
      url: string;
      strategy?: "mobile" | "desktop";
    };
    const { url, strategy = "mobile" } = body;

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

    // Build PageSpeed API URL
    const params = new URLSearchParams({
      url: targetUrl,
      strategy,
    });
    // Add multiple category params
    for (const cat of [
      "PERFORMANCE",
      "ACCESSIBILITY",
      "BEST_PRACTICES",
      "SEO",
    ]) {
      params.append("category", cat);
    }

    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    if (apiKey) {
      params.set("key", apiKey);
    }

    const apiUrl = `${PAGESPEED_BASE}?${params.toString()}`;
    const data = await fetchWithRetry(apiUrl);

    // Extract scores from categories
    const lighthouseResult = data.lighthouseResult as Record<string, unknown>;
    const categories = lighthouseResult?.categories as Record<
      string,
      { score: number }
    >;
    const audits = lighthouseResult?.audits as Record<
      string,
      { numericValue?: number; displayValue?: string }
    >;

    const scores = {
      performance: Math.round((categories?.performance?.score || 0) * 100),
      accessibility: Math.round(
        (categories?.accessibility?.score || 0) * 100,
      ),
      bestPractices: Math.round(
        (categories?.["best-practices"]?.score || 0) * 100,
      ),
      seo: Math.round((categories?.seo?.score || 0) * 100),
    };

    // Extract Web Vitals metrics
    const msToSec = (val?: number) =>
      val != null ? Math.round((val / 1000) * 100) / 100 : null;

    const metrics = {
      lcp: msToSec(audits?.["largest-contentful-paint"]?.numericValue),
      tbt: audits?.["total-blocking-time"]?.numericValue != null
        ? Math.round(audits["total-blocking-time"].numericValue)
        : null,
      cls: audits?.["cumulative-layout-shift"]?.numericValue != null
        ? Math.round(audits["cumulative-layout-shift"].numericValue * 1000) /
          1000
        : null,
      fcp: msToSec(audits?.["first-contentful-paint"]?.numericValue),
      si: msToSec(audits?.["speed-index"]?.numericValue),
      ttfb: msToSec(
        audits?.["server-response-time"]?.numericValue,
      ),
    };

    const result = {
      url: targetUrl,
      strategy,
      scores,
      metrics,
      analyzedAt: new Date().toISOString(),
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
