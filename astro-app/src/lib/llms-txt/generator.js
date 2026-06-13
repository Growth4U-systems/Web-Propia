import { summarizeDescription } from "./extract.js";
import { auditLlmsOutput } from "./quality.js";

const SECTION_ORDER = [
  "Core Pages",
  "Services",
  "Case Studies",
  "Resources",
  "Documentation",
  "Articles And Resources",
  "Company",
  "Other Pages",
  "Optional"
];

// Páginas de relleno legal/normativo: van a ## Optional (convención del estándar
// llms.txt para "esto el LLM puede ignorar"). Se matchea sobre el PATH, no sobre
// título/descripción, para no arrastrar páginas de contenido que mencionen "terms".
const BOILERPLATE_PATH_RE =
  /(privacy|privacidad|cookie|terms|terminos|términos|aviso-legal|legal-advice|legal-notice|politica-de|política-de|gdpr|rgpd|disclaimer|condiciones-generales|condiciones-de-uso)/;

// Primer segmento de path tipo "es", "en", "pt-br": idioma probable.
const KNOWN_LANGS = new Set([
  "en", "es", "fr", "de", "it", "pt", "nl", "ca", "eu", "gl", "ja", "zh", "ko",
  "ru", "pl", "sv", "da", "no", "fi", "cs", "tr", "ar", "he", "el", "ro", "hu", "uk"
]);
const LOCALE_SEG_RE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function generateLlmsFiles(crawlResult, preferredLocale = null) {
  const sorted = [...crawlResult.pages].sort(
    (a, b) => scorePage(b, crawlResult.startUrl) - scorePage(a, crawlResult.startUrl)
  );
  // Colapsar variantes de idioma de la misma página (mantiene la del idioma primario).
  const { pages, primaryLocale, collapsed, availableLocales } = dedupeLocales(
    sorted,
    crawlResult.startUrl,
    preferredLocale
  );

  const site = crawlResult.site;
  const title = cleanMarkdownText(site.title || new URL(crawlResult.startUrl).hostname.replace(/^www\./, ""));
  const description = cleanMarkdownText(site.description || `Important pages discovered for ${new URL(crawlResult.startUrl).hostname}.`);
  const grouped = groupPages(pages);

  // Contexto para deduplicar títulos/descripciones repetidas en los enlaces.
  const titleFreq = new Map();
  for (const page of pages) {
    const t = cleanMarkdownText(page.title || "");
    if (t) titleFreq.set(t, (titleFreq.get(t) || 0) + 1);
  }
  const linkCtx = { siteTitle: title, titleFreq, usedDescriptions: new Set() };

  const llmsTxt = [
    `# ${title}`,
    "",
    `> ${description}`,
    "",
    `Source: ${crawlResult.startUrl}`,
    "",
    ...SECTION_ORDER.flatMap((section) => renderSection(section, grouped.get(section) || [], linkCtx)),
    "",
    "<!-- Generado gratis con https://growth4u.io/llms-txt-generator -->"
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const llmsFullTxt = renderFullText(title, description, crawlResult.startUrl, pages);

  const result = {
    llmsTxt,
    llmsFullTxt,
    pages: pages.map((page) => ({
      url: page.url,
      title: page.title,
      description: page.description,
      section: categorizePage(page)
    })),
    stats: {
      crawledPages: pages.length,
      failedPages: crawlResult.errors.length,
      source: crawlResult.startUrl,
      renderedPages: crawlResult.stats?.renderedPages || 0,
      discoveredSpaRoutes: crawlResult.stats?.discoveredSpaRoutes || 0,
      spaShellsDetected: crawlResult.stats?.spaShellsDetected || 0,
      primaryLocale: primaryLocale || null,
      availableLocales,
      collapsedLocaleDuplicates: collapsed
    },
    errors: crawlResult.errors
  };
  result.quality = auditLlmsOutput(result);
  return result;
}

export function categorizePage(page) {
  const url = new URL(page.url);
  const path = url.pathname.toLowerCase();
  const joined = `${path} ${page.title || ""} ${page.description || ""}`.toLowerCase();

  if (path === "/" || path === "") {
    return "Core Pages";
  }

  // Legal/privacidad/cookies → Optional (antes que cualquier otra categoría).
  if (BOILERPLATE_PATH_RE.test(path)) {
    return "Optional";
  }

  if (/(blog|news|article|articulo|insights?|whitepaper|webinar|podcast|events?|eventos?|categoria)/.test(joined)) {
    return "Articles And Resources";
  }

  if (
    /(servicios?|services?|pricing|precios?|product|producto|features?|funcionalidades|solutions?|soluciones?|platform|plataforma)/.test(
      joined
    )
  ) {
    return "Services";
  }

  if (
    /(recursos?|resources?|landing|lead-magnet|playbooks?|frameworks?|plantillas?|templates?|herramientas?|toolkits?|kit-|checklist|auditor|diagnostico|diagnóstico)/.test(
      joined
    )
  ) {
    return "Resources";
  }

  if (/(casos?-de-exito|case-stud|success-stor|clientes?|customers?|resultados?|bnext|bit2me|gocardless|criptan)/.test(joined)) {
    return "Case Studies";
  }

  if (/(docs?|documentation|documentacion|guide|guia|learn|tutorial|reference|api|developer|help|support|faq|knowledge)/.test(joined)) {
    return "Documentation";
  }

  if (/(about|company|empresa|equipo|team|careers?|trabaja|contact|contacto|press|security)/.test(joined)) {
    return "Company";
  }

  return "Other Pages";
}

function pathLocale(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg || !LOCALE_SEG_RE.test(seg)) return null;
  return KNOWN_LANGS.has(seg.slice(0, 2).toLowerCase()) ? seg.toLowerCase() : null;
}

