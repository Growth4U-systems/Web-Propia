import { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Sparkles,
  Trash2,
  Pencil,
  Eye,
  X,
  Save,
  Loader2,
  Plus,
  Minus,
  Check,
  Send,
  Filter,
  ChevronDown,
  ExternalLink,
  Target,
  BarChart3,
  BookOpen
} from 'lucide-react';
import {
  getAllContentBriefs,
  createContentBrief,
  updateContentBrief,
  deleteContentBrief,
  getAllPosts,
  type ContentBrief,
  type BriefStatus,
  type KeywordSuggestion
} from '../../lib/firebase-client';
import { API_BASE } from '../../lib/api';

// ── Constants ──────────────────────────────────────────────────────────────────

const BRIEF_STATUSES: { value: BriefStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  { value: 'researched', label: 'Investigado', color: 'bg-blue-100 text-blue-700' },
  { value: 'brief_ready', label: 'Brief listo', color: 'bg-green-100 text-green-700' },
  { value: 'writing', label: 'Escribiendo', color: 'bg-amber-100 text-amber-700' },
  { value: 'published', label: 'Publicado', color: 'bg-purple-100 text-purple-700' },
];

const INTENT_COLORS: Record<string, string> = {
  informational: 'bg-blue-100 text-blue-700',
  commercial: 'bg-amber-100 text-amber-700',
  transactional: 'bg-green-100 text-green-700',
  navigational: 'bg-slate-100 text-slate-700',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const INTENT_LABELS: Record<string, string> = {
  informational: 'Informacional',
  commercial: 'Comercial',
  transactional: 'Transaccional',
  navigational: 'Navegacional',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

type Tab = 'briefs' | 'research' | 'generator';

interface BriefWithId extends ContentBrief {
  id?: string;
}

interface BlogPostRef {
  title: string;
  slug: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function KeywordBriefPage() {
  const [activeTab, setActiveTab] = useState<Tab>('briefs');
  const [briefs, setBriefs] = useState<(BriefWithId & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<BlogPostRef[]>([]);

  // ── Briefs tab state ─────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<BriefStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrief, setSelectedBrief] = useState<(BriefWithId & { id: string }) | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ContentBrief>>({});

  // ── Research tab state ───────────────────────────────────────────────────
  const [researchTopic, setResearchTopic] = useState('');
  const [researching, setResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<KeywordSuggestion[]>([]);
  const [savingResearch, setSavingResearch] = useState(false);

  // ── Generator tab state ──────────────────────────────────────────────────
  const [genMode, setGenMode] = useState<'existing' | 'manual'>('existing');
  const [genSelectedBriefId, setGenSelectedBriefId] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genPrimaryKw, setGenPrimaryKw] = useState('');
  const [genSecondaryKw, setGenSecondaryKw] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<Partial<ContentBrief> | null>(null);
  const [genInternalLinks, setGenInternalLinks] = useState<{ url: string; selected: boolean }[]>([]);
  const [savingBrief, setSavingBrief] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBriefs, allPosts] = await Promise.all([
        getAllContentBriefs(),
        getAllPosts(),
      ]);
      setBriefs(allBriefs as (BriefWithId & { id: string })[]);
      setBlogPosts(allPosts.map((p: any) => ({ title: p.title, slug: p.slug })));
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  // ── Briefs helpers ───────────────────────────────────────────────────────
  const filteredBriefs = briefs.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.topic.toLowerCase().includes(q) ||
        b.primaryKeyword.toLowerCase().includes(q) ||
        b.suggestedTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: BriefStatus) => {
    const s = BRIEF_STATUSES.find((x) => x.value === status);
    if (!s) return null;
    return <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>;
  };

  const handleDeleteBrief = async (id: string) => {
    if (!confirm('¿Eliminar este brief? Esta accion no se puede deshacer.')) return;
    await deleteContentBrief(id);
    setBriefs((prev) => prev.filter((b) => b.id !== id));
    if (selectedBrief?.id === id) {
      setShowDetailModal(false);
      setSelectedBrief(null);
    }
  };

  const handleSendToBlog = (brief: BriefWithId) => {
    localStorage.setItem('pendingBrief', JSON.stringify(brief));
    alert('Brief guardado! Ve a la pagina de Blog para crear el post.');
  };

  const openDetail = (brief: BriefWithId & { id: string }) => {
    setSelectedBrief(brief);
    setEditMode(false);
    setEditForm({});
    setShowDetailModal(true);
  };

  const startEdit = () => {
    if (!selectedBrief) return;
    setEditForm({
      topic: selectedBrief.topic,
      primaryKeyword: selectedBrief.primaryKeyword,
      secondaryKeywords: [...selectedBrief.secondaryKeywords],
      suggestedTitle: selectedBrief.suggestedTitle,
      metaDescription: selectedBrief.metaDescription,
      outline: [...selectedBrief.outline],
      targetWordCount: selectedBrief.targetWordCount,
      targetAudience: selectedBrief.targetAudience,
      contentAngle: selectedBrief.contentAngle,
      internalLinks: [...selectedBrief.internalLinks],
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!selectedBrief) return;
    setSavingBrief(true);
    try {
      await updateContentBrief(selectedBrief.id, editForm);
      await loadData();
      setEditMode(false);
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error saving edit:', err);
    }
    setSavingBrief(false);
  };

  // ── Research helpers ─────────────────────────────────────────────────────
  const handleResearch = async () => {
    if (!researchTopic.trim()) return;
    setResearching(true);
    setResearchResults([]);
    try {
      const res = await fetch(`${API_BASE}/.netlify/functions/keyword-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: researchTopic.trim() }),
      });
      const data = await res.json();
      const keywords: KeywordSuggestion[] = (data.keywords || []).map((k: any) => ({
        ...k,
        selected: false,
      }));
      setResearchResults(keywords);
    } catch (err) {
      console.error('Error researching keywords:', err);
      alert('Error al investigar keywords. Revisa la consola.');
    }
    setResearching(false);
  };

  const toggleKeywordSelected = (index: number) => {
    setResearchResults((prev) =>
      prev.map((k, i) => (i === index ? { ...k, selected: !k.selected } : k))
    );
  };

  const handleSaveResearch = async () => {
    const selected = researchResults.filter((k) => k.selected);
    if (selected.length === 0) {
      alert('Selecciona al menos una keyword.');
      return;
    }
    setSavingResearch(true);
    try {
      const primary = selected[0];
      await createContentBrief({
        topic: researchTopic.trim(),
        status: 'researched',
        keywords: researchResults,
        primaryKeyword: primary.keyword,
        secondaryKeywords: selected.slice(1).map((k) => k.keyword),
        suggestedTitle: '',
        metaDescription: '',
        outline: [],
        targetWordCount: 1000,
        targetAudience: '',
        contentAngle: '',
        competitorUrls: [],
        internalLinks: [],
        linkedBlogPostId: '',
      });
      await loadData();
      setResearchTopic('');
      setResearchResults([]);
      alert('Investigacion guardada como brief con estado "Investigado".');
    } catch (err) {
      console.error('Error saving research:', err);
    }
    setSavingResearch(false);
  };

  // ── Generator helpers ────────────────────────────────────────────────────
  const researchedBriefs = briefs.filter((b) => b.status === 'researched');

  const handleGenerate = async () => {
    let topic = '';
    let primaryKeyword = '';
    let secondaryKeywords: string[] = [];

    if (genMode === 'existing') {
      const brief = briefs.find((b) => b.id === genSelectedBriefId);
      if (!brief) {
        alert('Selecciona un brief existente.');
        return;
      }
      topic = brief.topic;
      primaryKeyword = brief.primaryKeyword;
      secondaryKeywords = brief.secondaryKeywords;
    } else {
      if (!genTopic.trim() || !genPrimaryKw.trim()) {
        alert('Completa el tema y la keyword principal.');
        return;
      }
      topic = genTopic.trim();
      primaryKeyword = genPrimaryKw.trim();
      secondaryKeywords = genSecondaryKw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    setGenerating(true);
    setGenResult(null);
    setGenInternalLinks([]);
    try {
      const existingPosts = blogPosts.map((p) => ({ title: p.title, slug: p.slug }));
      const res = await fetch(`${API_BASE}/.netlify/functions/generate-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryKeyword, secondaryKeywords, topic, existingPosts }),
      });
      const data = await res.json();
      setGenResult({
        suggestedTitle: data.suggestedTitle || '',
        metaDescription: data.metaDescription || '',
        outline: data.outline || [],
        targetWordCount: data.targetWordCount || 1000,
        targetAudience: data.targetAudience || '',
        contentAngle: data.contentAngle || '',
      });
      setGenInternalLinks(
        (data.internalLinks || []).map((url: string) => ({ url, selected: true }))
      );
    } catch (err) {
      console.error('Error generating brief:', err);
      alert('Error al generar el brief. Revisa la consola.');
    }
    setGenerating(false);
  };

  const handleSaveGeneratedBrief = async () => {
    if (!genResult) return;
    setSavingBrief(true);
    try {
      const selectedLinks = genInternalLinks.filter((l) => l.selected).map((l) => l.url);

      if (genMode === 'existing' && genSelectedBriefId) {
        await updateContentBrief(genSelectedBriefId, {
          ...genResult,
          internalLinks: selectedLinks,
          status: 'brief_ready',
        });
      } else {
        await createContentBrief({
          topic: genTopic.trim(),
          status: 'brief_ready',
          keywords: [],
          primaryKeyword: genPrimaryKw.trim(),
          secondaryKeywords: genSecondaryKw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          suggestedTitle: genResult.suggestedTitle || '',
          metaDescription: genResult.metaDescription || '',
          outline: genResult.outline || [],
          targetWordCount: genResult.targetWordCount || 1000,
          targetAudience: genResult.targetAudience || '',
          contentAngle: genResult.contentAngle || '',
          competitorUrls: [],
          internalLinks: selectedLinks,
          linkedBlogPostId: '',
        });
      }
      await loadData();
      setGenResult(null);
      setGenInternalLinks([]);
      setGenTopic('');
      setGenPrimaryKw('');
      setGenSecondaryKw('');
      setGenSelectedBriefId('');
      alert('Brief guardado con estado "Brief listo".');
    } catch (err) {
      console.error('Error saving brief:', err);
    }
    setSavingBrief(false);
  };

  // ── Format date ──────────────────────────────────────────────────────────
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'briefs', label: 'Briefs', icon: FileText },
    { key: 'research', label: 'Investigacion', icon: Search },
    { key: 'generator', label: 'Generador', icon: Sparkles },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keywords y Briefs</h1>
          <p className="text-slate-500 mt-1">Investigacion de keywords y generacion de briefs de contenido</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Target className="w-4 h-4" />
          {briefs.length} briefs totales
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === tab.key
                  ? 'bg-[#6351d5] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#6351d5]" />
          <span className="ml-2 text-slate-500">Cargando...</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: BRIEFS
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'briefs' && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as BriefStatus | 'all')}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                  >
                    <option value="all">Todos los estados</option>
                    {BRIEF_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por tema, keyword o titulo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                    />
                  </div>
                </div>
                <span className="text-sm text-slate-500">
                  {filteredBriefs.length} resultado{filteredBriefs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {filteredBriefs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No hay briefs {filterStatus !== 'all' ? 'con ese estado' : 'aun'}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Tema</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Keyword principal</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Estado</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Titulo sugerido</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Creado</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredBriefs.map((brief) => (
                        <tr key={brief.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[180px] truncate">
                            {brief.topic || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">
                            {brief.primaryKeyword || '—'}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(brief.status)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                            {brief.suggestedTitle || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(brief.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openDetail(brief)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#6351d5] hover:bg-slate-100 transition"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {brief.status === 'brief_ready' && (
                                <button
                                  onClick={() => handleSendToBlog(brief)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition"
                                  title="Enviar a Blog"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteBrief(brief.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: RESEARCH
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'research' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#6351d5]" />
                  Investigacion de Keywords
                </h2>
                <textarea
                  rows={4}
                  placeholder="Ej: Growth marketing para fintechs B2B, estrategias de reduccion de CAC..."
                  value={researchTopic}
                  onChange={(e) => setResearchTopic(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30 resize-none"
                />
                <button
                  onClick={handleResearch}
                  disabled={researching || !researchTopic.trim()}
                  className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                >
                  {researching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {researching ? 'Investigando...' : 'Investigar Keywords'}
                </button>
              </div>

              {/* Research results */}
              {researchResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {researchResults.length} keywords encontradas
                    </h3>
                    <span className="text-xs text-slate-500">
                      {researchResults.filter((k) => k.selected).length} seleccionadas
                    </span>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-10 px-4 py-3"></th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Keyword</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Intencion</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Dificultad</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Relevancia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {researchResults.map((kw, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 transition cursor-pointer ${kw.selected ? 'bg-purple-50/50' : ''}`}
                          onClick={() => toggleKeywordSelected(idx)}
                        >
                          <td className="px-4 py-3">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                kw.selected
                                  ? 'bg-[#6351d5] border-[#6351d5]'
                                  : 'border-slate-300'
                              }`}
                            >
                              {kw.selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{kw.keyword}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${INTENT_COLORS[kw.intent] || ''}`}>
                              {INTENT_LABELS[kw.intent] || kw.intent}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${DIFFICULTY_COLORS[kw.difficulty] || ''}`}>
                              {DIFFICULTY_LABELS[kw.difficulty] || kw.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#6351d5] rounded-full transition-all"
                                  style={{ width: `${(kw.relevance / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-5 text-right">{kw.relevance}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={handleSaveResearch}
                      disabled={savingResearch || researchResults.filter((k) => k.selected).length === 0}
                      className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                    >
                      {savingResearch ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar investigacion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: GENERATOR
          ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'generator' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#6351d5]" />
                  Generador de Briefs
                </h2>

                {/* Mode toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenMode('existing')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      genMode === 'existing'
                        ? 'bg-[#6351d5] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Desde brief existente
                  </button>
                  <button
                    onClick={() => setGenMode('manual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      genMode === 'manual'
                        ? 'bg-[#6351d5] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Entrada manual
                  </button>
                </div>

                {genMode === 'existing' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Seleccionar brief investigado
                    </label>
                    <select
                      value={genSelectedBriefId}
                      onChange={(e) => setGenSelectedBriefId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                    >
                      <option value="">— Seleccionar —</option>
                      {researchedBriefs.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.topic} ({b.primaryKeyword})
                        </option>
                      ))}
                    </select>
                    {researchedBriefs.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        No hay briefs con estado &quot;Investigado&quot;. Usa la pestana de Investigacion primero.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tema</label>
                      <input
                        type="text"
                        placeholder="Ej: Growth marketing para fintechs"
                        value={genTopic}
                        onChange={(e) => setGenTopic(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Keyword principal</label>
                      <input
                        type="text"
                        placeholder="Ej: growth marketing fintech"
                        value={genPrimaryKw}
                        onChange={(e) => setGenPrimaryKw(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Keywords secundarias (separadas por coma)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CAC fintech, growth hacking, adquisicion usuarios"
                        value={genSecondaryKw}
                        onChange={(e) => setGenSecondaryKw(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {generating ? 'Generando brief...' : 'Generar Brief'}
                </button>
              </div>

              {/* Generated result */}
              {genResult && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    Brief generado
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Titulo sugerido</label>
                      <input
                        type="text"
                        value={genResult.suggestedTitle || ''}
                        onChange={(e) => setGenResult({ ...genResult, suggestedTitle: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Meta descripcion{' '}
                        <span
                          className={`text-xs ${
                            (genResult.metaDescription?.length || 0) > 160
                              ? 'text-red-500'
                              : 'text-slate-400'
                          }`}
                        >
                          ({genResult.metaDescription?.length || 0}/155)
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={genResult.metaDescription || ''}
                        onChange={(e) => setGenResult({ ...genResult, metaDescription: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Palabras objetivo</label>
                      <input
                        type="number"
                        value={genResult.targetWordCount || 1000}
                        onChange={(e) =>
                          setGenResult({ ...genResult, targetWordCount: parseInt(e.target.value) || 1000 })
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Audiencia objetivo</label>
                      <input
                        type="text"
                        value={genResult.targetAudience || ''}
                        onChange={(e) => setGenResult({ ...genResult, targetAudience: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Angulo del contenido</label>
                      <textarea
                        rows={3}
                        value={genResult.contentAngle || ''}
                        onChange={(e) => setGenResult({ ...genResult, contentAngle: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30 resize-none"
                      />
                    </div>
                  </div>

                  {/* Outline */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Outline (secciones H2)
                    </label>
                    <div className="space-y-2">
                      {(genResult.outline || []).map((section, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-6 text-right font-mono">{idx + 1}.</span>
                          <input
                            type="text"
                            value={section}
                            onChange={(e) => {
                              const updated = [...(genResult.outline || [])];
                              updated[idx] = e.target.value;
                              setGenResult({ ...genResult, outline: updated });
                            }}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                          />
                          <button
                            onClick={() => {
                              const updated = (genResult.outline || []).filter((_, i) => i !== idx);
                              setGenResult({ ...genResult, outline: updated });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setGenResult({ ...genResult, outline: [...(genResult.outline || []), ''] })
                        }
                        className="flex items-center gap-1 text-sm text-[#6351d5] hover:text-[#4a3cb0] transition"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar seccion
                      </button>
                    </div>
                  </div>

                  {/* Internal links */}
                  {genInternalLinks.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Enlaces internos sugeridos
                      </label>
                      <div className="space-y-2">
                        {genInternalLinks.map((link, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition"
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                link.selected
                                  ? 'bg-[#6351d5] border-[#6351d5]'
                                  : 'border-slate-300'
                              }`}
                              onClick={() => {
                                const updated = [...genInternalLinks];
                                updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                                setGenInternalLinks(updated);
                              }}
                            >
                              {link.selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{link.url}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveGeneratedBrief}
                      disabled={savingBrief}
                      className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                    >
                      {savingBrief ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar Brief
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DETAIL MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedBrief && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editMode ? 'Editar Brief' : 'Detalle del Brief'}
                </h2>
                <div className="mt-1">{getStatusBadge(selectedBrief.status)}</div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditMode(false);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {editMode ? (
                // ── Edit mode ──────────────────────────────────────────────
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tema</label>
                    <input
                      type="text"
                      value={editForm.topic || ''}
                      onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Keyword principal</label>
                      <input
                        type="text"
                        value={editForm.primaryKeyword || ''}
                        onChange={(e) => setEditForm({ ...editForm, primaryKeyword: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Palabras objetivo</label>
                      <input
                        type="number"
                        value={editForm.targetWordCount || 1000}
                        onChange={(e) =>
                          setEditForm({ ...editForm, targetWordCount: parseInt(e.target.value) || 1000 })
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Titulo sugerido</label>
                    <input
                      type="text"
                      value={editForm.suggestedTitle || ''}
                      onChange={(e) => setEditForm({ ...editForm, suggestedTitle: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta descripcion</label>
                    <textarea
                      rows={2}
                      value={editForm.metaDescription || ''}
                      onChange={(e) => setEditForm({ ...editForm, metaDescription: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Audiencia objetivo</label>
                    <input
                      type="text"
                      value={editForm.targetAudience || ''}
                      onChange={(e) => setEditForm({ ...editForm, targetAudience: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Angulo del contenido</label>
                    <textarea
                      rows={3}
                      value={editForm.contentAngle || ''}
                      onChange={(e) => setEditForm({ ...editForm, contentAngle: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Outline</label>
                    <div className="space-y-2">
                      {(editForm.outline || []).map((section, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-6 text-right font-mono">{idx + 1}.</span>
                          <input
                            type="text"
                            value={section}
                            onChange={(e) => {
                              const updated = [...(editForm.outline || [])];
                              updated[idx] = e.target.value;
                              setEditForm({ ...editForm, outline: updated });
                            }}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6351d5]/30"
                          />
                          <button
                            onClick={() => {
                              const updated = (editForm.outline || []).filter((_, i) => i !== idx);
                              setEditForm({ ...editForm, outline: updated });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setEditForm({ ...editForm, outline: [...(editForm.outline || []), ''] })
                        }
                        className="flex items-center gap-1 text-sm text-[#6351d5] hover:text-[#4a3cb0] transition"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar seccion
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // ── Read-only mode ─────────────────────────────────────────
                <>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase">Tema</span>
                    <p className="text-sm text-slate-900 mt-0.5">{selectedBrief.topic || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Keyword principal</span>
                      <p className="text-sm text-slate-900 mt-0.5">{selectedBrief.primaryKeyword || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Palabras objetivo</span>
                      <p className="text-sm text-slate-900 mt-0.5">{selectedBrief.targetWordCount || 1000}</p>
                    </div>
                  </div>

                  {selectedBrief.suggestedTitle && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Titulo sugerido</span>
                      <p className="text-sm text-slate-900 mt-0.5 font-medium">{selectedBrief.suggestedTitle}</p>
                    </div>
                  )}

                  {selectedBrief.metaDescription && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Meta descripcion</span>
                      <p className="text-sm text-slate-600 mt-0.5">{selectedBrief.metaDescription}</p>
                    </div>
                  )}

                  {selectedBrief.targetAudience && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Audiencia objetivo</span>
                      <p className="text-sm text-slate-600 mt-0.5">{selectedBrief.targetAudience}</p>
                    </div>
                  )}

                  {selectedBrief.contentAngle && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Angulo del contenido</span>
                      <p className="text-sm text-slate-600 mt-0.5">{selectedBrief.contentAngle}</p>
                    </div>
                  )}

                  {/* Keywords as chips */}
                  {selectedBrief.keywords.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Keywords</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedBrief.keywords
                          .filter((k) => k.selected)
                          .map((kw, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                            >
                              <Target className="w-3 h-3" />
                              {kw.keyword}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedBrief.secondaryKeywords.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Keywords secundarias</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedBrief.secondaryKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outline as numbered list */}
                  {selectedBrief.outline.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Outline</span>
                      <ol className="mt-2 space-y-1.5">
                        {selectedBrief.outline.map((section, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-xs text-slate-400 font-mono mt-0.5 w-5 text-right flex-shrink-0">
                              {idx + 1}.
                            </span>
                            {section}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Internal links */}
                  {selectedBrief.internalLinks.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-400 uppercase">Enlaces internos</span>
                      <ul className="mt-2 space-y-1">
                        {selectedBrief.internalLinks.map((url, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-[#6351d5]">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{url}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    Creado: {formatDate(selectedBrief.createdAt)} | Actualizado: {formatDate(selectedBrief.updatedAt)}
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditMode(false);
                }}
                className="text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={savingBrief}
                      className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                    >
                      {savingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEdit}
                      className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    {selectedBrief.status === 'brief_ready' && (
                      <button
                        onClick={() => handleSendToBlog(selectedBrief)}
                        className="bg-[#6351d5] text-white hover:bg-[#4a3cb0] rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
                      >
                        <Send className="w-4 h-4" />
                        Enviar a Blog
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
