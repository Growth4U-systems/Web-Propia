import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Globe,
  Bot,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import {
  getAllSEOGEOAudits,
  createSEOGEOAudit,
  updateSEOGEOAudit,
  deleteSEOGEOAudit,
  type SEOGEOAudit,
  type GEOPromptResult,
  type SERPCheck,
} from '../../lib/firebase-client';
import { API_BASE } from '../../lib/api';

// ============================================
// TYPES
// ============================================

interface AuditWithId extends SEOGEOAudit {
  id: string;
}

interface WebVitalsData {
  performanceScore: number;
  lcp: number;
  tbt: number;
  cls: number;
  fcp: number;
  si: number;
}

type Tab = 'audits' | 'new' | 'history';

// ============================================
// SCORE COMPUTATION
// ============================================

function computeSeoScore(webVitals: any): number {
  if (!webVitals) return 0;
  let score = 0;
  if (webVitals.performanceScore) score += webVitals.performanceScore * 0.5;
  if (webVitals.lcp) {
    if (webVitals.lcp < 2500) score += 20;
    else if (webVitals.lcp < 4000) score += 10;
  }
  if (webVitals.cls !== undefined) {
    if (webVitals.cls < 0.1) score += 15;
    else if (webVitals.cls < 0.25) score += 7;
  }
  if (webVitals.fcp) {
    if (webVitals.fcp < 1800) score += 15;
    else if (webVitals.fcp < 3000) score += 7;
  }
  return Math.min(100, Math.round(score));
}

function computeGeoScore(geoPrompts: GEOPromptResult[]): number {
  if (!geoPrompts.length) return 0;
  const mentionRate = geoPrompts.filter((p) => p.mentioned).length / geoPrompts.length;
  const positiveRate = geoPrompts.filter((p) => p.sentiment === 'positive').length / geoPrompts.length;
  const citationRate = geoPrompts.filter((p) => p.citedUrls.length > 0).length / geoPrompts.length;
  return Math.round(mentionRate * 50 + positiveRate * 30 + citationRate * 20);
}

function detectGaps(webVitals: any, geoPrompts: GEOPromptResult[], _domain: string): string[] {
  const gaps: string[] = [];
  const platforms = [...new Set(geoPrompts.map((p) => p.platform))];
  for (const platform of platforms) {
    const platformPrompts = geoPrompts.filter((p) => p.platform === platform);
    const mentionRate = platformPrompts.filter((p) => p.mentioned).length / platformPrompts.length;
    if (mentionRate === 0) gaps.push(`No mencionado en ${platform}`);
    else if (mentionRate < 0.5)
      gaps.push(`Baja visibilidad en ${platform} (${Math.round(mentionRate * 100)}%)`);
  }
  const negatives = geoPrompts.filter((p) => p.sentiment === 'negative');
  if (negatives.length > 0) gaps.push(`${negatives.length} respuesta(s) con sentimiento negativo`);
  const noCitations = geoPrompts.filter((p) => p.mentioned && p.citedUrls.length === 0);
  if (noCitations.length > 0) gaps.push(`${noCitations.length} mención(es) sin URL citada`);
  if (webVitals) {
    if (webVitals.lcp > 2500) gaps.push(`LCP alto: ${(webVitals.lcp / 1000).toFixed(1)}s (objetivo: < 2.5s)`);
    if (webVitals.cls > 0.1) gaps.push(`CLS alto: ${webVitals.cls.toFixed(2)} (objetivo: < 0.1)`);
    if (webVitals.fcp > 1800) gaps.push(`FCP alto: ${(webVitals.fcp / 1000).toFixed(1)}s (objetivo: < 1.8s)`);
    if (webVitals.performanceScore && webVitals.performanceScore < 50)
      gaps.push('Performance score bajo (< 50)');
  }
  return gaps;
}

// ============================================
// HELPERS
// ============================================

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-100';
  if (score >= 40) return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
}


function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    running: 'bg-blue-100 text-blue-600',
    completed: 'bg-green-100 text-green-600',
  };
  const labels: Record<string, string> = {
    draft: 'Borrador',
    running: 'En curso',
    completed: 'Completado',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function sentimentBadge(sentiment: string) {
  if (sentiment === 'positive')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <ThumbsUp size={12} /> Positivo
      </span>
    );
  if (sentiment === 'negative')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <ThumbsDown size={12} /> Negativo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
      <Minus size={12} /> Neutral
    </span>
  );
}

