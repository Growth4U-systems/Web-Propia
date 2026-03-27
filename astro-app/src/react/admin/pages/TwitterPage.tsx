import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  Check,
  Copy,
  Edit3,
  RefreshCw,
  Sparkles,
  MessageCircle,
  FileText,
  Users,
  Lightbulb,
  LayoutDashboard,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertCircle,
} from 'lucide-react';
import {
  getAllXCreators,
  createXCreator,
  updateXCreator,
  deleteXCreator,
  getAllXReplies,
  updateXReply,
  deleteXReply,
  getAllXPosts,
  updateXPost,
  deleteXPost,
  type XCreator,
  type XReply,
  type XPost,
} from '../../../lib/firebase-client';

// Seed creators from user's initial list
const CREATOR_SEED: Omit<XCreator, 'createdAt' | 'updatedAt'>[] = [
  { handle: 'coreyhainesco', name: 'Corey Haines', category: 'Growth', notes: '', active: true },
  { handle: 'askokara', name: 'Asko Kara', category: 'Growth', notes: '', active: true },
  { handle: 'DeRonin_', name: 'DeRonin', category: 'Growth', notes: '', active: true },
  { handle: 'ai_vaidehi', name: 'Vaidehi', category: 'AI', notes: '', active: true },
  { handle: 'dotta', name: 'Dotta', category: 'Founder', notes: '', active: true },
  { handle: 'kanikabk', name: 'Kanika', category: 'Growth', notes: '', active: true },
  { handle: 'indexsy', name: 'Indexsy', category: 'SEO', notes: '', active: true },
  { handle: 'presswhizz', name: 'PressWhizz', category: 'SEO', notes: '', active: true },
  { handle: 'everestchris6', name: 'Chris Everest', category: 'Growth', notes: '', active: true },
  { handle: 'oliverhenry', name: 'Oliver Henry', category: 'Growth', notes: '', active: true },
  { handle: 'jacobsklug', name: 'Jacob Sklug', category: 'Growth', notes: '', active: true },
  { handle: 'bcherny', name: 'Boris Cherny', category: 'Founder', notes: '', active: true },
  { handle: 'moltbook', name: 'Molt Book', category: 'Growth', notes: '', active: true },
  { handle: 'Rasmic', name: 'Rasmic', category: 'Founder', notes: '', active: true },
  { handle: 'remotion', name: 'Remotion', category: 'Founder', notes: '', active: true },
  { handle: '_guillecasaus', name: 'Guille Casaus', category: 'Growth', notes: '', active: true },
  { handle: 'oliviscusai', name: 'Oliviscus AI', category: 'AI', notes: '', active: true },
  { handle: 'prukalpa', name: 'Prukalpa', category: 'Founder', notes: '', active: true },
  { handle: 'gregisenberg', name: 'Greg Isenberg', category: 'Founder', notes: '', active: true },
];

const FUNCTION_URL = '/api/x-scrape';

type Tab = 'overview' | 'replies' | 'posts' | 'creators' | 'ideas';

