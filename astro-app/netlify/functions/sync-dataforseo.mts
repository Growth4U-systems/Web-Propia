import type { Context } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    return Response.json(
      { error: "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not configured" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  try {
    const credentials = btoa(`${login}:${password}`);

    const res = await fetch(
      "https://api.dataforseo.com/v3/backlinks/summary/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ target: "growth4u.io" }]),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `DataForSEO API error (${res.status}): ${text.slice(0, 500)}` },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const data = (await res.json()) as {
      tasks?: {
        id?: string;
        status_code?: number;
        status_message?: string;
        result?: {
          rank?: number;
          backlinks?: number;
          referring_domains?: number;
          referring_ips?: number;
          referring_subnets?: number;
          referring_links_types?: Record<string, number>;
          referring_links_attributes?: Record<string, number>;
          broken_backlinks?: number;
          broken_pages?: number;
          referring_pages?: number;
        }[];
      }[];
    };

    const task = data?.tasks?.[0];
    const result = task?.result?.[0];

    if (!result) {
      const taskStatus = task
        ? `Task status ${task.status_code}: ${task.status_message}`
        : "No tasks returned";
      return Response.json(
        { error: `No results from DataForSEO. ${taskStatus}` },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const extracted = {
      domainRank: result.rank ?? null,
      backlinks: result.backlinks ?? null,
      referringDomains: result.referring_domains ?? null,
      referringIps: result.referring_ips ?? null,
      referringSubnets: result.referring_subnets ?? null,
      dofollowBacklinks:
        result.referring_links_types?.dofollow ??
        result.referring_links_attributes?.dofollow ??
        null,
      nofollowBacklinks:
        result.referring_links_types?.nofollow ??
        result.referring_links_attributes?.nofollow ??
        null,
      brokenBacklinks: result.broken_backlinks ?? null,
      brokenPages: result.broken_pages ?? null,
      referringPages: result.referring_pages ?? null,
      date: new Date().toISOString(),
      source: "DataForSEO",
    };

    return Response.json(extracted, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
