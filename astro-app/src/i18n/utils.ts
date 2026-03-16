import { es } from './es';
import { en } from './en';

export type Locale = 'es' | 'en';

const translations = { es, en };

export function getTranslations(locale: Locale = 'es') {
  return translations[locale] || translations.es;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang === 'en') return 'en';
  return 'es';
}

export function getLocalizedPath(path: string, locale: Locale): string {
  if (locale === 'es') return path;
  return `/en${path}`;
}

// ── Route segment translations ──
const ROUTE_MAP: Record<string, Record<Locale, string>> = {
  blog:             { es: 'blog',             en: 'blog' },
  recursos:         { es: 'recursos',         en: 'resources' },
  servicios:        { es: 'servicios',        en: 'services' },
  'casos-de-exito': { es: 'casos-de-exito',  en: 'success-stories' },
  equipo:           { es: 'equipo',           en: 'team' },
  privacidad:       { es: 'privacidad',       en: 'privacy' },
  cookies:          { es: 'cookies',          en: 'cookies' },
  categoria:        { es: 'categoria',        en: 'category' },
};

// Reverse map: en slug → es slug
const REVERSE_ROUTE_MAP: Record<string, string> = {};
for (const [esKey, map] of Object.entries(ROUTE_MAP)) {
  REVERSE_ROUTE_MAP[map.en] = esKey;
}

/**
 * Get the alternate-language URL for the current page.
 * Handles translated route segments (e.g., /recursos/ ↔ /en/resources/).
 */
export function getAlternateUrl(currentPath: string, targetLocale: Locale): string {
  // Remove /en/ prefix if present to get the "base" Spanish path
  let basePath = currentPath;
  if (basePath.startsWith('/en/')) {
    basePath = '/' + basePath.slice(4);
  } else if (basePath === '/en') {
    basePath = '/';
  }

  // Translate route segments from current locale to base (es) first
  // Then from es to target locale
  const segments = basePath.split('/').filter(Boolean);
  const translatedSegments = segments.map(seg => {
    // Check if this segment is a known English route → convert to Spanish base
    if (REVERSE_ROUTE_MAP[seg]) {
      const esKey = REVERSE_ROUTE_MAP[seg];
      // Now convert from es to target
      return ROUTE_MAP[esKey]?.[targetLocale] || seg;
    }
    // Check if this segment is a known Spanish route → convert to target
    if (ROUTE_MAP[seg]) {
      return ROUTE_MAP[seg][targetLocale] || seg;
    }
    return seg;
  });

  const path = '/' + translatedSegments.join('/') + (translatedSegments.length > 0 ? '/' : '');

  if (targetLocale === 'es') {
    return path === '/' ? '/' : path;
  }
  return `/en${path === '/' ? '/' : path}`;
}

/**
 * Helper to get locale, translations, and path prefix from Astro context.
 */
export function getPageContext(url: URL) {
  const locale = getLocaleFromUrl(url);
  const t = getTranslations(locale);
  const prefix = locale === 'es' ? '' : '/en';
  const altLocale: Locale = locale === 'es' ? 'en' : 'es';
  const altUrl = getAlternateUrl(url.pathname, altLocale);
  return { locale, t, prefix, altLocale, altUrl };
}
