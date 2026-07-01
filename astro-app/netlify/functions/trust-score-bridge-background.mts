/**
 * Trust Score Bridge (Netlify background function)
 * --------------------------------------------------
 * El quiz /diagnostico postea aquí {email, web, ...} al completarse.
 * Esta función (server-side, sin CORS ni token):
 *   1) /api/discover-competitors {url}      -> competidores
 *   2) /api/compare {primary, competitors}  -> reportId (+ trust_score)
 *   3) arma el link  https://trust.growth4u.io/herramientas/r/<reportId>
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
  if (!web || !email) return new Response("missing web/email", { status: 400, headers: CORS });

  try {
    // 1) Descubrir competidores
    const dc = await fetch(`${TRUST}/discover-competitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: web }),
    });
    // compare espera competitors como objetos { url: "<dominio>" } (dominio pelado, sin protocolo).
    let competitors: { url: string }[] = [];
    await streamEvents(dc, (ev) => {
      // El evento "competitors" trae la lista en ev.data (no ev.competitors).
      const arr = ev?.type === "competitors" ? (ev.data || ev.competitors) : null;
      if (Array.isArray(arr)) {
        competitors = arr
          .map((c: any) => c?.website || c?.url || (typeof c === "string" ? c : ""))
          .filter(Boolean)
          .map((w: string) => ({ url: String(w).replace(/^https?:\/\//i, "") }));
      }
    });
    competitors = competitors.slice(0, 4);
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
    await streamEvents(cmp, (ev) => {
      if (ev?.type === "result") {
        const d = ev.data ?? ev;
        reportId = d?.reportId || d?.report_id || reportId;
        const ts = d?.primary?.trust_score ?? d?.primary?.score ?? d?.trust_score;
        if (typeof ts === "number") score = ts;
      }
    });
    if (!reportId) {
      console.warn("[bridge] sin reportId para", web);
      return new Response("no report", { status: 200, headers: CORS });
    }

    const link = `https://trust.growth4u.io/herramientas/r/${reportId}`;

    // 3) Enviar a GHL (upsert por email vía webhook)
    await fetch(GHL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        web,
        trust_score_link: link,
        trust_score: score,
        source: "trust-bridge",
      }),
    });

    console.log("[bridge] OK", email, "score:", score, link);
    return new Response("ok", { status: 200, headers: CORS });
  } catch (e) {
    console.error("[bridge] error", e);
    return new Response("error", { status: 500, headers: CORS });
  }
};
