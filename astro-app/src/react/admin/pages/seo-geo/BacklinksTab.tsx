import { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Globe,
  Server,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ArrowUpRight,
  Shield,
  AlertTriangle,
  Download,
  FileText,
  Target,
  Mail,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  Ban,
  Clock,
  Edit3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { DataForSEOMetrics, DomainMetric, GuestPostProspect, GuestPostStatus, BacklinkAction } from './types';
import { DATA_PATH, guestPostStatusLabels, guestPostStatusColors, actionCategoryLabels } from './types';
import { MetricCard, LoadingSpinner, ErrorBanner, SectionHeader, StatusBadge } from './shared';

const sources = ['Moz', 'Ahrefs', 'SEMrush', 'Majestic'];
const GP_COLLECTION = `${DATA_PATH}/guest_posts`;
const ACTIONS_COLLECTION = `${DATA_PATH}/backlink_actions`;

type SubTab = 'metrics' | 'action-plan' | 'guest-posting';

// ============================================
// Action Plan Generator — based on current metrics
// ============================================
function generateActionPlan(
  dataForSEO: DataForSEOMetrics | null,
  metrics: DomainMetric[],
  prospects: GuestPostProspect[],
): Omit<BacklinkAction, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] {
  const actions: Omit<BacklinkAction, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [];
  const latestMetric = metrics[0];
  const da = latestMetric?.domainAuthority ?? dataForSEO?.domainRank ?? 0;
  const refDomains = dataForSEO?.referringDomains ?? latestMetric?.referringDomains ?? 0;
  const brokenBL = dataForSEO?.brokenBacklinks ?? 0;
  const publishedCount = prospects.filter(p => p.status === 'published').length;

  // DA < 20: critical need for authority
  if (da < 20) {
    actions.push({
      title: 'Conseguir primeros backlinks de calidad (DA < 20)',
      description: 'Con un DA bajo, la prioridad es construir una base de enlaces de dominios relevantes. Empieza con directorios de calidad y guest posts en nichos accesibles.',
      category: 'directories',
      priority: 'high',
      steps: [
        'Registrarse en directorios de agencias marketing: Clutch, GoodFirms, SortList, Agency Spotter',
        'Crear perfil completo en Product Hunt, Crunchbase, AngelList',
        'Buscar listados "mejores agencias growth marketing Espana" y solicitar inclusion',
        'Identificar 10 blogs de marketing/fintech en espanol con DA 20-40 para guest posting',
        'Crear un asset linkable (estudio de caso, infografia, herramienta gratuita)',
      ],
      expectedImpact: 'Subir DA de 0-20 a 15-25 en 3-6 meses',
    });
  }

  // DA 20-40: growth phase
  if (da >= 20 && da < 40) {
    actions.push({
      title: 'Escalar autoridad con guest posting estrategico (DA 20-40)',
      description: 'Ya tienes base. Ahora enfocate en conseguir enlaces de sitios con DA 30-60 en tu nicho. Prioriza calidad sobre cantidad.',
      category: 'guest_posting',
      priority: 'high',
      steps: [
        'Identificar 20 publicaciones de marketing/fintech con DA 30-60',
        'Preparar 5 pitch templates personalizados por vertical (fintech, SaaS, ecommerce)',
        'Proponer articulos con datos originales o estudios de caso propios',
        'Apuntar a 2-4 guest posts publicados por mes',
        'Diversificar anchor text: marca, URL, keyword, generico (40/25/25/10)',
      ],
      expectedImpact: 'Subir DA a 35-45 en 6-12 meses',
    });
  }

  // Broken backlinks
  if (brokenBL > 0) {
    actions.push({
      title: `Recuperar ${brokenBL} backlinks rotos`,
      description: `Tienes ${brokenBL} backlinks apuntando a paginas que no existen (404). Cada uno es autoridad perdida que puedes recuperar con redirects.`,
      category: 'broken_links',
      priority: brokenBL > 5 ? 'high' : 'medium',
      steps: [
        'Exportar lista de backlinks rotos desde DataForSEO o Ahrefs',
        'Identificar las URLs originales y el contenido al que apuntaban',
        'Crear redirects 301 en netlify.toml para las URLs rotas mas importantes',
        'Si el contenido ya no existe, crear contenido nuevo relevante',
        'Contactar webmasters para actualizar enlaces a URLs correctas',
      ],
      expectedImpact: `Recuperar autoridad de ${brokenBL} enlaces perdidos`,
    });
  }

  // Low referring domains
  if (refDomains < 50) {
    actions.push({
      title: 'Diversificar dominios de referencia',
      description: `Solo ${refDomains} dominios distintos enlazan a tu web. Google valora la diversidad de fuentes. Necesitas al menos 50-100 para un DA competitivo.`,
      category: 'outreach',
      priority: 'high',
      steps: [
        'Analizar competidores para encontrar sitios que les enlazan pero no a ti',
        'Preparar contenido unico que justifique un enlace (datos, estudios, herramientas)',
        'Hacer outreach a periodistas y bloggers de marketing en Espana',
        'Participar como experto en roundup posts y entrevistas',
        'Crear alianzas con herramientas complementarias (CRMs, analytics, etc.)',
      ],
      expectedImpact: 'Aumentar dominios de referencia a 50+ en 6 meses',
    });
  }

  // Content-based link building
  actions.push({
    title: 'Crear contenido linkable (link magnets)',
    description: 'El contenido que atrae enlaces de forma natural: estudios originales, herramientas gratuitas, frameworks propios, infografias con datos del sector.',
    category: 'content',
    priority: 'medium',
    steps: [
      'Crear un estudio anual del estado del growth marketing en Espana/LATAM',
      'Desarrollar una calculadora gratuita (CAC, LTV, payback period)',
      'Publicar benchmarks de metricas de growth por industria',
      'Crear infografias compartibles con datos originales',
      'Escribir guias definitivas (3000+ palabras) sobre temas del nicho',
    ],
    expectedImpact: 'Generar 5-15 backlinks naturales por pieza de contenido',
  });

  // Guest posting pipeline empty
  if (publishedCount < 3) {
    actions.push({
      title: 'Lanzar programa de guest posting sistematico',
      description: 'El guest posting es la estrategia mas controlable para link building. Necesitas un flujo constante de prospectos, outreach y publicaciones.',
      category: 'guest_posting',
      priority: 'high',
      steps: [
        'Crear lista de 50 blogs target usando operadores de busqueda ("escribe para nosotros" + marketing)',
        'Preparar un media kit con bio, temas de expertise, y ejemplos de articulos',
        'Enviar 10 pitches por semana con templates personalizados',
        'Medir tasa de respuesta y ajustar el pitch (objetivo: >15% respuesta)',
        'Documentar todo en el pipeline de Guest Posting de esta herramienta',
      ],
      expectedImpact: 'Publicar 2-4 guest posts/mes con DA 25+',
    });
  }

  // DoFollow ratio
  if (dataForSEO && dataForSEO.backlinks > 0) {
    const doFollowRatio = dataForSEO.dofollowBacklinks / dataForSEO.backlinks;
    if (doFollowRatio < 0.5) {
      actions.push({
        title: 'Mejorar ratio DoFollow (actualmente ' + Math.round(doFollowRatio * 100) + '%)',
        description: 'Menos del 50% de tus backlinks son dofollow. Los enlaces nofollow transmiten menos autoridad. Enfoca esfuerzos en conseguir enlaces dofollow.',
        category: 'outreach',
        priority: 'medium',
        steps: [
          'Priorizar guest posts en blogs que usen dofollow (verificar antes de escribir)',
          'Evitar directorios que solo dan nofollow',
          'Solicitar actualizacion de enlaces nofollow a dofollow cuando sea posible',
          'Crear contenido tan valioso que los sitios enlacen de forma natural (dofollow)',
        ],
        expectedImpact: 'Subir ratio dofollow a >60%',
      });
    }
  }

  return actions;
}