function localelessPath(pathname) {
  const segs = pathname.split("/").filter(Boolean);
  const stripped = pathLocale(pathname) ? segs.slice(1) : segs;
  return ("/" + stripped.join("/")).replace(/\/$/, "") || "/";
}

// Si la misma página canónica existe en varios idiomas, deja solo la del idioma
// primario del sitio (home, si no el más frecuente). En sitios monolingües no hace nada.
function dedupeLocales(pages, startUrl, preferredLocale = null) {
  // El idioma sin prefijo (p. ej. español en growth4u.io, que va en la raíz) cuenta
  // como un idioma más: "default". Así un sitio ES-sin-prefijo + /en/ ofrece elegir
  // entre los dos y deduplica de verdad, no solo los sitios con /es//en/ explícitos.
  const DEFAULT = "default";
  const groups = new Map();
  const localeCounts = new Map();
  for (const page of pages) {
    const u = new URL(page.url);
    const loc = pathLocale(u.pathname) || DEFAULT;
    const key = localelessPath(u.pathname);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ page, locale: loc });
    localeCounts.set(loc, (localeCounts.get(loc) || 0) + 1);
  }

  const availableLocales = [...localeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
  const hasCrossLocaleDup = [...groups.values()].some(
    (arr) => new Set(arr.map((x) => x.locale)).size > 1
  );
  if (!hasCrossLocaleDup || localeCounts.size < 2) {
    return { pages, primaryLocale: null, collapsed: 0, availableLocales };
  }

  // El usuario puede forzar el idioma canónico; si no, se autodetecta (home, luego más frecuente).
  let primary = preferredLocale && localeCounts.has(preferredLocale) ? preferredLocale : null;
  if (!primary) primary = pathLocale(new URL(startUrl).pathname) || DEFAULT;
  if (!localeCounts.has(primary)) primary = availableLocales[0];

  const kept = [];
  const keptKeys = new Set();
  let collapsed = 0;
  for (const page of pages) {
    const key = localelessPath(new URL(page.url).pathname);
    const arr = groups.get(key);
    const distinct = new Set(arr.map((x) => x.locale));
    if (distinct.size <= 1) {
      kept.push(page);
      continue;
    }
    if (keptKeys.has(key)) {
      collapsed++;
      continue;
    }
    const preferred = arr.find((x) => x.locale === primary) || arr[0];
    if (page.url === preferred.page.url) {
      kept.push(page);
      keptKeys.add(key);
    } else {
      collapsed++;
    }
  }
  return { pages: kept, primaryLocale: primary, collapsed, availableLocales };
}

