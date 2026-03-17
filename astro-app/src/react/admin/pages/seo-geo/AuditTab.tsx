import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Image,
  Globe,
  Code2,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { SEOAuditResult, WebVitals } from './types';
import { DATA_PATH } from './types';
import { StatusBadge, SeverityBadge, LoadingSpinner, ErrorBanner, SectionHeader, IssueCard } from './shared';
import { generateIssues } from './engines';

interface AuditCheckItem {
  label: string;
  status: 'pass' | 'fail' | 'warning';
  currentValue: string;
  expectedValue: string;
  category: string;
}

function buildChecklist(audit: SEOAuditResult): AuditCheckItem[] {
  const checks: AuditCheckItem[] = [];

  // Meta Tags
  checks.push({
    label: 'Meta Title',
    status: audit.metaTitle && audit.metaTitleLength >= 30 && audit.metaTitleLength <= 60 ? 'pass' : audit.metaTitle ? 'warning' : 'fail',
    currentValue: audit.metaTitle ? `${audit.metaTitleLength} chars` : 'Ausente',
    expectedValue: '50-60 caracteres',
    category: 'Meta Tags',
  });
  checks.push({
    label: 'Meta Description',
    status: audit.metaDescription && audit.metaDescriptionLength >= 120 && audit.metaDescriptionLength <= 160 ? 'pass' : audit.metaDescription ? 'warning' : 'fail',
    currentValue: audit.metaDescription ? `${audit.metaDescriptionLength} chars` : 'Ausente',
    expectedValue: '150-160 caracteres',
    category: 'Meta Tags',
  });
  checks.push({
    label: 'OG Title',
    status: audit.ogTitle ? 'pass' : 'fail',
    currentValue: audit.ogTitle || 'Ausente',
    expectedValue: 'Presente',
    category: 'Meta Tags',
  });
  checks.push({
    label: 'OG Description',
    status: audit.ogDescription ? 'pass' : 'fail',
    currentValue: audit.ogDescription ? 'Presente' : 'Ausente',
    expectedValue: 'Presente',
    category: 'Meta Tags',
  });
  checks.push({
    label: 'OG Image',
    status: audit.ogImage ? 'pass' : 'warning',
    currentValue: audit.ogImage ? 'Presente' : 'Ausente',
    expectedValue: 'Imagen 1200x630',
    category: 'Meta Tags',
  });
  checks.push({
    label: 'Viewport Meta',
    status: audit.hasViewport ? 'pass' : 'fail',
    currentValue: audit.hasViewport ? 'Presente' : 'Ausente',
    expectedValue: 'Presente',
    category: 'Meta Tags',
  });

  // Content Structure
  checks.push({
    label: 'Etiqueta H1',
    status: audit.h1Count === 1 ? 'pass' : audit.h1Count === 0 ? 'fail' : 'warning',
    currentValue: `${audit.h1Count} encontrado(s)`,
    expectedValue: 'Exactamente 1',
    category: 'Content Structure',
  });
  checks.push({
    label: 'Etiquetas H2',
    status: audit.h2Count >= 2 ? 'pass' : audit.h2Count > 0 ? 'warning' : 'fail',
    currentValue: `${audit.h2Count} encontrado(s)`,
    expectedValue: '2+ secciones',
    category: 'Content Structure',
  });
  checks.push({
    label: 'Conteo de Palabras',
    status: audit.wordCount >= 800 ? 'pass' : audit.wordCount >= 300 ? 'warning' : 'fail',
    currentValue: `${audit.wordCount} palabras`,
    expectedValue: '800+ palabras',
    category: 'Content Structure',
  });
  checks.push({
    label: 'Imagenes con Alt',
    status: audit.imagesWithoutAlt === 0 ? 'pass' : audit.imagesWithoutAlt <= 3 ? 'warning' : 'fail',
    currentValue: `${audit.imagesWithoutAlt}/${audit.totalImages} sin alt`,
    expectedValue: '0 sin alt',
    category: 'Content Structure',
  });
  checks.push({
    label: 'Enlaces Internos',
    status: audit.internalLinks >= 5 ? 'pass' : audit.internalLinks > 0 ? 'warning' : 'fail',
    currentValue: `${audit.internalLinks} links`,
    expectedValue: '5+ links internos',
    category: 'Content Structure',
  });

  // Technical
  checks.push({
    label: 'HTTPS',
    status: audit.isHttps ? 'pass' : 'fail',
    currentValue: audit.isHttps ? 'Si' : 'No',
    expectedValue: 'Si',
    category: 'Technical',
  });
  checks.push({
    label: 'Canonical Tag',
    status: audit.hasCanonical ? 'pass' : 'fail',
    currentValue: audit.hasCanonical ? 'Presente' : 'Ausente',
    expectedValue: 'Presente',
    category: 'Technical',
  });
  checks.push({
    label: 'robots.txt',
    status: audit.hasRobotsTxt ? 'pass' : 'warning',
    currentValue: audit.hasRobotsTxt ? 'Encontrado' : 'No encontrado',
    expectedValue: 'Presente',
    category: 'Technical',
  });
  checks.push({
    label: 'Sitemap.xml',
    status: audit.hasSitemap ? 'pass' : 'fail',
    currentValue: audit.hasSitemap ? 'Encontrado' : 'No encontrado',
    expectedValue: 'Presente',
    category: 'Technical',
  });
  const hreflang = audit.hreflangTags ?? [];
  checks.push({
    label: 'Hreflang Tags',
    status: hreflang.length > 0 ? 'pass' : 'warning',
    currentValue: hreflang.length > 0 ? hreflang.join(', ') : 'Ninguno',
    expectedValue: 'es, en (si multiidioma)',
    category: 'Technical',
  });

  // Schema & Structured Data
  const sd = audit.structuredDataTypes ?? [];
  checks.push({
    label: 'JSON-LD Presente',
    status: sd.length > 0 ? 'pass' : 'fail',
    currentValue: sd.length > 0 ? `${sd.length} tipo(s)` : 'Ninguno',
    expectedValue: '3+ tipos',
    category: 'Schema & Structured Data',
  });
  const criticalSchemas = ['Organization', 'Article', 'FAQPage'];
  for (const schema of criticalSchemas) {
    const has = sd.includes(schema);
    checks.push({
      label: `Schema ${schema}`,
      status: has ? 'pass' : 'fail',
      currentValue: has ? 'Presente' : 'Ausente',
      expectedValue: 'Presente',
      category: 'Schema & Structured Data',
    });
  }

  return checks;
}

