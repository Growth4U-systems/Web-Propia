/**
 * Trust Score Bridge (Netlify background function)
 * --------------------------------------------------
 * El quiz /diagnostico postea aquí {email, web, ...} al completarse.
 * Esta función (server-side, sin CORS ni token):
 *   1) /api/discover-competitors {url}      -> competidores
 *   2) /api/compare {primary, competitors}  -> reportId (+ trust_score)
 *   3) arma el link  https://trust.growth4u.io/herramientas/r/<reportId>
 *      (OJO: /compare devuelve un informe de COMPARACIÓN -> ruta /r/{id};
 *       los informes de una sola empresa son /d/{id}, otro espacio de ids)
 *   4) POST {email, trust_score_link, trust_score} al webhook de GHL
 *      -> el workflow de Ramiro hace UPSERT por email (match) y setea el link.
 *
 * Es "-background": Netlify la corre hasta 15 min y responde 202 al instante,
 * así el quiz no espera (el análisis tarda minutos).
 * No guarda secretos: solo postea al webhook (mismo que el quiz).
 */

const TRUST = "https://trust.growth4u.io/herramientas/api";
const GHL_WEBHOOK =
  "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/**
 * Pilar débil -> landing del hook. Modelo de 5 pilares (ago 2026): 1 cimiento + 4 de referente.
 * Claves = las del informe vivo (id="p-<key>" en trust.growth4u.io). Actualizado desde el modelo viejo de 6.
 */
const PILAR: Record<string, { label: string; landing: string }> = {
  confianza_prestada: { label: "Lo que otros dicen de ti",  landing: "https://growth4u.io/trust-score/lo-que-otros-dicen" },
  seo:                { label: "Tu visibilidad en Google",  landing: "https://growth4u.io/trust-score/visibilidad-en-google" },
  geo:                { label: "Tu visibilidad en las IAs", landing: "https://growth4u.io/trust-score/visibilidad-en-ias" },
  resenas:            { label: "Reseñas y prueba social",   landing: "https://growth4u.io/trust-score/resenas-y-prueba-social" },
  nicho:              { label: "Conversaciones de nicho",   landing: "https://growth4u.io/trust-score/conversaciones-de-nicho" },
};

/** Dominio pelado, en minúsculas (para reconocer a la marca primaria en los eventos). */
const bareDomainLc = (v: any) =>
  String(v || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "").toLowerCase();

/**
 * El server ya ordena los pilares peor-primero en `top_gaps`; el [0] es el más débil.
 * OJO: la forma de cada item de top_gaps no está documentada. Solo devolvemos un
 * valor si es una CLAVE de pilar válida; si no, "" para caer al fallback por score
 * (nunca devolver "[object Object]" ni un label, que romperían el `|| keyFromPillars`).
 */
const keyFromTopGaps = (o: any): string => {
  const g = o?.top_gaps;
  if (!Array.isArray(g) || !g.length) return "";
  const raw = g[0]?.key ?? g[0]?.pillar ?? g[0];
  const k = typeof raw === "string" ? raw : "";
  return k in PILAR ? k : "";
};

/** Fallback: calcula el pilar de menor score desde {pillars|scores: {key:{score}|number}}. */
const keyFromPillars = (o: any): string => {
  const p = o?.pillars ?? o?.scores ?? null;
  if (!p || typeof p !== "object") return "";
  let best = "", bestScore = Infinity;
  for (const [k, v] of Object.entries(p)) {
    if (!(k in PILAR)) continue; // ignora cualquier clave que no sea un pilar
    const s = typeof v === "number" ? v : (v as any)?.score;
    if (typeof s === "number" && s < bestScore) { bestScore = s; best = k; }
  }
  return best;
};

