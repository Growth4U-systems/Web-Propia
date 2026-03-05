import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Eye,
  MousePointer,
  Target,
  Percent,
  Save,
  Globe,
  Link2,
  Gauge,
  Smartphone,
  Monitor,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ExternalLink,
  Zap,
  Users,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase-client';

// ============================================
// TYPES
// ============================================

interface SEOMetric {
  id: string;
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  source: string;
  notes?: string;
}

interface DomainMetric {
  id: string;
  date: string;
  domainAuthority: number;
  backlinks: number;
  referringDomains: number;
  source: string;
  notes?: string;
}

interface WebVitals {
  performance: number;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface AnalyticsMetric {
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

interface DataForSEOMetrics {
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

// ============================================
// METRIC EXPLANATIONS
// ============================================

const metricInfo = {
  // Search Console
  impressions: {
    name: 'Impresiones',
    why: 'Indica cuántas veces tu web aparece en resultados de Google. Más impresiones = más visibilidad.',
    improve: 'Crea más contenido de calidad, optimiza títulos y meta descripciones, expande a más keywords.'
  },
  clicks: {
    name: 'Clics',
    why: 'Cuántos usuarios hacen clic en tu resultado. Es tráfico real desde Google.',
    improve: 'Mejora títulos (más atractivos), usa números y emociones, añade rich snippets.'
  },
  ctr: {
    name: 'CTR (Click-Through Rate)',
    why: 'Porcentaje de impresiones que se convierten en clics. Alto CTR = buenos títulos y descripciones.',
    improve: 'Títulos con números (ej: "5 estrategias..."), preguntas, beneficios claros. Meta descripciones con CTA.'
  },
  position: {
    name: 'Posición Media',
    why: 'Tu posición promedio en Google. Posición 1-3 recibe el 60% de clics, 4-10 otro 30%.',
    improve: 'Mejora contenido existente, consigue backlinks, optimiza velocidad, añade más detalle y valor.'
  },
  // Domain Authority
  domainAuthority: {
    name: 'Domain Authority (DA)',
    why: 'Métrica de Moz (0-100) que predice tu capacidad de rankear. Cuanto más alto, mejor.',
    improve: 'Consigue backlinks de calidad, crea contenido que la gente quiera enlazar, sé paciente (toma meses).'
  },
  backlinks: {
    name: 'Backlinks',
    why: 'Enlaces que apuntan a tu web desde otros sitios. Son "votos de confianza" para Google.',
    improve: 'Guest posting, crear herramientas gratuitas, estudios originales, aparecer en prensa.'
  },
  referringDomains: {
    name: 'Dominios de Referencia',
    why: 'Cantidad de webs únicas que te enlazan. Mejor 10 enlaces de 10 webs que 100 de 1.',
    improve: 'Diversifica fuentes de backlinks, busca oportunidades en tu industria, outreach a blogs.'
  },
  // Web Vitals
  performance: {
    name: 'Performance Score',
    why: 'Puntuación global de rendimiento (0-100). Google usa velocidad como factor de ranking.',
    improve: 'Optimiza imágenes, usa CDN, minimiza JS/CSS, implementa lazy loading.'
  },
  lcp: {
    name: 'LCP (Largest Contentful Paint)',
    why: 'Tiempo en cargar el elemento más grande visible. Debe ser < 2.5s.',
    improve: 'Optimiza imagen principal, usa preload, mejora servidor, implementa CDN.'
  },
  cls: {
    name: 'CLS (Cumulative Layout Shift)',
    why: 'Estabilidad visual. Mide cuánto se "mueve" el contenido al cargar. Debe ser < 0.1.',
    improve: 'Define tamaños de imágenes/ads, evita contenido inyectado, usa placeholders.'
  },
  // Analytics
  sessions: {
    name: 'Sesiones',
    why: 'Total de visitas a tu web. Una sesión puede incluir múltiples páginas vistas.',
    improve: 'Más contenido, mejor SEO, publicidad, redes sociales, email marketing.'
  },
  users: {
    name: 'Usuarios',
    why: 'Visitantes únicos. Indica el tamaño real de tu audiencia.',
    improve: 'SEO, contenido viral, redes sociales, colaboraciones, publicidad.'
  },
  pageviews: {
    name: 'Páginas Vistas',
    why: 'Total de páginas vistas. Más páginas por sesión = mejor engagement.',
    improve: 'Enlaces internos, contenido relacionado, navegación clara, CTAs efectivos.'
  },
  bounceRate: {
    name: 'Tasa de Rebote',
    why: 'Porcentaje de visitas de una sola página. Alto rebote puede indicar contenido no relevante.',
    improve: 'Mejora contenido, añade CTAs claros, enlaces internos, contenido relacionado.'
  },
  avgSessionDuration: {
    name: 'Duración Media',
    why: 'Tiempo promedio en tu web. Más tiempo = contenido más valioso.',
    improve: 'Contenido más largo y detallado, vídeos, herramientas interactivas.'
  },
  organicPercent: {
    name: '% Tráfico Orgánico',
    why: 'Porcentaje de tráfico desde buscadores. Es tráfico "gratis" y de alta calidad.',
    improve: 'Más contenido SEO, mejorar rankings, expandir a más keywords.'
  }
};

// ============================================
// RECOMMENDATIONS ENGINE
// ============================================

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  metric: string;
}

function generateRecommendations(
  gscMetrics: SEOMetric[],
  domainMetrics: DomainMetric[],
  webVitals: WebVitals | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const latest = gscMetrics[0];
  const previous = gscMetrics[1];
  const latestDomain = domainMetrics[0];

  // CTR Analysis
  if (latest && latest.ctr < 2) {
    recommendations.push({
      priority: 'critical',
      title: 'CTR muy bajo',
      description: `Tu CTR es ${latest.ctr.toFixed(2)}%. Estás perdiendo tráfico potencial.`,
      action: 'Revisa y mejora títulos y meta descripciones de tus páginas principales.',
      metric: 'ctr'
    });
  } else if (latest && latest.ctr < 4) {
    recommendations.push({
      priority: 'medium',
      title: 'CTR mejorable',
      description: `Tu CTR es ${latest.ctr.toFixed(2)}%. Hay margen de mejora.`,
      action: 'Prueba títulos más atractivos con números o preguntas.',
      metric: 'ctr'
    });
  }

  // Position Analysis
  if (latest && latest.position > 20) {
    recommendations.push({
      priority: 'critical',
      title: 'Posición muy baja',
      description: `Posición media ${latest.position.toFixed(1)}. Pocas personas ven tus resultados.`,
      action: 'Enfócate en mejorar contenido existente y conseguir backlinks de calidad.',
      metric: 'position'
    });
  } else if (latest && latest.position > 10) {
    recommendations.push({
      priority: 'high',
      title: 'Fuera del top 10',
      description: `Posición media ${latest.position.toFixed(1)}. La mayoría de clics van a página 1.`,
      action: 'Identifica páginas en posiciones 11-20 y mejora su contenido para entrar en top 10.',
      metric: 'position'
    });
  }

  // Domain Authority
  if (latestDomain && latestDomain.domainAuthority < 20) {
    recommendations.push({
      priority: 'high',
      title: 'Domain Authority bajo',
      description: `DA de ${latestDomain.domainAuthority}. Dificulta competir por keywords competitivas.`,
      action: 'Prioriza conseguir backlinks de webs relevantes en tu industria.',
      metric: 'domainAuthority'
    });
  }

  // Backlinks
  if (latestDomain && latestDomain.referringDomains < 30) {
    recommendations.push({
      priority: 'medium',
      title: 'Pocos dominios de referencia',
      description: `Solo ${latestDomain.referringDomains} dominios te enlazan.`,
      action: 'Crea contenido enlazable (guías, herramientas, estudios) y haz outreach.',
      metric: 'referringDomains'
    });
  }

  // Web Vitals
  if (webVitals) {
    if (webVitals.performance < 50) {
      recommendations.push({
        priority: 'critical',
        title: 'Rendimiento crítico',
        description: `Score de ${webVitals.performance}/100. Afecta SEO y experiencia de usuario.`,
        action: 'Optimiza imágenes, minimiza CSS/JS, usa CDN, revisa hosting.',
        metric: 'performance'
      });
    } else if (webVitals.performance < 80) {
      recommendations.push({
        priority: 'medium',
        title: 'Rendimiento mejorable',
        description: `Score de ${webVitals.performance}/100. Hay oportunidades de mejora.`,
        action: 'Revisa imágenes grandes, scripts de terceros y tiempo de servidor.',
        metric: 'performance'
      });
    }

    if (webVitals.lcp > 4) {
      recommendations.push({
        priority: 'high',
        title: 'LCP lento',
        description: `LCP de ${webVitals.lcp.toFixed(1)}s. Debe ser menor a 2.5s.`,
        action: 'Optimiza la imagen hero, usa preload para recursos críticos.',
        metric: 'lcp'
      });
    }

    if (webVitals.cls > 0.25) {
      recommendations.push({
        priority: 'high',
        title: 'Layout inestable',
        description: `CLS de ${webVitals.cls.toFixed(3)}. Causa mala experiencia.`,
        action: 'Define dimensiones de imágenes y embeds, evita contenido que aparece tarde.',
        metric: 'cls'
      });
    }
  }

  // Trend Analysis
  if (latest && previous) {
    if (latest.clicks < previous.clicks * 0.8) {
      recommendations.push({
        priority: 'high',
        title: 'Caída de clics',
        description: `Los clics bajaron ${((1 - latest.clicks / previous.clicks) * 100).toFixed(0)}% vs período anterior.`,
        action: 'Investiga si perdiste posiciones, si hay nuevos competidores o cambios de algoritmo.',
        metric: 'clicks'
      });
    }
    if (latest.impressions < previous.impressions * 0.8) {
      recommendations.push({
        priority: 'high',
        title: 'Caída de impresiones',
        description: `Las impresiones bajaron ${((1 - latest.impressions / previous.impressions) * 100).toFixed(0)}%.`,
        action: 'Revisa Google Search Console por errores de indexación o penalizaciones.',
        metric: 'impressions'
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ============================================
// COMPONENTS
// ============================================

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  changePositive,
  color,
  metricKey,
  expandedMetric,
  setExpandedMetric
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  color: string;
  metricKey: keyof typeof metricInfo;
  expandedMetric: string | null;
  setExpandedMetric: (key: string | null) => void;
}) {
  const info = metricInfo[metricKey];
  const isExpanded = expandedMetric === metricKey;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">{label}</span>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-[#032149]">{value}</span>
          {change && (
            <span className={`text-sm flex items-center gap-1 ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
              {changePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {change}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => setExpandedMetric(isExpanded ? null : metricKey)}
        className="w-full px-6 py-2 bg-slate-100 hover:bg-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs transition-colors"
      >
        <Info className="w-3 h-3" />
        {isExpanded ? 'Ocultar info' : '¿Por qué medimos esto?'}
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isExpanded && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Por qué importa</p>
            <p className="text-sm text-slate-300">{info.why}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Cómo mejorar</p>
            <p className="text-sm text-green-400">{info.improve}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  priority,
  icon: Icon
}: {
  title: string;
  subtitle: string;
  priority: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const priorityColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500'];
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`w-10 h-10 rounded-lg ${priorityColors[priority - 1]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-[#032149]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[#032149]">{title}</h2>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-400">Prioridad {priority}</span>
        </div>
        <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const priorityStyles = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle, iconColor: 'text-red-400', label: 'Crítico' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, iconColor: 'text-orange-400', label: 'Alto' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Info, iconColor: 'text-yellow-400', label: 'Medio' },
    low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, iconColor: 'text-blue-400', label: 'Bajo' }
  };
  const style = priorityStyles[rec.priority];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-[#032149]">{rec.title}</h4>
            <span className={`px-2 py-0.5 rounded text-xs ${style.iconColor} bg-black/20`}>{style.label}</span>
          </div>
          <p className="text-slate-400 text-sm mb-2">{rec.description}</p>
          <div className="flex items-start gap-2 mt-3 p-2 bg-black/20 rounded-lg">
            <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{rec.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SeoPage() {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gscMetrics, setGscMetrics] = useState<SEOMetric[]>([]);
  const [domainMetrics, setDomainMetrics] = useState<DomainMetric[]>([]);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetric[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [loadingVitals, setLoadingVitals] = useState(false);

  // DataForSEO
  const [dataForSEO, setDataForSEO] = useState<DataForSEOMetrics | null>(null);
  const [syncingDataForSEO, setSyncingDataForSEO] = useState(false);
  const [dataForSEOError, setDataForSEOError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'seo' | 'geo'>('seo');

  // Modals
  const [showGscForm, setShowGscForm] = useState(false);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [showAnalyticsForm, setShowAnalyticsForm] = useState(false);

  // Form states
  const [newGscMetric, setNewGscMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    impressions: '',
    clicks: '',
    position: '',
    notes: ''
  });

  const [newDomainMetric, setNewDomainMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    domainAuthority: '',
    backlinks: '',
    referringDomains: '',
    source: 'Moz',
    notes: ''
  });

  const [newAnalyticsMetric, setNewAnalyticsMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    sessions: '',
    users: '',
    pageviews: '',
    bounceRate: '',
    avgSessionDuration: '',
    organicPercent: '',
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadGscMetrics(),
      loadDomainMetrics(),
      loadAnalyticsMetrics(),
      loadCachedWebVitals(),
      loadCachedDataForSEO()
    ]);
    setLoading(false);
  };

  const loadGscMetrics = async () => {
    try {
      const q = query(collection(db, 'seo_metrics'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SEOMetric[];
      setGscMetrics(data);
    } catch (error) {
      console.error('Error loading GSC metrics:', error);
    }
  };

  const loadDomainMetrics = async () => {
    try {
      const q = query(collection(db, 'domain_metrics'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DomainMetric[];
      setDomainMetrics(data);
    } catch (error) {
      console.error('Error loading domain metrics:', error);
    }
  };

  const loadAnalyticsMetrics = async () => {
    try {
      const q = query(collection(db, 'analytics_metrics'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnalyticsMetric[];
      setAnalyticsMetrics(data);
    } catch (error) {
      console.error('Error loading analytics metrics:', error);
    }
  };

  const loadCachedWebVitals = async () => {
    try {
      const docRef = doc(db, 'site_data', 'web_vitals');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setWebVitals(docSnap.data() as WebVitals);
      }
    } catch (error) {
      console.error('Error loading web vitals:', error);
    }
  };

  const loadCachedDataForSEO = async () => {
    try {
      const docRef = doc(db, 'dataforseo_metrics', 'latest');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDataForSEO(docSnap.data() as DataForSEOMetrics);
      }
    } catch (error) {
      console.error('Error loading DataForSEO metrics:', error);
    }
  };

  const syncDataForSEO = async () => {
    setSyncingDataForSEO(true);
    setDataForSEOError(null);
    try {
      const response = await fetch('/.netlify/functions/sync-dataforseo');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al sincronizar con DataForSEO');
      }

      setDataForSEO(data.data);
    } catch (error) {
      console.error('Error syncing DataForSEO:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setDataForSEOError(errorMessage);
    } finally {
      setSyncingDataForSEO(false);
    }
  };

  const [vitalsError, setVitalsError] = useState<string | null>(null);

  const fetchWebVitals = async () => {
    setLoadingVitals(true);
    setVitalsError(null);
    try {
      const targetUrl = 'https://growth4u.io';
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile&category=performance`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      // Check for API errors
      if (data.error) {
        throw new Error(data.error.message || 'Error de la API de PageSpeed');
      }

      // Check if lighthouseResult exists
      if (!data.lighthouseResult) {
        throw new Error('No se pudo analizar la página. Verifica que growth4u.io esté accesible.');
      }

      const lighthouse = data.lighthouseResult;

      // Check if performance category exists
      if (!lighthouse.categories?.performance?.score) {
        throw new Error('No se pudieron obtener las métricas de rendimiento.');
      }

      const vitals: WebVitals = {
        performance: Math.round(lighthouse.categories.performance.score * 100),
        lcp: lighthouse.audits['largest-contentful-paint']?.numericValue
          ? lighthouse.audits['largest-contentful-paint'].numericValue / 1000
          : 0,
        fid: lighthouse.audits['max-potential-fid']?.numericValue || 0,
        cls: lighthouse.audits['cumulative-layout-shift']?.numericValue || 0,
        fcp: lighthouse.audits['first-contentful-paint']?.numericValue
          ? lighthouse.audits['first-contentful-paint'].numericValue / 1000
          : 0,
        ttfb: lighthouse.audits['server-response-time']?.numericValue
          ? lighthouse.audits['server-response-time'].numericValue / 1000
          : 0
      };

      // Save to Firebase
      await setDoc(doc(db, 'site_data', 'web_vitals'), {
        ...vitals,
        updatedAt: new Date().toISOString()
      });

      setWebVitals(vitals);
    } catch (error) {
      console.error('Error fetching web vitals:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setVitalsError(errorMessage);
    } finally {
      setLoadingVitals(false);
    }
  };

  const handleAddGscMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    const impressions = parseInt(newGscMetric.impressions);
    const clicks = parseInt(newGscMetric.clicks);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    try {
      await addDoc(collection(db, 'seo_metrics'), {
        date: newGscMetric.date,
        impressions,
        clicks,
        ctr: parseFloat(ctr.toFixed(2)),
        position: parseFloat(newGscMetric.position),
        source: 'Google Search Console',
        notes: newGscMetric.notes,
        createdAt: new Date().toISOString()
      });

      setNewGscMetric({
        date: new Date().toISOString().split('T')[0],
        impressions: '',
        clicks: '',
        position: '',
        notes: ''
      });
      setShowGscForm(false);
      loadGscMetrics();
    } catch (error) {
      console.error('Error adding GSC metric:', error);
      alert('Error al guardar la métrica');
    }
  };

  const handleAddDomainMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'domain_metrics'), {
        date: newDomainMetric.date,
        domainAuthority: parseInt(newDomainMetric.domainAuthority),
        backlinks: parseInt(newDomainMetric.backlinks),
        referringDomains: parseInt(newDomainMetric.referringDomains),
        source: newDomainMetric.source,
        notes: newDomainMetric.notes,
        createdAt: new Date().toISOString()
      });

      setNewDomainMetric({
        date: new Date().toISOString().split('T')[0],
        domainAuthority: '',
        backlinks: '',
        referringDomains: '',
        source: 'Moz',
        notes: ''
      });
      setShowDomainForm(false);
      loadDomainMetrics();
    } catch (error) {
      console.error('Error adding domain metric:', error);
      alert('Error al guardar la métrica');
    }
  };

  const handleDeleteGscMetric = async (id: string) => {
    if (!confirm('¿Eliminar esta métrica?')) return;
    try {
      await deleteDoc(doc(db, 'seo_metrics', id));
      loadGscMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  const handleDeleteDomainMetric = async (id: string) => {
    if (!confirm('¿Eliminar esta métrica?')) return;
    try {
      await deleteDoc(doc(db, 'domain_metrics', id));
      loadDomainMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  const handleAddAnalyticsMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'analytics_metrics'), {
        date: newAnalyticsMetric.date,
        sessions: parseInt(newAnalyticsMetric.sessions),
        users: parseInt(newAnalyticsMetric.users),
        pageviews: parseInt(newAnalyticsMetric.pageviews),
        bounceRate: parseFloat(newAnalyticsMetric.bounceRate),
        avgSessionDuration: parseFloat(newAnalyticsMetric.avgSessionDuration),
        organicPercent: parseFloat(newAnalyticsMetric.organicPercent),
        notes: newAnalyticsMetric.notes,
        createdAt: new Date().toISOString()
      });

      setNewAnalyticsMetric({
        date: new Date().toISOString().split('T')[0],
        sessions: '',
        users: '',
        pageviews: '',
        bounceRate: '',
        avgSessionDuration: '',
        organicPercent: '',
        notes: ''
      });
      setShowAnalyticsForm(false);
      loadAnalyticsMetrics();
    } catch (error) {
      console.error('Error adding analytics metric:', error);
      alert('Error al guardar la métrica');
    }
  };

  const handleDeleteAnalyticsMetric = async (id: string) => {
    if (!confirm('¿Eliminar esta métrica?')) return;
    try {
      await deleteDoc(doc(db, 'analytics_metrics', id));
      loadAnalyticsMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  // Calculate changes
  const getChange = (current: number, previous: number) => {
    if (!previous) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const latestGsc = gscMetrics[0];
  const previousGsc = gscMetrics[1];
  const latestDomain = domainMetrics[0];
  const previousDomain = domainMetrics[1];
  const latestAnalytics = analyticsMetrics[0];
  const previousAnalytics = analyticsMetrics[1];

  const recommendations = generateRecommendations(gscMetrics, domainMetrics, webVitals);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">SEO & GEO</h1>
        <p className="text-slate-400 mt-2">Métricas y seguimiento de posicionamiento</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
            activeTab === 'seo'
              ? 'bg-[#6351d5] text-white'
              : 'text-slate-500 hover:text-[#032149]'
          }`}
        >
          SEO
        </button>
        <button
          onClick={() => setActiveTab('geo')}
          className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
            activeTab === 'geo'
              ? 'bg-[#6351d5] text-white'
              : 'text-slate-500 hover:text-[#032149]'
          }`}
        >
          GEO
        </button>
      </div>

      {/* GEO TBC */}
      {activeTab === 'geo' && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-slate-100 rounded-2xl p-12">
            <p className="text-5xl mb-4">🚧</p>
            <h2 className="text-2xl font-bold text-[#032149] mb-2">GEO Tracker</h2>
            <p className="text-slate-500 text-lg">TBC — Próximamente</p>
          </div>
        </div>
      )}

      {/* SEO Content */}
      {activeTab === 'seo' && <>

      {/* ============================================ */}
      {/* PRIORITY 1: RECOMMENDATIONS */}
      {/* ============================================ */}
      {recommendations.length > 0 && (
        <section>
          <SectionHeader
            icon={Lightbulb}
            title="Recomendaciones"
            subtitle="Acciones prioritarias para mejorar tu SEO"
            priority={1}
          />
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* PRIORITY 2: SEARCH VISIBILITY (GSC) */}
      {/* ============================================ */}
      <section>
        <SectionHeader
          icon={Eye}
          title="Visibilidad en Google"
          subtitle="Datos de Google Search Console - cómo te encuentra la gente"
          priority={2}
        />

        {latestGsc ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={Eye}
              label="Impresiones"
              value={latestGsc.impressions.toLocaleString()}
              change={previousGsc ? `${getChange(latestGsc.impressions, previousGsc.impressions)}%` : undefined}
              changePositive={previousGsc ? latestGsc.impressions >= previousGsc.impressions : undefined}
              color="text-blue-400"
              metricKey="impressions"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={MousePointer}
              label="Clics"
              value={latestGsc.clicks.toLocaleString()}
              change={previousGsc ? `${getChange(latestGsc.clicks, previousGsc.clicks)}%` : undefined}
              changePositive={previousGsc ? latestGsc.clicks >= previousGsc.clicks : undefined}
              color="text-green-400"
              metricKey="clicks"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Percent}
              label="CTR"
              value={`${latestGsc.ctr.toFixed(2)}%`}
              change={previousGsc ? `${getChange(latestGsc.ctr, previousGsc.ctr)}%` : undefined}
              changePositive={previousGsc ? latestGsc.ctr >= previousGsc.ctr : undefined}
              color="text-purple-400"
              metricKey="ctr"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Target}
              label="Posición Media"
              value={latestGsc.position.toFixed(1)}
              change={previousGsc ? `${Math.abs(latestGsc.position - previousGsc.position).toFixed(1)} pos` : undefined}
              changePositive={previousGsc ? latestGsc.position <= previousGsc.position : undefined}
              color="text-orange-400"
              metricKey="position"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">
            <Eye className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-2">No hay datos de Search Console</p>
            <p className="text-slate-500 text-sm">Haz clic en "Añadir datos GSC" para registrar tus primeras métricas</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGscForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir datos GSC
          </button>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Search Console
          </a>
        </div>

        {/* GSC History */}
        {gscMetrics.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-slate-400 hover:text-[#032149] transition-colors">
              Ver historial ({gscMetrics.length} registros)
            </summary>
            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400">Fecha</th>
                    <th className="px-4 py-3 text-left text-slate-400">Impresiones</th>
                    <th className="px-4 py-3 text-left text-slate-400">Clics</th>
                    <th className="px-4 py-3 text-left text-slate-400">CTR</th>
                    <th className="px-4 py-3 text-left text-slate-400">Posición</th>
                    <th className="px-4 py-3 text-right text-slate-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gscMetrics.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-slate-300">{m.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-slate-300">{m.position.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteGscMetric(m.id)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ============================================ */}
      {/* PRIORITY 3: WEB VITALS */}
      {/* ============================================ */}
      <section>
        <SectionHeader
          icon={Zap}
          title="Core Web Vitals"
          subtitle="Rendimiento técnico - Google lo usa para rankear"
          priority={3}
        />

        {webVitals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={Gauge}
              label="Performance"
              value={`${webVitals.performance}/100`}
              changePositive={webVitals.performance >= 80}
              color={webVitals.performance >= 80 ? 'text-green-400' : webVitals.performance >= 50 ? 'text-yellow-400' : 'text-red-400'}
              metricKey="performance"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">LCP</span>
                <Clock className={`w-5 h-5 ${webVitals.lcp <= 2.5 ? 'text-green-400' : webVitals.lcp <= 4 ? 'text-yellow-400' : 'text-red-400'}`} />
              </div>
              <span className="text-2xl font-bold text-[#032149]">{webVitals.lcp.toFixed(2)}s</span>
              <p className="text-xs text-slate-500 mt-1">Objetivo: &lt;2.5s</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">CLS</span>
                <BarChart3 className={`w-5 h-5 ${webVitals.cls <= 0.1 ? 'text-green-400' : webVitals.cls <= 0.25 ? 'text-yellow-400' : 'text-red-400'}`} />
              </div>
              <span className="text-2xl font-bold text-[#032149]">{webVitals.cls.toFixed(3)}</span>
              <p className="text-xs text-slate-500 mt-1">Objetivo: &lt;0.1</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">FCP</span>
                <Zap className={`w-5 h-5 ${webVitals.fcp <= 1.8 ? 'text-green-400' : webVitals.fcp <= 3 ? 'text-yellow-400' : 'text-red-400'}`} />
              </div>
              <span className="text-2xl font-bold text-[#032149]">{webVitals.fcp.toFixed(2)}s</span>
              <p className="text-xs text-slate-500 mt-1">Objetivo: &lt;1.8s</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">
            <Gauge className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No hay datos de rendimiento</p>
            <p className="text-slate-500 text-sm">Haz clic en "Analizar" para obtener métricas</p>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchWebVitals}
            disabled={loadingVitals}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingVitals ? 'animate-spin' : ''}`} />
            {loadingVitals ? 'Analizando (30-60s)...' : 'Analizar Web Vitals'}
          </button>
          <a
            href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fgrowth4u.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            PageSpeed Insights
          </a>
        </div>

        {vitalsError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">Error al analizar</p>
                <p className="text-slate-400 text-sm mt-1">{vitalsError}</p>
                <p className="text-slate-500 text-xs mt-2">
                  Prueba de nuevo en unos segundos o usa el enlace a PageSpeed Insights directamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* PRIORITY 4: GOOGLE ANALYTICS */}
      {/* ============================================ */}
      <section>
        <SectionHeader
          icon={BarChart3}
          title="Google Analytics"
          subtitle="Tráfico y comportamiento de usuarios en tu web"
          priority={4}
        />

        {latestAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <MetricCard
              icon={Users}
              label="Sesiones"
              value={latestAnalytics.sessions.toLocaleString()}
              change={previousAnalytics ? `${getChange(latestAnalytics.sessions, previousAnalytics.sessions)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.sessions >= previousAnalytics.sessions : undefined}
              color="text-blue-400"
              metricKey="sessions"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Users}
              label="Usuarios"
              value={latestAnalytics.users.toLocaleString()}
              change={previousAnalytics ? `${getChange(latestAnalytics.users, previousAnalytics.users)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.users >= previousAnalytics.users : undefined}
              color="text-green-400"
              metricKey="users"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Eye}
              label="Páginas Vistas"
              value={latestAnalytics.pageviews.toLocaleString()}
              change={previousAnalytics ? `${getChange(latestAnalytics.pageviews, previousAnalytics.pageviews)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.pageviews >= previousAnalytics.pageviews : undefined}
              color="text-purple-400"
              metricKey="pageviews"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Target}
              label="Tasa de Rebote"
              value={`${latestAnalytics.bounceRate.toFixed(1)}%`}
              change={previousAnalytics ? `${(latestAnalytics.bounceRate - previousAnalytics.bounceRate).toFixed(1)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.bounceRate <= previousAnalytics.bounceRate : undefined}
              color="text-orange-400"
              metricKey="bounceRate"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={Clock}
              label="Duración Media"
              value={`${Math.floor(latestAnalytics.avgSessionDuration / 60)}:${String(Math.floor(latestAnalytics.avgSessionDuration % 60)).padStart(2, '0')}`}
              change={previousAnalytics ? `${getChange(latestAnalytics.avgSessionDuration, previousAnalytics.avgSessionDuration)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.avgSessionDuration >= previousAnalytics.avgSessionDuration : undefined}
              color="text-cyan-400"
              metricKey="avgSessionDuration"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
            <MetricCard
              icon={TrendingUp}
              label="% Tráfico Orgánico"
              value={`${latestAnalytics.organicPercent.toFixed(1)}%`}
              change={previousAnalytics ? `${(latestAnalytics.organicPercent - previousAnalytics.organicPercent).toFixed(1)}%` : undefined}
              changePositive={previousAnalytics ? latestAnalytics.organicPercent >= previousAnalytics.organicPercent : undefined}
              color="text-emerald-400"
              metricKey="organicPercent"
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-2">No hay datos de Analytics</p>
            <p className="text-slate-500 text-sm mb-4">
              Abre Google Analytics, ve a Informes → Vista general, y copia los datos aquí
            </p>
            <button
              onClick={() => setShowAnalyticsForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Añadir datos ahora
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAnalyticsForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir datos de GA
          </button>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Google Analytics
          </a>
        </div>

        {/* Analytics History */}
        {analyticsMetrics.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-slate-400 hover:text-[#032149] transition-colors">
              Ver historial ({analyticsMetrics.length} registros)
            </summary>
            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400">Fecha</th>
                    <th className="px-4 py-3 text-left text-slate-400">Sesiones</th>
                    <th className="px-4 py-3 text-left text-slate-400">Usuarios</th>
                    <th className="px-4 py-3 text-left text-slate-400">Pageviews</th>
                    <th className="px-4 py-3 text-left text-slate-400">Rebote</th>
                    <th className="px-4 py-3 text-left text-slate-400">% Orgánico</th>
                    <th className="px-4 py-3 text-right text-slate-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {analyticsMetrics.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-slate-300">{m.sessions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.users.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.pageviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.bounceRate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-300">{m.organicPercent.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteAnalyticsMetric(m.id)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ============================================ */}
      {/* PRIORITY 5: BACKLINKS (DataForSEO) */}
      {/* ============================================ */}
      <section>
        <SectionHeader
          icon={Link2}
          title="Backlinks y Autoridad"
          subtitle="Datos automáticos de DataForSEO - la 'reputación' de tu web"
          priority={5}
        />

        {dataForSEO ? (
          <div className="space-y-4 mb-6">
            {/* Main metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Domain Rank</span>
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-2xl font-bold text-[#032149]">{dataForSEO.domainRank}</span>
                <p className="text-xs text-slate-500 mt-1">Similar a DA (0-1000)</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Backlinks Totales</span>
                  <Link2 className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-[#032149]">{dataForSEO.backlinks.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Dominios de Ref.</span>
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-2xl font-bold text-[#032149]">{dataForSEO.referringDomains.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">IPs de Referencia</span>
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-2xl font-bold text-[#032149]">{dataForSEO.referringIps.toLocaleString()}</span>
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/50 rounded-xl p-4">
                <span className="text-slate-400 text-xs block mb-1">DoFollow</span>
                <span className="text-lg font-semibold text-green-400">{dataForSEO.dofollowBacklinks.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-slate-200/50 rounded-xl p-4">
                <span className="text-slate-400 text-xs block mb-1">NoFollow</span>
                <span className="text-lg font-semibold text-yellow-400">{dataForSEO.nofollowBacklinks.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-slate-200/50 rounded-xl p-4">
                <span className="text-slate-400 text-xs block mb-1">Páginas con Enlaces</span>
                <span className="text-lg font-semibold text-blue-400">{dataForSEO.referringPages.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-slate-200/50 rounded-xl p-4">
                <span className="text-slate-400 text-xs block mb-1">Enlaces Rotos</span>
                <span className={`text-lg font-semibold ${dataForSEO.brokenBacklinks > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {dataForSEO.brokenBacklinks.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Última actualización: {new Date(dataForSEO.date).toLocaleDateString('es-ES')} | Fuente: {dataForSEO.source}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">
            <Link2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-2">No hay datos de backlinks</p>
            <p className="text-slate-500 text-sm mb-4">
              Haz clic en "Sincronizar DataForSEO" para obtener datos automáticamente
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={syncDataForSEO}
            disabled={syncingDataForSEO}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncingDataForSEO ? 'animate-spin' : ''}`} />
            {syncingDataForSEO ? 'Sincronizando...' : 'Sincronizar DataForSEO'}
          </button>
          <a
            href="https://app.dataforseo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Panel DataForSEO
          </a>
        </div>

        {dataForSEOError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">Error al sincronizar</p>
                <p className="text-slate-400 text-sm mt-1">{dataForSEOError}</p>
                <p className="text-slate-500 text-xs mt-2">
                  Verifica que DATAFORSEO_LOGIN y DATAFORSEO_PASSWORD estén configurados en Netlify.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Domain History */}
        {domainMetrics.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-slate-400 hover:text-[#032149] transition-colors">
              Ver historial ({domainMetrics.length} registros)
            </summary>
            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400">Fecha</th>
                    <th className="px-4 py-3 text-left text-slate-400">DA</th>
                    <th className="px-4 py-3 text-left text-slate-400">Backlinks</th>
                    <th className="px-4 py-3 text-left text-slate-400">Ref. Domains</th>
                    <th className="px-4 py-3 text-left text-slate-400">Fuente</th>
                    <th className="px-4 py-3 text-right text-slate-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {domainMetrics.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-slate-300">{m.domainAuthority}</td>
                      <td className="px-4 py-3 text-slate-300">{m.backlinks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.referringDomains.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{m.source}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteDomainMetric(m.id)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ============================================ */}
      {/* HOW TO GET DATA */}
      {/* ============================================ */}
      <section className="bg-white border border-slate-200/50 rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-[#032149] mb-4">¿Cómo obtener estos datos?</h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-[#032149] mb-2">Google Search Console</h4>
            <ol className="text-slate-400 space-y-1">
              <li>1. Abre Search Console</li>
              <li>2. Ve a Rendimiento → Resultados</li>
              <li>3. Selecciona últimos 7 días</li>
              <li>4. Copia totales aquí</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-[#032149] mb-2">Backlinks (DataForSEO)</h4>
            <ol className="text-slate-400 space-y-1">
              <li>1. Configura credenciales en Netlify</li>
              <li>2. DATAFORSEO_LOGIN = tu email</li>
              <li>3. DATAFORSEO_PASSWORD = tu API key</li>
              <li>4. Haz clic en "Sincronizar"</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-[#032149] mb-2">Web Vitals</h4>
            <ol className="text-slate-400 space-y-1">
              <li>1. Haz clic en "Analizar"</li>
              <li>2. Espera ~30 segundos</li>
              <li>3. Los datos se guardan automáticamente</li>
              <li>4. Analiza semanalmente</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* GSC Form Modal */}
      {showGscForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Añadir datos de Search Console</h2>
            <form onSubmit={handleAddGscMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={newGscMetric.date}
                  onChange={(e) => setNewGscMetric({ ...newGscMetric, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Impresiones</label>
                  <input
                    type="number"
                    value={newGscMetric.impressions}
                    onChange={(e) => setNewGscMetric({ ...newGscMetric, impressions: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Clics</label>
                  <input
                    type="number"
                    value={newGscMetric.clicks}
                    onChange={(e) => setNewGscMetric({ ...newGscMetric, clicks: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Posición Media</label>
                <input
                  type="number"
                  step="0.1"
                  value={newGscMetric.position}
                  onChange={(e) => setNewGscMetric({ ...newGscMetric, position: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newGscMetric.notes}
                  onChange={(e) => setNewGscMetric({ ...newGscMetric, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  placeholder="Ej: Publicado nuevo artículo"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGscForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Domain Form Modal */}
      {showDomainForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Añadir datos de Autoridad</h2>
            <form onSubmit={handleAddDomainMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={newDomainMetric.date}
                  onChange={(e) => setNewDomainMetric({ ...newDomainMetric, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Domain Authority (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newDomainMetric.domainAuthority}
                  onChange={(e) => setNewDomainMetric({ ...newDomainMetric, domainAuthority: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Backlinks</label>
                  <input
                    type="number"
                    value={newDomainMetric.backlinks}
                    onChange={(e) => setNewDomainMetric({ ...newDomainMetric, backlinks: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dominios Ref.</label>
                  <input
                    type="number"
                    value={newDomainMetric.referringDomains}
                    onChange={(e) => setNewDomainMetric({ ...newDomainMetric, referringDomains: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fuente</label>
                <select
                  value={newDomainMetric.source}
                  onChange={(e) => setNewDomainMetric({ ...newDomainMetric, source: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                >
                  <option value="Moz">Moz</option>
                  <option value="Ahrefs">Ahrefs</option>
                  <option value="SEMrush">SEMrush</option>
                  <option value="Majestic">Majestic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newDomainMetric.notes}
                  onChange={(e) => setNewDomainMetric({ ...newDomainMetric, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  placeholder="Ej: Conseguido backlink de X"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDomainForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Form Modal */}
      {showAnalyticsForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Añadir datos de Google Analytics</h2>
            <form onSubmit={handleAddAnalyticsMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Período (fecha final)</label>
                <input
                  type="date"
                  value={newAnalyticsMetric.date}
                  onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sesiones</label>
                  <input
                    type="number"
                    value={newAnalyticsMetric.sessions}
                    onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, sessions: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Usuarios</label>
                  <input
                    type="number"
                    value={newAnalyticsMetric.users}
                    onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, users: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Páginas vistas</label>
                <input
                  type="number"
                  value={newAnalyticsMetric.pageviews}
                  onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, pageviews: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tasa de rebote (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newAnalyticsMetric.bounceRate}
                    onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, bounceRate: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    placeholder="ej: 45.2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duración media (seg)</label>
                  <input
                    type="number"
                    step="1"
                    value={newAnalyticsMetric.avgSessionDuration}
                    onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, avgSessionDuration: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                    placeholder="ej: 120"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">% Tráfico orgánico</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newAnalyticsMetric.organicPercent}
                  onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, organicPercent: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  placeholder="ej: 35.5"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">En GA4: Informes → Adquisición → Visión general</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newAnalyticsMetric.notes}
                  onChange={(e) => setNewAnalyticsMetric({ ...newAnalyticsMetric, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149]"
                  placeholder="Ej: Campaña de email"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAnalyticsForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>}
    </div>
  );
}