export default function AuditTab() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<SEOAuditResult | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);

  useEffect(() => {
    loadCached();
  }, []);

  const loadCached = async () => {
    try {
      const [auditSnap, vitalsSnap] = await Promise.all([
        getDoc(doc(db, DATA_PATH, 'site_data', 'latest_audit')),
        getDoc(doc(db, DATA_PATH, 'site_data', 'web_vitals')),
      ]);
      if (auditSnap.exists()) setAudit(auditSnap.data() as SEOAuditResult);
      if (vitalsSnap.exists()) setWebVitals(vitalsSnap.data() as WebVitals);
    } catch {} finally {
      setInitialLoading(false);
    }
  };

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://growth4u.io' }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setAudit(data);
      // Cache in Firestore
      await setDoc(doc(db, DATA_PATH, 'site_data', 'latest_audit'), data).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar la auditoria');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner text="Cargando datos..." />;
  }

  const checklist = audit ? buildChecklist(audit) : [];
  const categories = ['Meta Tags', 'Content Structure', 'Technical', 'Schema & Structured Data'];
  const issues = generateIssues(audit, webVitals);

  const issuesByCategory: Record<string, typeof issues> = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  const passCount = checklist.filter(c => c.status === 'pass').length;
  const failCount = checklist.filter(c => c.status === 'fail').length;
  const warnCount = checklist.filter(c => c.status === 'warning').length;

  return (
    <div className="space-y-8">
      {/* Header + Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#032149]">Auditoria SEO On-Page</h2>
          <p className="text-slate-400 text-sm mt-1">Analiza los factores on-page criticos de tu web</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analizando...' : 'Ejecutar Auditoria'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner text="Ejecutando auditoria SEO..." />}

      {audit && !loading && (
        <>
          {/* Summary Bar */}
          <div className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-[#032149]">{passCount} OK</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-[#032149]">{warnCount} Avisos</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-[#032149]">{failCount} Errores</span>
            </div>
            <div className="ml-auto text-xs text-slate-400">
              Escaneado: {new Date(audit.scannedAt).toLocaleString('es-ES')}
            </div>
          </div>

          {/* Checklist Grid by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categories.map((cat) => {
              const catIcon =
                cat === 'Meta Tags' ? <FileText className="w-4 h-4" /> :
                cat === 'Content Structure' ? <Image className="w-4 h-4" /> :
                cat === 'Technical' ? <Globe className="w-4 h-4" /> :
                <Code2 className="w-4 h-4" />;

              return (
                <div key={cat} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
                    {catIcon}
                    <h3 className="font-semibold text-[#032149] text-sm">{cat}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {checklist
                      .filter(c => c.category === cat)
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-5 py-3">
                          <StatusBadge status={item.status} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#032149]">{item.label}</p>
                            <p className="text-xs text-slate-400 truncate">
                              Actual: <span className="text-slate-600">{item.currentValue}</span>
                              {' | '}
                              Esperado: <span className="text-slate-600">{item.expectedValue}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issues Section */}
          {issues.length > 0 && (
            <div>
              <SectionHeader
                title="Issues Detectadas"
                subtitle={`${issues.length} issues encontradas ordenadas por severidad`}
              />
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                const sevIssues = issuesByCategory[sev];
                if (sevIssues.length === 0) return null;
                const sevLabels = { critical: 'Criticas', high: 'Altas', medium: 'Medias', low: 'Bajas' };
                return (
                  <div key={sev} className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                      <SeverityBadge severity={sev} />
                      {sevLabels[sev]} ({sevIssues.length})
                    </h4>
                    <div className="space-y-2">
                      {sevIssues.map((issue, i) => (
                        <IssueCard key={i} issue={issue} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
