/**
 * Pilar Débil — derive (Netlify function SÍNCRONA)
 * --------------------------------------------------
 * Para el scan inicial. GHL hace un Custom Webhook (POST) a esta función con
 * el link del informe, y la función DEVUELVE en la respuesta el pilar más flojo.
 * GHL captura la respuesta y la mapea a los campos. No re-analiza nada (~1-2 s):
 * solo lee el informe que ya existe (por su trust_score_link).
 *
 * Request  (POST, application/json):
 *   { "report": "https://trust.growth4u.io/herramientas/d/<id>" }   // o el id pelado
 * Response (200, application/json):
 *   { "pilar_key": "brand_assets",
 *     "pilar_debil": "Tus reviews y prueba social",
 *     "landing_pilar_debil": "https://growth4u.io/trust-score/reviews-y-prueba-social" }
 *
 * El re-scan (día 60/120) escribe el pilar por el bridge, no por aquí.
 */

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

/** De un link/id de informe saca la URL /d/{id} que devuelve el HTML. */
const reportUrl = (raw: string): string => {
  const v = String(raw || "").trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://trust.growth4u.io/herramientas/d/${v}`;
};

/** Lee el HTML del informe y devuelve la clave del pilar más débil (rk 01 = peor). */
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
  const json = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { /* tolerar text/plain */ }
  const report = String(body.report || body.trust_score_link || body.reportId || body.report_id || "").trim();
  const email = String(body.email || "").trim(); // opcional, solo para el log

  if (!report) return json({ error: "missing report", pilar_key: "", pilar_debil: "", landing_pilar_debil: "" }, 400);

  try {
    const res = await fetch(reportUrl(report), { redirect: "follow" });
    if (!res.ok) {
      console.warn("[pilar-derive] informe no accesible", res.status, report);
      return json({ pilar_key: "", pilar_debil: "", landing_pilar_debil: "" });
    }
    const html = await res.text();
    const key = weakestFromReport(html);
    const p = key ? PILAR[key] : null;
    console.log("[pilar-derive]", email || "(sin email)", "->", key || "(no derivable)", p?.label || "");
    return json({
      pilar_key: key || "",
      pilar_debil: p?.label ?? "",
      landing_pilar_debil: p?.landing ?? "",
    });
  } catch (e) {
    console.error("[pilar-derive] error", e);
    return json({ pilar_key: "", pilar_debil: "", landing_pilar_debil: "" });
  }
};