// ============================================
// Markdown Generator
// ============================================
function generateMarkdown(
  dataForSEO: DataForSEOMetrics | null,
  metrics: DomainMetric[],
  actions: BacklinkAction[],
  prospects: GuestPostProspect[],
): string {
  const now = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  let md = `# Plan de Mejora de Backlinks — Growth4U\n`;
  md += `> Generado el ${now}\n\n`;

  // Current metrics
  md += `## Estado Actual\n\n`;
  if (dataForSEO) {
    md += `| Metrica | Valor |\n|---------|-------|\n`;
    md += `| Domain Rank | ${dataForSEO.domainRank} |\n`;
    md += `| Backlinks Totales | ${dataForSEO.backlinks.toLocaleString()} |\n`;
    md += `| Dominios de Referencia | ${dataForSEO.referringDomains.toLocaleString()} |\n`;
    md += `| DoFollow | ${dataForSEO.dofollowBacklinks.toLocaleString()} |\n`;
    md += `| NoFollow | ${dataForSEO.nofollowBacklinks.toLocaleString()} |\n`;
    md += `| Backlinks Rotos | ${dataForSEO.brokenBacklinks.toLocaleString()} |\n`;
    md += `| Ultima sync | ${new Date(dataForSEO.date).toLocaleDateString('es-ES')} |\n\n`;
  }
  if (metrics.length > 0) {
    const latest = metrics[0];
    md += `**DA Manual (${latest.source}):** ${latest.domainAuthority} | Backlinks: ${latest.backlinks.toLocaleString()} | Ref. Domains: ${latest.referringDomains.toLocaleString()}\n\n`;
  }

  // Action plan
  md += `## Plan de Accion\n\n`;
  const statusEmoji: Record<string, string> = {
    open: '[ ]',
    in_progress: '[~]',
    resolved: '[x]',
    dismissed: '[-]',
  };
  const byPriority = { high: [] as BacklinkAction[], medium: [] as BacklinkAction[], low: [] as BacklinkAction[] };
  actions.forEach(a => {
    if (a.status !== 'dismissed') byPriority[a.priority]?.push(a);
  });

  for (const [priority, items] of Object.entries(byPriority)) {
    if (items.length === 0) continue;
    const label = priority === 'high' ? 'Alta Prioridad' : priority === 'medium' ? 'Media Prioridad' : 'Baja Prioridad';
    md += `### ${label}\n\n`;
    for (const action of items) {
      md += `#### ${statusEmoji[action.status]} ${action.title}\n`;
      md += `*${actionCategoryLabels[action.category]}* — Impacto: ${action.expectedImpact}\n\n`;
      md += `${action.description}\n\n`;
      md += `**Pasos:**\n`;
      action.steps.forEach((s, i) => {
        md += `${i + 1}. ${s}\n`;
      });
      md += `\n`;
    }
  }

  // Guest posting pipeline
  const activeProspects = prospects.filter(p => p.status !== 'rejected');
  if (activeProspects.length > 0) {
    md += `## Pipeline de Guest Posting\n\n`;
    md += `| Dominio | DA | Estado | Tema | Anchor Text |\n`;
    md += `|---------|---:|--------|------|-------------|\n`;
    for (const p of activeProspects) {
      md += `| ${p.domain} | ${p.domainAuthority} | ${guestPostStatusLabels[p.status]} | ${p.topic || '—'} | ${p.anchorText || '—'} |\n`;
    }
    md += `\n`;
  }

  // Published posts
  const published = prospects.filter(p => p.status === 'published');
  if (published.length > 0) {
    md += `### Guest Posts Publicados\n\n`;
    for (const p of published) {
      md += `- **${p.domain}** (DA ${p.domainAuthority}) — ${p.topic}${p.publishedUrl ? ` → [Ver post](${p.publishedUrl})` : ''}\n`;
    }
    md += `\n`;
  }

  md += `---\n*Plan generado automaticamente por Growth4U Admin. Revisa y ajusta segun necesidad.*\n`;
  return md;
}

