import type { Context } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TARGET_DOMAIN = "growth4u.io";

// ==========================================
// OpenPageRank — free, no CC, 10K req/hour
// ==========================================
async function fetchOpenPageRank(apiKey: string): Promise<{ pageRank: number | null }> {
  const res = await fetch(
    `https://openpagerank.com/api/v1.0/getPageRank?domains%5B0%5D=${TARGET_DOMAIN}`,
    {
      headers: { "API-OPR": apiKey },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) return { pageRank: null };
  const data = await res.json();
  const result = data?.response?.[0];
  return {
    pageRank: result?.page_rank_decimal ?? result?.rank ?? null,
  };
}

// ==========================================
// Moz Links API v2 — free tier 50 rows/month
// ==========================================
async function fetchMozMetrics(apiToken: string): Promise<{
  domainAuthority: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  dofollowBacklinks: number | null;
  nofollowBacklinks: number | null;
  spamScore: number | null;
  pageAuthority: number | null;
  rootDomainsToRootDomain: number | null;
}> {
  const res = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      "x-moz-token": apiToken,
    },
    body: JSON.stringify({
      targets: [TARGET_DOMAIN],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Moz API error ${res.status}: ${text.slice(0, 300)}`);
    return {
      domainAuthority: null,
      backlinks: null,
      referringDomains: null,
      dofollowBacklinks: null,
      nofollowBacklinks: null,
      spamScore: null,
      pageAuthority: null,
      rootDomainsToRootDomain: null,
    };
  }

  const data = await res.json();
  const result = data?.results?.[0];

  if (!result) {
    return {
      domainAuthority: null,
      backlinks: null,
      referringDomains: null,
      dofollowBacklinks: null,
      nofollowBacklinks: null,
      spamScore: null,
      pageAuthority: null,
      rootDomainsToRootDomain: null,
    };
  }

  const totalBacklinks = result.external_pages_to_root_domain ?? result.pages_to_root_domain ?? null;
  const followedLinks = result.external_nofollow_pages_to_root_domain ?? null;

  return {
    domainAuthority: result.domain_authority ?? null,
    pageAuthority: result.page_authority ?? null,
    backlinks: totalBacklinks,
    referringDomains: result.root_domains_to_root_domain ?? null,
    dofollowBacklinks: totalBacklinks && followedLinks ? totalBacklinks - followedLinks : null,
    nofollowBacklinks: followedLinks,
    spamScore: result.spam_score ?? null,
    rootDomainsToRootDomain: result.root_domains_to_root_domain ?? null,
  };
}

// ==========================================
// Moz Links API v2 (Basic Auth fallback)
// ==========================================
async function fetchMozMetricsBasicAuth(accessId: string, secretKey: string): Promise<{
  domainAuthority: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  dofollowBacklinks: number | null;
  nofollowBacklinks: number | null;
  spamScore: number | null;
  pageAuthority: number | null;
  rootDomainsToRootDomain: number | null;
}> {
  const credentials = btoa(`${accessId}:${secretKey}`);
  const res = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      targets: [TARGET_DOMAIN],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Moz API (basic auth) error ${res.status}: ${text.slice(0, 300)}`);
    return {
      domainAuthority: null,
      backlinks: null,
      referringDomains: null,
      dofollowBacklinks: null,
      nofollowBacklinks: null,
      spamScore: null,
      pageAuthority: null,
      rootDomainsToRootDomain: null,
    };
  }

  const data = await res.json();
  const result = data?.results?.[0];

  if (!result) {
    return {
      domainAuthority: null,
      backlinks: null,
      referringDomains: null,
      dofollowBacklinks: null,
      nofollowBacklinks: null,
      spamScore: null,
      pageAuthority: null,
      rootDomainsToRootDomain: null,
    };
  }

  const totalBacklinks = result.external_pages_to_root_domain ?? result.pages_to_root_domain ?? null;
  const nofollowLinks = result.external_nofollow_pages_to_root_domain ?? null;

  return {
    domainAuthority: result.domain_authority ?? null,
    pageAuthority: result.page_authority ?? null,
    backlinks: totalBacklinks,
    referringDomains: result.root_domains_to_root_domain ?? null,
    dofollowBacklinks: totalBacklinks && nofollowLinks ? totalBacklinks - nofollowLinks : null,
    nofollowBacklinks: nofollowLinks,
    spamScore: result.spam_score ?? null,
    rootDomainsToRootDomain: result.root_domains_to_root_domain ?? null,
  };
}

// ==========================================
// Main handler
// ==========================================
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

  const oprKey = process.env.OPENPAGERANK_API_KEY;
  const mozToken = process.env.MOZ_API_TOKEN;
  const mozAccessId = process.env.MOZ_ACCESS_ID;
  const mozSecretKey = process.env.MOZ_SECRET_KEY;

  const hasMoz = !!mozToken || (!!mozAccessId && !!mozSecretKey);

  if (!oprKey && !hasMoz) {
    return Response.json(
      {
        error:
          "Configura al menos una fuente: OPENPAGERANK_API_KEY (gratis en domcop.com/openpagerank) o MOZ_API_TOKEN / MOZ_ACCESS_ID+MOZ_SECRET_KEY (gratis en moz.com/products/api)",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  try {
    const sources: string[] = [];
    let domainRank: number | null = null;
    let domainAuthority: number | null = null;
    let backlinks: number | null = null;
    let referringDomains: number | null = null;
    let dofollowBacklinks: number | null = null;
    let nofollowBacklinks: number | null = null;
    let spamScore: number | null = null;

    // Fetch in parallel
    const [oprResult, mozResult] = await Promise.all([
      oprKey ? fetchOpenPageRank(oprKey).catch(() => null) : null,
      hasMoz
        ? (mozToken
            ? fetchMozMetrics(mozToken)
            : fetchMozMetricsBasicAuth(mozAccessId!, mozSecretKey!)
          ).catch(() => null)
        : null,
    ]);

    // OpenPageRank
    if (oprResult?.pageRank != null) {
      domainRank = oprResult.pageRank;
      sources.push("OpenPageRank");
    }

    // Moz
    if (mozResult) {
      if (mozResult.domainAuthority != null) {
        domainAuthority = mozResult.domainAuthority;
        // Use Moz DA as domainRank if OpenPageRank didn't provide one
        if (domainRank == null) domainRank = mozResult.domainAuthority;
      }
      if (mozResult.backlinks != null) backlinks = mozResult.backlinks;
      if (mozResult.referringDomains != null) referringDomains = mozResult.referringDomains;
      if (mozResult.dofollowBacklinks != null) dofollowBacklinks = mozResult.dofollowBacklinks;
      if (mozResult.nofollowBacklinks != null) nofollowBacklinks = mozResult.nofollowBacklinks;
      if (mozResult.spamScore != null) spamScore = mozResult.spamScore;
      sources.push("Moz");
    }

    if (sources.length === 0) {
      return Response.json(
        { error: "No se pudo obtener datos de ninguna fuente. Verifica las API keys." },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const extracted = {
      domainRank: domainRank ?? 0,
      domainAuthority: domainAuthority ?? 0,
      backlinks: backlinks ?? 0,
      referringDomains: referringDomains ?? 0,
      referringIps: 0,
      referringSubnets: 0,
      dofollowBacklinks: dofollowBacklinks ?? 0,
      nofollowBacklinks: nofollowBacklinks ?? 0,
      brokenBacklinks: 0,
      brokenPages: 0,
      referringPages: backlinks ?? 0,
      spamScore: spamScore ?? 0,
      date: new Date().toISOString(),
      source: sources.join(" + "),
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
