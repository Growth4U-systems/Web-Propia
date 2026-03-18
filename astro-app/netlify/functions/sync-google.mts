import type { Context } from "@netlify/functions";
import { createSign } from "node:crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── JWT helpers ──────────────────────────────────────────────

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

async function getAccessToken(
  serviceAccount: { client_email: string; private_key: string; token_uri: string },
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: scopes.join(" "),
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  const jwt = `${signInput}.${signature}`;

  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ── GSC fetch ────────────────────────────────────────────────

interface GSCRow {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys?: string[];
}

interface GSCResponse {
  rows?: GSCRow[];
  responseAggregationType?: string;
}

async function fetchGSC(
  token: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [],  // aggregate totals
      rowLimit: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API error: ${res.status} — ${err}`);
  }

  const data = (await res.json()) as GSCResponse;
  const row = data.rows?.[0];

  if (!row) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }

  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: parseFloat((row.ctr * 100).toFixed(2)),
    position: parseFloat(row.position.toFixed(1)),
  };
}

// ── GA4 fetch ────────────────────────────────────────────────

interface GA4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

interface GA4Response {
  rows?: GA4Row[];
  totals?: GA4Row[];
}

async function fetchGA4(
  token: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  organicPercent: number;
}> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  // Main metrics report
  const mainRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    }),
  });

  if (!mainRes.ok) {
    const err = await mainRes.text();
    throw new Error(`GA4 API error: ${mainRes.status} — ${err}`);
  }

  const mainData = (await mainRes.json()) as GA4Response;
  const mainRow = mainData.rows?.[0]?.metricValues;

  const sessions = mainRow ? parseInt(mainRow[0].value) : 0;
  const users = mainRow ? parseInt(mainRow[1].value) : 0;
  const pageviews = mainRow ? parseInt(mainRow[2].value) : 0;
  const bounceRate = mainRow ? parseFloat((parseFloat(mainRow[3].value) * 100).toFixed(1)) : 0;
  const avgSessionDuration = mainRow ? parseFloat(parseFloat(mainRow[4].value).toFixed(0)) : 0;

  // Organic traffic report
  const organicRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
    }),
  });

  let organicPercent = 0;
  if (organicRes.ok) {
    const organicData = (await organicRes.json()) as GA4Response;
    const rows = organicData.rows || [];
    let totalSessions = 0;
    let organicSessions = 0;
    for (const row of rows) {
      const channel = row.dimensionValues?.[0]?.value?.toLowerCase() || "";
      const val = parseInt(row.metricValues?.[0]?.value || "0");
      totalSessions += val;
      if (channel === "organic search") {
        organicSessions = val;
      }
    }
    organicPercent = totalSessions > 0
      ? parseFloat(((organicSessions / totalSessions) * 100).toFixed(1))
      : 0;
  }

  return { sessions, users, pageviews, bounceRate, avgSessionDuration, organicPercent };
}

// ── Handler ──────────────────────────────────────────────────

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const siteUrl = process.env.GSC_SITE_URL;
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!saJson) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON env var");
    if (!siteUrl) throw new Error("Missing GSC_SITE_URL env var");
    if (!propertyId) throw new Error("Missing GA4_PROPERTY_ID env var");

    const serviceAccount = JSON.parse(saJson);

    const body = (await req.json()) as { days?: number };
    const days = body.days || 7;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // yesterday (data delay)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const start = fmt(startDate);
    const end = fmt(endDate);

    // Get token with both scopes
    const token = await getAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);

    // Fetch both in parallel
    const [gsc, ga] = await Promise.all([
      fetchGSC(token, siteUrl, start, end),
      fetchGA4(token, propertyId, start, end),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        period: { start, end, days },
        gsc,
        ga,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-google error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
};