// ============================================
// Main Component
// ============================================
export default function BacklinksTab() {
  const [subTab, setSubTab] = useState<SubTab>('metrics');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataForSEO, setDataForSEO] = useState<DataForSEOMetrics | null>(null);

  // Manual domain metrics
  const [metrics, setMetrics] = useState<DomainMetric[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    domainAuthority: 0,
    backlinks: 0,
    referringDomains: 0,
    source: 'Moz',
    notes: '',
  });

  // Guest posting
  const [prospects, setProspects] = useState<GuestPostProspect[]>([]);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState<GuestPostProspect | null>(null);
  const [newProspect, setNewProspect] = useState({
    domain: '',
    contactName: '',
    contactEmail: '',
    domainAuthority: 0,
    status: 'prospecting' as GuestPostStatus,
    topic: '',
    anchorText: '',
    targetUrl: 'https://growth4u.io',
    publishedUrl: '',
    notes: '',
  });

  // Action plan
  const [savedActions, setSavedActions] = useState<BacklinkAction[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const [dfsSnap, metricsSnap, prospectsSnap, actionsSnap] = await Promise.all([
        getDoc(doc(db, DATA_PATH, 'dataforseo_metrics', 'latest')),
        getDocs(query(collection(db, DATA_PATH, 'domain_metrics'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, GP_COLLECTION), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, ACTIONS_COLLECTION), orderBy('createdAt', 'desc'))),
      ]);
      if (dfsSnap.exists()) setDataForSEO(dfsSnap.data() as DataForSEOMetrics);
      setMetrics(metricsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DomainMetric[]);
      setProspects(prospectsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as GuestPostProspect[]);
      setSavedActions(actionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as BacklinkAction[]);
    } catch {} finally {
      setInitialLoading(false);
    }
  };

  // --- DataForSEO sync ---
  const syncDataForSEO = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sync-backlinks', { method: 'GET' });
      const data = await res.json();
      if (!res.ok) throw new Error(`Error ${res.status}: ${data?.error || res.statusText}`);
      setDataForSEO(data);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar metricas de backlinks.');
    } finally {
      setLoading(false);
    }
  };

  // --- Manual metrics ---
  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, DATA_PATH, 'domain_metrics'), {
        ...newMetric,
        createdAt: new Date().toISOString(),
      });
      setNewMetric({ date: new Date().toISOString().split('T')[0], domainAuthority: 0, backlinks: 0, referringDomains: 0, source: 'Moz', notes: '' });
      setShowAddForm(false);
      loadInitial();
    } catch {
      alert('Error al guardar metrica');
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (!confirm('Eliminar esta metrica?')) return;
    try {
      await deleteDoc(doc(db, DATA_PATH, 'domain_metrics', id));
      loadInitial();
    } catch {}
  };

  // --- Guest posting ---
  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    try {
      if (editingProspect) {
        await updateDoc(doc(db, GP_COLLECTION, editingProspect.id), { ...newProspect, updatedAt: now });
      } else {
        await addDoc(collection(db, GP_COLLECTION), { ...newProspect, createdAt: now, updatedAt: now });
      }
      resetProspectForm();
      loadInitial();
    } catch {
      alert('Error al guardar prospecto');
    }
  };

  const resetProspectForm = () => {
    setNewProspect({ domain: '', contactName: '', contactEmail: '', domainAuthority: 0, status: 'prospecting', topic: '', anchorText: '', targetUrl: 'https://growth4u.io', publishedUrl: '', notes: '' });
    setShowProspectForm(false);
    setEditingProspect(null);
  };

  const handleEditProspect = (p: GuestPostProspect) => {
    setEditingProspect(p);
    setNewProspect({
      domain: p.domain,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      domainAuthority: p.domainAuthority,
      status: p.status,
      topic: p.topic,
      anchorText: p.anchorText,
      targetUrl: p.targetUrl,
      publishedUrl: p.publishedUrl,
      notes: p.notes,
    });
    setShowProspectForm(true);
  };

  const handleDeleteProspect = async (id: string) => {
    if (!confirm('Eliminar este prospecto?')) return;
    try {
      await deleteDoc(doc(db, GP_COLLECTION, id));
      loadInitial();
    } catch {}
  };

  const handleProspectStatusChange = async (id: string, status: GuestPostStatus) => {
    try {
      await updateDoc(doc(db, GP_COLLECTION, id), { status, updatedAt: new Date().toISOString() });
      loadInitial();
    } catch {}
  };

  // --- Action plan ---
  const generatedActions = useMemo(
    () => generateActionPlan(dataForSEO, metrics, prospects),
    [dataForSEO, metrics, prospects],
  );

  const handleSaveActions = async () => {
    const now = new Date().toISOString();
    try {
      // Only save actions that don't already exist (by title)
      const existingTitles = new Set(savedActions.map(a => a.title));
      for (const action of generatedActions) {
        if (!existingTitles.has(action.title)) {
          await addDoc(collection(db, ACTIONS_COLLECTION), {
            ...action,
            status: 'open',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      loadInitial();
    } catch {
      alert('Error al guardar acciones');
    }
  };

  const handleActionStatusChange = async (id: string, status: BacklinkAction['status']) => {
    try {
      await updateDoc(doc(db, ACTIONS_COLLECTION, id), { status, updatedAt: new Date().toISOString() });
      setSavedActions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {}
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm('Eliminar esta accion?')) return;
    try {
      await deleteDoc(doc(db, ACTIONS_COLLECTION, id));
      setSavedActions(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  // --- Download markdown ---
  const handleDownloadMarkdown = () => {
    const md = generateMarkdown(dataForSEO, metrics, savedActions.length > 0 ? savedActions : generatedActions.map((a, i) => ({
      ...a, id: `gen-${i}`, status: 'open' as const, createdAt: '', updatedAt: '',
    })), prospects);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-backlinks-growth4u-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (initialLoading) return <LoadingSpinner text="Cargando datos..." />;

  // Pipeline stats
  const pipelineStats = {
    total: prospects.length,
    prospecting: prospects.filter(p => p.status === 'prospecting').length,
    outreach: prospects.filter(p => p.status === 'outreach').length,
    negotiating: prospects.filter(p => p.status === 'negotiating').length,
    writing: prospects.filter(p => p.status === 'writing').length,
    published: prospects.filter(p => p.status === 'published').length,
    rejected: prospects.filter(p => p.status === 'rejected').length,
  };
  const conversionRate = pipelineStats.total > 0 ? Math.round((pipelineStats.published / pipelineStats.total) * 100) : 0;

  const subTabs: { key: SubTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'metrics', label: 'Metricas', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'action-plan', label: 'Plan de Accion', icon: <Target className="w-4 h-4" />, count: savedActions.filter(a => a.status === 'open' || a.status === 'in_progress').length },
    { key: 'guest-posting', label: 'Guest Posting', icon: <FileText className="w-4 h-4" />, count: prospects.filter(p => p.status !== 'published' && p.status !== 'rejected').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#032149]">Backlinks & Link Building</h2>
          <p className="text-slate-400 text-sm mt-1">Metricas, plan de accion y pipeline de guest posting</p>
        </div>
        <button
          onClick={handleDownloadMarkdown}
          className="flex items-center gap-2 px-4 py-2 bg-[#032149] hover:bg-[#032149]/90 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar Plan (.md)
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              subTab === t.key
                ? 'bg-white text-[#032149] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-[#6351d5] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== METRICS TAB ==================== */}
      {subTab === 'metrics' && (
        <div className="space-y-8">
          {/* DataForSEO Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Backlinks & Domain Authority" subtitle="Datos via Moz + OpenPageRank (gratis) + metricas manuales" />
              <button
                onClick={syncDataForSEO}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Sincronizar Metricas'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-medium">Error al sincronizar</p>
                  <p className="text-red-600 text-xs mt-1">{error}</p>
                  <p className="text-red-500 text-xs mt-2">
                    Configura <code className="bg-red-100 px-1 rounded">OPENPAGERANK_API_KEY</code> (gratis en domcop.com/openpagerank) y/o{' '}
                    <code className="bg-red-100 px-1 rounded">MOZ_API_TOKEN</code> (gratis en moz.com/products/api) en Netlify.
                  </p>
                </div>
              </div>
            )}
            {loading && <LoadingSpinner text="Sincronizando Moz + OpenPageRank..." />}

            {dataForSEO && !loading && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <MetricCard label="Domain Rank" value={dataForSEO.domainRank} icon={<Shield className="w-5 h-5 text-[#6351d5]" />} />
                  <MetricCard label="Backlinks Totales" value={dataForSEO.backlinks.toLocaleString()} icon={<Link2 className="w-5 h-5 text-[#45b6f7]" />} />
                  <MetricCard label="Dominios de Referencia" value={dataForSEO.referringDomains.toLocaleString()} icon={<Globe className="w-5 h-5 text-green-500" />} />
                  <MetricCard label="IPs de Referencia" value={dataForSEO.referringIps.toLocaleString()} icon={<Server className="w-5 h-5 text-amber-500" />} />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">DoFollow</p>
                    <p className="text-lg font-bold text-green-600">{dataForSEO.dofollowBacklinks.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">NoFollow</p>
                    <p className="text-lg font-bold text-slate-500">{dataForSEO.nofollowBacklinks.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Paginas de Referencia</p>
                    <p className="text-lg font-bold text-[#032149]">{dataForSEO.referringPages.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Backlinks Rotos</p>
                    <p className={`text-lg font-bold ${dataForSEO.brokenBacklinks > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {dataForSEO.brokenBacklinks.toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Ultima sincronizacion: {new Date(dataForSEO.date).toLocaleString('es-ES')}
                  {dataForSEO.source && ` | Fuente: ${dataForSEO.source}`}
                </p>
              </>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Manual Domain Metrics */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Metricas de Autoridad Manual" subtitle="Registra datos de DA desde herramientas externas" />
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Anadir Datos
              </button>
            </div>

            {metrics.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No hay metricas registradas</p>
                <p className="text-slate-400 text-sm mt-1">Anade datos de DA desde Moz, Ahrefs, SEMrush o Majestic</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">DA</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Backlinks</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ref. Domains</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fuente</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Notas</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-sm text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`text-sm font-bold ${m.domainAuthority >= 40 ? 'text-green-600' : m.domainAuthority >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                              {m.domainAuthority}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600 text-right">{m.backlinks.toLocaleString()}</td>
                          <td className="px-5 py-3 text-sm text-slate-600 text-right">{m.referringDomains.toLocaleString()}</td>
                          <td className="px-5 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{m.source}</span></td>
                          <td className="px-5 py-3 text-sm text-slate-400 max-w-[150px] truncate">{m.notes || '—'}</td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleDeleteMetric(m.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ACTION PLAN TAB ==================== */}
      {subTab === 'action-plan' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Plan de Accion de Link Building"
              subtitle="Acciones recomendadas basadas en tus metricas actuales"
              icon={Target}
            />
            <div className="flex gap-2">
              {savedActions.length === 0 && generatedActions.length > 0 && (
                <button
                  onClick={handleSaveActions}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Generar Plan
                </button>
              )}
              {savedActions.length > 0 && (
                <button
                  onClick={handleSaveActions}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
              )}
            </div>
          </div>

          {/* Action plan stats */}
          {savedActions.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">{savedActions.filter(a => a.status === 'open').length}</p>
                <p className="text-xs text-slate-400">Pendientes</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{savedActions.filter(a => a.status === 'in_progress').length}</p>
                <p className="text-xs text-blue-500">En Progreso</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{savedActions.filter(a => a.status === 'resolved').length}</p>
                <p className="text-xs text-green-500">Completadas</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-400">{savedActions.filter(a => a.status === 'dismissed').length}</p>
                <p className="text-xs text-slate-400">Descartadas</p>
              </div>
            </div>
          )}

          {/* Actions list */}
          {(savedActions.length > 0 ? savedActions : generatedActions.map((a, i) => ({
            ...a, id: `preview-${i}`, status: 'open' as const, createdAt: '', updatedAt: '',
          }))).map(action => (
            <div
              key={action.id}
              className={`bg-white border rounded-xl transition-all ${
                action.status === 'resolved' ? 'border-green-200 opacity-70' :
                action.status === 'dismissed' ? 'border-slate-200 opacity-50' :
                'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Priority badge */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    action.priority === 'high' ? 'bg-red-100 text-red-600' :
                    action.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[#032149] text-sm">{action.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {actionCategoryLabels[action.category]}
                      </span>
                      <span className="text-xs text-[#6351d5] font-semibold">{action.expectedImpact}</span>
                      {action.status !== 'open' && <StatusBadge status={action.status} />}
                    </div>

                    {expandedAction === action.id && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-slate-600">{action.description}</p>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm text-[#032149] font-medium mb-2">Pasos:</p>
                          <ol className="list-decimal list-inside space-y-1.5">
                            {action.steps.map((step, i) => (
                              <li key={i} className="text-xs text-slate-600 leading-relaxed">{step}</li>
                            ))}
                          </ol>
                        </div>

                        {/* Status buttons */}
                        {savedActions.some(a => a.id === action.id) && (
                          <div className="flex flex-wrap gap-2">
                            {action.status !== 'in_progress' && (
                              <button onClick={() => handleActionStatusChange(action.id, 'in_progress')}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <PlayCircle className="w-3.5 h-3.5" /> En progreso
                              </button>
                            )}
                            {action.status !== 'resolved' && (
                              <button onClick={() => handleActionStatusChange(action.id, 'resolved')}
                                className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                              </button>
                            )}
                            {action.status !== 'dismissed' && (
                              <button onClick={() => handleActionStatusChange(action.id, 'dismissed')}
                                className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Ban className="w-3.5 h-3.5" /> Descartar
                              </button>
                            )}
                            {action.status !== 'open' && (
                              <button onClick={() => handleActionStatusChange(action.id, 'open')}
                                className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Clock className="w-3.5 h-3.5" /> Reabrir
                              </button>
                            )}
                            <button onClick={() => handleDeleteAction(action.id)}
                              className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors ml-auto">
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                    className="p-1.5 text-slate-400 hover:text-[#6351d5] hover:bg-[#6351d5]/5 rounded-lg transition-colors"
                  >
                    {expandedAction === action.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {savedActions.length === 0 && generatedActions.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No hay acciones generadas</p>
              <p className="text-slate-400 text-sm mt-1">Sincroniza DataForSEO o anade metricas manuales para generar el plan</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== GUEST POSTING TAB ==================== */}
      {subTab === 'guest-posting' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Pipeline de Guest Posting"
              subtitle="Gestiona prospectos, outreach y publicaciones"
              icon={FileText}
            />
            <button
              onClick={() => { resetProspectForm(); setShowProspectForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Prospecto
            </button>
          </div>

          {/* Pipeline stats */}
          <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
            {([
              { key: 'prospecting', color: 'bg-slate-50 border-slate-200' },
              { key: 'outreach', color: 'bg-blue-50 border-blue-200' },
              { key: 'negotiating', color: 'bg-amber-50 border-amber-200' },
              { key: 'writing', color: 'bg-purple-50 border-purple-200' },
              { key: 'published', color: 'bg-green-50 border-green-200' },
              { key: 'rejected', color: 'bg-red-50 border-red-200' },
              { key: 'conversion', color: 'bg-[#6351d5]/5 border-[#6351d5]/20' },
            ] as const).map(s => (
              <div key={s.key} className={`${s.color} border rounded-lg p-2.5 text-center`}>
                <p className="text-lg font-bold text-[#032149]">
                  {s.key === 'conversion' ? `${conversionRate}%` : pipelineStats[s.key as keyof typeof pipelineStats]}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-medium">
                  {s.key === 'conversion' ? 'Conversion' : guestPostStatusLabels[s.key as GuestPostStatus]}
                </p>
              </div>
            ))}
          </div>

          {/* Prospects table */}
          {prospects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No hay prospectos en el pipeline</p>
              <p className="text-slate-400 text-sm mt-1">Anade blogs y publicaciones objetivo para guest posting</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dominio</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">DA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tema</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Anchor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contacto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prospects.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[#032149]">{p.domain}</span>
                            {p.publishedUrl && (
                              <a href={p.publishedUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[#6351d5] hover:text-[#5242b8]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${p.domainAuthority >= 40 ? 'text-green-600' : p.domainAuthority >= 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {p.domainAuthority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            onChange={e => handleProspectStatusChange(p.id, e.target.value as GuestPostStatus)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${guestPostStatusColors[p.status]}`}
                          >
                            {Object.entries(guestPostStatusLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{p.topic || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 max-w-[120px] truncate">{p.anchorText || '—'}</td>
                        <td className="px-4 py-3">
                          {p.contactEmail ? (
                            <a href={`mailto:${p.contactEmail}`} className="text-xs text-[#6351d5] hover:underline">{p.contactName || p.contactEmail}</a>
                          ) : (
                            <span className="text-xs text-slate-400">{p.contactName || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEditProspect(p)}
                              className="p-1.5 text-slate-400 hover:text-[#6351d5] transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteProspect(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== ADD METRIC MODAL ==================== */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Anadir Datos de Autoridad</h2>
            <form onSubmit={handleAddMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
                <input type="date" value={newMetric.date}
                  onChange={e => setNewMetric({ ...newMetric, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Domain Authority (0-100)</label>
                <input type="number" min={0} max={100} value={newMetric.domainAuthority}
                  onChange={e => setNewMetric({ ...newMetric, domainAuthority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Backlinks</label>
                <input type="number" min={0} value={newMetric.backlinks}
                  onChange={e => setNewMetric({ ...newMetric, backlinks: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dominios de Referencia</label>
                <input type="number" min={0} value={newMetric.referringDomains}
                  onChange={e => setNewMetric({ ...newMetric, referringDomains: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fuente</label>
                <select value={newMetric.source}
                  onChange={e => setNewMetric({ ...newMetric, source: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]">
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <input type="text" value={newMetric.notes}
                  onChange={e => setNewMetric({ ...newMetric, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Observaciones" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors">Cancelar</button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD/EDIT PROSPECT MODAL ==================== */}
      {showProspectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#032149] mb-4">
              {editingProspect ? 'Editar Prospecto' : 'Nuevo Prospecto de Guest Post'}
            </h2>
            <form onSubmit={handleAddProspect} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Dominio *</label>
                  <input type="text" value={newProspect.domain}
                    onChange={e => setNewProspect({ ...newProspect, domain: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="blog.ejemplo.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">DA estimado</label>
                  <input type="number" min={0} max={100} value={newProspect.domainAuthority}
                    onChange={e => setNewProspect({ ...newProspect, domainAuthority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contacto</label>
                  <input type="text" value={newProspect.contactName}
                    onChange={e => setNewProspect({ ...newProspect, contactName: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="Nombre del editor" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={newProspect.contactEmail}
                    onChange={e => setNewProspect({ ...newProspect, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="editor@ejemplo.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                <select value={newProspect.status}
                  onChange={e => setNewProspect({ ...newProspect, status: e.target.value as GuestPostStatus })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]">
                  {Object.entries(guestPostStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tema propuesto</label>
                <input type="text" value={newProspect.topic}
                  onChange={e => setNewProspect({ ...newProspect, topic: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Ej: Growth marketing para fintechs en 2026" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Anchor text</label>
                  <input type="text" value={newProspect.anchorText}
                    onChange={e => setNewProspect({ ...newProspect, anchorText: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="growth marketing" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">URL destino</label>
                  <input type="url" value={newProspect.targetUrl}
                    onChange={e => setNewProspect({ ...newProspect, targetUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="https://growth4u.io/..." />
                </div>
              </div>

              {(newProspect.status === 'published' || editingProspect?.status === 'published') && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">URL publicada</label>
                  <input type="url" value={newProspect.publishedUrl}
                    onChange={e => setNewProspect({ ...newProspect, publishedUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="https://blog.ejemplo.com/tu-guest-post" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas</label>
                <textarea value={newProspect.notes} rows={2}
                  onChange={e => setNewProspect({ ...newProspect, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5] resize-none"
                  placeholder="Observaciones, requisitos del blog, etc." />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetProspectForm}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors">Cancelar</button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> {editingProspect ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
