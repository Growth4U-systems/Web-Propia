export const config = {
  matcher: ['/((?!en|admin|_astro|api|trust-score|comunidad|images|favicon|robots|sitemap|.*\\.\\w+$).*)'],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip bots/crawlers — they must see the canonical (Spanish) version for SEO
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (/bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|googlebot|bingbot|yandex|baidu|duckduck|semrush|ahrefs|mj12bot|bytespider|gptbot|chatgpt|perplexity|anthropic/i.test(ua)) {
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

  // Auto-detect: check Vercel geo header (country code)
  const country = request.headers.get('x-vercel-ip-country') || '';
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
}
