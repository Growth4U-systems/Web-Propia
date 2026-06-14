// Front door único de las apps internas bajo growth4u.io/herramientas/*.
// - Trust Score: basePath /herramientas, rutas planas con guion
//   (/herramientas/trust-score-competidores[-interna], -individual[-interna]).
// - Sales Copilot: /herramientas/sales-copilot/* (strip → zurich).
// - Redirige links viejos slash → nuevo esquema guion.
function proxy(request: Request, target: string, host: string) {
  return fetch(target, {
    method: request.method,
    headers: { ...Object.fromEntries(request.headers), host },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const p = url.pathname;

  // Links viejos: [/herramientas]/trust-score/<modo>[/internal] → /herramientas/trust-score-<modo>[-interna]
  const m = p.match(/^(?:\/herramientas)?\/trust-score\/(compare|competidores|individual)(\/internal)?\/?$/);
  if (m) {
    const mode = m[1] === "compare" ? "competidores" : m[1];
    const suffix = m[2] ? "-interna" : "";
    return Response.redirect(`${url.origin}/herramientas/trust-score-${mode}${suffix}${url.search}`, 301);
  }

  // Sales Copilot → zurich (strip prefijo)
  if (p === "/herramientas/sales-copilot" || p.startsWith("/herramientas/sales-copilot/")) {
    const rest = p.replace(/^\/herramientas\/sales-copilot/, "") || "/";
    return proxy(request, `https://zurich-ebon.vercel.app${rest}${url.search}`, "zurich-ebon.vercel.app");
  }

  // Resto de /herramientas/* → Trust Score (basePath /herramientas)
  return proxy(request, `https://trust.growth4u.io${p}${url.search}`, "trust.growth4u.io");
};

export const config = { path: ["/herramientas/*", "/trust-score/*", "/trust-score"] };
