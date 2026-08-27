/** Shared Trust Score day-60/day-120 re-scan implementation. */

export type RescanPhase = "60" | "120";

const DEFAULT_TRUST_API = "https://trust.growth4u.io/herramientas/api";
const DEFAULT_GHL_WEBHOOK =
  "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const PILAR: Record<string, { label: string; landing: string }> = {
  confianza_prestada: {
    label: "Lo que otros dicen de ti",
    landing: "https://growth4u.io/trust-score/lo-que-otros-dicen",
  },
  seo: {
    label: "Tu visibilidad en Google",
    landing: "https://growth4u.io/trust-score/visibilidad-en-google",
  },
  geo: {
    label: "Tu visibilidad en las IAs",
    landing: "https://growth4u.io/trust-score/visibilidad-en-ias",
  },
  resenas: {
    label: "Reseñas y prueba social",
    landing: "https://growth4u.io/trust-score/resenas-y-prueba-social",
  },
  nicho: {
    label: "Conversaciones de nicho",
    landing: "https://growth4u.io/trust-score/conversaciones-de-nicho",
  },
};

export const weakestFromReport = (html: string): string => {
  let best = "";
  let bestRank = 99;
  for (const key of Object.keys(PILAR)) {
    const i = html.indexOf(`id="p-${key}"`);
    if (i < 0) continue;
    const block = html.slice(i, i + 400);
    const match = block.match(/class="rk">(\d+)/);
    const rank = match ? parseInt(match[1], 10) : 99;
    if (rank < bestRank) {
      bestRank = rank;
      best = key;
    }
  }
  return best;
};

async function streamEvents(resp: Response, onEvent: (event: any) => void) {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()));
      } catch {
        // Ignore malformed keepalive/events from the upstream SSE stream.
      }
    }
  }
}

const bareDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "");

const looksLikeDomain = (value: string) => /\./.test(value) && !/\s/.test(value);

async function resolveDomain(raw: string): Promise<string> {
  const cleaned = bareDomain(raw);
  if (looksLikeDomain(cleaned)) return cleaned;
  try {
    const response = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(raw)}`,
    );
    const candidates = await response.json();
    const domain = Array.isArray(candidates) && candidates[0]?.domain
      ? String(candidates[0].domain)
      : "";
    return looksLikeDomain(domain) ? domain : "";
  } catch {
    return "";
  }
}

function endpointFromEnv(name: "TRUST_SCORE_API_BASE" | "TRUST_SCORE_CALLBACK_URL", fallback: string) {
  const configured = String(process.env[name] || "").trim();
  return configured || fallback;
}

/**
 * Creates a phase-locked background handler. The route, not request data, chooses
 * the destination score field, so a day-120 workflow can never update day 60.
 *
 * TRUST_SCORE_CALLBACK_URL and TRUST_SCORE_API_BASE are environment-only test
 * overrides. They are intentionally not accepted from the request body: this
 * prevents callers from turning the public function into an SSRF/relay endpoint.
 */
export function createTrustScoreRescanHandler(phase: RescanPhase) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405, headers: CORS });
    }

    let body: any = {};
    try {
      body = JSON.parse(await req.text());
    } catch {
      // Keep the existing tolerant behaviour; validation below returns 400.
    }
    const web = String(body.web || "").trim();
    const email = String(body.email || "").trim();
    if (!web || !email) {
      return new Response("missing web/email", { status: 400, headers: CORS });
    }

    const trustApi = endpointFromEnv("TRUST_SCORE_API_BASE", DEFAULT_TRUST_API).replace(/\/$/, "");
    const callbackUrl = endpointFromEnv("TRUST_SCORE_CALLBACK_URL", DEFAULT_GHL_WEBHOOK);

    try {
      const rawCompetitors: unknown[] = Array.isArray(body.competidores)
        ? body.competidores
        : String(body.competidores || "").split(",");
      const competitorNames = rawCompetitors
        .map((candidate) => String(candidate || "").trim())
        .filter(Boolean)
        .slice(0, 4);
      const competitors: { url: string }[] = (
        await Promise.all(competitorNames.map(async (name) => ({ url: await resolveDomain(name) })))
      ).filter((candidate) => candidate.url);

      const diagnostic = await fetch(`${trustApi}/diagnostico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: web,
          engine: "v3",
          business: "Mixed",
          fill: true,
          competitors,
        }),
      });
      if (!diagnostic.ok) {
        throw new Error(`diagnostico upstream returned ${diagnostic.status}`);
      }

      let reportId = "";
      let link = "";
      let score: number | null = null;
      await streamEvents(diagnostic, (event) => {
        if (event?.type !== "result") return;
        const result = event.data?.data ?? event.data ?? event;
        reportId = result?.id || result?.reportId || reportId;
        if (result?.url) link = String(result.url);
        if (typeof result?.trust_score === "number") score = result.trust_score;
      });
      if (!link && reportId) {
        link = `https://trust.growth4u.io/herramientas/d/${reportId}`;
      }
      if (!link || score === null) {
        throw new Error("diagnostico completed without report link or score");
      }

      let weakKey = "";
      try {
        const report = await fetch(link, { redirect: "follow" });
        if (report.ok) weakKey = weakestFromReport(await report.text());
      } catch {
        // The callback still carries score/link if report parsing is unavailable.
      }
      const weakPillar = weakKey ? PILAR[weakKey] : null;

      const payload: Record<string, unknown> = {
        email,
        web,
        fase: phase,
        trust_score_link: link,
        pilar_debil: weakPillar?.label ?? "",
        landing_pilar_debil: weakPillar?.landing ?? "",
        source: `trust-rescan-${phase}`,
        [`trust_score_${phase}_dias`]: score,
      };

      const callback = await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!callback.ok) {
        throw new Error(`callback returned ${callback.status}`);
      }

      console.log(
        "[trust-rescan] OK",
        email,
        "phase:",
        phase,
        "score:",
        score,
        "pillar:",
        weakPillar?.label || "-",
        link,
      );
      return new Response("ok", { status: 200, headers: CORS });
    } catch (error) {
      console.error("[trust-rescan] error", { phase, email, web, error });
      return new Response("error", { status: 500, headers: CORS });
    }
  };
}