function groupPages(pages) {
  const grouped = new Map(SECTION_ORDER.map((section) => [section, []]));

  for (const page of pages) {
    grouped.get(categorizePage(page)).push(page);
  }

  return grouped;
}

function renderSection(section, pages, ctx) {
  if (!pages.length) {
    return [];
  }

  return [`## ${section}`, "", ...pages.map((page) => formatPageLink(page, ctx)), ""];
}

function labelFromSlug(url) {
  const pathname = new URL(url).pathname;
  const segs = pathname.split("/").filter(Boolean);
  const stripped = pathLocale(pathname) ? segs.slice(1) : segs;
  const last = stripped[stripped.length - 1] || new URL(url).hostname.replace(/^www\./, "");
  return last
    .replace(/\.\w+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPageLink(page, ctx = { siteTitle: "", titleFreq: new Map(), usedDescriptions: new Set() }) {
  let titleText = cleanMarkdownText(page.title || "");
  const isDuplicateTitle =
    !titleText || titleText === ctx.siteTitle || (ctx.titleFreq.get(titleText) || 0) > 1;
  if (isDuplicateTitle) {
    const slugLabel = labelFromSlug(page.url);
    if (slugLabel) titleText = slugLabel;
  }
  const title = escapeLinkText(titleText || new URL(page.url).pathname || page.url);

  let description = cleanMarkdownText(summarizeDescription(page.description || ""));
  if (!description || ctx.usedDescriptions.has(description)) {
    const alt = cleanMarkdownText(summarizeDescription(page.text || ""));
    if (alt && !ctx.usedDescriptions.has(alt)) {
      description = alt;
    } else if (ctx.usedDescriptions.has(description)) {
      description = "";
    }
  }
  if (description) ctx.usedDescriptions.add(description);

  if (!description) {
    return `- [${title}](${page.url})`;
  }

  return `- [${title}](${page.url}): ${description}`;
}

function renderFullText(title, description, startUrl, pages) {
  const sections = [
    `# ${title} Full Content`,
    "",
    `> ${description}`,
    "",
    `Source: ${startUrl}`,
    ""
  ];

  for (const page of pages) {
    sections.push("---", "", `## ${cleanMarkdownText(page.title || page.url)}`, "", `URL: ${page.url}`);

    if (page.description) {
      sections.push(`Description: ${cleanMarkdownText(page.description)}`);
    }

    sections.push("", trimPageMarkdown(page.markdown || page.text || ""));
  }

  return sections.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

function trimPageMarkdown(markdown) {
  const cleaned = String(markdown || "").trim();
  const maxLength = 8_000;
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trim()}\n\n[Content truncated for this page.]`;
}

function scorePage(page, startUrl) {
  const url = new URL(page.url);
  const start = new URL(startUrl);
  const path = url.pathname.toLowerCase();
  const depth = path.split("/").filter(Boolean).length;
  let score = 100 - depth * 8;

  if (url.pathname === "/" || url.href === start.href) {
    score += 100;
  }
  if (/(docs?|guide|api|reference|pricing|product|features?|about)/.test(path)) {
    score += 35;
  }
  if (/(tag|category|author|page\/\d+|search|login|signin|signup|cart|checkout)/.test(path)) {
    score -= 45;
  }
  // Legal/privacidad pesan menos: van a Optional, no deben competir por las primeras posiciones.
  if (BOILERPLATE_PATH_RE.test(path)) {
    score -= 60;
  }
  if ((page.description || "").length > 40) {
    score += 10;
  }

  return score;
}

function cleanMarkdownText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[*_`~]/g, "")
    .replace(/[[\]<>]/g, "")
    .trim();
}

function escapeLinkText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}
