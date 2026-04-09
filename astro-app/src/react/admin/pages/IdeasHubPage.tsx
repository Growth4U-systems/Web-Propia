import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb, Sparkles, Loader2, ChevronDown, ChevronUp, Trash2,
  Edit3, Check, ArrowRight, AlertTriangle, Twitter, Linkedin, Mail,
  FileText, Plus, Filter, Zap, Newspaper, X, Settings, ToggleLeft,
  ToggleRight, ExternalLink,
} from 'lucide-react';
import {
  Camera,
} from 'lucide-react';
import {
  getAllContentIdeas, createContentIdea, updateContentIdea, deleteContentIdea,
  getAllXCreators, createXCreator, deleteXCreator, updateXCreator,
  getAllLICreators, createLICreator, deleteLICreator, updateLICreator,
  getAllNewsSources, createNewsSource, deleteNewsSource, updateNewsSource,
  createLIContentPost, createXPost,
  type ContentIdea, type XCreator, type LICreator, type NewsSource,
} from '../../../lib/firebase-client';

type Tab = 'overview' | 'ideas' | 'sources';
type StatusFilter = 'all' | ContentIdea['status'];
type PlatformFilter = 'all' | 'linkedin' | 'twitter' | 'newsletter' | 'blog';
type PriorityFilter = 'all' | ContentIdea['priority'];

interface SourceCounts { x: { creators: number }; li: { creators: number }; news: { articles: number }; }

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-purple-100 text-purple-700', draft: 'bg-amber-100 text-amber-700',
  assigned: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700',
};
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin, twitter: Twitter, instagram: Camera, newsletter: Mail, blog: FileText,
};
const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'text-[#0077B5] bg-[#0077B5]/10', twitter: 'text-[#1DA1F2] bg-[#1DA1F2]/10',
  instagram: 'text-[#E4405F] bg-[#E4405F]/10', newsletter: 'text-[#6351d5] bg-[#6351d5]/10',
  blog: 'text-[#3ecda5] bg-[#3ecda5]/10',
};
const FORMAT_LABELS: Record<string, string> = {
  post: 'Post', thread: 'Thread', carousel: 'Carrusel', article: 'Artículo', 'newsletter-section': 'Newsletter',
};

const X_CATEGORIES = ['Growth', 'Founder', 'SEO', 'AI', 'VC'];
const LI_CATEGORIES = ['Growth', 'Founder', 'VC'];
const LI_CATEGORY_COLORS: Record<string, string> = {
  Growth: 'bg-green-50 text-green-600', Founder: 'bg-blue-50 text-blue-600', VC: 'bg-purple-50 text-purple-600',
};

