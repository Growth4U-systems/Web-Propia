/**
 * Pilar Débil — derive (Netlify background function)
 * --------------------------------------------------
 * Para el SCAN INICIAL (el que hace el server de Diagnosys, no el bridge).
 * GHL ya tiene el informe del lead en `trust_score_link`. Esta función NO
 * re-analiza nada: lee ese informe, saca el pilar más flojo y escribe
 * pilar_debil + landing_pilar_debil en el contacto de GHL (upsert por email).
 *
 * GHL lo dispara cuando aterriza el scan inicial (tag trust-score / trust_score
 * seteado), con { email, report }.  report = el trust_score_link (o el id).
 *
 * El re-scan (día 60/120) ya escribe el pilar desde el bridge; esto cubre
 * el momento inicial sin depender del server.
 */

const GHL_WEBHOOK =
  "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/**
 * Pilar débil -> landing. OJO: las claves internas ENGAÑAN.
 * brand_assets = reviews · borrowed_trust = PR · demand_engine = técnico.
 */
const PILAR: Record<string, { label: string; landing: string }> = {
  brand_assets:       { label: "Tus reviews y prueba social", landing: "https://growth4u.io/trust-score/reviews-y-prueba-social" },
  geo_presence:       { label: "Tu presencia en las IAs",     landing: "https://growth4u.io/trust-score/presencia-en-ias" },
  outbound_readiness: { label: "Una web que convierte",       landing: "https://growth4u.io/trust-score/web-que-convierte" },
  borrowed_trust:     { label: "Lo que otros dicen de ti",    landing: "https://growth4u.io/trust-score/lo-que-otros-dicen" },
  serp_trust:         { label: "Tu presencia en Google",      landing: "https://growth4u.io/trust-score/presencia-en-google" },
  demand_engine:      { label: "Tu base técnica y medición",  landing: "https://growth4u.io/trust-score/base-tecnica-y-medicion" },
};

/** De un link/id de informe saca la URL /d/{id} (o /r/{id}) que devuelve el HTML. */
const reportUrl = (raw: string): string => {
  const v = String(raw || "").trim();
  if (/^https?:\/\//i.test(v)) return v;                 // ya es un link completo
  return `https://trust.growth4u.io/herramientas/d/${v}`; // era solo el id
};

/**
 * Lee el HTML del informe y devuelve la clave del pilar más débil.
 * En el informe cada pilar es id="p-<key>" y lleva un rango (rk 01..06) en la
 * sección de gaps (peor primero). rk 01 = el más flojo.
 */
const weakestFromReport = (html: string): string => {
  let best = "", bestRank = 99;
  for (const key of Object.keys(PILAR)) {
    const i = html.indexOf(`id="p-${key}"`);
    if (i < 0) continue;
    const block = html.slice(i, i + 400);
    const m = block.match(/class="rk">(\d+)/);
    const rank = m ? parseInt(m[1], 10) : 99;
    if (rank < bestRank) { bestRank = rank; best = key; }
  }
  return best;
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { /* tolerar text/plain */ }
  const email = String(body.email || "").trim();
  const report = String(body.report || body.trust_score_link || body.reportId || body.report_id || "").trim();
  if (!email || !report) return new Response("missing email/report", { status: 400, headers: CORS });

  try {
    const res = await fetch(reportUrl(report), { redirect: "follow" });
    if (!res.ok) {
      console.warn("[pilar-derive] informe no accesible", res.status, report);
      return new Response("report not reachable", { status: 200, headers: CORS });
    }
    const html = await res.text();
    const key = weakestFromReport(html);
    const pilar = key ? PILAR[key] : null;
    console.log("[pilar-derive]", email, "pilar_debil:", key || "(no se pudo derivar del informe)");

    if (!pilar) return new Response("no pillar", { status: 200, headers: CORS });

    await fetch(GHL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        pilar_debil: pilar.label,
        landing_pilar_debil: pilar.landing,
        source: "pilar-derive",
      }),
    });

    console.log("[pilar-derive] OK", email, "->", pilar.label);
    return new Response("ok", { status: 200, headers: CORS });
  } catch (e) {
    console.error("[pilar-derive] error", e);
    return new Response("error", { status: 500, headers: CORS });
  }
};
