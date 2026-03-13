export default async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/trust-score\/?/, "/") + url.search;
  const target = `https://trust.growth4u.io${path}`;

  const resp = await fetch(target, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      host: "trust.growth4u.io",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
  });

  // Rewrite any absolute redirects to stay under /trust-score
  const location = resp.headers.get("location");
  if (location && (resp.status >= 300 && resp.status < 400)) {
    const newHeaders = new Headers(resp.headers);
    if (location.startsWith("/")) {
      newHeaders.set("location", `/trust-score${location}`);
    }
    return new Response(resp.body, {
      status: resp.status,
      headers: newHeaders,
    });
  }

  return resp;
};

export const config = { path: "/trust-score/*" };
