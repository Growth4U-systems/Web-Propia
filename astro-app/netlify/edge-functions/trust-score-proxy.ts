export default async (request: Request) => {
  const url = new URL(request.url);

  // Links viejos /trust-score/* → redirigir al nuevo namespace /herramientas/trust-score/*
  if (url.pathname === "/trust-score" || url.pathname.startsWith("/trust-score/")) {
    const rest = url.pathname.replace(/^\/trust-score/, "");
    return Response.redirect(`${url.origin}/herramientas/trust-score${rest}${url.search}`, 301);
  }

  // Proxy de la app (Trust Score, basePath /herramientas/trust-score) al backend Vercel
  const target = `https://trust.growth4u.io${url.pathname}${url.search}`;
  const resp = await fetch(target, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      host: "trust.growth4u.io",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
  });

  return resp;
};

export const config = {
  path: ["/herramientas/trust-score", "/herramientas/trust-score/*", "/trust-score", "/trust-score/*"],
};
