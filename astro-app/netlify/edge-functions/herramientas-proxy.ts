import type { Context } from "@netlify/edge-functions";

// Front door único de las apps internas bajo growth4u.io/herramientas/*.
// El hub /herramientas lo sirve Astro; el resto se proxea a las apps.
function proxy(request: Request, target: string, host: string) {
  return fetch(target, {
    method: request.method,
    headers: { ...Object.fromEntries(request.headers), host },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const p = url.pathname;

  // El hub lo sirve Astro (no proxear)
  if (p === "/herramientas" || p === "/herramientas/") return context.next();

  // Links viejos: [/herramientas]/trust-score/<modo>[/internal] → guion
  const m = p.match(/^(?:\/herramientas)?\/trust-score\/(compare|competidores|individual)(\/internal)?\/?$/);
  if (m) {
    const mode = m[1] === "compare" ? "competidores" : m[1];
    const suffix = m[2] ? "-interna" : "";
    return Response.redirect(`${url.origin}/herramientas/trust-score-${mode}${suffix}${url.search}`, 301);
  }

  // Sales Copilot → zurich (strip)
  if (p === "/herramientas/sales-copilot" || p.startsWith("/herramientas/sales-copilot/")) {
    const rest = p.replace(/^\/herramientas\/sales-copilot/, "") || "/";
    return proxy(request, `https://zurich-ebon.vercel.app${rest}${url.search}`, "zurich-ebon.vercel.app");
  }

  // Resto de /herramientas/* → Trust Score: redirect a Vercel directo en vez de
  // proxear por este edge function. El proxy cortaba la conexión a ~100s (techo del
  // edge), abortando los análisis SSE largos del comparador. El redirect manda al
  // cliente directo a trust.growth4u.io (Vercel, 180s, SSE sin buffering).
  // 302 (temporal) durante el rollout; promover a 301 cuando esté validado.
  return Response.redirect(`https://trust.growth4u.io${p}${url.search}`, 302);
};

export const config = { path: ["/herramientas/*", "/trust-score/*", "/trust-score"] };