/** Lee un stream SSE (`data: {...}\n\n`) y llama onEvent por cada evento JSON. */
async function streamEvents(resp: Response, onEvent: (ev: any) => void) {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith("data:")) {
        try { onEvent(JSON.parse(line.slice(5).trim())); } catch { /* ignore */ }
      }
    }
  }
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { /* tolerar text/plain */ }
  const web = String(body.web || "").trim();
  const email = String(body.email || "").trim();
  // Fase del nurturing: "60" | "120" en el re-scan; "" en el scan inicial.
  // Cuando viene, el score nuevo se manda también en trust_score_<fase>_dias.
  const fase = String(body.fase || body.phase || "").trim();
  if (!web || !email) return new Response("missing web/email", { status: 400, headers: CORS });

  try {
    // Limpia a dominio pelado (sin protocolo, sin path, sin www).
    const bareDomain = (v: any) =>
      String(v || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
    // ¿Ya parece un dominio? (tiene punto y no tiene espacios)
    const looksLikeDomain = (v: string) => /\./.test(v) && !/\s/.test(v);

    // Resuelve un competidor a dominio. Si el usuario escribió un NOMBRE
    // (ej: "Product hackers") lo pasa por Clearbit autocomplete (free, sin auth)
    // -> producthackers.com. Si no logra un dominio válido, devuelve "" (se descarta).
    const resolveDomain = async (raw: string): Promise<string> => {
      const cleaned = bareDomain(raw);
      if (looksLikeDomain(cleaned)) return cleaned;
      try {
        const r = await fetch(
          `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(raw)}`
        );
        const arr = await r.json();
        const dom = Array.isArray(arr) && arr[0]?.domain ? String(arr[0].domain) : "";
        return looksLikeDomain(dom) ? dom : "";
      } catch {
        return "";
      }
    };

    // 0) Competidores indicados por el usuario en el quiz (prioridad).
    const userRaw: any[] = Array.isArray(body.competidores)
      ? body.competidores
      : String(body.competidores || "").split(",");
    const userNames = userRaw.map((c) => String(c || "").trim()).filter(Boolean).slice(0, 4);
    let competitors: { url: string }[] = (
      await Promise.all(userNames.map(async (n) => ({ url: await resolveDomain(n) })))
    ).filter((c) => c.url);

    // 1) Auto-descubrir solo si el usuario no indicó ninguno.
    if (!competitors.length) {
      const dc = await fetch(`${TRUST}/discover-competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: web }),
      });
      await streamEvents(dc, (ev) => {
        // El evento "competitors" trae la lista en ev.data (no ev.competitors).
        const arr = ev?.type === "competitors" ? (ev.data || ev.competitors) : null;
        if (Array.isArray(arr)) {
          competitors = arr
            .map((c: any) => c?.website || c?.url || (typeof c === "string" ? c : ""))
            .filter(Boolean)
            .map((v: any) => ({ url: bareDomain(v) }))
            .filter((c: { url: string }) => c.url);
        }
      });
      competitors = competitors.slice(0, 4);
    }
    if (!competitors.length) {
      console.warn("[bridge] sin competidores para", web);
      return new Response("no competitors", { status: 200, headers: CORS });
    }

    // 2) Comparar -> reportId (+ trust_score)
    const cmp = await fetch(`${TRUST}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primary: { url: web }, competitors }),
    });
    let reportId = "";
    let score: number | null = null;
    let weakKey = "";
    const primaryDomain = bareDomainLc(web);
    // ¿este objeto de evento es la marca primaria (la del lead)?
    const isPrimary = (o: any) =>
      !!o && (o.is_primary || o.isPrimary || o.primary === true ||
        (!!bareDomainLc(o.url || o.website || o.domain) &&
          bareDomainLc(o.url || o.website || o.domain) === primaryDomain));

    await streamEvents(cmp, (ev) => {
      const d = ev?.data ?? ev;
      if (ev?.type === "result") {
        reportId = d?.reportId || d?.report_id || reportId;
        const p = d?.primary ?? d;
        const ts = p?.trust_score ?? p?.score ?? d?.trust_score;
        if (typeof ts === "number") score = ts;
        // el pilar débil puede venir en el result.primary...
        const w = keyFromTopGaps(p) || keyFromPillars(p);
        if (w) weakKey = w;
      }
      // ...o en los eventos por-marca (brand_done trae top_gaps del server)
      if (isPrimary(d)) {
        const w = keyFromTopGaps(d) || keyFromPillars(d);
        if (w) weakKey = w;
      }
    });
    if (!reportId) {
      console.warn("[bridge] sin reportId para", web);
      return new Response("no report", { status: 200, headers: CORS });
    }

    const link = `https://trust.growth4u.io/herramientas/r/${reportId}`;
    const pilar = weakKey && PILAR[weakKey] ? PILAR[weakKey] : null;
    // Log para confirmar en producción qué trae el evento (weakKey crudo incluido).
    console.log("[bridge] pilar_debil:", weakKey || "(sin datos por pilar en el result)", "->", pilar?.label || "");

    // 3) Enviar a GHL (upsert por email vía webhook)
    const payload: Record<string, unknown> = {
      email,
      web,
      trust_score_link: link,
      pilar_debil: pilar?.label ?? "",
      landing_pilar_debil: pilar?.landing ?? "",
      source: fase ? `trust-rescan-${fase}` : "trust-bridge",
    };
    if (fase === "60" || fase === "120") {
      // Re-scan por fase: el score nuevo cae SOLO en su campo de fase.
      // NO se manda trust_score, para preservar el inicial (la base del delta).
      payload.fase = fase;
      payload[`trust_score_${fase}_dias`] = score;
    } else {
      // Scan / rollback manual: escribe el score actual.
      payload.trust_score = score;
    }
    await fetch(GHL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[bridge] OK", email, "fase:", fase || "inicial", "score:", score, "pilar:", pilar?.label || "-", link);
    return new Response("ok", { status: 200, headers: CORS });
  } catch (e) {
    console.error("[bridge] error", e);
    return new Response("error", { status: 500, headers: CORS });
  }
};
