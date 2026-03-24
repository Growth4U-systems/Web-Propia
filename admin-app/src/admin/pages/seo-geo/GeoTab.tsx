import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Link2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import type { GEOAutoResult } from './types';
import { platforms, suggestedPrompts } from './types';
import { LoadingSpinner, ErrorBanner, MetricCard } from './shared';
import { API_BASE } from '../../../lib/api';

export default function GeoTab() {
  // Auto GEO state
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoResults, setAutoResults] = useState<GEOAutoResult[]>([]);
  const [geoScore, setGeoScore] = useState<number | null>(null);

  const runAutoGEO = async () => {
    setAutoLoading(true);
    setAutoError(null);
    try {
      const promptsToTest = suggestedPrompts.map(sp => sp.prompt);
      const res = await fetch(`${API_BASE}/.netlify/functions/ai-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsToTest,
          domain: 'growth4u.io',
          brandName: 'Growth4U',
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setAutoResults(data.results || []);
      setGeoScore(data.geoScore ?? null);
    } catch (err: any) {
      setAutoError(err.message || 'Error al ejecutar analisis GEO automatico');
    } finally {
      setAutoLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Auto GEO Analysis */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6351d5]" />
              Analisis GEO Automatico
            </h2>
            <p className="text-slate-400 text-sm mt-1">Pregunta a motores de IA sobre tu marca automaticamente</p>
          </div>
          <button
            onClick={runAutoGEO}
            disabled={autoLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${autoLoading ? 'animate-spin' : ''}`} />
            {autoLoading ? 'Analizando...' : 'Ejecutar Analisis GEO'}
          </button>
        </div>

        {autoError && <ErrorBanner message={autoError} />}
        {autoLoading && <LoadingSpinner text="Consultando motores de IA..." />}

        {geoScore !== null && autoResults.length > 0 && !autoLoading && (
          <div className="space-y-4">
            {/* GEO Score + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#6351d5]/5 border border-[#6351d5]/20 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500 mb-1">GEO Score</p>
                <p className="text-5xl font-bold text-[#6351d5]">{geoScore}</p>
                <p className="text-xs text-slate-400 mt-1">/100</p>
              </div>
              <MetricCard
                label="Tasa de Mencion"
                value={`${Math.round(autoResults.filter(r => r.mentioned).length / autoResults.length * 100)}%`}
                icon={<Target className="w-5 h-5 text-green-500" />}
                subtitle={`${autoResults.filter(r => r.mentioned).length}/${autoResults.length} prompts`}
              />
              <MetricCard
                label="Con Cita URL"
                value={autoResults.filter(r => r.citedUrls.length > 0).length}
                icon={<Link2 className="w-5 h-5 text-[#45b6f7]" />}
                subtitle="URLs de growth4u.io citadas"
              />
            </div>

            {/* Per-platform results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoResults.map((result, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      platforms.find(p => p.value === result.platform)?.color || 'bg-slate-500'
                    } text-white`}>
                      {platforms.find(p => p.value === result.platform)?.label || result.platform}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.mentioned ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      {result.sentiment === 'positive' && <ThumbsUp className="w-4 h-4 text-green-500" />}
                      {result.sentiment === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
                      {result.sentiment === 'negative' && <ThumbsDown className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-1">{result.prompt}</p>
                  {result.responseSnippet && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 line-clamp-3">
                      {result.responseSnippet}
                    </p>
                  )}
                  {result.citedUrls.length > 0 && (
                    <div className="mt-2">
                      {result.citedUrls.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6351d5] hover:underline flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> {url}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{new Date(result.testedAt).toLocaleString('es-ES')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
