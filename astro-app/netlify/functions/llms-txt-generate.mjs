import { createTtlCache } from "../../src/lib/llms-txt/cache.js";
import { generateFromWebsite } from "../../src/lib/llms-txt/crawler.js";
import { createConcurrencyLimiter } from "../../src/lib/llms-txt/rateLimit.js";

const cache = createTtlCache({
  ttlMs: Number(process.env.LLMS_TXT_CACHE_TTL_MS || 10 * 60 * 1000),
  maxEntries: Number(process.env.LLMS_TXT_CACHE_MAX_ENTRIES || 100)
});

const runLimited = createConcurrencyLimiter({
  maxConcurrent: Number(process.env.LLMS_TXT_MAX_CONCURRENT_GENERATIONS || 2)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  try {
    const payload = parseRequest(event);
    const result = await cachedGenerate(payload.url, payload.maxPages, payload.preferredLocale);

    if (payload.format === "txt" || payload.format === "llms") {
      return textResponse(result.llmsTxt);
    }

    if (payload.format === "full" || payload.format === "llms-full") {
      return textResponse(result.llmsFullTxt);
    }

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const statusCode = /not allowed|private|local|unsupported|url must|enter a valid|enter a website|invalid url|only http/i.test(message)
      ? 400
      : 500;

    return jsonResponse({ error: message }, statusCode);
  }
}

function parseRequest(event) {
  const method = event.httpMethod || "GET";

  if (method === "POST") {
    const body = event.body ? JSON.parse(event.body) : {};
    return {
      url: body.url,
      maxPages: body.maxPages,
      preferredLocale: normalizeLocale(body.preferredLocale),
      format: String(body.format || "json").toLowerCase()
    };
  }

  const params = event.queryStringParameters || {};
  return {
    url: params.url,
    maxPages: params.maxPages,
    preferredLocale: normalizeLocale(params.preferredLocale),
    format: String(params.format || "json").toLowerCase()
  };
}

function normalizeLocale(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "default") return v;
  return /^[a-z]{2}(?:-[a-z]{2})?$/.test(v) ? v : null;
}

async function cachedGenerate(url, maxPages, preferredLocale = null) {
  const defaultLimit = Number(process.env.LLMS_TXT_DEFAULT_MAX_PAGES || 25);
  const hardLimit = Number(process.env.LLMS_TXT_MAX_PAGES || 25);
  const renderedFallback = process.env.LLMS_TXT_RENDERED_FALLBACK !== "false";
  const maxRenderedPages = Number(process.env.LLMS_TXT_MAX_RENDERED_PAGES || 8);
  const limit = Math.max(5, Math.min(Number(maxPages || defaultLimit), hardLimit));
  const cacheKey = JSON.stringify({ url: String(url || "").trim(), maxPages: limit, renderedFallback, maxRenderedPages, preferredLocale: preferredLocale || "" });
  const cached = cache.get(cacheKey);

  if (cached) {
    return { ...cached, cached: true };
  }

  const result = await runLimited(() => generateFromWebsite(url, { maxPages: limit, renderedFallback, maxRenderedPages, preferredLocale }));
  cache.set(cacheKey, result);
  return result;
}

function jsonResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function textResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://growth4u.io",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}
