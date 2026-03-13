export default async (request: Request) => {
  const url = new URL(request.url);
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

export const config = { path: "/trust-score/*" };
