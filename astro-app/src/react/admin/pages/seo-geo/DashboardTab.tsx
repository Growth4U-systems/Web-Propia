import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Globe,
  Link2,
  TrendingUp,
  Zap,
  Bot,
  Loader2,
} from 'lucide-react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { SEOAuditResult, WebVitals, OwnMediaResult, DataForSEOMetrics, GSCMetric, Recommendation } from './types';
import { DATA_PATH } from './types';
import { ScoreGauge, MetricCard, RecommendationCard, SectionHeader } from './shared';
import { generateRecommendations, generateIssues } from './engines';

const REC_STATUS_KEY = 'vis_rec_statuses';

function loadRecStatuses(): Record<string, Recommendation['status']> {
  try {
    return JSON.parse(localStorage.getItem(REC_STATUS_KEY) || '{}');
  } catch { return {}; }
}

function saveRecStatuses(statuses: Record<string, Recommendation['status']>) {
  localStorage.setItem(REC_STATUS_KEY, JSON.stringify(statuses));
}

function computeSEOHealth(audit: SEOAuditResult | null): number {
  if (!audit) return 0;
  try {
    let score = 100;
    if (!audit.metaTitle) score -= 15;
    if (!audit.metaDescription) score -= 10;
    if (audit.h1Count !== 1) score -= 10;
    if (!audit.hasCanonical) score -= 10;
    if (!audit.hasSitemap) score -= 15;
    if (!audit.hasRobotsTxt) score -= 5;
    if (!audit.isHttps) score -= 15;
    if ((audit.imagesWithoutAlt ?? 0) > 0) score -= Math.min(audit.imagesWithoutAlt * 2, 10);
    if (!audit.ogTitle || !audit.ogImage) score -= 5;
    if ((audit.wordCount ?? 0) < 300) score -= 5;
    return Math.max(0, score);
  } catch { return 0; }
}