function metricStatus(value: number, goodThreshold: number, poorThreshold: number, invert = false) {
  const isGood = invert ? value < goodThreshold : value >= goodThreshold;
  const isPoor = invert ? value > poorThreshold : value < poorThreshold;
  if (isGood) return 'text-green-600 bg-green-50 border-green-200';
  if (isPoor) return 'text-red-600 bg-red-50 border-red-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
}

// ============================================
// COMPONENT
// ============================================

export default function SeoGeoAuditPage() {
  const [activeTab, setActiveTab] = useState<Tab>('audits');
  const [audits, setAudits] = useState<AuditWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [auditName, setAuditName] = useState('');
  const [domain, setDomain] = useState('');
  const [keywords, setKeywords] = useState('');
  const [webVitals, setWebVitals] = useState<WebVitalsData | null>(null);
  const [fetchingVitals, setFetchingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState('');
  const [geoPrompts, setGeoPrompts] = useState<string[]>([]);
  const [geoPlatforms, setGeoPlatforms] = useState<Record<string, boolean>>({
    ChatGPT: true,
    Perplexity: true,
    Gemini: true,
    Claude: true,
  });
  const [geoResults, setGeoResults] = useState<GEOPromptResult[]>([]);
  const [runningGeo, setRunningGeo] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [savingAudit, setSavingAudit] = useState(false);
  const [expandedSnippets, setExpandedSnippets] = useState<Set<number>>(new Set());

  // History
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const data = await getAllSEOGEOAudits();
      setAudits(data as AuditWithId[]);
    } catch (error) {
      console.error('Error loading audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAudit = async (id: string) => {
    if (!confirm('¿Eliminar esta auditoría?')) return;
    try {
      await deleteSEOGEOAudit(id);
      loadAudits();
    } catch (error) {
      console.error('Error deleting audit:', error);
    }
  };

  // ---- Wizard helpers ----

  const generateDefaultPrompts = (d: string) => {
    const cleanDomain = d.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return [
      `¿Qué es ${cleanDomain} y qué servicios ofrecen?`,
      `Mejores agencias de growth marketing en España`,
      `Compara ${cleanDomain} con competidores`,
      `¿Quién recomiendas para growth marketing B2B?`,
      `Opiniones sobre ${cleanDomain}`,
    ];
  };

  const handleDomainChange = (val: string) => {
    setDomain(val);
    if (geoPrompts.length === 0 && val.length > 3) {
      setGeoPrompts(generateDefaultPrompts(val));
    }
  };

  const fetchWebVitals = async () => {
    if (!domain) return;
    setFetchingVitals(true);
    setVitalsError('');
    setWebVitals(null);
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const lhr = data.lighthouseResult;
      const auditsData = lhr?.audits || {};
      setWebVitals({
        performanceScore: Math.round((lhr?.categories?.performance?.score || 0) * 100),
        lcp: auditsData['largest-contentful-paint']?.numericValue || 0,
        tbt: auditsData['total-blocking-time']?.numericValue || 0,
        cls: auditsData['cumulative-layout-shift']?.numericValue || 0,
        fcp: auditsData['first-contentful-paint']?.numericValue || 0,
        si: auditsData['speed-index']?.numericValue || 0,
      });
    } catch (err: any) {
      setVitalsError(err.message || 'Error al obtener Web Vitals');
    } finally {
      setFetchingVitals(false);
    }
  };

  const addPrompt = () => setGeoPrompts([...geoPrompts, '']);
  const removePrompt = (idx: number) => setGeoPrompts(geoPrompts.filter((_, i) => i !== idx));
  const updatePrompt = (idx: number, val: string) => {
    const copy = [...geoPrompts];
    copy[idx] = val;
    setGeoPrompts(copy);
  };

  const runGeoAudit = async () => {
    const activePrompts = geoPrompts.filter((p) => p.trim());
    const activePlatforms = Object.entries(geoPlatforms)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!activePrompts.length || !activePlatforms.length) return;

    setRunningGeo(true);
    setGeoError('');
    setGeoResults([]);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const res = await fetch(`${API_BASE}/.netlify/functions/ai-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: activePrompts,
          domain: cleanDomain,
          brandName: cleanDomain.split('.')[0],
          platforms: activePlatforms,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setGeoResults(data.results || []);
    } catch (err: any) {
      setGeoError(err.message || 'Error al ejecutar auditoría GEO');
    } finally {
      setRunningGeo(false);
    }
  };

  const handleSaveAudit = async () => {
    if (!auditName || !domain) return;
    setSavingAudit(true);
    try {
      const seoScore = computeSeoScore(webVitals);
      const geoScore = computeGeoScore(geoResults);
      const gaps = detectGaps(webVitals, geoResults, domain);
      await createSEOGEOAudit({
        name: auditName,
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        status: geoResults.length > 0 ? 'completed' : webVitals ? 'running' : 'draft',
        targetKeywords: keywords
          .split('\n')
          .map((k) => k.trim())
          .filter(Boolean),
        serpResults: [],
        webVitals: webVitals as any,
        geoPrompts: geoResults,
        seoScore,
        geoScore,
        gaps,
      });
      // Reset wizard
      setAuditName('');
      setDomain('');
      setKeywords('');
      setWebVitals(null);
      setGeoPrompts([]);
      setGeoResults([]);
      setWizardStep(1);
      setActiveTab('audits');
      loadAudits();
    } catch (error) {
      console.error('Error saving audit:', error);
      alert('Error al guardar la auditoría');
    } finally {
      setSavingAudit(false);
    }
  };

  const toggleSnippet = (idx: number) => {
    const copy = new Set(expandedSnippets);
    if (copy.has(idx)) copy.delete(idx);
    else copy.add(idx);
    setExpandedSnippets(copy);
  };

  // History helpers
  const domains = [...new Set(audits.map((a) => a.domain))];
  const domainAudits = selectedDomain
    ? audits.filter((a) => a.domain === selectedDomain).sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db2;
      })
    : [];

  // ============================================
  // RENDER
  // ============================================

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'audits', label: 'Auditorías', icon: Search },
    { key: 'new', label: 'Nueva Auditoría', icon: Plus },
    { key: 'history', label: 'Historial', icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#032149]">Auditoría SEO + GEO</h1>
          <p className="text-slate-400 mt-2">
            Analiza el rendimiento web y la visibilidad en motores de IA
          </p>
        </div>
        <button
          onClick={() => {
            setActiveTab('new');
            setWizardStep(1);
          }}
          className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nueva Auditoría
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#6351d5] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'audits' && renderAuditsTab()}
      {activeTab === 'new' && renderNewAuditTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );

  // ============================================
  // TAB 1: AUDITS LIST
  // ============================================

  function renderAuditsTab() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#6351d5]" size={32} />
        </div>
      );
    }

    if (audits.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-12 shadow-sm text-center">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin auditorías</h3>
          <p className="text-slate-400 mb-6">Crea tu primera auditoría SEO + GEO para comenzar</p>
          <button
            onClick={() => {
              setActiveTab('new');
              setWizardStep(1);
            }}
            className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Crear auditoría
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Nombre</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Dominio</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">SEO</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">GEO</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase px-6 py-3">Estado</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Fecha</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {audits.map((audit) => (
              <AuditRow
                key={audit.id}
                audit={audit}
                expanded={expandedAuditId === audit.id}
                onToggle={() => setExpandedAuditId(expandedAuditId === audit.id ? null : audit.id)}
                onDelete={() => handleDeleteAudit(audit.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ============================================
  // TAB 2: NEW AUDIT WIZARD
  // ============================================

  function renderNewAuditTab() {
    const totalSteps = 4;

    return (
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <button
                onClick={() => setWizardStep(step)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  wizardStep === step
                    ? 'bg-[#6351d5] text-white'
                    : wizardStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {wizardStep > step ? <CheckCircle2 size={18} /> : step}
              </button>
              {step < 4 && (
                <div className={`w-12 h-0.5 ${wizardStep > step ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-xs text-slate-500">
          <span className={wizardStep === 1 ? 'text-[#6351d5] font-medium' : ''}>Configuración</span>
          <span className={wizardStep === 2 ? 'text-[#6351d5] font-medium' : ''}>Web Vitals</span>
          <span className={wizardStep === 3 ? 'text-[#6351d5] font-medium' : ''}>Test GEO</span>
          <span className={wizardStep === 4 ? 'text-[#6351d5] font-medium' : ''}>Resultados</span>
        </div>

        {/* Step content */}
        {wizardStep === 1 && renderStep1()}
        {wizardStep === 2 && renderStep2()}
        {wizardStep === 3 && renderStep3()}
        {wizardStep === 4 && renderStep4()}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
            disabled={wizardStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          {wizardStep < totalSteps ? (
            <button
              onClick={() => setWizardStep(Math.min(totalSteps, wizardStep + 1))}
              className="flex items-center gap-2 bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSaveAudit}
              disabled={savingAudit || !auditName || !domain}
              className="flex items-center gap-2 bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAudit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Guardar Auditoría
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-[#032149] flex items-center gap-2">
          <Target size={20} /> Configuración de la auditoría
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la auditoría</label>
          <input
            type="text"
            value={auditName}
            onChange={(e) => setAuditName(e.target.value)}
            placeholder="Ej: Auditoría Q1 2026 — growth4u.io"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Dominio / URL</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => handleDomainChange(e.target.value)}
            placeholder="Ej: growth4u.io"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Keywords objetivo <span className="text-slate-400 font-normal">(una por línea)</span>
          </label>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            rows={5}
            placeholder={"growth marketing España\nagencia growth B2B\nconsultoría crecimiento startups"}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent resize-none"
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-[#032149] flex items-center gap-2">
          <Gauge size={20} /> Web Vitals
        </h2>
        <p className="text-sm text-slate-500">
          Analiza el rendimiento de <strong>{domain || '(introduce un dominio)'}</strong> usando Google
          PageSpeed Insights (estrategia móvil).
        </p>
        <button
          onClick={fetchWebVitals}
          disabled={fetchingVitals || !domain}
          className="flex items-center gap-2 bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fetchingVitals ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {fetchingVitals ? 'Analizando...' : 'Obtener Web Vitals'}
        </button>

        {vitalsError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle size={16} /> {vitalsError}
          </div>
        )}

        {webVitals && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <VitalCard
              label="Performance Score"
              value={`${webVitals.performanceScore}`}
              unit="/100"
              className={metricStatus(webVitals.performanceScore, 90, 50)}
            />
            <VitalCard
              label="LCP"
              value={`${(webVitals.lcp / 1000).toFixed(1)}`}
              unit="s"
              className={metricStatus(webVitals.lcp, 2500, 4000, true)}
            />
            <VitalCard
              label="TBT"
              value={`${Math.round(webVitals.tbt)}`}
              unit="ms"
              className={metricStatus(webVitals.tbt, 200, 600, true)}
            />
            <VitalCard
              label="CLS"
              value={`${webVitals.cls.toFixed(3)}`}
              unit=""
              className={metricStatus(webVitals.cls, 0.1, 0.25, true)}
            />
            <VitalCard
              label="FCP"
              value={`${(webVitals.fcp / 1000).toFixed(1)}`}
              unit="s"
              className={metricStatus(webVitals.fcp, 1800, 3000, true)}
            />
            <VitalCard
              label="Speed Index"
              value={`${(webVitals.si / 1000).toFixed(1)}`}
              unit="s"
              className={metricStatus(webVitals.si, 3400, 5800, true)}
            />
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    const activePlatforms = Object.entries(geoPlatforms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-[#032149] flex items-center gap-2">
          <Bot size={20} /> Test GEO
        </h2>
        <p className="text-sm text-slate-500">
          Define los prompts y plataformas para evaluar la visibilidad de tu marca en motores de IA.
        </p>

        {/* Platforms */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Plataformas</label>
          <div className="flex flex-wrap gap-3">
            {Object.keys(geoPlatforms).map((platform) => (
              <label
                key={platform}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  geoPlatforms[platform]
                    ? 'border-[#6351d5] bg-[#6351d5]/5 text-[#6351d5]'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={geoPlatforms[platform]}
                  onChange={(e) =>
                    setGeoPlatforms({ ...geoPlatforms, [platform]: e.target.checked })
                  }
                  className="sr-only"
                />
                <CheckCircle2
                  size={16}
                  className={geoPlatforms[platform] ? 'text-[#6351d5]' : 'text-slate-300'}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>

        {/* Prompts */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Prompts de prueba</label>
          <div className="space-y-2">
            {geoPrompts.map((prompt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => updatePrompt(idx, e.target.value)}
                  placeholder="Escribe un prompt de prueba..."
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent"
                />
                <button
                  onClick={() => removePrompt(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addPrompt}
            className="mt-2 flex items-center gap-1 text-sm text-[#6351d5] hover:text-[#4a3cb0] font-medium transition-colors"
          >
            <Plus size={14} /> Añadir prompt
          </button>
        </div>

        {/* Run */}
        <button
          onClick={runGeoAudit}
          disabled={runningGeo || !geoPrompts.filter((p) => p.trim()).length || !activePlatforms.length}
          className="flex items-center gap-2 bg-[#0faec1] text-white hover:bg-[#0d9aab] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {runningGeo ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {runningGeo ? 'Ejecutando auditoría GEO...' : 'Ejecutar Auditoría GEO'}
        </button>

        {geoError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle size={16} /> {geoError}
          </div>
        )}

        {/* Results */}
        {geoResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Resultados ({geoResults.length} respuestas)
            </h3>
            <div className="space-y-3">
              {geoResults.map((result, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {result.platform}
                        </span>
                        {result.mentioned ? (
                          <CheckCircle2 size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                        {sentimentBadge(result.sentiment)}
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{result.prompt}</p>
                    </div>
                  </div>
                  {result.citedUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.citedUrls.map((url, ui) => (
                        <a
                          key={ui}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#45b6f7] hover:underline"
                        >
                          <ExternalLink size={10} />
                          {url.length > 50 ? url.slice(0, 50) + '...' : url}
                        </a>
                      ))}
                    </div>
                  )}
                  {result.responseSnippet && (
                    <div>
                      <button
                        onClick={() => toggleSnippet(idx)}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                      >
                        {expandedSnippets.has(idx) ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                        {expandedSnippets.has(idx) ? 'Ocultar respuesta' : 'Ver respuesta'}
                      </button>
                      {expandedSnippets.has(idx) && (
                        <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded p-2 whitespace-pre-wrap">
                          {result.responseSnippet}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    const seoScore = computeSeoScore(webVitals);
    const geoScore = computeGeoScore(geoResults);
    const gaps = detectGaps(webVitals, geoResults, domain);

    return (
      <div className="space-y-6">
        {/* Score cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreColor(seoScore)}`}>
                <Gauge size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">SEO Score</h3>
                <p className="text-3xl font-bold text-[#032149]">{seoScore}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Basado en Performance Score, LCP, CLS y FCP</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreColor(geoScore)}`}>
                <Bot size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">GEO Score</h3>
                <p className="text-3xl font-bold text-[#032149]">{geoScore}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Basado en tasa de mención, sentimiento y citaciones</p>
          </div>
        </div>

        {/* Gaps */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#032149] mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Gaps detectados
          </h3>
          {gaps.length === 0 ? (
            <p className="text-sm text-slate-400">No se detectaron gaps significativos.</p>
          ) : (
            <ul className="space-y-2">
              {gaps.map((gap, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3"
                >
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#032149] mb-4">Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Dominio</p>
              <p className="font-medium text-slate-700">{domain || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">Keywords</p>
              <p className="font-medium text-slate-700">
                {keywords
                  .split('\n')
                  .filter((k) => k.trim()).length || 0}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Prompts GEO</p>
              <p className="font-medium text-slate-700">{geoResults.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Gaps</p>
              <p className="font-medium text-slate-700">{gaps.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TAB 3: HISTORY / COMPARE
  // ============================================

  function renderHistoryTab() {
    const domainsWithMultiple = domains.filter(
      (d) => audits.filter((a) => a.domain === d).length >= 2
    );

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#032149] mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Comparar auditorías
          </h2>

          {domainsWithMultiple.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">
                Se necesitan al menos 2 auditorías del mismo dominio para comparar.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar dominio</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent"
                >
                  <option value="">-- Seleccionar --</option>
                  {domainsWithMultiple.map((d) => (
                    <option key={d} value={d}>
                      {d} ({audits.filter((a) => a.domain === d).length} auditorías)
                    </option>
                  ))}
                </select>
              </div>

              {selectedDomain && domainAudits.length >= 2 && (
                <>
                  {/* Side-by-side comparison */}
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Auditoría</th>
                          {domainAudits.map((a) => (
                            <th key={a.id} className="text-center py-2 px-3 text-slate-700 font-medium">
                              {a.name}
                            </th>
                          ))}
                          {domainAudits.length >= 2 && (
                            <th className="text-center py-2 px-3 text-slate-500 font-medium">Delta</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">Fecha</td>
                          {domainAudits.map((a) => (
                            <td key={a.id} className="py-2 px-3 text-center text-slate-700">
                              {a.createdAt
                                ? new Date(a.createdAt).toLocaleDateString('es-ES')
                                : '-'}
                            </td>
                          ))}
                          {domainAudits.length >= 2 && <td />}
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">SEO Score</td>
                          {domainAudits.map((a) => (
                            <td key={a.id} className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${scoreColor(a.seoScore)}`}>
                                {a.seoScore}
                              </span>
                            </td>
                          ))}
                          {domainAudits.length >= 2 && (
                            <td className="py-2 px-3 text-center">
                              {renderDelta(
                                domainAudits[domainAudits.length - 1].seoScore -
                                  domainAudits[domainAudits.length - 2].seoScore
                              )}
                            </td>
                          )}
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">GEO Score</td>
                          {domainAudits.map((a) => (
                            <td key={a.id} className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${scoreColor(a.geoScore)}`}>
                                {a.geoScore}
                              </span>
                            </td>
                          ))}
                          {domainAudits.length >= 2 && (
                            <td className="py-2 px-3 text-center">
                              {renderDelta(
                                domainAudits[domainAudits.length - 1].geoScore -
                                  domainAudits[domainAudits.length - 2].geoScore
                              )}
                            </td>
                          )}
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">Gaps</td>
                          {domainAudits.map((a) => (
                            <td key={a.id} className="py-2 px-3 text-center text-slate-700">
                              {a.gaps.length}
                            </td>
                          ))}
                          {domainAudits.length >= 2 && (
                            <td className="py-2 px-3 text-center">
                              {renderDelta(
                                -(
                                  domainAudits[domainAudits.length - 1].gaps.length -
                                  domainAudits[domainAudits.length - 2].gaps.length
                                )
                              )}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bar chart timeline */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Evolución de scores</h3>
                    <div className="flex items-end gap-6 h-48">
                      {domainAudits.map((a) => (
                        <div key={a.id} className="flex-1 flex flex-col items-center gap-2">
                          <div className="flex items-end gap-1 w-full justify-center h-36">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-bold text-slate-600">{a.seoScore}</span>
                              <div
                                className="w-8 bg-[#6351d5] rounded-t"
                                style={{ height: `${(a.seoScore / 100) * 128}px` }}
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-bold text-slate-600">{a.geoScore}</span>
                              <div
                                className="w-8 bg-[#0faec1] rounded-t"
                                style={{ height: `${(a.geoScore / 100) * 128}px` }}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 text-center truncate w-full">
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-3 h-3 rounded bg-[#6351d5]" /> SEO Score
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-3 h-3 rounded bg-[#0faec1]" /> GEO Score
                      </div>
                    </div>
                  </div>

                  {/* Gaps resolved vs new */}
                  {domainAudits.length >= 2 && renderGapsComparison()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderGapsComparison() {
    const prev = domainAudits[domainAudits.length - 2];
    const curr = domainAudits[domainAudits.length - 1];
    const resolved = prev.gaps.filter((g) => !curr.gaps.includes(g));
    const newGaps = curr.gaps.filter((g) => !prev.gaps.includes(g));

    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-green-200 bg-green-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} /> Gaps resueltos ({resolved.length})
          </h4>
          {resolved.length === 0 ? (
            <p className="text-xs text-green-600">Sin cambios</p>
          ) : (
            <ul className="space-y-1">
              {resolved.map((g, i) => (
                <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {g}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border border-red-200 bg-red-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Nuevos gaps ({newGaps.length})
          </h4>
          {newGaps.length === 0 ? (
            <p className="text-xs text-red-600">Sin nuevos gaps</p>
          ) : (
            <ul className="space-y-1">
              {newGaps.map((g, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {g}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  function renderDelta(delta: number) {
    if (delta === 0) return <span className="text-xs text-slate-400">--</span>;
    if (delta > 0)
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-600">
          <ArrowUpRight size={14} /> +{delta}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">
        <ArrowDownRight size={14} /> {delta}
      </span>
    );
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

function VitalCard({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  className: string;
}) {
  return (
    <div className={`border rounded-xl p-4 ${className}`}>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-sm font-normal opacity-60">{unit}</span>
      </p>
    </div>
  );
}

function AuditRow({
  audit,
  expanded,
  onToggle,
  onDelete,
}: {
  audit: AuditWithId;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-6 py-4 text-sm font-medium text-slate-800">{audit.name}</td>
        <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1">
          <Globe size={14} className="text-slate-400" /> {audit.domain}
        </td>
        <td className="px-6 py-4 text-center">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
              audit.seoScore >= 70
                ? 'bg-green-500 text-white'
                : audit.seoScore >= 40
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
            }`}
          >
            {audit.seoScore}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
              audit.geoScore >= 70
                ? 'bg-green-500 text-white'
                : audit.geoScore >= 40
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
            }`}
          >
            {audit.geoScore}
          </span>
        </td>
        <td className="px-6 py-4 text-center">{statusBadge(audit.status)}</td>
        <td className="px-6 py-4 text-sm text-slate-500">
          {audit.createdAt ? new Date(audit.createdAt).toLocaleDateString('es-ES') : '-'}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="text-slate-400 hover:text-[#6351d5] transition-colors p-1"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-6 py-6">
            <AuditDetails audit={audit} />
          </td>
        </tr>
      )}
    </>
  );
}

function AuditDetails({ audit }: { audit: AuditWithId }) {
  const [expandedSnippets, setExpandedSnippets] = useState<Set<number>>(new Set());

  const toggleSnippet = (idx: number) => {
    const copy = new Set(expandedSnippets);
    if (copy.has(idx)) copy.delete(idx);
    else copy.add(idx);
    setExpandedSnippets(copy);
  };

  return (
    <div className="space-y-6">
      {/* Keywords */}
      {audit.targetKeywords.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Keywords objetivo</h4>
          <div className="flex flex-wrap gap-1">
            {audit.targetKeywords.map((kw, i) => (
              <span
                key={i}
                className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Web Vitals */}
      {audit.webVitals && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Web Vitals</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Perf', value: audit.webVitals.performanceScore },
              { label: 'LCP', value: `${(audit.webVitals.lcp / 1000).toFixed(1)}s` },
              { label: 'TBT', value: `${Math.round(audit.webVitals.tbt || 0)}ms` },
              { label: 'CLS', value: (audit.webVitals.cls || 0).toFixed(3) },
              { label: 'FCP', value: `${(audit.webVitals.fcp / 1000).toFixed(1)}s` },
              { label: 'SI', value: `${((audit.webVitals.si || 0) / 1000).toFixed(1)}s` },
            ].map((m, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-400 uppercase">{m.label}</p>
                <p className="text-sm font-bold text-slate-700">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GEO Results */}
      {audit.geoPrompts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            Resultados GEO ({audit.geoPrompts.length})
          </h4>
          <div className="space-y-2">
            {audit.geoPrompts.map((result, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {result.platform}
                    </span>
                    {result.mentioned ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                    {sentimentBadge(result.sentiment)}
                  </div>
                  <p className="text-xs text-slate-700">{result.prompt}</p>
                  {result.citedUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.citedUrls.map((url, ui) => (
                        <a
                          key={ui}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-[#45b6f7] hover:underline"
                        >
                          <ExternalLink size={8} />
                          {url.length > 40 ? url.slice(0, 40) + '...' : url}
                        </a>
                      ))}
                    </div>
                  )}
                  {result.responseSnippet && (
                    <>
                      <button
                        onClick={() => toggleSnippet(idx)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 mt-1 flex items-center gap-1"
                      >
                        {expandedSnippets.has(idx) ? (
                          <ChevronUp size={10} />
                        ) : (
                          <ChevronDown size={10} />
                        )}
                        {expandedSnippets.has(idx) ? 'Ocultar' : 'Ver respuesta'}
                      </button>
                      {expandedSnippets.has(idx) && (
                        <p className="text-[10px] text-slate-500 mt-1 bg-slate-50 rounded p-2 whitespace-pre-wrap">
                          {result.responseSnippet}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {audit.gaps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Gaps ({audit.gaps.length})</h4>
          <ul className="space-y-1">
            {audit.gaps.map((gap, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
              >
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

