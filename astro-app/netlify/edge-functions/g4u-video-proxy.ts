// Proxy /g4u-video/* → g4u-video-launcher.vercel.app (mismo patrón que trust-score-proxy,
// pero quitando el prefijo: la app del launcher sirve en la raíz de su deployment).
export default async (request: Request) => {
  const url = new URL(request.url);
  const upstreamPath = url.pathname.replace(/^\/g4u-video/, "") || "/";
  const target = `https://g4u-video-launcher.vercel.app${upstreamPath}${url.search}`;

  const resp = await fetch(target, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      host: "g4u-video-launcher.vercel.app",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
  });

  return resp;
};

export const config = { path: "/g4u-video/*" };
