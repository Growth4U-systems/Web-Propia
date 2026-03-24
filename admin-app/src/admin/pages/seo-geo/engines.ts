import type { SEOAuditResult, WebVitals, SEOIssue, Recommendation, OwnMediaResult } from './types';

// ============================================
// SEVERITY ORDER (for sorting)
// ============================================
const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortBySeverityAndImpact(a: SEOIssue, b: SEOIssue): number {
  const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (sevDiff !== 0) return sevDiff;
  return b.expectedImpactPct - a.expectedImpactPct;
}

function sortRecsBySeverityAndImpact(a: Recommendation, b: Recommendation): number {
  const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (sevDiff !== 0) return sevDiff;
  return b.expectedImpactPct - a.expectedImpactPct;
}

// ============================================
// ISSUES ENGINE — 45+ rules
// ============================================
export function generateIssues(
  audit: SEOAuditResult | null,
  webVitals: WebVitals | null
): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // ─── PERFORMANCE RULES (from Web Vitals) ───

  if (webVitals) {
    // Performance score
    if (webVitals.performance < 50) {
      issues.push({
        type: 'performance',
        severity: 'critical',
        title: 'Performance score critico',
        description: `El score de rendimiento es ${webVitals.performance}/100. Google penaliza sitios lentos en rankings y los motores de IA priorizan fuentes con buena experiencia de usuario.`,
        fixSteps: [
          'Optimiza imagenes: convierte a WebP/AVIF, usa lazy loading',
          'Minimiza y comprime JS/CSS (tree-shaking, code splitting)',
          'Implementa CDN para assets estaticos',
          'Elimina recursos que bloquean el renderizado',
          'Activa compresion Brotli/Gzip en el servidor',
        ],
        expectedImpactPct: 25,
      });
    } else if (webVitals.performance < 75) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'Performance score mejorable',
        description: `El score de rendimiento es ${webVitals.performance}/100. Un score > 90 mejora rankings y UX.`,
        fixSteps: [
          'Revisa imagenes sin optimizar',
          'Reduce JS innecesario (third-party scripts)',
          'Implementa preload para recursos criticos',
        ],
        expectedImpactPct: 10,
      });
    }

    // Accessibility score
    if (webVitals.accessibility < 70) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'Accesibilidad baja',
        description: `El score de accesibilidad es ${webVitals.accessibility}/100. Problemas de accesibilidad afectan SEO y pueden excluir usuarios.`,
        fixSteps: [
          'Anade atributos alt a todas las imagenes',
          'Asegura contraste de color suficiente (ratio >= 4.5:1)',
          'Usa etiquetas semanticas (header, main, nav, footer)',
          'Anade labels a todos los inputs de formulario',
          'Asegura navegacion por teclado',
        ],
        expectedImpactPct: 15,
      });
    } else if (webVitals.accessibility < 90) {
      issues.push({
        type: 'performance',
        severity: 'low',
        title: 'Accesibilidad mejorable',
        description: `El score de accesibilidad es ${webVitals.accessibility}/100. Recomendamos alcanzar > 90.`,
        fixSteps: [
          'Revisa contraste de colores',
          'Verifica que todos los formularios tengan labels',
          'Usa aria-labels donde sea necesario',
        ],
        expectedImpactPct: 5,
      });
    }

    // SEO score (Lighthouse)
    if (webVitals.seo < 80) {
      issues.push({
        type: 'technical_seo',
        severity: 'high',
        title: 'SEO score de Lighthouse bajo',
        description: `El score SEO de Lighthouse es ${webVitals.seo}/100. Hay problemas tecnicos que impiden una correcta indexacion.`,
        fixSteps: [
          'Revisa meta tags (title, description)',
          'Asegura que la pagina sea rastreable (robots.txt, meta robots)',
          'Verifica enlaces validos y sin errores 404',
          'Implementa datos estructurados',
        ],
        expectedImpactPct: 20,
      });
    } else if (webVitals.seo < 95) {
      issues.push({
        type: 'technical_seo',
        severity: 'low',
        title: 'SEO score de Lighthouse mejorable',
        description: `El score SEO de Lighthouse es ${webVitals.seo}/100. Pequenas mejoras pueden llevarlo a 100.`,
        fixSteps: [
          'Revisa el informe de Lighthouse para detalles especificos',
          'Verifica hreflang tags si tienes contenido multiidioma',
        ],
        expectedImpactPct: 5,
      });
    }

    // Best Practices score
    if (webVitals.bestPractices < 70) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'Best Practices score bajo',
        description: `El score de Best Practices es ${webVitals.bestPractices}/100. Indica problemas de seguridad o configuracion.`,
        fixSteps: [
          'Usa HTTPS en todos los recursos',
          'Evita APIs obsoletas del navegador',
          'Revisa errores en la consola del navegador',
          'Asegura que no hay vulnerabilidades en librerias JS',
        ],
        expectedImpactPct: 8,
      });
    }

    // LCP (Largest Contentful Paint)
    if (webVitals.lcp > 4.0) {
      issues.push({
        type: 'performance',
        severity: 'critical',
        title: 'LCP excesivamente lento',
        description: `El LCP es ${webVitals.lcp.toFixed(1)}s (debe ser < 2.5s). El contenido principal tarda demasiado en cargar. Google clasifica esto como "pobre".`,
        fixSteps: [
          'Identifica el elemento LCP (suele ser una imagen hero o titulo)',
          'Usa <link rel="preload"> para la imagen principal',
          'Optimiza el servidor (TTFB < 800ms)',
          'Implementa CDN y caching agresivo',
          'Elimina CSS render-blocking innecesario',
          'Considera server-side rendering si usas SPA',
        ],
        expectedImpactPct: 30,
      });
    } else if (webVitals.lcp > 2.5) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'LCP necesita mejora',
        description: `El LCP es ${webVitals.lcp.toFixed(1)}s (objetivo < 2.5s). Google lo clasifica como "needs improvement".`,
        fixSteps: [
          'Preload la imagen o recurso LCP',
          'Optimiza imagenes (formato WebP, compresion)',
          'Reduce time to first byte (TTFB)',
        ],
        expectedImpactPct: 20,
      });
    }

    // CLS (Cumulative Layout Shift)
    if (webVitals.cls > 0.25) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'CLS muy alto — inestabilidad visual',
        description: `El CLS es ${webVitals.cls.toFixed(3)} (debe ser < 0.1). Los elementos se mueven durante la carga, perjudicando la experiencia.`,
        fixSteps: [
          'Define width/height en todas las imagenes y videos',
          'Reserva espacio para anuncios y embeds (aspect-ratio)',
          'Evita inyectar contenido dinamico sobre contenido existente',
          'Usa font-display: swap con preload de fuentes',
          'No insertes banners o CTAs que desplacen el contenido',
        ],
        expectedImpactPct: 15,
      });
    } else if (webVitals.cls > 0.1) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'CLS mejorable',
        description: `El CLS es ${webVitals.cls.toFixed(3)} (objetivo < 0.1). Hay pequenos cambios de layout.`,
        fixSteps: [
          'Revisa imagenes sin dimensiones definidas',
          'Verifica fuentes web (font-display)',
          'Comprueba elementos dinamicos (banners, popups)',
        ],
        expectedImpactPct: 8,
      });
    }

    // TBT (Total Blocking Time)
    if (webVitals.tbt > 600) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'TBT alto — hilo principal bloqueado',
        description: `El TBT es ${webVitals.tbt}ms (debe ser < 200ms). El navegador esta bloqueado ejecutando JavaScript, lo que causa lag.`,
        fixSteps: [
          'Divide tareas JS largas en chunks mas pequenos',
          'Usa web workers para calculos pesados',
          'Elimina o posterga scripts de terceros',
          'Implementa code splitting y lazy loading de componentes',
          'Revisa y elimina polyfills innecesarios',
        ],
        expectedImpactPct: 18,
      });
    } else if (webVitals.tbt > 200) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'TBT elevado',
        description: `El TBT es ${webVitals.tbt}ms (objetivo < 200ms). Hay margen para optimizar JavaScript.`,
        fixSteps: [
          'Revisa scripts de terceros (analytics, chat widgets)',
          'Posterga carga de scripts no criticos',
          'Usa dynamic imports para componentes pesados',
        ],
        expectedImpactPct: 10,
      });
    }

    // FCP (First Contentful Paint)
    if (webVitals.fcp > 3.0) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'FCP lento — primera pintura tardia',
        description: `El FCP es ${webVitals.fcp.toFixed(1)}s (debe ser < 1.8s). El usuario ve una pantalla en blanco demasiado tiempo.`,
        fixSteps: [
          'Elimina CSS render-blocking',
          'Inline el CSS critico (above-the-fold)',
          'Reduce el TTFB del servidor',
          'Usa preconnect para dominios de terceros',
        ],
        expectedImpactPct: 15,
      });
    } else if (webVitals.fcp > 1.8) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'FCP mejorable',
        description: `El FCP es ${webVitals.fcp.toFixed(1)}s (objetivo < 1.8s).`,
        fixSteps: [
          'Revisa CSS critico',
          'Optimiza la respuesta del servidor',
        ],
        expectedImpactPct: 8,
      });
    }

    // Speed Index
    if (webVitals.si > 5.8) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'Speed Index alto',
        description: `El Speed Index es ${webVitals.si.toFixed(1)}s (debe ser < 3.4s). La pagina carga visualmente lento.`,
        fixSteps: [
          'Optimiza el orden de carga de recursos visibles',
          'Reduce el tamano de CSS y fuentes',
          'Implementa critical CSS inlining',
        ],
        expectedImpactPct: 12,
      });
    } else if (webVitals.si > 3.4) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'Speed Index mejorable',
        description: `El Speed Index es ${webVitals.si.toFixed(1)}s (objetivo < 3.4s).`,
        fixSteps: [
          'Prioriza carga de contenido above-the-fold',
          'Lazy load imagenes below-the-fold',
        ],
        expectedImpactPct: 6,
      });
    }

    // TTFB
    if (webVitals.ttfb > 1.8) {
      issues.push({
        type: 'performance',
        severity: 'high',
        title: 'TTFB alto — servidor lento',
        description: `El TTFB es ${webVitals.ttfb.toFixed(1)}s (debe ser < 0.8s). El servidor tarda mucho en responder.`,
        fixSteps: [
          'Usa un CDN (Cloudflare, Netlify Edge)',
          'Implementa caching a nivel de servidor',
          'Optimiza queries de base de datos',
          'Considera pre-rendering / SSG para paginas estaticas',
        ],
        expectedImpactPct: 15,
      });
    } else if (webVitals.ttfb > 0.8) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'TTFB mejorable',
        description: `El TTFB es ${webVitals.ttfb.toFixed(1)}s (objetivo < 0.8s).`,
        fixSteps: [
          'Revisa configuracion de CDN',
          'Implementa edge caching',
        ],
        expectedImpactPct: 8,
      });
    }
  }

  // ─── TECHNICAL SEO RULES (from Audit) ───

  if (audit) {
    // Meta title
    if (!audit.metaTitle || audit.metaTitleLength === 0) {
      issues.push({
        type: 'technical_seo',
        severity: 'critical',
        title: 'Meta title ausente',
        description: 'La pagina no tiene meta title. Es el factor on-page mas importante para SEO y lo primero que ven los motores de IA al analizar una pagina.',
        fixSteps: [
          'Anade un <title> descriptivo en el <head>',
          'Incluye la keyword principal al inicio',
          'Manten entre 50-60 caracteres',
          'Incluye el nombre de marca al final',
        ],
        expectedImpactPct: 35,
      });
    } else if (audit.metaTitleLength < 30) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Meta title demasiado corto',
        description: `El meta title tiene ${audit.metaTitleLength} caracteres (recomendado: 50-60). Un titulo corto desaprovecha espacio valioso en los resultados de busqueda.`,
        fixSteps: [
          'Expande el titulo incluyendo mas keywords relevantes',
          'Anade un beneficio o propuesta de valor',
          'Objetivo: 50-60 caracteres',
        ],
        expectedImpactPct: 10,
      });
    } else if (audit.metaTitleLength > 60) {
      issues.push({
        type: 'technical_seo',
        severity: 'low',
        title: 'Meta title demasiado largo',
        description: `El meta title tiene ${audit.metaTitleLength} caracteres (recomendado: 50-60). Google truncara el titulo en los resultados.`,
        fixSteps: [
          'Recorta a 60 caracteres maximo',
          'Prioriza las keywords mas importantes al inicio',
        ],
        expectedImpactPct: 5,
      });
    }

    // Meta description
    if (!audit.metaDescription || audit.metaDescriptionLength === 0) {
      issues.push({
        type: 'technical_seo',
        severity: 'high',
        title: 'Meta description ausente',
        description: 'No hay meta description. Google generara una automaticamente, pero perderas control sobre lo que ven los usuarios y los motores de IA.',
        fixSteps: [
          'Anade <meta name="description" content="..."> en el <head>',
          'Incluye keywords principales de forma natural',
          'Anade un CTA (call to action)',
          'Manten entre 120-160 caracteres',
        ],
        expectedImpactPct: 15,
      });
    } else if (audit.metaDescriptionLength < 70) {
      issues.push({
        type: 'technical_seo',
        severity: 'low',
        title: 'Meta description corta',
        description: `La meta description tiene ${audit.metaDescriptionLength} caracteres (recomendado: 120-160). Desaprovechas espacio en los resultados.`,
        fixSteps: [
          'Expande la descripcion con mas detalles y beneficios',
          'Objetivo: 120-160 caracteres',
        ],
        expectedImpactPct: 5,
      });
    } else if (audit.metaDescriptionLength > 160) {
      issues.push({
        type: 'technical_seo',
        severity: 'low',
        title: 'Meta description larga',
        description: `La meta description tiene ${audit.metaDescriptionLength} caracteres (recomendado: 120-160). Google la truncara.`,
        fixSteps: [
          'Recorta a 160 caracteres maximo',
          'Pon la informacion mas importante al inicio',
        ],
        expectedImpactPct: 3,
      });
    }

    // H1
    if (audit.h1Count === 0) {
      issues.push({
        type: 'technical_seo',
        severity: 'high',
        title: 'Sin H1 en la pagina',
        description: 'No se encontro ningun H1. Es esencial para que Google y los motores de IA entiendan el tema principal de la pagina.',
        fixSteps: [
          'Anade exactamente un H1 con la keyword principal',
          'Colocalo como primer heading visible de la pagina',
          'Debe reflejar el contenido principal',
        ],
        expectedImpactPct: 20,
      });
    } else if (audit.h1Count > 1) {
      issues.push({
        type: 'technical_seo',
        severity: 'low',
        title: 'Multiples H1 detectados',
        description: `Se encontraron ${audit.h1Count} etiquetas H1. Tener mas de un H1 puede confundir a los buscadores sobre el tema principal.`,
        fixSteps: [
          'Manten solo un H1 por pagina',
          'Convierte los H1 extra en H2',
        ],
        expectedImpactPct: 5,
      });
    }

    // H2 headings
    if (audit.h2Count === 0) {
      issues.push({
        type: 'content',
        severity: 'medium',
        title: 'Sin subtitulos H2',
        description: 'No hay H2s. Los subtitulos ayudan a estructurar el contenido y son usados por motores de IA para extraer secciones clave.',
        fixSteps: [
          'Divide el contenido en secciones con H2s descriptivos',
          'Usa keywords secundarias en los H2',
          'Cada H2 debe poder funcionar como snippet independiente',
        ],
        expectedImpactPct: 12,
      });
    }

    // Images without alt
    if (audit.totalImages > 0) {
      const altMissingPct = (audit.imagesWithoutAlt / audit.totalImages) * 100;

      if (altMissingPct > 50) {
        issues.push({
          type: 'technical_seo',
          severity: 'high',
          title: 'Mas del 50% de imagenes sin alt',
          description: `${audit.imagesWithoutAlt} de ${audit.totalImages} imagenes no tienen atributo alt. Esto perjudica accesibilidad, SEO de imagenes y la comprension de IA.`,
          fixSteps: [
            'Anade alt descriptivo a cada imagen',
            'Incluye keywords relevantes cuando sea natural',
            'Para imagenes decorativas, usa alt=""',
            'Describe que muestra la imagen, no solo el nombre del archivo',
          ],
          expectedImpactPct: 15,
        });
      } else if (altMissingPct > 20) {
        issues.push({
          type: 'technical_seo',
          severity: 'medium',
          title: 'Algunas imagenes sin alt',
          description: `${audit.imagesWithoutAlt} de ${audit.totalImages} imagenes no tienen alt (${altMissingPct.toFixed(0)}%).`,
          fixSteps: [
            'Anade alt descriptivo a las imagenes que faltan',
            'Prioriza imagenes de contenido sobre decorativas',
          ],
          expectedImpactPct: 8,
        });
      } else if (audit.imagesWithoutAlt > 0) {
        issues.push({
          type: 'technical_seo',
          severity: 'low',
          title: 'Pocas imagenes sin alt',
          description: `${audit.imagesWithoutAlt} de ${audit.totalImages} imagenes no tienen alt.`,
          fixSteps: [
            'Completa los atributos alt que faltan',
          ],
          expectedImpactPct: 3,
        });
      }
    }

    // Viewport
    if (!audit.hasViewport) {
      issues.push({
        type: 'technical_seo',
        severity: 'critical',
        title: 'Sin viewport meta tag',
        description: 'Falta la etiqueta viewport. Sin ella, la pagina no sera mobile-friendly y Google la penalizara en resultados moviles.',
        fixSteps: [
          'Anade <meta name="viewport" content="width=device-width, initial-scale=1"> al <head>',
        ],
        expectedImpactPct: 30,
      });
    }

    // HTTPS
    if (!audit.isHttps) {
      issues.push({
        type: 'technical_seo',
        severity: 'critical',
        title: 'Sitio sin HTTPS',
        description: 'El sitio no usa HTTPS. Los navegadores lo marcaran como "no seguro" y Google prioriza sitios con SSL.',
        fixSteps: [
          'Instala un certificado SSL (Let\'s Encrypt es gratuito)',
          'Configura redireccion HTTP a HTTPS',
          'Actualiza todas las URLs internas a HTTPS',
          'Actualiza el sitemap con URLs HTTPS',
        ],
        expectedImpactPct: 35,
      });
    }

    // Robots.txt
    if (!audit.hasRobotsTxt) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Sin robots.txt',
        description: 'No se encontro robots.txt. Sin el, los crawlers no saben que pueden rastrear y podrian indexar paginas innecesarias.',
        fixSteps: [
          'Crea un archivo robots.txt en la raiz del dominio',
          'Incluye directivas Allow/Disallow para crawlers',
          'Anade referencia al sitemap: Sitemap: https://tudominio.com/sitemap.xml',
        ],
        expectedImpactPct: 10,
      });
    }

    // Sitemap
    if (!audit.hasSitemap) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Sin sitemap.xml',
        description: 'No se encontro sitemap.xml. Es esencial para que Google descubra todas tus paginas de forma eficiente.',
        fixSteps: [
          'Genera un sitemap.xml con todas las URLs indexables',
          'Envialo a Google Search Console',
          'Referencialos desde robots.txt',
          'Actualizalo automaticamente al publicar nuevo contenido',
        ],
        expectedImpactPct: 12,
      });
    }

    // Canonical
    if (!audit.hasCanonical) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Sin canonical tag',
        description: 'No hay etiqueta canonical. Puede causar problemas de contenido duplicado si hay multiples URLs para la misma pagina.',
        fixSteps: [
          'Anade <link rel="canonical" href="URL-canonica"> en el <head>',
          'Asegura que apunta a la version preferida de la URL',
          'Incluye canonical en todas las paginas',
        ],
        expectedImpactPct: 10,
      });
    }

    // Structured data / Schema
    if ((audit.structuredDataTypes ?? []).length === 0) {
      issues.push({
        type: 'geo',
        severity: 'high',
        title: 'Sin datos estructurados (Schema)',
        description: 'No se detectaron datos estructurados. Los motores de IA priorizan sitios con schema markup para extraer informacion fiable y citarla.',
        fixSteps: [
          'Implementa Schema.org Organization para tu empresa',
          'Anade Article/BlogPosting para contenido del blog',
          'Implementa FAQPage para secciones de preguntas frecuentes',
          'Anade BreadcrumbList para navegacion',
          'Usa HowTo para guias paso a paso',
          'Valida con Google Rich Results Test',
        ],
        expectedImpactPct: 25,
      });
    } else {
      // Check for missing important schema types
      const importantSchemas = ['Organization', 'WebSite', 'BreadcrumbList'];
      const missingSchemas = importantSchemas.filter(
        s => !(audit.structuredDataTypes ?? []).some(t => t.toLowerCase().includes(s.toLowerCase()))
      );
      if (missingSchemas.length > 0) {
        issues.push({
          type: 'geo',
          severity: 'medium',
          title: 'Datos estructurados incompletos',
          description: `Faltan schemas importantes: ${missingSchemas.join(', ')}. Los motores de IA usan estos datos para entender y citar tu sitio.`,
          fixSteps: missingSchemas.map(s => `Implementa Schema.org ${s}`),
          expectedImpactPct: 12,
        });
      }

      // Check for FAQ schema (important for GEO)
      if (!(audit.structuredDataTypes ?? []).some(t => t.toLowerCase().includes('faq'))) {
        issues.push({
          type: 'geo',
          severity: 'medium',
          title: 'Sin FAQPage schema',
          description: 'No se detecto schema FAQPage. Las FAQs con markup estructurado son una de las fuentes principales que citan ChatGPT y Perplexity.',
          fixSteps: [
            'Anade secciones de FAQ en tus paginas principales',
            'Implementa schema FAQPage con JSON-LD',
            'Incluye 3-5 preguntas frecuentes relevantes por pagina',
          ],
          expectedImpactPct: 18,
        });
      }
    }

    // Open Graph
    if (!audit.ogTitle) {
      issues.push({
        type: 'content',
        severity: 'medium',
        title: 'Sin Open Graph title',
        description: 'Falta og:title. Cuando se comparte en redes sociales, no se mostrara correctamente.',
        fixSteps: [
          'Anade <meta property="og:title" content="...">',
          'Incluye tambien og:description y og:image',
        ],
        expectedImpactPct: 5,
      });
    }

    if (!audit.ogImage) {
      issues.push({
        type: 'content',
        severity: 'medium',
        title: 'Sin Open Graph image',
        description: 'Falta og:image. Las publicaciones sin imagen tienen mucho menos engagement en redes sociales.',
        fixSteps: [
          'Anade <meta property="og:image" content="URL-imagen">',
          'Usa una imagen de 1200x630px',
          'Incluye tambien og:image:width y og:image:height',
        ],
        expectedImpactPct: 5,
      });
    }

    if (!audit.ogDescription) {
      issues.push({
        type: 'content',
        severity: 'low',
        title: 'Sin Open Graph description',
        description: 'Falta og:description. Las redes sociales usaran la meta description como fallback.',
        fixSteps: [
          'Anade <meta property="og:description" content="...">',
        ],
        expectedImpactPct: 3,
      });
    }

    // Hreflang tags
    if ((audit.hreflangTags ?? []).length === 0 && audit.url.includes('/en/')) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Sin hreflang tags (contenido multiidioma)',
        description: 'Tienes contenido en ingles pero no hay hreflang tags. Google no puede asociar las versiones de idioma correctamente.',
        fixSteps: [
          'Anade <link rel="alternate" hreflang="es" href="URL-espanol">',
          'Anade <link rel="alternate" hreflang="en" href="URL-ingles">',
          'Incluye hreflang="x-default" para la version principal',
          'Asegura reciprocidad: ambas paginas deben referenciarse mutuamente',
        ],
        expectedImpactPct: 10,
      });
    }

    // Word count (content quality)
    if (audit.wordCount > 0 && audit.wordCount < 300) {
      issues.push({
        type: 'content',
        severity: 'high',
        title: 'Contenido muy escaso (thin content)',
        description: `La pagina tiene solo ${audit.wordCount} palabras. Google y los motores de IA necesitan contenido sustancial para entender y recomendar la pagina.`,
        fixSteps: [
          'Expande el contenido a minimo 800 palabras para paginas de servicio',
          'Anade secciones de FAQ, beneficios y casos de uso',
          'Incluye datos, estadisticas y ejemplos concretos',
          'Los articulos del blog deberian tener 1000-2000 palabras',
        ],
        expectedImpactPct: 25,
      });
    } else if (audit.wordCount > 0 && audit.wordCount < 600) {
      issues.push({
        type: 'content',
        severity: 'medium',
        title: 'Contenido corto',
        description: `La pagina tiene ${audit.wordCount} palabras. Para competir en SEO y ser citado por IA, se recomienda minimo 800 palabras.`,
        fixSteps: [
          'Anade mas contenido de valor',
          'Incluye seccion de FAQ',
          'Desarrolla mas los puntos clave',
        ],
        expectedImpactPct: 15,
      });
    }

    // Internal links
    if (audit.internalLinks === 0) {
      issues.push({
        type: 'technical_seo',
        severity: 'high',
        title: 'Sin enlaces internos',
        description: 'No se detectaron enlaces internos. Los enlaces internos distribuyen autoridad y ayudan a la indexacion.',
        fixSteps: [
          'Enlaza a paginas de servicio desde el contenido',
          'Anade una seccion de "contenido relacionado"',
          'Usa anchor text descriptivo con keywords',
          'Enlaza desde las FAQ a paginas relevantes',
        ],
        expectedImpactPct: 18,
      });
    } else if (audit.internalLinks < 3) {
      issues.push({
        type: 'technical_seo',
        severity: 'medium',
        title: 'Pocos enlaces internos',
        description: `Solo ${audit.internalLinks} enlaces internos. Se recomienda minimo 3-5 por pagina.`,
        fixSteps: [
          'Anade enlaces a paginas relacionadas',
          'Incluye breadcrumbs si no los tienes',
          'Enlaza desde CTAs a paginas de servicio',
        ],
        expectedImpactPct: 10,
      });
    }

    // External links
    if (audit.externalLinks === 0 && audit.wordCount > 500) {
      issues.push({
        type: 'content',
        severity: 'low',
        title: 'Sin enlaces externos',
        description: 'No hay enlaces a fuentes externas. Enlazar a fuentes autoritativas mejora la credibilidad ante Google y motores de IA.',
        fixSteps: [
          'Enlaza a fuentes autoritativas cuando cites datos',
          'Referencia estudios, informes o articulos de referencia',
          'Usa rel="noopener" para enlaces externos',
        ],
        expectedImpactPct: 5,
      });
    }

    // Heading hierarchy
    if (audit.h1Count > 0 && audit.h2Count === 0 && audit.h3Count > 0) {
      issues.push({
        type: 'content',
        severity: 'low',
        title: 'Jerarquia de headings incorrecta',
        description: 'Se detectaron H3 sin H2. La jerarquia de headings debe ser secuencial (H1 > H2 > H3).',
        fixSteps: [
          'Revisa la estructura de headings',
          'No saltes niveles (H1 > H3 sin H2)',
          'Usa headings para estructura, no para estilo',
        ],
        expectedImpactPct: 5,
      });
    }
  }

  return issues.sort(sortBySeverityAndImpact);
}

