// Proxy first-party del handler de Firebase Auth.
// Hace que el login de Google corra bajo growth4u.io (mismo origen que la app)
// en vez de g4u-team-auth.firebaseapp.com (tercero), para que NO dependa de
// cookies de terceros y funcione en Arc/Brave/Safari/Chrome.
// Requiere authDomain: "growth4u.io" en el config de Firebase del cliente.
export default async (request: Request) => {
  const url = new URL(request.url);
  const target = `https://g4u-team-auth.firebaseapp.com${url.pathname}${url.search}`;

  const resp = await fetch(target, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      host: "g4u-team-auth.firebaseapp.com",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });

  return resp;
};

export const config = { path: ["/__/auth/*", "/__/firebase/*"] };
