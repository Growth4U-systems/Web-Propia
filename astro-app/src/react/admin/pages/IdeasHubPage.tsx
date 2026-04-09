import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Check,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Twitter,
  Linkedin,
  Mail,
  FileText,
  Plus,
  Filter,
  Zap,
  Newspaper,
  X,
} from 'lucide-react';
import {
  getAllContentIdeas,
  createContentIdea,
  updateContentIdea,
  deleteContentIdea,
  type ContentIdea,
} from '../../../lib/firebase-client';

type Tab = 'overview' | 'ideas';
type StatusFilter = 'all' | ContentIdea['status'];
type PlatformFilter = 'all' | 'linkedin' | 'twitter' | 'newsletter' | 'blog';
type PriorityFilter = 'all' | ContentIdea['priority'];

interface SourceCounts {
  x: { creators: number };
  li: { creators: number };
  news: { articles: number };
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-purple-100 text-purple-700',
  draft: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  twitter: Twitter,
  newsletter: Mail,
  blog: FileText,
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'text-[#0077B5] bg-[#0077B5]/10',
  twitter: 'text-[#1DA1F2] bg-[#1DA1F2]/10',
  newsletter: 'text-[#6351d5] bg-[#6351d5]/10',
  blog: 'text-[#3ecda5] bg-[#3ecda5]/10',
};

const FORMAT_LABELS: Record<string, string> = {
  post: 'Post',
  thread: 'Thread',
  carousel: 'Carrusel',
  article: 'Artículo',
  'newsletter-section': 'Newsletter',
};