export default function IdeasHubPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [ideas, setIdeas] = useState<(ContentIdea & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceCounts | null>(null);

  // Generate
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [sourceToggles, setSourceToggles] = useState({ x: true, li: true, news: true });
  const [customPrompt, setCustomPrompt] = useState('');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // Sources tab state
  const [xCreators, setXCreators] = useState<(XCreator & { id: string })[]>([]);
  const [liCreators, setLiCreators] = useState<(LICreator & { id: string })[]>([]);
  const [newsSources, setNewsSources] = useState<(NewsSource & { id: string })[]>([]);
  const [sourcesTab, setSourcesTab] = useState<'x' | 'li' | 'news'>('x');
  const [newXHandle, setNewXHandle] = useState('');
  const [newXCategory, setNewXCategory] = useState('Growth');
  const [newLIName, setNewLIName] = useState('');
  const [newLIUrl, setNewLIUrl] = useState('');
  const [newLICategory, setNewLICategory] = useState('Growth');
  const [newNewsName, setNewNewsName] = useState('');
  const [newNewsQuery, setNewNewsQuery] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [allIdeas, xc, lic, ns] = await Promise.all([
        getAllContentIdeas(), getAllXCreators(), getAllLICreators(), getAllNewsSources(),
      ]);
      setIdeas(allIdeas);
      setXCreators(xc);
      setLiCreators(lic);
      setNewsSources(ns);
      setSources({
        x: { creators: xc.filter(c => c.active).length },
        li: { creators: lic.filter((c: any) => c.active).length },
        news: { articles: ns.filter(s => s.active).length * 8 },
      });
    } catch (err) { console.error('Error loading data:', err); }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true); setGenError('');
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', sources: sourceToggles, customPrompt }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`Error del servidor (${res.status}): ${text.slice(0, 150)}`); }
      if (data.error) throw new Error(data.error);
      const batchId = Date.now().toString();
      for (const idea of (data.ideas || [])) {
        await createContentIdea({
          topic: idea.topic || '', angle: idea.angle || '', platforms: idea.platforms || [],
          format: idea.format || 'post', priority: idea.priority || 'medium', status: 'idea',
          sourceType: idea.sourceType || 'mixed', sourceInspiration: idea.sourceInspiration || '',
          sourceUrl: idea.sourceUrl || '',
          generatedBy: 'ai', batchId, notes: '',
        });
      }
      setLastGenerated(new Date().toLocaleString('es-ES'));
      await loadData(); setTab('ideas');
    } catch (err: any) { setGenError(err.message || 'Error generando ideas'); }
    setGenerating(false);
  }

  // ---- Idea → Content (create drafts in selected channels) ----
  const [sendingIdea, setSendingIdea] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Record<string, Set<string>>>({});

  function toggleChannel(ideaId: string, channel: string) {
    setSelectedChannels(prev => {
      const current = new Set(prev[ideaId] || []);
      current.has(channel) ? current.delete(channel) : current.add(channel);
      return { ...prev, [ideaId]: current };
    });
  }

  async function sendToChannels(idea: ContentIdea & { id: string }) {
    const channels = selectedChannels[idea.id];
    if (!channels || channels.size === 0) return;
    setSendingIdea(idea.id);
    const channelList = Array.from(channels);

    try {
      for (const channel of channelList) {
        if (channel === 'linkedin') {
          // Generate caption via existing API
          let body = idea.angle;
          try {
            const res = await fetch('/api/generate-caption', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: idea.topic, excerpt: idea.angle, platform: 'linkedin' }),
            });
            const data = await res.json();
            if (data.caption) body = data.caption;
          } catch {}
          await createLIContentPost({
            format: idea.format === 'carousel' ? 'carousel' : 'text',
            title: idea.topic, body,
            slides: idea.format === 'carousel' ? [{ title: '', body: '' }, { title: '', body: '' }, { title: '', body: '' }] : [],
            author: 'philippe', status: 'draft', hook: '', cta: '', tags: ['ideas-hub'],
          });
        } else if (channel === 'twitter') {
          // Generate tweet via existing API
          let draft = '';
          try {
            const res = await fetch('/api/generate-caption', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: idea.topic, excerpt: idea.angle, platform: 'twitter' }),
            });
            const data = await res.json();
            if (data.caption) draft = data.caption;
          } catch {}
          await createXPost({
            topic: idea.topic, angle: idea.angle,
            format: idea.format === 'thread' ? 'thread' : 'tweet',
            draft, threadSlides: [], inspiration: idea.sourceInspiration,
            language: 'es', status: 'draft', scheduledDate: '', scheduledTime: '',
          });
        }
        // instagram, newsletter, blog — just mark assigned, content created in their sections
      }

      await updateContentIdea(idea.id, { status: 'assigned', assignedTo: channelList.join(', ') });
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: 'assigned', assignedTo: channelList.join(', ') } : i));
      setSelectedChannels(prev => ({ ...prev, [idea.id]: new Set() }));

      // Navigate to first channel
      const routes: Record<string, string> = {
        linkedin: '/admin/linkedin/', twitter: '/admin/twitter/',
        instagram: '/admin/instagram/', newsletter: '/admin/newsletter/', blog: '/admin/blog/',
      };
      if (routes[channelList[0]]) navigate(routes[channelList[0]]);
    } catch (err) {
      console.error('Error sending to channels:', err);
    }
    setSendingIdea(null);
  }

  async function handleStatusChange(id: string, status: ContentIdea['status']) {
    await updateContentIdea(id, { status });
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
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
      topic: '', angle: '', platforms: ['linkedin'], format: 'post', priority: 'medium',
      status: 'idea', sourceType: 'mixed', sourceInspiration: 'Idea manual', generatedBy: 'manual', notes: '',
    });
    await loadData(); setExpandedId(id); setTab('ideas');
  }

  // ---- Source management ----
  async function addXCreator() {
    const handle = newXHandle.replace('@', '').trim();
    if (!handle || xCreators.some(c => c.handle.toLowerCase() === handle.toLowerCase())) return;
    await createXCreator({ handle, name: '', category: newXCategory, notes: '', active: true });
    setNewXHandle(''); await loadData();
  }
  async function addLICreator() {
    if (!newLIName.trim()) return;
    await createLICreator({ name: newLIName, linkedinUrl: newLIUrl, category: newLICategory, lastPostDate: '', lastCommentDate: '', commentCount: 0, notes: '', active: true });
    setNewLIName(''); setNewLIUrl(''); await loadData();
  }
  async function addNewsSource() {
    if (!newNewsQuery.trim()) return;
    await createNewsSource({ name: newNewsName || newNewsQuery, query: newNewsQuery, active: true });
    setNewNewsName(''); setNewNewsQuery(''); await loadData();
  }

  const filtered = ideas.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (platformFilter !== 'all' && !i.platforms.includes(platformFilter)) return false;
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
    return true;
  });
  const ideasByStatus = {
    idea: ideas.filter(i => i.status === 'idea').length, draft: ideas.filter(i => i.status === 'draft').length,
    assigned: ideas.filter(i => i.status === 'assigned').length, done: ideas.filter(i => i.status === 'done').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" /></div>;

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
        {[
          { label: 'X Creators', val: sources?.x?.creators ?? '—', icon: Twitter, color: 'text-[#1DA1F2]' },
          { label: 'LI Creators', val: sources?.li?.creators ?? '—', icon: Linkedin, color: 'text-[#0077B5]' },
          { label: 'News queries', val: newsSources.filter(s => s.active).length, icon: Newspaper, color: 'text-amber-500' },
          { label: 'Ideas nuevas', val: ideasByStatus.idea, icon: Lightbulb, color: 'text-[#6351d5]' },
          { label: 'Total ideas', val: ideas.length, icon: Zap, color: 'text-[#3ecda5]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <span className="text-xl font-bold text-[#032149]">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {([['overview', 'Overview', Sparkles], ['ideas', 'Ideas', Lightbulb], ['sources', 'Fuentes', Settings]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#032149] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#6351d5]" /> Generar ideas con Claude</h3>
              {lastGenerated && <span className="text-xs text-slate-400">Última: {lastGenerated}</span>}
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'x' as const, label: 'X/Twitter', icon: Twitter, color: '#1DA1F2', count: xCreators.filter(c => c.active).length },
                { key: 'li' as const, label: 'LinkedIn', icon: Linkedin, color: '#0077B5', count: liCreators.filter((c: any) => c.active).length },
                { key: 'news' as const, label: 'Noticias', icon: Newspaper, color: '#F59E0B', count: newsSources.filter(s => s.active).length },
              ].map(s => {
                const Icon = s.icon; const active = sourceToggles[s.key];
                return (
                  <button key={s.key} onClick={() => setSourceToggles(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${active ? 'border-[#6351d5] bg-[#6351d5]/5 text-[#032149]' : 'border-slate-200 text-slate-400 opacity-60'}`}>
                    <Icon className="w-4 h-4" style={{ color: active ? s.color : undefined }} />
                    {s.label}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.count}</span>
                  </button>
                );
              })}
            </div>
            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder="Contexto adicional (opcional)..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
            {genError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {genError}</div>}
            <div className="flex items-center gap-4">
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6351d5] to-[#45b6f7] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[#6351d5]/20">
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {generating ? 'Analizando señales...' : 'Generar ideas con Claude'}
              </button>
              <button onClick={handleAddManual} className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Plus className="w-4 h-4" /> Idea manual
              </button>
            </div>
          </div>
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
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value as PlatformFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="all">Todas plataformas</option><option value="linkedin">LinkedIn</option><option value="twitter">X</option><option value="instagram">Instagram</option><option value="newsletter">Newsletter</option><option value="blog">Blog</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="all">Todos estados</option><option value="idea">Idea</option><option value="draft">Draft</option><option value="assigned">Asignada</option><option value="done">Hecha</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="all">Toda prioridad</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} ideas</span>
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No hay ideas todavía</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(idea => {
                const isExpanded = expandedId === idea.id;
                return (
                  <div key={idea.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                    <button onClick={() => setExpandedId(isExpanded ? null : idea.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${PRIORITY_COLORS[idea.priority]}`}>{idea.priority}</span>
                      <span className="flex-1 font-semibold text-sm text-[#032149] truncate">{idea.topic || '(sin título)'}</span>
                      <div className="flex gap-1 shrink-0">
                        {idea.platforms.map(p => { const Icon = PLATFORM_ICONS[p]; return Icon ? <span key={p} className={`p-1 rounded ${PLATFORM_COLORS[p]}`}><Icon className="w-3.5 h-3.5" /></span> : null; })}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_COLORS[idea.status]}`}>{idea.status}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
                        {idea.generatedBy === 'manual' && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Tema</label>
                            <input value={idea.topic} onChange={e => { const v = e.target.value; setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, topic: v } : i)); }}
                              onBlur={() => updateContentIdea(idea.id, { topic: idea.topic })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                          </div>
                        )}
                        <div className="mt-3"><label className="text-xs font-medium text-slate-500 mb-1 block">Ángulo</label><p className="text-sm text-[#032149]">{idea.angle || '—'}</p></div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Formato: <strong className="text-[#032149]">{FORMAT_LABELS[idea.format] || idea.format}</strong></span>
                          <span>Fuente: <strong className="text-[#032149]">{idea.sourceType}</strong></span>
                          {idea.assignedTo && <span>Asignado: <strong className="text-[#032149]">{idea.assignedTo}</strong></span>}
                        </div>
                        {idea.sourceInspiration && (
                          <div className="bg-slate-50 rounded-lg px-4 py-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Inspiración</p>
                            <p className="text-sm text-slate-600">{idea.sourceInspiration}</p>
                            {idea.sourceUrl && (
                              <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#6351d5] hover:text-[#4a3db8] mt-2 font-medium">
                                <ExternalLink className="w-3 h-3" /> Ver fuente original
                              </a>
                            )}
                          </div>
                        )}
                        {idea.createdAt && (
                          <p className="text-xs text-slate-400">{new Date(idea.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-500">Notas</label>
                            {editingNotes !== idea.id && <button onClick={() => { setEditingNotes(idea.id); setNotesText(idea.notes || ''); }} className="text-xs text-[#6351d5] font-medium flex items-center gap-1"><Edit3 className="w-3 h-3" /> Editar</button>}
                          </div>
                          {editingNotes === idea.id ? (
                            <div className="space-y-2">
                              <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveNotes(idea.id)} className="text-xs px-3 py-1.5 bg-[#6351d5] text-white rounded-lg font-medium">Guardar</button>
                                <button onClick={() => setEditingNotes(null)} className="text-xs px-3 py-1.5 text-slate-500">Cancelar</button>
                              </div>
                            </div>
                          ) : <p className="text-sm text-slate-500">{idea.notes || '(sin notas)'}</p>}
                        </div>
                        {/* Actions — Multiselect channels + create content */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          {(idea.status === 'idea' || idea.status === 'draft') && (
                            <>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Crear contenido en:</p>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { ch: 'linkedin', label: 'LinkedIn', icon: Linkedin, bg: '#0077B5' },
                                  { ch: 'twitter', label: 'X / Twitter', icon: Twitter, bg: '#1DA1F2' },
                                  { ch: 'instagram', label: 'Instagram', icon: Camera, bg: '#E4405F' },
                                  { ch: 'newsletter', label: 'Newsletter', icon: Mail, bg: '#6351d5' },
                                  { ch: 'blog', label: 'Blog', icon: FileText, bg: '#3ecda5' },
                                ].map(({ ch, label, icon: Icon, bg }) => {
                                  const selected = selectedChannels[idea.id]?.has(ch);
                                  return (
                                    <button key={ch} onClick={() => toggleChannel(idea.id, ch)}
                                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                                        selected
                                          ? 'text-white border-transparent'
                                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                      }`}
                                      style={selected ? { backgroundColor: bg, borderColor: bg } : undefined}
                                    >
                                      <Icon className="w-3.5 h-3.5" /> {label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => sendToChannels(idea)}
                                  disabled={!selectedChannels[idea.id]?.size || sendingIdea === idea.id}
                                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#6351d5] to-[#45b6f7] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
                                  {sendingIdea === idea.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {sendingIdea === idea.id ? 'Creando...' : `Crear contenido (${selectedChannels[idea.id]?.size || 0})`}
                                </button>
                                <button onClick={() => handleDelete(idea.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 ml-auto">
                                  <Trash2 className="w-3 h-3" /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                          {idea.status === 'assigned' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleStatusChange(idea.id, 'done')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
                                <Check className="w-3 h-3" /> Marcar hecha
                              </button>
                              <button onClick={() => handleDelete(idea.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 ml-auto">
                                <Trash2 className="w-3 h-3" /> Eliminar
                              </button>
                            </div>
                          )}
                          {idea.status === 'done' && (
                            <button onClick={() => handleDelete(idea.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3 h-3" /> Eliminar
                            </button>
                          )}
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

      {/* ==================== SOURCES TAB ==================== */}
      {tab === 'sources' && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {([['x', 'X / Twitter', Twitter, xCreators.length], ['li', 'LinkedIn', Linkedin, liCreators.length], ['news', 'Noticias', Newspaper, newsSources.length]] as const).map(([key, label, Icon, count]) => (
              <button key={key} onClick={() => setSourcesTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${sourcesTab === key ? 'bg-[#6351d5] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" /> {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourcesTab === key ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
              </button>
            ))}
          </div>

          {/* X Creators */}
          {sourcesTab === 'x' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#032149]">Creadores de X / Twitter</h3>
                <span className="text-xs text-slate-400">{xCreators.filter(c => c.active).length} activos de {xCreators.length}</span>
              </div>
              {/* Add form */}
              <div className="flex gap-2">
                <input value={newXHandle} onChange={e => setNewXHandle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addXCreator()}
                  placeholder="@handle" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                <select value={newXCategory} onChange={e => setNewXCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {X_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addXCreator} className="flex items-center gap-1.5 px-4 py-2 bg-[#6351d5] text-white rounded-lg text-sm font-medium hover:bg-[#4a3db8]">
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>
              {/* List */}
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {xCreators.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
                    <button onClick={() => updateXCreator(c.id, { active: !c.active }).then(loadData)}
                      className={`p-0.5 ${c.active ? 'text-[#3ecda5]' : 'text-slate-300'}`}>
                      {c.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <a href={`https://x.com/${c.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#032149] hover:text-[#1DA1F2]">@{c.handle}</a>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">{c.category}</span>
                    <div className="flex-1" />
                    <button onClick={() => { deleteXCreator(c.id); setXCreators(prev => prev.filter(x => x.id !== c.id)); }}
                      className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LI Creators */}
          {sourcesTab === 'li' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#032149]">Creadores de LinkedIn</h3>
                <span className="text-xs text-slate-400">{liCreators.filter((c: any) => c.active).length} activos de {liCreators.length}</span>
              </div>
              {/* Add form */}
              <div className="flex gap-2">
                <input value={newLIName} onChange={e => setNewLIName(e.target.value)} placeholder="Nombre" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                <input value={newLIUrl} onChange={e => setNewLIUrl(e.target.value)} placeholder="LinkedIn URL" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                <select value={newLICategory} onChange={e => setNewLICategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {LI_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addLICreator} className="flex items-center gap-1.5 px-4 py-2 bg-[#6351d5] text-white rounded-lg text-sm font-medium hover:bg-[#4a3db8]">
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>
              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {liCreators.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300">
                    <div className="w-8 h-8 rounded-full bg-[#3ecda5] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#032149] truncate">{c.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${LI_CATEGORY_COLORS[c.category] || 'bg-slate-100 text-slate-500'}`}>{c.category}</span>
                    </div>
                    <button onClick={() => updateLICreator(c.id, { active: !c.active }).then(loadData)}
                      className={`p-0.5 ${c.active ? 'text-[#3ecda5]' : 'text-slate-300'}`}>
                      {c.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-[#0077B5]"><ExternalLink className="w-3.5 h-3.5" /></a>}
                    <button onClick={() => { deleteLICreator(c.id); setLiCreators(prev => prev.filter((x: any) => x.id !== c.id)); }}
                      className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News Sources */}
          {sourcesTab === 'news' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#032149]">Fuentes de noticias (Google News RSS)</h3>
                <span className="text-xs text-slate-400">{newsSources.filter(s => s.active).length} activas</span>
              </div>
              <p className="text-xs text-slate-400">Cada query busca en Google News y trae ~8 artículos. Se usan como contexto para generar ideas.</p>
              {/* Add form */}
              <div className="flex gap-2">
                <input value={newNewsName} onChange={e => setNewNewsName(e.target.value)} placeholder="Nombre (ej: Growth B2B)" className="w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                <input value={newNewsQuery} onChange={e => setNewNewsQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewsSource()}
                  placeholder="Query de búsqueda (ej: growth marketing fintech)" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                <button onClick={addNewsSource} className="flex items-center gap-1.5 px-4 py-2 bg-[#6351d5] text-white rounded-lg text-sm font-medium hover:bg-[#4a3db8]">
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>
              {/* List */}
              <div className="space-y-2">
                {newsSources.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-slate-300">
                    <button onClick={() => updateNewsSource(s.id, { active: !s.active }).then(loadData)}
                      className={`p-0.5 ${s.active ? 'text-[#3ecda5]' : 'text-slate-300'}`}>
                      {s.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <Newspaper className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#032149]">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">query: {s.query}</p>
                    </div>
                    <button onClick={() => { deleteNewsSource(s.id); setNewsSources(prev => prev.filter(x => x.id !== s.id)); }}
                      className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {newsSources.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <Newspaper className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No hay fuentes de noticias configuradas
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
