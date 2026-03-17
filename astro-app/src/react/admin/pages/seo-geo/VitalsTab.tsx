import { useState, useEffect } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Timer,
  Move,
  Layers,
  Zap,
  Eye,
  Server,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { WebVitals } from './types';
import { DATA_PATH } from './types';
import { ScoreGauge, LoadingSpinner, ErrorBanner, SectionHeader } from './shared';

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-500/10 border-green-200';
  if (score >= 50) return 'bg-amber-500/10 border-amber-200';
  return 'bg-red-500/10 border-red-200';
}

interface VitalConfig {
  key: string;
  label: string;
  unit: string;
  icon: React.ReactNode;
  good: number;
  poor: number;
  lower_is_better: boolean;
  format: (v: number) => string;
}

const vitalsConfig: VitalConfig[] = [
  { key: 'lcp', label: 'LCP (Largest Contentful Paint)', unit: 's', icon: <Eye className="w-5 h-5" />, good: 2.5, poor: 4.0, lower_is_better: true, format: (v) => `${v.toFixed(1)}s` },
  { key: 'tbt', label: 'TBT (Total Blocking Time)', unit: 'ms', icon: <Timer className="w-5 h-5" />, good: 200, poor: 600, lower_is_better: true, format: (v) => `${Math.round(v)}ms` },
  { key: 'cls', label: 'CLS (Cumulative Layout Shift)', unit: '', icon: <Move className="w-5 h-5" />, good: 0.1, poor: 0.25, lower_is_better: true, format: (v) => v.toFixed(3) },
  { key: 'fcp', label: 'FCP (First Contentful Paint)', unit: 's', icon: <Zap className="w-5 h-5" />, good: 1.8, poor: 3.0, lower_is_better: true, format: (v) => `${v.toFixed(1)}s` },
  { key: 'si', label: 'SI (Speed Index)', unit: 's', icon: <Layers className="w-5 h-5" />, good: 3.4, poor: 5.8, lower_is_better: true, format: (v) => `${v.toFixed(1)}s` },
  { key: 'ttfb', label: 'TTFB (Time to First Byte)', unit: 'ms', icon: <Server className="w-5 h-5" />, good: 800, poor: 1800, lower_is_better: true, format: (v) => `${Math.round(v)}ms` },
];

function getVitalStatus(value: number, config: VitalConfig): 'good' | 'needs_work' | 'poor' {
  if (config.lower_is_better) {
    if (value <= config.good) return 'good';
    if (value <= config.poor) return 'needs_work';
    return 'poor';
  }
  if (value >= config.good) return 'good';
  if (value >= config.poor) return 'needs_work';
  return 'poor';
}

function getVitalColor(status: 'good' | 'needs_work' | 'poor'): string {
  if (status === 'good') return 'text-green-600 bg-green-50 border-green-200';
  if (status === 'needs_work') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export default function VitalsTab() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);

  useEffect(() => {
    getDoc(doc(db, DATA_PATH, 'site_data', 'web_vitals'))
      .then(snap => { if (snap.exists()) setWebVitals(snap.data() as WebVitals); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://growth4u.io' }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setWebVitals(data);
      await setDoc(doc(db, DATA_PATH, 'site_data', 'web_vitals'), data).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Error al analizar Web Vitals');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner text="Cargando datos..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header + Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#032149]">Core Web Vitals</h2>
          <p className="text-slate-400 text-sm mt-1">Analisis de rendimiento y metricas vitales</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analizando...' : 'Analizar Web Vitals'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner text="Analizando Web Vitals (30-60s)..." />}

      {webVitals && !loading && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Performance', score: webVitals.performance },
              { label: 'Accessibility', score: webVitals.accessibility },
              { label: 'Best Practices', score: webVitals.bestPractices },
              { label: 'SEO', score: webVitals.seo },
            ].map((item) => (
              <div key={item.label} className={`border rounded-xl p-5 text-center ${getScoreBg(item.score)}`}>
                <p className="text-sm text-slate-500 mb-2">{item.label}</p>
                <p className={`text-4xl font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                <p className="text-xs text-slate-400 mt-1">/ 100</p>
              </div>
            ))}
          </div>

          {/* Core Web Vitals Detail Cards */}
          <div>
            <SectionHeader title="Detalle de Core Web Vitals" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vitalsConfig.map((config) => {
                const value = webVitals[config.key as keyof WebVitals] as number;
                if (value === undefined || value === null) return null;
                const status = getVitalStatus(value, config);
                const colorClass = getVitalColor(status);
                const statusLabel = status === 'good' ? 'Bueno' : status === 'needs_work' ? 'Mejorable' : 'Pobre';

                return (
                  <div key={config.key} className={`border rounded-xl p-5 ${colorClass}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span className="text-sm font-medium">{config.key.toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-3xl font-bold mb-1">{config.format(value)}</p>
                    <p className="text-xs opacity-70">
                      Objetivo: {config.key === 'cls' ? `<${config.good}` : `<${config.good}${config.unit}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thresholds Reference Table */}
          <div>
            <SectionHeader title="Tabla de Referencia" subtitle="Umbrales oficiales de Google para Core Web Vitals" />
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Metrica</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-green-600 uppercase">Bueno</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-amber-600 uppercase">Mejorable</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-red-600 uppercase">Pobre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-5 py-3 text-sm font-medium text-[#032149]">Performance</td>
                    <td className="px-5 py-3 text-sm text-center text-green-600">&ge; 90</td>
                    <td className="px-5 py-3 text-sm text-center text-amber-600">50 - 89</td>
                    <td className="px-5 py-3 text-sm text-center text-red-600">&lt; 50</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm font-medium text-[#032149]">LCP</td>
                    <td className="px-5 py-3 text-sm text-center text-green-600">&lt; 2.5s</td>
                    <td className="px-5 py-3 text-sm text-center text-amber-600">2.5 - 4.0s</td>
                    <td className="px-5 py-3 text-sm text-center text-red-600">&gt; 4.0s</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm font-medium text-[#032149]">CLS</td>
                    <td className="px-5 py-3 text-sm text-center text-green-600">&lt; 0.1</td>
                    <td className="px-5 py-3 text-sm text-center text-amber-600">0.1 - 0.25</td>
                    <td className="px-5 py-3 text-sm text-center text-red-600">&gt; 0.25</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm font-medium text-[#032149]">TBT</td>
                    <td className="px-5 py-3 text-sm text-center text-green-600">&lt; 200ms</td>
                    <td className="px-5 py-3 text-sm text-center text-amber-600">200 - 600ms</td>
                    <td className="px-5 py-3 text-sm text-center text-red-600">&gt; 600ms</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-sm font-medium text-[#032149]">FCP</td>
                    <td className="px-5 py-3 text-sm text-center text-green-600">&lt; 1.8s</td>
                    <td className="px-5 py-3 text-sm text-center text-amber-600">1.8 - 3.0s</td>
                    <td className="px-5 py-3 text-sm text-center text-red-600">&gt; 3.0s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Updated At + Link */}
          <div className="flex items-center justify-between text-sm text-slate-400">
            {webVitals.updatedAt && (
              <span>Ultima actualizacion: {new Date(webVitals.updatedAt).toLocaleString('es-ES')}</span>
            )}
            <a
              href="https://pagespeed.web.dev/analysis?url=https://growth4u.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#6351d5] hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver en PageSpeed Insights
            </a>
          </div>
        </>
      )}
    </div>
  );
}
