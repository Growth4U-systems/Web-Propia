export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip: already on /en/, admin, static assets, API, functions
  if (
    path.startsWith('/en/') ||
    path === '/en' ||
    path.startsWith('/admin') ||
    path.startsWith('/_astro') ||
    path.startsWith('/.netlify') ||
    path.startsWith('/trust-score') ||
    path.match(/\.\w+$/) // static files (.js, .css, .png, etc.)
  ) {
    return;
  }

  // Check for language preference cookie (user's explicit choice)
  const cookies = request.headers.get('cookie') || '';
  const langMatch = cookies.match(/g4u_lang=(es|en)/);
  if (langMatch) {
    const preferredLang = langMatch[1];
    if (preferredLang === 'en') {
      return Response.redirect(new URL(`/en${path}`, url.origin), 302);
    }
    return; // es is default, no redirect needed
  }

  // Auto-detect: check Netlify geo header (country code)
  const country = context?.geo?.country?.code || '';
  const SPANISH_COUNTRIES = new Set([
    'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'EC', 'VE', 'UY', 'PY',
    'BO', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU', 'GQ',
  ]);

  if (SPANISH_COUNTRIES.has(country)) {
    return; // Stay on Spanish (default)
  }

  // Fallback: check Accept-Language header
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.toLowerCase().startsWith('es')) {
    return; // Browser prefers Spanish
  }

  // Non-Spanish country + non-Spanish browser → redirect to English
  return Response.redirect(new URL(`/en${path}`, url.origin), 302);
};

export const config = {
  path: '/*',
  excludedPath: ['/en/*', '/admin/*', '/_astro/*', '/.netlify/*'],
};
