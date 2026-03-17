// Firebase paths
export const APP_ID = 'growth4u-public-app';
export const DATA_PATH = `artifacts/${APP_ID}/public/data`;

// ===== SEO Audit =====
export interface SEOAuditResult {
  url: string;
  metaTitle: string;
  metaTitleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  hasViewport: boolean;
  totalImages: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hasCanonical: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  isHttps: boolean;
  structuredDataTypes: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  hreflangTags: string[];
  wordCount: number;
  scannedAt: string;
}

// ===== Web Vitals =====
export interface WebVitals {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcp: number;
  tbt: number;
  cls: number;
  fcp: number;
  si: number;
  ttfb: number;
  updatedAt?: string;
}

// ===== Issues =====
export interface SEOIssue {
  type: 'technical_seo' | 'performance' | 'content' | 'geo';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fixSteps: string[];
  expectedImpactPct: number;
}

// ===== Recommendations =====
export interface Recommendation {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fixOverview: string;
  fixSteps: string[];
  expectedImpactPct: number;
  source: 'audit' | 'geo_analysis' | 'own_media';
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
}

// ===== GEO =====
export interface GEOTest {
  id: string;
  date: string;
  platform: string;
  promptType: string;
  prompt: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  citedUrl: string;
  position?: number;
  testedBy?: string;
  notes: string;
}

export interface GEOAutoResult {
  platform: string;
  prompt: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  citedUrls: string[];
  responseSnippet: string;
  testedAt: string;
}

// ===== Own Media =====
export interface OwnMediaResult {
  blog: {
    hasBlog: boolean;
    blogUrl: string | null;
    postCount: number;
    lastPostDate: string | null;
    avgWordCount: number;
    postingFrequency: 'weekly' | 'monthly' | 'sporadic' | 'inactive' | 'none';
    categories: string[];
    samplePosts: { title: string; url: string; date: string; wordCount: number }[];
  };
  social: Record<string, string>;
  techStack: {
    cms: string | null;
    analytics: string[];
    cdn: string | null;
    framework: string | null;
    hosting: string | null;
    tagManager: string | null;
  };
  schemaTypes: string[];
  scores: {
    overallScore: number;
    contentScore: number;
    socialScore: number;
    technicalScore: number;
  };
}

// ===== Backlinks (DataForSEO) =====
export interface DataForSEOMetrics {
  domainRank: number;
  backlinks: number;
  referringDomains: number;
  referringIps: number;
  referringSubnets: number;
  dofollowBacklinks: number;
  nofollowBacklinks: number;
  brokenBacklinks: number;
  brokenPages: number;
  referringPages: number;
  date: string;
  source: string;
}

// ===== GSC Manual =====
export interface GSCMetric {
  id: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  source: string;
  notes?: string;
}

// ===== GA Manual =====
export interface AnalyticsMetric {
  id: string;
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  organicPercent: number;
  notes?: string;
}

// ===== Domain Metrics =====
export interface DomainMetric {
  id: string;
  date: string;
  domainAuthority: number;
  backlinks: number;
  referringDomains: number;
  source: string;
  notes?: string;
}

// ===== Platforms =====
export const platforms = [
  { value: 'chatgpt', label: 'ChatGPT', color: 'bg-green-500' },
  { value: 'perplexity', label: 'Perplexity', color: 'bg-blue-500' },
  { value: 'bing-chat', label: 'Bing Chat / Copilot', color: 'bg-cyan-500' },
  { value: 'gemini', label: 'Google Gemini', color: 'bg-purple-500' },
  { value: 'claude', label: 'Claude', color: 'bg-orange-500' },
];

export const promptTypes = [
  { value: 'discovery', label: 'Discovery', description: 'Ej: "Mejores agencias de growth"' },
  { value: 'comparison', label: 'Comparativa', description: 'Ej: "Compara agencias growth"' },
  { value: 'brand', label: 'Marca Directa', description: 'Ej: "¿Qué ofrece Growth4U?"' },
  { value: 'article', label: 'Artículo', description: 'Ej: "Resume artículo de Growth4U"' },
];

export const suggestedPrompts = [
  { type: 'discovery', prompt: '¿Cuáles son las mejores agencias de growth marketing en España?' },
  { type: 'discovery', prompt: '¿Qué empresas ayudan a escalar startups B2B en España?' },
  { type: 'comparison', prompt: 'Compara las mejores agencias de growth marketing en España' },
  { type: 'brand', prompt: '¿Qué servicios ofrece Growth4U?' },
  { type: 'brand', prompt: '¿Quién es Growth4U y qué hacen?' },
  { type: 'article', prompt: 'Resume el artículo sobre unit economics de Growth4U' },
  { type: 'article', prompt: '¿Qué dice Growth4U sobre el go-to-market en España?' },
];

// ===== Metric Info =====
export const metricInfo: Record<string, { name: string; why: string; improve: string }> = {
  impressions: {
    name: 'Impresiones',
    why: 'Indica cuántas veces tu web aparece en resultados de Google.',
    improve: 'Crea más contenido, optimiza títulos y meta descripciones, expande keywords.'
  },
  clicks: {
    name: 'Clics',
    why: 'Cuántos usuarios hacen clic en tu resultado. Es tráfico real.',
    improve: 'Mejora títulos (más atractivos), usa números, añade rich snippets.'
  },
  ctr: {
    name: 'CTR',
    why: 'Porcentaje de impresiones convertidas en clics.',
    improve: 'Títulos con números, preguntas, beneficios claros. Meta descripciones con CTA.'
  },
  position: {
    name: 'Posición Media',
    why: 'Posición 1-3 recibe el 60% de clics, 4-10 otro 30%.',
    improve: 'Mejora contenido, consigue backlinks, optimiza velocidad.'
  },
  performance: {
    name: 'Performance Score',
    why: 'Google usa velocidad como factor de ranking.',
    improve: 'Optimiza imágenes, usa CDN, minimiza JS/CSS.'
  },
  lcp: {
    name: 'LCP',
    why: 'Tiempo en cargar el elemento más grande. Debe ser < 2.5s.',
    improve: 'Optimiza imagen principal, usa preload, implementa CDN.'
  },
  cls: {
    name: 'CLS',
    why: 'Estabilidad visual. Debe ser < 0.1.',
    improve: 'Define tamaños de imágenes, evita contenido inyectado.'
  },
  sessions: {
    name: 'Sesiones',
    why: 'Total de visitas a tu web.',
    improve: 'Más contenido, mejor SEO, publicidad, redes sociales.'
  },
  users: {
    name: 'Usuarios',
    why: 'Visitantes únicos. Tamaño real de tu audiencia.',
    improve: 'SEO, contenido viral, redes sociales, publicidad.'
  },
  pageviews: {
    name: 'Páginas Vistas',
    why: 'Más páginas por sesión = mejor engagement.',
    improve: 'Enlaces internos, contenido relacionado, CTAs efectivos.'
  },
  bounceRate: {
    name: 'Tasa de Rebote',
    why: 'Alto rebote puede indicar contenido no relevante.',
    improve: 'Mejora contenido, añade CTAs, enlaces internos.'
  },
  avgSessionDuration: {
    name: 'Duración Media',
    why: 'Más tiempo = contenido más valioso.',
    improve: 'Contenido más largo, vídeos, herramientas interactivas.'
  },
  organicPercent: {
    name: '% Orgánico',
    why: 'Tráfico desde buscadores, gratis y de alta calidad.',
    improve: 'Más contenido SEO, mejorar rankings.'
  },
};
