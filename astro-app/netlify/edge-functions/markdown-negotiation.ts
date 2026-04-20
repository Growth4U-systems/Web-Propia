// Agent-facing content negotiation.
// When a client sends `Accept: text/markdown` on the homepage, serve
// the llms.txt markdown summary instead of the HTML landing page.
// Browsers (which send Accept: text/html,...) are unaffected.

export default async (request: Request, _context: unknown) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;

  const url = new URL(request.url);
  const path = url.pathname;

  if (path !== '/' && path !== '/en' && path !== '/en/') return;

  const accept = request.headers.get('accept') || '';
  if (!prefersMarkdown(accept)) return;

  const llmsUrl = new URL('/llms.txt', url.origin);
  const upstream = await fetch(llmsUrl.toString(), { headers: { accept: 'text/plain' } });
  if (!upstream.ok) return;

  const body = request.method === 'HEAD' ? null : await upstream.text();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'Cache-Control': 'public, max-age=600',
      'X-Content-Source': '/llms.txt',
    },
  });
};

// Parse Accept header and return true only when text/markdown is
// strictly preferred over text/html (ignoring wildcards).
function prefersMarkdown(accept: string): boolean {
  const entries = accept
    .split(',')
    .map((part) => {
      const [type, ...params] = part.trim().split(';').map((s) => s.trim());
      const qParam = params.find((p) => p.toLowerCase().startsWith('q='));
      const q = qParam ? parseFloat(qParam.slice(2)) : 1;
      return { type: type.toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .filter((e) => e.type);

  const md = entries.find((e) => e.type === 'text/markdown');
  if (!md || md.q <= 0) return false;

  const html = entries.find((e) => e.type === 'text/html');
  if (!html) return true;
  return md.q > html.q;
}

export const config = {
  path: '/*',
  excludedPath: ['/admin/*', '/_astro/*', '/.netlify/*', '/.well-known/*'],
};
