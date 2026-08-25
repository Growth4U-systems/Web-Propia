/**
 * Trust Score Bridge (Netlify background function)
 * --------------------------------------------------
 * Re-scan del Trust Score (día 60/120) y rollback del scan inicial.
 * GHL le postea {email, web, fase?} y esta función (server-side):
 *   1) /api/diagnostico {url, engine:"v3", fill:true}  -> informe de 5 PILARES (/d/{id})
 *   2) lee el informe /d/ y deriva el PILAR DÉBIL (id="p-<key>", rk 01 = el peor)
 *   3) POST {email, trust_score, trust_score_link (/d/), pilar_debil, landing} al webhook de GHL
 *      -> el workflow de Ramiro hace UPSERT por email y setea los campos.
 *
 * OJO (25 ago 2026): antes usaba /api/compare -> informe de COMPARACIÓN /r/ (modelo
 * VIEJO de 6 dimensiones). Ahora usa /api/diagnostico engine v3 -> /d/ de 5 pilares,
 * el MISMO formato que produce el quiz en vivo y que consumen las landings + pilar-derive.
 *
 * Es "-background": Netlify la corre hasta 15 min y responde 202 al instante.
 * No guarda secretos: /api/diagnostico se llama público (con tope por IP; el re-scan
 * es de bajo volumen) y solo postea al webhook de GHL (el mismo que el quiz).
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
 * Pilar débil -> landing del hook. Modelo de 5 pilares (v3): 1 cimiento + 4 de referente.
 * Claves = las del informe vivo (id="p-<key>" en el /d/ de trust.growth4u.io).
 */
const PILAR: Record<string, { label: string; landing: string }> = {
  confianza_prestada: { label: "Lo que otros dicen de ti",  landing: "https://growth4u.io/trust-score/lo-que-otros-dicen" },
  seo:                { label: "Tu visibilidad en Google",  landing: "https://growth4u.io/trust-score/visibilidad-en-google" },
  geo:                { label: "Tu visibilidad en las IAs", landing: "https://growth4u.io/trust-score/visibilidad-en-ias" },
  resenas:            { label: "Reseñas y prueba social",   landing: "https://growth4u.io/trust-score/resenas-y-prueba-social" },
  nicho:              { label: "Conversaciones de nicho",   landing: "https://growth4u.io/trust-score/conversaciones-de-nicho" },
};

/**
 * Lee el HTML del informe /d/ (v3) y devuelve la clave del pilar más débil.
 * Cada pilar es id="p-<key>" y trae su rank en class="rk">NN (01 = el peor).
 * Misma lógica que la función pilar-derive. Si no encuentra nada, devuelve "".
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
    const looksLikeDomain = (v: string) => /\./.test(v) && !/\s/.test(v);

    // Resuelve un competidor a dominio. Si el usuario escribió un NOMBRE
    // (ej: "Product hackers") lo pasa por Clearbit autocomplete (free, sin auth).
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

    // Competidores indicados por el usuario en el quiz (opcional). `fill:true`
    // completa hasta 5 con los más relevantes, así que si no hay, se descubren solos.
    const userRaw: any[] = Array.isArray(body.competidores)
      ? body.competidores
      : String(body.competidores || "").split(",");
    const userNames = userRaw.map((c) => String(c || "").trim()).filter(Boolean).slice(0, 4);
    const competitors: { url: string }[] = (
      await Promise.all(userNames.map(async (n) => ({ url: await resolveDomain(n) })))
    ).filter((c) => c.url);

    // 1) Diagnóstico v3 (5 pilares) -> informe /d/{id}
    const dg = await fetch(`${TRUST}/diagnostico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: web, engine: "v3", business: "Mixed", fill: true, competitors }),
    });
    let reportId = "";
    let link = "";
    let score: number | null = null;
    await streamEvents(dg, (ev) => {
      if (ev?.type === "result") {
        // El evento result trae {id, url(=/d/), reportId, trust_score, brand_name}.
        const r = ev.data?.data ?? ev.data ?? ev;
        reportId = r?.id || r?.reportId || reportId;
        if (r?.url) link = String(r.url);
        const ts = r?.trust_score;
        if (typeof ts === "number") score = ts;
      }
    });
    if (!link && reportId) link = `https://trust.growth4u.io/herramientas/d/${reportId}`;
    if (!link) {
      console.warn("[bridge] sin informe /d/ para", web);
      return new Response("no report", { status: 200, headers: CORS });
    }

    // 2) Derivar el pilar débil leyendo el propio informe /d/ (rk 01 = el peor).
    let weakKey = "";
    try {
      const rep = await fetch(link, { redirect: "follow" });
      if (rep.ok) weakKey = weakestFromReport(await rep.text());
    } catch { /* si no se puede leer, el pilar va vacío y GHL no lo pisa */ }
    const pilar = weakKey && PILAR[weakKey] ? PILAR[weakKey] : null;
    console.log("[bridge] pilar_debil:", weakKey || "(no derivable)", "->", pilar?.label || "");

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