// ============================================
// RECOMMENDATIONS ENGINE
// ============================================
export function generateRecommendations(
  issues: SEOIssue[],
  ownMedia: OwnMediaResult | null
): Recommendation[] {
  const recs: Recommendation[] = [];

  // ─── 1. Convert issues to recommendations ───
  for (const issue of issues) {
    recs.push({
      category: issue.type === 'performance' ? 'Rendimiento'
        : issue.type === 'technical_seo' ? 'SEO Tecnico'
        : issue.type === 'geo' ? 'GEO'
        : 'Contenido',
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      fixOverview: issue.fixSteps[0] || '',
      fixSteps: issue.fixSteps,
      expectedImpactPct: issue.expectedImpactPct,
      source: issue.type === 'geo' ? 'geo_analysis' : 'audit',
      status: 'open',
    });
  }

  // ─── 2. GEO-specific recommendations (conditional) ───
  const sd = ownMedia?.schemaTypes ?? [];
  const hasFAQSchema = sd.some(s => s.toLowerCase().includes('faq'));
  const hasArticleSchema = sd.some(s => s.toLowerCase().includes('article'));
  const hasPersonSchema = sd.some(s => s.toLowerCase().includes('person'));
  const blogPostCount = ownMedia?.blog?.postCount ?? 0;
  const avgWordCount = ownMedia?.blog?.avgWordCount ?? 0;

  // Only suggest citations if blog exists but posts are short (likely lacking depth/sources)
  if (blogPostCount > 0 && avgWordCount < 1200) {
    recs.push({
      category: 'GEO',
      severity: 'high',
      title: 'Anadir citas autoritativas al contenido',
      description: `Con un promedio de ${avgWordCount} palabras/articulo, hay espacio para anadir fuentes. Los motores de IA como ChatGPT y Perplexity priorizan contenido que cita fuentes fiables.`,
      fixOverview: 'Anade datos con fuente en cada articulo del blog y pagina de servicio.',
      fixSteps: [
        'Incluye al menos 2-3 estadisticas con fuente por articulo',
        'Cita informes de Gartner, McKinsey, HubSpot, etc.',
        'Usa formato: "Segun [fuente], [dato]" para que la IA pueda extraerlo',
        'Anade links a las fuentes originales',
        'Incluye datos propios de casos de exito como fuente primaria',
      ],
      expectedImpactPct: 35,
      source: 'geo_analysis',
      status: 'open',
    });
  }

  // Only suggest expert quotes if no Person schema (proxy for author/expert attribution)
  if (!hasPersonSchema) {
    recs.push({
      category: 'GEO',
      severity: 'medium',
      title: 'Incluir citas de expertos',
      description: 'No se detecto schema Person/Author. Los motores de IA valoran las citas directas de expertos del sector con atribucion verificable.',
      fixOverview: 'Anade citas textuales de expertos en articulos clave e implementa schema Person.',
      fixSteps: [
        'Incluye quotes del CEO o equipo en cada servicio',
        'Anade testimonios textuales de clientes con nombre y cargo',
        'Cita a expertos reconocidos del sector growth/marketing',
        'Usa formato blockquote con atribucion clara',
        'Implementa schema Person para los autores',
      ],
      expectedImpactPct: 15,
      source: 'geo_analysis',
      status: 'open',
    });
  }

  // Only suggest AI-extractable content if no FAQ schema and few headings
  if (!hasFAQSchema || !hasArticleSchema) {
    const missing = [!hasFAQSchema && 'FAQPage', !hasArticleSchema && 'Article'].filter(Boolean).join(', ');
    recs.push({
      category: 'GEO',
      severity: 'high',
      title: 'Optimizar contenido para extraccion por IA',
      description: `Faltan schemas clave (${missing}). Estructura el contenido para que los LLMs puedan extraer respuestas: definiciones claras, FAQ sections y datos estructurados.`,
      fixOverview: 'Reestructura las paginas principales con formato extractable.',
      fixSteps: [
        'Incluye definiciones claras al inicio de cada tema ("Growth marketing es...")',
        'Usa listas numeradas para procesos y pasos',
        'Anade tablas comparativas en articulos de comparacion',
        'Implementa FAQ sections con preguntas reales',
        'Usa H2/H3 como preguntas que la IA pueda responder',
        `Implementa schemas faltantes: ${missing}`,
      ],
      expectedImpactPct: 30,
      source: 'geo_analysis',
      status: 'open',
    });
  }

  // ─── 3. Own Media recommendations ───
  if (ownMedia) {
    // Blog checks
    if (!ownMedia.blog.hasBlog) {
      recs.push({
        category: 'Contenido',
        severity: 'critical',
        title: 'Sin blog detectado',
        description: 'No se detecto un blog. El blog es el principal generador de contenido indexable y la fuente mas citada por motores de IA.',
        fixOverview: 'Crea un blog con publicacion regular de contenido.',
        fixSteps: [
          'Crea una seccion /blog/ con contenido relevante',
          'Publica minimo 2 articulos por mes',
          'Cada articulo debe tener 800-1500 palabras',
          'Optimiza para GEO: respuesta directa, FAQ, tablas, citas',
          'Implementa schema BlogPosting en cada articulo',
        ],
        expectedImpactPct: 40,
        source: 'own_media',
        status: 'open',
      });
    } else {
      // Posting frequency
      if (ownMedia.blog.postingFrequency === 'inactive' || ownMedia.blog.postingFrequency === 'none') {
        recs.push({
          category: 'Contenido',
          severity: 'high',
          title: 'Blog inactivo',
          description: `El blog existe pero esta inactivo (frecuencia: ${ownMedia.blog.postingFrequency}). Google y los LLMs priorizan contenido fresco.`,
          fixOverview: 'Reactiva el blog con publicaciones regulares.',
          fixSteps: [
            'Establece un calendario de publicacion (minimo 2x/mes)',
            'Prioriza temas que tu audiencia busca activamente',
            'Actualiza articulos antiguos con informacion actual',
            'Promueve cada post en redes sociales',
          ],
          expectedImpactPct: 30,
          source: 'own_media',
          status: 'open',
        });
      } else if (ownMedia.blog.postingFrequency === 'sporadic') {
        recs.push({
          category: 'Contenido',
          severity: 'medium',
          title: 'Frecuencia de publicacion irregular',
          description: 'El blog publica de forma esporadica. La consistencia es clave para indexacion y autoridad.',
          fixOverview: 'Establece un calendario editorial regular.',
          fixSteps: [
            'Define un calendario editorial con fechas fijas',
            'Objetivo: minimo 2 publicaciones al mes',
            'Reutiliza contenido de redes sociales como base para posts',
          ],
          expectedImpactPct: 15,
          source: 'own_media',
          status: 'open',
        });
      }

      // Short articles
      if (ownMedia.blog.avgWordCount > 0 && ownMedia.blog.avgWordCount < 800) {
        recs.push({
          category: 'Contenido',
          severity: 'medium',
          title: 'Articulos demasiado cortos',
          description: `El promedio de palabras por articulo es ${ownMedia.blog.avgWordCount}. Para SEO competitivo y GEO, se necesitan minimo 800-1200 palabras.`,
          fixOverview: 'Expande los articulos existentes y establece minimos para nuevos.',
          fixSteps: [
            'Actualiza articulos existentes: anade FAQ, ejemplos, datos',
            'Establece minimo de 800 palabras para nuevos posts',
            'Para temas competitivos, apunta a 1500-2000 palabras',
            'Anade tablas comparativas y listas de pasos',
          ],
          expectedImpactPct: 20,
          source: 'own_media',
          status: 'open',
        });
      }

      // Low post count
      if (ownMedia.blog.postCount < 10) {
        recs.push({
          category: 'Contenido',
          severity: 'medium',
          title: 'Pocos articulos publicados',
          description: `Solo ${ownMedia.blog.postCount} articulos en el blog. Para establecer autoridad tematica se necesitan al menos 20-30 articulos.`,
          fixOverview: 'Incrementa la produccion de contenido.',
          fixSteps: [
            'Crea un cluster de contenido por cada servicio principal',
            'Cada cluster: 1 pilar (2000+ palabras) + 5-8 articulos de soporte',
            'Prioriza keywords con intencion informativa y comparativa',
          ],
          expectedImpactPct: 25,
          source: 'own_media',
          status: 'open',
        });
      }
    }

    // Social media checks
    if (!ownMedia.social['linkedin']) {
      recs.push({
        category: 'Contenido',
        severity: 'high',
        title: 'Sin presencia en LinkedIn',
        description: 'No se detecto LinkedIn. Para B2B, LinkedIn es el canal social mas importante y los LLMs citan frecuentemente perfiles con contenido relevante.',
        fixOverview: 'Crea y optimiza la pagina de empresa en LinkedIn.',
        fixSteps: [
          'Crea una pagina de empresa en LinkedIn',
          'Completa toda la informacion: about, servicios, especialidades',
          'Publica contenido 3-5 veces por semana',
          'Enlaza el LinkedIn desde la web y viceversa',
          'Los empleados deben vincular la empresa en sus perfiles',
        ],
        expectedImpactPct: 20,
        source: 'own_media',
        status: 'open',
      });
    }

    if (!ownMedia.social['youtube']) {
      recs.push({
        category: 'Contenido',
        severity: 'high',
        title: 'Sin canal de YouTube',
        description: 'No se detecto YouTube. Los videos aparecen en resultados de Google y los LLMs citan transcripciones de YouTube como fuente autoritativa.',
        fixOverview: 'Crea un canal de YouTube con contenido educativo.',
        fixSteps: [
          'Crea un canal de YouTube de marca',
          'Publica videos de 5-15 min sobre tus temas de expertise',
          'Anade transcripciones y descripciones ricas en keywords',
          'Embebe videos en articulos del blog para mejorar engagement',
          'Usa YouTube Shorts para contenido rapido',
        ],
        expectedImpactPct: 20,
        source: 'own_media',
        status: 'open',
      });
    }

    if (!ownMedia.social['twitter'] && !ownMedia.social['x']) {
      recs.push({
        category: 'Contenido',
        severity: 'medium',
        title: 'Sin presencia en X/Twitter',
        description: 'No se detecto cuenta de X/Twitter. Es una fuente que los LLMs consultan para opiniones y tendencias.',
        fixOverview: 'Crea una cuenta de X y publica insights regularmente.',
        fixSteps: [
          'Crea una cuenta de marca en X',
          'Publica hilos con insights de tus articulos',
          'Participa en conversaciones del sector',
        ],
        expectedImpactPct: 10,
        source: 'own_media',
        status: 'open',
      });
    }

    // Schema types check
    if (!(ownMedia.schemaTypes ?? []).some(s => s.toLowerCase().includes('faq'))) {
      const hasFaqIssue = recs.some(r => r.title.toLowerCase().includes('faqpage'));
      if (!hasFaqIssue) {
        recs.push({
          category: 'GEO',
          severity: 'high',
          title: 'Implementar FAQPage schema',
          description: 'No hay schema FAQPage. Las FAQ marcadas con schema son una de las principales fuentes para los motores de IA generativa.',
          fixOverview: 'Anade FAQ sections con schema markup en las paginas principales.',
          fixSteps: [
            'Identifica 5-10 preguntas frecuentes por servicio',
            'Anade la seccion FAQ visible en la pagina',
            'Implementa JSON-LD FAQPage schema',
            'Valida con Google Rich Results Test',
          ],
          expectedImpactPct: 20,
          source: 'own_media',
          status: 'open',
        });
      }
    }

    // E-E-A-T / Author schema
    if (!(ownMedia.schemaTypes ?? []).some(s => s.toLowerCase().includes('person'))) {
      recs.push({
        category: 'GEO',
        severity: 'high',
        title: 'Anadir Author schema (E-E-A-T)',
        description: 'No se detecto schema Person/Author. Google y los LLMs valoran la autoria verificable. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) es un factor clave.',
        fixOverview: 'Implementa paginas de autor con schema Person.',
        fixSteps: [
          'Crea paginas de autor para los escritores del blog',
          'Implementa schema Person con credenciales y experiencia',
          'Anade bylines visibles en cada articulo',
          'Incluye links al LinkedIn del autor',
          'Muestra la experiencia relevante del autor en el tema',
        ],
        expectedImpactPct: 18,
        source: 'own_media',
        status: 'open',
      });
    }

    // Technical checks from own media
    if (!ownMedia.techStack.analytics || ownMedia.techStack.analytics.length === 0) {
      recs.push({
        category: 'SEO Tecnico',
        severity: 'high',
        title: 'Sin analytics detectado',
        description: 'No se detecto ninguna herramienta de analytics. Sin datos, no puedes medir ni mejorar.',
        fixOverview: 'Implementa Google Analytics 4 y Google Search Console.',
        fixSteps: [
          'Configura Google Analytics 4',
          'Configura Google Search Console',
          'Implementa tracking de conversiones',
          'Configura alertas para caidas de trafico',
        ],
        expectedImpactPct: 15,
        source: 'own_media',
        status: 'open',
      });
    }

    if (!ownMedia.techStack.tagManager) {
      recs.push({
        category: 'SEO Tecnico',
        severity: 'low',
        title: 'Sin tag manager',
        description: 'No se detecto Google Tag Manager u otro tag manager. Dificulta la gestion de scripts de terceros.',
        fixOverview: 'Implementa Google Tag Manager.',
        fixSteps: [
          'Instala Google Tag Manager',
          'Migra todos los scripts de tracking al GTM',
          'Configura triggers para eventos de conversion',
        ],
        expectedImpactPct: 5,
        source: 'own_media',
        status: 'open',
      });
    }

    // Score-based recommendations
    if (ownMedia.scores.contentScore < 50) {
      recs.push({
        category: 'Contenido',
        severity: 'high',
        title: 'Score de contenido bajo',
        description: `El score de contenido es ${ownMedia.scores.contentScore}/100. Necesitas mas y mejor contenido para competir en SEO y GEO.`,
        fixOverview: 'Desarrolla una estrategia de contenido integral.',
        fixSteps: [
          'Crea un calendario editorial con temas keyword-driven',
          'Publica minimo 2 articulos optimizados por mes',
          'Actualiza contenido existente con datos frescos',
          'Implementa topic clusters para autoridad tematica',
        ],
        expectedImpactPct: 30,
        source: 'own_media',
        status: 'open',
      });
    }

    if (ownMedia.scores.socialScore < 30) {
      recs.push({
        category: 'Contenido',
        severity: 'medium',
        title: 'Presencia social muy baja',
        description: `El score social es ${ownMedia.scores.socialScore}/100. Las senales sociales refuerzan la autoridad de tu contenido ante los LLMs.`,
        fixOverview: 'Activa los canales sociales mas relevantes.',
        fixSteps: [
          'Prioriza LinkedIn y YouTube para B2B',
          'Publica contenido consistentemente (3-5 veces/semana)',
          'Reutiliza contenido del blog en formatos sociales',
          'Interactua con la comunidad y lideres del sector',
        ],
        expectedImpactPct: 15,
        source: 'own_media',
        status: 'open',
      });
    }

    if (ownMedia.scores.technicalScore < 50) {
      recs.push({
        category: 'SEO Tecnico',
        severity: 'high',
        title: 'Score tecnico bajo',
        description: `El score tecnico es ${ownMedia.scores.technicalScore}/100. Hay problemas de infraestructura que afectan al SEO.`,
        fixOverview: 'Resuelve los problemas tecnicos prioritarios.',
        fixSteps: [
          'Implementa analytics y Search Console si faltan',
          'Configura un CDN para mejor rendimiento',
          'Revisa la configuracion del hosting',
          'Implementa schema markup basico',
        ],
        expectedImpactPct: 20,
        source: 'own_media',
        status: 'open',
      });
    }
  }

  return recs.sort(sortRecsBySeverityAndImpact);
}