export default function TwitterPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [creators, setCreators] = useState<(XCreator & { id: string })[]>([]);
  const [replies, setReplies] = useState<(XReply & { id: string })[]>([]);
  const [posts, setPosts] = useState<(XPost & { id: string })[]>([]);

  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [scrapeRunId, setScrapeRunId] = useState('');
  const [scrapeDatasetId, setScrapeDatasetId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  // UI state
  const [replyFilter, setReplyFilter] = useState<string>('all');
  const [postFilter, setPostFilter] = useState<string>('all');
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [expandedReply, setExpandedReply] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState('');
  const [newCategory, setNewCategory] = useState('Growth');
  const [copied, setCopied] = useState<string | null>(null);
  const [creatorFilter, setCreatorFilter] = useState<string>('all');

  // Load all data
  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, r, p] = await Promise.all([
        getAllXCreators(),
        getAllXReplies(),
        getAllXPosts(),
      ]);
      setCreators(c as any);
      setReplies(r as any);
      setPosts(p as any);
    } catch (e) {
      console.error('Failed to load X data:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ---- Scraping ----
  const startScrape = async () => {
    setScraping(true);
    setScrapeStatus('Iniciando scraping...');
    try {
      const res = await fetch(`${FUNCTION_URL}?action=start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTweets: 5 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setScrapeRunId(data.runId);
      setScrapeDatasetId(data.datasetId);
      setScrapeStatus(`Scraping ${data.creators} perfiles...`);
      pollStatus(data.runId);
    } catch (e: any) {
      setScrapeStatus(`Error: ${e.message}`);
      setScraping(false);
    }
  };

  const pollStatus = async (runId: string) => {
    const check = async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?action=status&runId=${runId}`);
        const data = await res.json();
        if (data.finished) {
          if (data.status === 'SUCCEEDED') {
            setScrapeStatus('Scraping completado. Listo para procesar.');
            setScrapeDatasetId(data.datasetId);
          } else {
            setScrapeStatus(`Scraping ${data.status}`);
          }
          setScraping(false);
          return;
        }
        setScrapeStatus(`Scraping en curso (${data.status})...`);
        setTimeout(check, 5000);
      } catch {
        setScrapeStatus('Error checking status');
        setScraping(false);
      }
    };
    check();
  };

  const processReplies = async () => {
    if (!scrapeDatasetId) return;
    setProcessing(true);
    setProcessStatus('Generando replies...');
    let offset = 0;
    let totalSaved = 0;

    const processBatch = async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?action=process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datasetId: scrapeDatasetId, offset }),
        });
        const data = await res.json();
        totalSaved += data.saved || 0;
        setProcessStatus(`Procesados: ${data.processed || 0} | Guardados: ${totalSaved} | Saltados: ${data.skipped || 0}`);

        if (data.hasMore) {
          offset = data.nextOffset;
          setTimeout(processBatch, 1000);
        } else {
          setProcessStatus(`Completado. ${totalSaved} replies generados.`);
          setProcessing(false);
          loadAll();
        }
      } catch (e: any) {
        setProcessStatus(`Error: ${e.message}`);
        setProcessing(false);
      }
    };
    processBatch();
  };

  const generateIdeas = async () => {
    if (!scrapeDatasetId) return;
    setProcessing(true);
    setProcessStatus('Generando ideas de posts...');
    try {
      const res = await fetch(`${FUNCTION_URL}?action=ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: scrapeDatasetId }),
      });
      const data = await res.json();
      if (data.ok) {
        setProcessStatus(`${data.saved} ideas generadas.`);
        loadAll();
      } else {
        setProcessStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setProcessStatus(`Error: ${e.message}`);
    }
    setProcessing(false);
  };

  // ---- Actions ----
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateReplyStatus = async (id: string, status: XReply['status']) => {
    await updateXReply(id, { status });
    setReplies(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const saveReplyEdit = async (id: string) => {
    await updateXReply(id, { replyDraft: editText });
    setReplies(prev => prev.map(r => r.id === id ? { ...r, replyDraft: editText } : r));
    setEditingReply(null);
  };

  const removeReply = async (id: string) => {
    await deleteXReply(id);
    setReplies(prev => prev.filter(r => r.id !== id));
  };

  const updatePostStatus = async (id: string, status: XPost['status']) => {
    await updateXPost(id, { status });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const savePostEdit = async (id: string) => {
    await updateXPost(id, { draft: editPostText });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, draft: editPostText } : p));
    setEditingPost(null);
  };

  const removePost = async (id: string) => {
    await deleteXPost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const addCreator = async () => {
    const handle = newHandle.trim().replace('@', '');
    if (!handle) return;
    if (creators.some(c => c.handle.toLowerCase() === handle.toLowerCase())) return;
    await createXCreator({ handle, name: '', category: newCategory, notes: '', active: true });
    setNewHandle('');
    loadAll();
  };

  const removeCreator = async (id: string) => {
    await deleteXCreator(id);
    setCreators(prev => prev.filter(c => c.id !== id));
  };

  const toggleCreator = async (id: string) => {
    const c = creators.find(x => x.id === id);
    if (!c) return;
    await updateXCreator(id, { active: !c.active });
    setCreators(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));
  };

  const seedCreators = async () => {
    const existing = new Set(creators.map(c => c.handle.toLowerCase()));
    let added = 0;
    for (const seed of CREATOR_SEED) {
      if (!existing.has(seed.handle.toLowerCase())) {
        await createXCreator(seed);
        added++;
      }
    }
    if (added > 0) loadAll();
  };

  // ---- Counts ----
  const pendingReplies = replies.filter(r => r.status === 'pending').length;
  const approvedReplies = replies.filter(r => r.status === 'approved').length;
  const postedReplies = replies.filter(r => r.status === 'posted').length;
  const ideaPosts = posts.filter(p => p.status === 'idea').length;
  const draftPosts = posts.filter(p => p.status === 'draft').length;
  const activeCreators = creators.filter(c => c.active).length;

  // ---- Filtered data ----
  const filteredReplies = replies.filter(r => replyFilter === 'all' || r.status === replyFilter);
  const filteredPosts = posts.filter(p => {
    if (postFilter === 'all') return true;
    if (postFilter === 'ideas') return p.status === 'idea';
    if (postFilter === 'drafts') return p.status === 'draft' || p.status === 'approved';
    if (postFilter === 'posted') return p.status === 'posted';
    return true;
  });
  const filteredCreators = creators.filter(c => {
    if (creatorFilter === 'all') return true;
    if (creatorFilter === 'active') return c.active;
    return c.category === creatorFilter;
  });

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'replies', label: 'Replies', icon: MessageCircle, badge: pendingReplies },
    { id: 'posts', label: 'Posts', icon: FileText, badge: ideaPosts + draftPosts },
    { id: 'creators', label: 'Creators', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#3ecda5] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#032149]">X / Twitter Bot</h1>
        <p className="text-slate-500 mt-1">Engagement automatizado y generación de contenido</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-[#032149] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                tab === t.id ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Replies pendientes', value: pendingReplies, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Replies posteados', value: postedReplies, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Ideas de posts', value: ideaPosts + draftPosts, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Creators activos', value: activeCreators, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-[#032149] mb-4">Acciones rápidas</h2>

            {/* Step 1: Scrape */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={startScrape}
                  disabled={scraping || processing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#3ecda5] text-white rounded-lg hover:bg-[#35b892] transition-colors font-medium disabled:opacity-50"
                >
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  1. Scraping de tweets
                </button>
                {scrapeStatus && (
                  <span className="text-sm text-slate-500">{scrapeStatus}</span>
                )}
              </div>

              {/* Step 2: Process */}
              <div className="flex items-center gap-3">
                <button
                  onClick={processReplies}
                  disabled={!scrapeDatasetId || processing || scraping}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#032149] text-white rounded-lg hover:bg-[#043264] transition-colors font-medium disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  2. Generar replies
                </button>
                <button
                  onClick={generateIdeas}
                  disabled={!scrapeDatasetId || processing || scraping}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[#032149] text-[#032149] rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  2b. Generar ideas de posts
                </button>
              </div>

              {processStatus && (
                <p className="text-sm text-slate-500 ml-1">{processStatus}</p>
              )}
            </div>

            {/* Seed creators */}
            {creators.length === 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">No hay creators configurados</span>
                </div>
                <button
                  onClick={seedCreators}
                  className="text-sm text-amber-700 underline hover:text-amber-900"
                >
                  Cargar {CREATOR_SEED.length} creators iniciales
                </button>
              </div>
            )}
          </div>

          {/* Strategy reminder */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-[#032149] mb-3">Estrategia 70/30</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-[#032149] mb-1">70% Replies (engagement)</p>
                <ul className="space-y-1 text-xs">
                  <li>- 20-30 replies/día a creators de tu red</li>
                  <li>- Responder en los primeros 15 min del tweet</li>
                  <li>- Max 280 chars, aportar valor, sin links</li>
                  <li>- Objetivo: que el autor responda (x150 boost)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-[#032149] mb-1">30% Posts propios (contenido)</p>
                <ul className="space-y-1 text-xs">
                  <li>- 2 posts originales/día en horas pico</li>
                  <li>- 1-2 threads/semana (54% más engagement)</li>
                  <li>- Texto &gt; video en X</li>
                  <li>- Sin links en el tweet principal (-50% reach)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REPLIES TAB ===== */}
      {tab === 'replies' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: `Todos (${replies.length})` },
              { id: 'pending', label: `Pendientes (${pendingReplies})` },
              { id: 'approved', label: `Aprobados (${approvedReplies})` },
              { id: 'posted', label: `Posteados (${postedReplies})` },
              { id: 'rejected', label: `Rechazados (${replies.filter(r => r.status === 'rejected').length})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setReplyFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  replyFilter === f.id
                    ? 'bg-[#032149] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Reply list */}
          {filteredReplies.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay replies {replyFilter !== 'all' ? `con estado "${replyFilter}"` : ''}.</p>
              <p className="text-xs mt-1">Usa el scraping desde Overview para generar replies.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReplies.map(reply => (
                <div key={reply.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedReply(expandedReply === reply.id ? null : reply.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        reply.status === 'pending' ? 'bg-amber-400' :
                        reply.status === 'approved' ? 'bg-blue-400' :
                        reply.status === 'posted' ? 'bg-green-400' : 'bg-slate-300'
                      }`} />
                      <span className="font-medium text-sm text-[#032149]">@{reply.handle}</span>
                      <span className="text-xs text-slate-400 truncate">{reply.tweetSnippet.slice(0, 80)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {reply.replyDraft.length} chars
                      </span>
                      {expandedReply === reply.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedReply === reply.id && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      {/* Original tweet */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                        <p className="font-medium text-slate-500 mb-1">Tweet original:</p>
                        <p>{reply.tweetSnippet}</p>
                        {reply.tweetUrl && (
                          <a href={reply.tweetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#3ecda5] mt-2 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Ver en X
                          </a>
                        )}
                      </div>

                      {/* Reply draft */}
                      <div className="mt-3">
                        <p className="font-medium text-xs text-slate-500 mb-1">Reply generado:</p>
                        {editingReply === reply.id ? (
                          <div>
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              rows={3}
                              maxLength={280}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecda5]/50 resize-none"
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs ${editText.length > 280 ? 'text-red-500' : 'text-slate-400'}`}>
                                {editText.length}/280
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingReply(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                                <button onClick={() => saveReplyEdit(reply.id)} className="text-xs text-[#3ecda5] hover:text-[#35b892] font-medium">Guardar</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#032149] bg-blue-50 p-3 rounded-lg">{reply.replyDraft}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {reply.status === 'pending' && (
                          <>
                            <button onClick={() => updateReplyStatus(reply.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 bg-[#3ecda5] text-white rounded-lg text-xs font-medium hover:bg-[#35b892]">
                              <Check className="w-3 h-3" /> Aprobar
                            </button>
                            <button onClick={() => updateReplyStatus(reply.id, 'rejected')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">
                              <XCircle className="w-3 h-3" /> Rechazar
                            </button>
                          </>
                        )}
                        {(reply.status === 'approved') && (
                          <button onClick={() => updateReplyStatus(reply.id, 'posted')} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">
                            <Send className="w-3 h-3" /> Marcar posteado
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(reply.replyDraft, reply.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200"
                        >
                          {copied === reply.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copied === reply.id ? 'Copiado' : 'Copiar'}
                        </button>
                        {editingReply !== reply.id && (
                          <button onClick={() => { setEditingReply(reply.id); setEditText(reply.replyDraft); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                        )}
                        <button onClick={() => removeReply(reply.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== POSTS TAB ===== */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: `Todos (${posts.length})` },
              { id: 'ideas', label: `Ideas (${ideaPosts})` },
              { id: 'drafts', label: `Drafts (${draftPosts})` },
              { id: 'posted', label: `Posteados (${posts.filter(p => p.status === 'posted').length})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setPostFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  postFilter === f.id
                    ? 'bg-[#032149] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Posts list */}
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay posts.</p>
              <p className="text-xs mt-1">Genera ideas desde Overview tras el scraping.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map(post => (
                <div key={post.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        post.format === 'thread' ? 'bg-purple-100 text-purple-700' :
                        post.format === 'quote' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {post.format}
                      </span>
                      <span className="font-medium text-sm text-[#032149] truncate">{post.topic}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        post.status === 'idea' ? 'bg-amber-100 text-amber-700' :
                        post.status === 'draft' ? 'bg-blue-100 text-blue-700' :
                        post.status === 'approved' ? 'bg-green-100 text-green-700' :
                        post.status === 'posted' ? 'bg-slate-100 text-slate-500' :
                        'bg-slate-100 text-slate-500'
                      }`}>{post.status}</span>
                    </div>
                    {expandedPost === post.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {expandedPost === post.id && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      {post.angle && (
                        <p className="text-xs text-slate-500 mt-3"><span className="font-medium">Ángulo:</span> {post.angle}</p>
                      )}
                      {post.inspiration && (
                        <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Inspirado en:</span> {post.inspiration}</p>
                      )}

                      {/* Draft */}
                      <div className="mt-3">
                        <p className="font-medium text-xs text-slate-500 mb-1">Draft:</p>
                        {editingPost === post.id ? (
                          <div>
                            <textarea
                              value={editPostText}
                              onChange={e => setEditPostText(e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecda5]/50 resize-none"
                            />
                            <div className="flex justify-end gap-2 mt-1">
                              <button onClick={() => setEditingPost(null)} className="text-xs text-slate-400">Cancelar</button>
                              <button onClick={() => savePostEdit(post.id)} className="text-xs text-[#3ecda5] font-medium">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#032149] bg-blue-50 p-3 rounded-lg whitespace-pre-wrap">{post.draft}</p>
                        )}
                      </div>

                      {/* Thread slides */}
                      {post.format === 'thread' && post.threadSlides?.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-xs text-slate-500 mb-1">
                            <Layers className="w-3 h-3 inline mr-1" />
                            Thread ({post.threadSlides.length + 1} tweets):
                          </p>
                          <div className="space-y-2">
                            {post.threadSlides.map((slide, i) => (
                              <div key={i} className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                                <span className="text-slate-400 font-mono mr-1">{i + 2}.</span> {slide}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {post.status === 'idea' && (
                          <button onClick={() => updatePostStatus(post.id, 'draft')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">
                            <Edit3 className="w-3 h-3" /> Pasar a draft
                          </button>
                        )}
                        {(post.status === 'draft') && (
                          <button onClick={() => updatePostStatus(post.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 bg-[#3ecda5] text-white rounded-lg text-xs font-medium hover:bg-[#35b892]">
                            <Check className="w-3 h-3" /> Aprobar
                          </button>
                        )}
                        {(post.status === 'approved') && (
                          <button onClick={() => updatePostStatus(post.id, 'posted')} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">
                            <Send className="w-3 h-3" /> Marcar posteado
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const full = post.format === 'thread' && post.threadSlides?.length
                              ? `${post.draft}\n\n${post.threadSlides.map((s, i) => `${i + 2}/ ${s}`).join('\n\n')}`
                              : post.draft;
                            copyToClipboard(full, post.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200"
                        >
                          {copied === post.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copied === post.id ? 'Copiado' : 'Copiar'}
                        </button>
                        {editingPost !== post.id && (
                          <button onClick={() => { setEditingPost(post.id); setEditPostText(post.draft); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                        )}
                        <button onClick={() => removePost(post.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CREATORS TAB ===== */}
      {tab === 'creators' && (
        <div className="space-y-4">
          {/* Add creator form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Handle de X</label>
                <input
                  type="text"
                  value={newHandle}
                  onChange={e => setNewHandle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCreator()}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecda5]/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecda5]/50"
                >
                  <option value="Growth">Growth</option>
                  <option value="Founder">Founder</option>
                  <option value="SEO">SEO</option>
                  <option value="AI">AI</option>
                  <option value="VC">VC</option>
                </select>
              </div>
              <button onClick={addCreator} className="px-4 py-2 bg-[#3ecda5] text-white rounded-lg hover:bg-[#35b892] transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Seed button */}
          {creators.length === 0 && (
            <button
              onClick={seedCreators}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-[#3ecda5] hover:text-[#3ecda5] transition-colors"
            >
              Cargar {CREATOR_SEED.length} creators iniciales
            </button>
          )}

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: `Todos (${creators.length})` },
              { id: 'active', label: `Activos (${activeCreators})` },
              ...['Growth', 'Founder', 'SEO', 'AI', 'VC']
                .filter(cat => creators.some(c => c.category === cat))
                .map(cat => ({ id: cat, label: `${cat} (${creators.filter(c => c.category === cat).length})` })),
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCreatorFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  creatorFilter === f.id
                    ? 'bg-[#032149] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Creator list */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {filteredCreators.map(creator => (
              <div key={creator.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCreator(creator.id)}
                    className={`w-8 h-5 rounded-full transition-colors relative ${
                      creator.active ? 'bg-[#3ecda5]' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      creator.active ? 'left-3.5' : 'left-0.5'
                    }`} />
                  </button>
                  <a
                    href={`https://x.com/${creator.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-[#032149] hover:text-[#3ecda5] transition-colors"
                  >
                    @{creator.handle}
                  </a>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{creator.category}</span>
                </div>
                <button
                  onClick={() => removeCreator(creator.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredCreators.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No hay creators{creatorFilter !== 'all' ? ` en "${creatorFilter}"` : ''}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