export default function IdeasHubPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [ideas, setIdeas] = useState<(ContentIdea & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceCounts | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Generate state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [sourceToggles, setSourceToggles] = useState({ x: true, li: true, news: true });
  const [customPrompt, setCustomPrompt] = useState('');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  // Expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [allIdeas] = await Promise.all([getAllContentIdeas()]);
      setIdeas(allIdeas);
    } catch (err) {
      console.error('Error loading ideas:', err);
    }
    setLoading(false);
  }

  async function loadSources() {
    setSourcesLoading(true);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch-sources' }),
      });
      const data = await res.json();
      setSources(data);
    } catch {
      setSources(null);
    }
    setSourcesLoading(false);
  }

  useEffect(() => { loadSources(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', sources: sourceToggles, customPrompt }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Error del servidor (${res.status}): ${text.slice(0, 150)}`); }
      if (data.error) throw new Error(data.error);

      const batchId = Date.now().toString();
      const newIdeas = data.ideas || [];

      for (const idea of newIdeas) {
        await createContentIdea({
          topic: idea.topic || '',
          angle: idea.angle || '',
          platforms: idea.platforms || [],
          format: idea.format || 'post',
          priority: idea.priority || 'medium',
          status: 'idea',
          sourceType: idea.sourceType || 'mixed',
          sourceInspiration: idea.sourceInspiration || '',
          generatedBy: 'ai',
          batchId,
          notes: '',
        });
      }

      setLastGenerated(new Date().toLocaleString('es-ES'));
      await loadData();
      setTab('ideas');
    } catch (err: any) {
      setGenError(err.message || 'Error generando ideas');
    }
    setGenerating(false);
  }

  async function handleStatusChange(id: string, status: ContentIdea['status'], assignedTo?: string) {
    await updateContentIdea(id, { status, ...(assignedTo ? { assignedTo } : {}) });
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status, ...(assignedTo ? { assignedTo } : {}) } : i));
  }

  async function handleSaveNotes(id: string) {
    await updateContentIdea(id, { notes: notesText });
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, notes: notesText } : i));
    setEditingNotes(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta idea?')) return;
    await deleteContentIdea(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }

  async function handleAddManual() {
    const id = await createContentIdea({
      topic: '',
      angle: '',
      platforms: ['linkedin'],
      format: 'post',
      priority: 'medium',
      status: 'idea',
      sourceType: 'mixed',
      sourceInspiration: 'Idea manual',
      generatedBy: 'manual',
      notes: '',
    });
    await loadData();
    setExpandedId(id);
    setTab('ideas');
  }

  const filtered = ideas.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (platformFilter !== 'all' && !i.platforms.includes(platformFilter)) return false;
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
    return true;
  });

  const ideasByStatus = {
    idea: ideas.filter(i => i.status === 'idea').length,
    draft: ideas.filter(i => i.status === 'draft').length,
    assigned: ideas.filter(i => i.status === 'assigned').length,
    done: ideas.filter(i => i.status === 'done').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[#032149]">Ideas Hub</h1>
          <span className="text-xs px-3 py-1 rounded-full bg-[#6351d5]/10 text-[#6351d5] font-medium">Content Intelligence</span>
        </div>
        <p className="text-slate-400 mt-1">Detecta tendencias de X, LinkedIn y noticias. Genera ideas con Claude.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">X Creators</span>
            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
          </div>
          <span className="text-xl font-bold text-[#032149]">{sources?.x?.creators ?? '—'}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">LI Creators</span>
            <Linkedin className="w-4 h-4 text-[#0077B5]" />
          </div>
          <span className="text-xl font-bold text-[#032149]">{sources?.li?.creators ?? '—'}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Noticias</span>
            <Newspaper className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold text-[#032149]">{sources?.news?.articles ?? '—'}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Ideas nuevas</span>
            <Lightbulb className="w-4 h-4 text-[#6351d5]" />
          </div>
          <span className="text-xl font-bold text-[#032149]">{ideasByStatus.idea}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Total ideas</span>
            <Zap className="w-4 h-4 text-[#3ecda5]" />
          </div>
          <span className="text-xl font-bold text-[#032149]">{ideas.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {([['overview', 'Overview', Sparkles], ['ideas', 'Ideas', Lightbulb]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-[#6351d5] text-[#6351d5]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />
            {label}
            {key === 'ideas' && ideas.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#6351d5]/10 text-[#6351d5]' : 'bg-slate-100 text-slate-400'}`}>{ideas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Generate panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#032149] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6351d5]" />
                Generar ideas con Claude
              </h3>
              {lastGenerated && (
                <span className="text-xs text-slate-400">Última generación: {lastGenerated}</span>
              )}
            </div>

            {/* Source toggles */}
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'x' as const, label: 'X/Twitter', icon: Twitter, color: '#1DA1F2', count: sources?.x?.creators },
                { key: 'li' as const, label: 'LinkedIn', icon: Linkedin, color: '#0077B5', count: sources?.li?.creators },
                { key: 'news' as const, label: 'Noticias', icon: Newspaper, color: '#F59E0B', count: sources?.news?.articles },
              ].map(s => {
                const Icon = s.icon;
                const active = sourceToggles[s.key];
                return (
                  <button key={s.key} onClick={() => setSourceToggles(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${active ? 'border-[#6351d5] bg-[#6351d5]/5 text-[#032149]' : 'border-slate-200 text-slate-400 opacity-60'}`}>
                    <Icon className="w-4 h-4" style={{ color: active ? s.color : undefined }} />
                    {s.label}
                    {s.count !== undefined && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom prompt */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contexto adicional (opcional)</label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2}
                placeholder="Ej: Esta semana enfocarnos en contenido sobre GEO para fintechs..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
            </div>

            {genError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {genError}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button onClick={handleGenerate} disabled={generating || !Object.values(sourceToggles).some(Boolean)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6351d5] to-[#45b6f7] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-[#6351d5]/20">
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {generating ? 'Analizando señales...' : 'Generar ideas con Claude'}
              </button>
              <button onClick={handleAddManual}
                className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Plus className="w-4 h-4" /> Idea manual
              </button>
            </div>
          </div>

          {/* Pipeline overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#032149] mb-4">Pipeline de ideas</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Ideas', count: ideasByStatus.idea, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                { label: 'Drafts', count: ideasByStatus.draft, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Asignadas', count: ideasByStatus.assigned, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Hechas', count: ideasByStatus.done, color: 'bg-green-50 border-green-200 text-green-700' },
              ].map(s => (
                <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
                  <div className="text-2xl font-bold">{s.count}</div>
                  <div className="text-xs font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== IDEAS TAB ==================== */}
      {tab === 'ideas' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value as PlatformFilter)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]">
              <option value="all">Todas las plataformas</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter/X</option>
              <option value="newsletter">Newsletter</option>
              <option value="blog">Blog</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]">
              <option value="all">Todos los estados</option>
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="assigned">Asignada</option>
              <option value="done">Hecha</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]">
              <option value="all">Toda prioridad</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} ideas</span>
          </div>

          {/* Ideas list */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No hay ideas todavía</p>
              <p className="text-sm text-slate-400 mt-1">Genera ideas desde la pestaña Overview</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(idea => {
                const isExpanded = expandedId === idea.id;
                const isEditingNotes = editingNotes === idea.id;
                return (
                  <div key={idea.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                    {/* Collapsed header */}
                    <button onClick={() => setExpandedId(isExpanded ? null : idea.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      {/* Priority */}
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${PRIORITY_COLORS[idea.priority]}`}>
                        {idea.priority}
                      </span>
                      {/* Topic */}
                      <span className="flex-1 font-semibold text-sm text-[#032149] truncate">
                        {idea.topic || '(sin título)'}
                      </span>
                      {/* Platform tags */}
                      <div className="flex gap-1 shrink-0">
                        {idea.platforms.map(p => {
                          const Icon = PLATFORM_ICONS[p];
                          return Icon ? (
                            <span key={p} className={`p-1 rounded ${PLATFORM_COLORS[p]}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                          ) : null;
                        })}
                      </div>
                      {/* Status */}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_COLORS[idea.status]}`}>
                        {idea.status}
                      </span>
                      {/* Expand */}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
                        {/* Editable topic for manual ideas */}
                        {idea.generatedBy === 'manual' && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Tema</label>
                            <input value={idea.topic}
                              onChange={e => {
                                const val = e.target.value;
                                setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, topic: val } : i));
                              }}
                              onBlur={() => updateContentIdea(idea.id, { topic: idea.topic })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] font-semibold focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                          </div>
                        )}

                        {/* Angle */}
                        <div className="mt-3">
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Ángulo</label>
                          <p className="text-sm text-[#032149]">{idea.angle || '—'}</p>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Formato: <strong className="text-[#032149]">{FORMAT_LABELS[idea.format] || idea.format}</strong></span>
                          <span>Fuente: <strong className="text-[#032149]">{idea.sourceType}</strong></span>
                          {idea.assignedTo && <span>Asignado: <strong className="text-[#032149]">{idea.assignedTo}</strong></span>}
                          {idea.createdAt && <span>{new Date(idea.createdAt).toLocaleDateString('es-ES')}</span>}
                        </div>

                        {/* Source inspiration */}
                        {idea.sourceInspiration && (
                          <div className="bg-slate-50 rounded-lg px-4 py-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Inspiración</p>
                            <p className="text-sm text-slate-600">{idea.sourceInspiration}</p>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-500">Notas</label>
                            {!isEditingNotes && (
                              <button onClick={() => { setEditingNotes(idea.id); setNotesText(idea.notes || ''); }}
                                className="text-xs text-[#6351d5] hover:text-[#4a3db8] font-medium flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Editar
                              </button>
                            )}
                          </div>
                          {isEditingNotes ? (
                            <div className="space-y-2">
                              <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveNotes(idea.id)}
                                  className="text-xs px-3 py-1.5 bg-[#6351d5] text-white rounded-lg font-medium">Guardar</button>
                                <button onClick={() => setEditingNotes(null)}
                                  className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">{idea.notes || '(sin notas)'}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {idea.status === 'idea' && (
                            <button onClick={() => handleStatusChange(idea.id, 'draft')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                              <ArrowRight className="w-3 h-3" /> Draft
                            </button>
                          )}
                          {(idea.status === 'idea' || idea.status === 'draft') && (
                            <>
                              <button onClick={() => handleStatusChange(idea.id, 'assigned', 'linkedin')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 transition-colors">
                                <Linkedin className="w-3 h-3" /> LinkedIn
                              </button>
                              <button onClick={() => handleStatusChange(idea.id, 'assigned', 'twitter')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors">
                                <Twitter className="w-3 h-3" /> X/Twitter
                              </button>
                              <button onClick={() => handleStatusChange(idea.id, 'assigned', 'newsletter')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#6351d5]/10 text-[#6351d5] hover:bg-[#6351d5]/20 transition-colors">
                                <Mail className="w-3 h-3" /> Newsletter
                              </button>
                            </>
                          )}
                          {idea.status === 'assigned' && (
                            <button onClick={() => handleStatusChange(idea.id, 'done')}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                              <Check className="w-3 h-3" /> Marcar hecha
                            </button>
                          )}
                          <button onClick={() => handleDelete(idea.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