function computeGEOReadiness(audit: SEOAuditResult | null, ownMedia: OwnMediaResult | null): number {
  try {
    let score = 0;
    if (audit) {
      const sd = audit.structuredDataTypes ?? [];
      if (sd.length > 0) score += 25;
      if (sd.includes('Organization')) score += 10;
      if (sd.includes('Article')) score += 10;
      if (sd.includes('FAQPage')) score += 10;
      if ((audit.wordCount ?? 0) > 800) score += 10;
      if ((audit.h2Count ?? 0) >= 3) score += 5;
      if ((audit.hreflangTags ?? []).length > 0) score += 5;
    }
    if (ownMedia) {
      if (ownMedia.blog?.hasBlog) score += 10;
      if ((ownMedia.blog?.postCount ?? 0) > 10) score += 5;
      if ((ownMedia.schemaTypes ?? []).length > 3) score += 10;
    }
    return Math.min(100, score);
  } catch { return 0; }
}

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<SEOAuditResult | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [ownMedia, setOwnMedia] = useState<OwnMediaResult | null>(null);
  const [dataForSEO, setDataForSEO] = useState<DataForSEOMetrics | null>(null);
  const [gscMetrics, setGscMetrics] = useState<GSCMetric[]>([]);

  useEffect(() => {
    loadAllCached();
  }, []);

  const loadAllCached = async () => {
    setLoading(true);
    try {
      await Promise.all([
        // Web Vitals (cached)
        getDoc(doc(db, DATA_PATH, 'site_data', 'web_vitals_v2')).then(snap => {
          if (snap.exists()) {
            const d = snap.data();
            const raw = d.mobile ?? d;
            // Normalize nested { scores, metrics } format to flat WebVitals
            if (raw.scores) {
              setWebVitals({
                performance: raw.scores.performance ?? 0,
                accessibility: raw.scores.accessibility ?? 0,
                bestPractices: raw.scores.bestPractices ?? 0,
                seo: raw.scores.seo ?? 0,
                lcp: raw.metrics?.lcp ?? 0,
                tbt: raw.metrics?.tbt ?? 0,
                cls: raw.metrics?.cls ?? 0,
                fcp: raw.metrics?.fcp ?? 0,
                si: raw.metrics?.si ?? 0,
                ttfb: raw.metrics?.ttfb ?? 0,
                updatedAt: d.updatedAt,
              } as WebVitals);
            } else {
              setWebVitals(raw as WebVitals);
            }
          }
        }).catch(() => {}),
        // DataForSEO (cached)
        getDoc(doc(db, DATA_PATH, 'dataforseo_metrics', 'latest')).then(snap => {
          if (snap.exists()) setDataForSEO(snap.data() as DataForSEOMetrics);
        }).catch(() => {}),
        // Latest audit (cached)
        getDoc(doc(db, DATA_PATH, 'site_data', 'latest_audit')).then(snap => {
          if (snap.exists()) setAudit(snap.data() as SEOAuditResult);
        }).catch(() => {}),
        // Latest own media scan (cached)
        getDoc(doc(db, DATA_PATH, 'site_data', 'latest_own_media')).then(snap => {
          if (snap.exists()) setOwnMedia(snap.data() as OwnMediaResult);
        }).catch(() => {}),
        // GSC metrics (latest 5)
        getDocs(query(collection(db, DATA_PATH, 'seo_metrics'), orderBy('date', 'desc'))).then(snap => {
          setGscMetrics(snap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })) as GSCMetric[]);
        }).catch(() => {}),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const seoHealth = useMemo(() => computeSEOHealth(audit), [audit]);
  const perfScore = webVitals?.performance ?? 0;
  const geoReadiness = useMemo(() => computeGEOReadiness(audit, ownMedia), [audit, ownMedia]);
  const ownMediaScore = ownMedia?.scores?.overallScore ?? 0;

  const [recStatuses, setRecStatuses] = useState<Record<string, Recommendation['status']>>(loadRecStatuses);

  const issues = useMemo(() => {
    try { return generateIssues(audit, webVitals); } catch { return []; }
  }, [audit, webVitals]);
  const allRecommendations = useMemo(() => {
    try { return generateRecommendations(issues ?? [], ownMedia); } catch { return []; }
  }, [issues, ownMedia]);

  // Apply persisted statuses and filter out resolved/dismissed
  const recommendations = useMemo(() => {
    return allRecommendations
      .map(rec => {
        const saved = recStatuses[rec.title];
        return saved ? { ...rec, status: saved } : rec;
      })
      .filter(rec => rec.status !== 'resolved' && rec.status !== 'dismissed');
  }, [allRecommendations, recStatuses]);

  const handleStatusChange = useCallback((title: string, status: Recommendation['status']) => {
    setRecStatuses(prev => {
      const next = { ...prev, [title]: status };
      // Remove 'open' entries to keep storage clean
      if (status === 'open') delete next[title];
      saveRecStatuses(next);
      return next;
    });
  }, []);

  const latestGSC = gscMetrics.length > 0 ? gscMetrics[0] : null;
  const hasAnyData = audit || webVitals || ownMedia || dataForSEO || gscMetrics.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" />
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-[#032149] mb-2">Sin datos todavia</h3>
        <p className="text-slate-500 text-center max-w-md">
          Ejecuta una auditoria SEO, analisis de Web Vitals u Own Media Scan desde las otras pestanas para ver el dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Score Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreGauge label="SEO Health" score={seoHealth} />
        <ScoreGauge label="Web Performance" score={perfScore} />
        <ScoreGauge label="GEO Readiness" score={geoReadiness} />
        <ScoreGauge label="Own Media" score={ownMediaScore} />
      </div>

      {/* Quick Stats */}
      <div>
        <SectionHeader title="Metricas Rapidas" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Backlinks Totales"
            value={dataForSEO?.backlinks?.toLocaleString() ?? '—'}
            icon={<Link2 className="w-5 h-5 text-[#6351d5]" />}
          />
          <MetricCard
            label="Dominios de Referencia"
            value={dataForSEO?.referringDomains?.toLocaleString() ?? '—'}
            icon={<Globe className="w-5 h-5 text-[#45b6f7]" />}
          />
          <MetricCard
            label="Impresiones GSC"
            value={latestGSC?.impressions?.toLocaleString() ?? '—'}
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            subtitle={latestGSC ? `Datos del ${new Date(latestGSC.date).toLocaleDateString('es-ES')}` : undefined}
          />
          <MetricCard
            label="Clics GSC"
            value={latestGSC?.clicks?.toLocaleString() ?? '—'}
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            subtitle={latestGSC ? `CTR: ${latestGSC.ctr.toFixed(1)}%` : undefined}
          />
        </div>
      </div>

      {/* Top Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <SectionHeader
            title="Top Recomendaciones"
            subtitle={`${recommendations.length} recomendaciones activas de ${allRecommendations.length} detectadas — mostrando las 5 mas importantes`}
          />
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec, i) => (
              <RecommendationCard
                key={rec.title}
                rec={rec}
                onStatusChange={(status) => handleStatusChange(rec.title, status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* GEO Quick Insight */}
      {audit && (
        <div className="bg-[#6351d5]/5 border border-[#6351d5]/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-[#6351d5]" />
            <h3 className="font-bold text-[#032149]">GEO Insight</h3>
          </div>
          <p className="text-slate-600 text-sm">
            {(audit.structuredDataTypes ?? []).length > 0
              ? `Tu web tiene ${audit.structuredDataTypes.length} tipos de datos estructurados (${audit.structuredDataTypes.join(', ')}). `
              : 'Tu web no tiene datos estructurados. Es critico agregar JSON-LD para que los motores de IA citen tu contenido. '}
            {(audit.wordCount ?? 0) > 800
              ? 'El contenido tiene suficiente profundidad para ser citado por LLMs.'
              : `Con solo ${audit.wordCount ?? 0} palabras, el contenido es demasiado corto para ser citado frecuentemente por LLMs.`}
          </p>
        </div>
      )}
    </div>
  );
}
