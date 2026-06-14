// Sirve Sales Copilot bajo growth4u.io/herramientas/sales-copilot, proxeando al
// backend Vercel (zurich). Stripea el prefijo para que las rutas (/, /api/*)
// lleguen al origen. El login Google corre first-party bajo growth4u.io (/__/auth).
export default async (request: Request) => {
  const url = new URL(request.url);
  const rest = url.pathname.replace(/^\/herramientas\/sales-copilot/, "") || "/";
  const target = `https://zurich-ebon.vercel.app${rest}${url.search}`;

  const resp = await fetch(target, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      host: "zurich-ebon.vercel.app",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });

  return resp;
};

export const config = { path: ["/herramientas/sales-copilot", "/herramientas/sales-copilot/*"] };
