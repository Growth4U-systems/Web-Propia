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
  const [posting, setPosting] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [creatorFilter, setCreatorFilter] = useState<string>('all');

  // X connection state
  const [xConnected, setXConnected] = useState<boolean | null>(null);
  const [xUser, setXUser] = useState<{ name: string; username: string; avatar: string; followers: number; following: number; tweets: number } | null>(null);
  const [xConnecting, setXConnecting] = useState(false);

  // Discover state
  const [discovered, setDiscovered] = useState<{ handle: string; mentions: number; mentionedBy: string[]; context: string }[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [following, setFollowing] = useState(false);

  const checkXConnection = async () => {
    setXConnecting(true);
    try {
      const res = await fetch(`${FUNCTION_URL}?action=me`);
      const data = await res.json();
      setXConnected(data.ok);
      if (data.ok) setXUser(data.user);
      else setPostError(data.error);
    } catch {
      setXConnected(false);
    }
    setXConnecting(false);
  };

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
      if (!data.ok) {
        const extra = data.details || data.stack || '';
        throw new Error(`${data.error}${extra ? ' | ' + JSON.stringify(extra) : ''}`);
      }
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
    setProcessStatus('Generando quote tweets...');
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
          setProcessStatus(`Completado. ${totalSaved} quote tweets generados.`);
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

  const postQuoteToX = async (reply: XReply & { id: string }) => {
    setPosting(reply.id);
    setPostError(null);
    try {
      const res = await fetch(`${FUNCTION_URL}?action=post-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId: reply.id, replyText: reply.replyDraft, tweetUrl: reply.tweetUrl }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, status: 'posted' as const } : r));
      await updateXReply(reply.id, { status: 'posted' }).catch(() => {});
    } catch (e: any) {
      setPostError(e.message);
    }
    setPosting(null);
  };

  const likeOnX = async (tweetUrl: string) => {
    try {
      const res = await fetch(`${FUNCTION_URL}?action=like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetUrl }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
    } catch (e: any) {
      setPostError(e.message);
    }
  };

  const followCreators = async (handles?: string[]) => {
    setFollowing(true);
    setPostError(null);
    const targetHandles = handles || creators.filter(c => c.active).map(c => c.handle);
    if (targetHandles.length === 0) { setFollowing(false); return; }
    try {
      const res = await fetch(`${FUNCTION_URL}?action=follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: targetHandles }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setProcessStatus(`Followed ${data.followed}/${data.total} cuentas`);
    } catch (e: any) {
      setPostError(e.message);
    }
    setFollowing(false);
  };

  const discoverAccounts = async () => {
    if (!scrapeDatasetId) return;
    setDiscovering(true);
    setPostError(null);
    try {
      const existingHandles = creators.map(c => c.handle);
      const res = await fetch(`${FUNCTION_URL}?action=discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: scrapeDatasetId, existingHandles }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setDiscovered(data.discovered || []);
    } catch (e: any) {
      setPostError(e.message);
    }
    setDiscovering(false);
  };

  const addAndFollow = async (handle: string) => {
    await createXCreator({ handle, name: '', category: 'Discovered', notes: 'Auto-discovered', active: true });
    setDiscovered(prev => prev.filter(d => d.handle !== handle));
    await followCreators([handle]);
    loadAll();
  };

  const addAllDiscovered = async () => {
    setFollowing(true);
    const handles = discovered.map(d => d.handle);
    for (const handle of handles) {
      await createXCreator({ handle, name: '', category: 'Discovered', notes: 'Auto-discovered', active: true }).catch(() => {});
    }
    await followCreators(handles);
    setDiscovered([]);
    loadAll();
    setFollowing(false);
  };

  const postTweetToX = async (post: XPost & { id: string }) => {
    setPosting(post.id);
    setPostError(null);
    try {
      const res = await fetch(`${FUNCTION_URL}?action=post-tweet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, draft: post.draft, format: post.format, threadSlides: post.threadSlides }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'posted' as const } : p));
      await updateXPost(post.id, { status: 'posted' }).catch(() => {});
    } catch (e: any) {
      setPostError(e.message);
    }
    setPosting(null);
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

  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  const seedCreators = async () => {
    setSeeding(true);
    setSeedStatus('Verificando existentes...');
    // Always fetch fresh from Firebase to avoid duplicates
    const freshCreators = await getAllXCreators();
    const existing = new Set(freshCreators.map((c: any) => c.handle.toLowerCase()));
    let added = 0;
    for (const seed of CREATOR_SEED) {
      if (!existing.has(seed.handle.toLowerCase())) {
        try {
          await createXCreator(seed);
          existing.add(seed.handle.toLowerCase()); // prevent duplicates within same batch
          added++;
          setSeedStatus(`Añadidos ${added}...`);
        } catch (e: any) {
          console.error(`Error adding @${seed.handle}:`, e);
        }
      }
    }
    setSeedStatus(added > 0 ? `${added} creators añadidos` : 'Todos ya existían');
    setSeeding(false);
    loadAll();
  };

  const dedupCreators = async () => {
    setSeeding(true);
    setSeedStatus('Eliminando duplicados...');
    const seen = new Set<string>();
    let removed = 0;
    for (const c of creators) {
      const key = c.handle.toLowerCase();
      if (seen.has(key)) {
        await deleteXCreator(c.id);
        removed++;
      } else {
        seen.add(key);
      }
    }
    setSeedStatus(removed > 0 ? `${removed} duplicados eliminados` : 'No había duplicados');
    setSeeding(false);
    loadAll();
  };

  // ---- Counts ----
  const pendingReplies = replies.filter(r => r.status === 'pending').length;
  const approvedReplies = replies.filter(r => r.status === 'approved').length;
  const postedReplies = replies.filter(r => r.status === 'posted').length;
  const ideaPosts = posts.filter(p => p.status === 'idea').length;
  const draftPosts = posts.filter(p => p.status === 'draft').length;
  const approvedPosts = posts.filter(p => p.status === 'approved').length;
  const postedPosts = posts.filter(p => p.status === 'posted').length;
  const pendingPosts = ideaPosts + draftPosts;
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
    { id: 'replies', label: 'Quotes', icon: MessageCircle, badge: pendingReplies },
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
        <p className="text-slate-500 mt-1">Scrape → Genera → Aprueba → Publica</p>
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
        <div className="space-y-4">
          {/* X Connection Status */}
          <div className={`rounded-xl border p-4 ${xConnected === true ? 'bg-green-50 border-green-200' : xConnected === false ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {xConnected === true && xUser ? (
                  <>
                    <img src={xUser.avatar} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-[#032149]">@{xUser.username} <span className="text-green-600 text-xs font-normal ml-1">Conectado</span></p>
                      <p className="text-xs text-slate-500">{xUser.followers} seguidores · {xUser.following} siguiendo · {xUser.tweets} tweets</p>
                    </div>
                  </>
                ) : xConnected === false ? (
                  <div>
                    <p className="font-semibold text-red-700">X API no conectada</p>
                    <p className="text-xs text-red-500">Verifica las credenciales de la API</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700">Cuenta de X</p>
                    <p className="text-xs text-slate-400">Conecta tu cuenta para publicar automáticamente</p>
                  </div>
                )}
              </div>
              <button onClick={checkXConnection} disabled={xConnecting} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${xConnected === true ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#032149] text-white hover:bg-[#043264]'} disabled:opacity-50`}>
                {xConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {xConnected === true ? 'Reconectar' : 'Conectar'}
              </button>
            </div>
          </div>

          {/* Seed creators warning */}
          {creators.length === 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Primero necesitas creators</span>
              </div>
              <button onClick={seedCreators} disabled={seeding} className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 disabled:opacity-50">
                {seeding && <Loader2 className="w-3 h-3 animate-spin" />}
                {seeding ? seedStatus : `Cargar ${CREATOR_SEED.length} creators iniciales`}
              </button>
            </div>
          )}

          {/* Pipeline — 4 steps */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Step 1: Scrape */}
            <div className={`p-5 border-b border-slate-100 ${scraping ? 'bg-teal-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3ecda5] text-white flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-semibold text-[#032149]">Scraping de tweets</p>
                    <p className="text-xs text-slate-400">Busca tweets recientes de tus {activeCreators} creators</p>
                  </div>
                </div>
                <button onClick={startScrape} disabled={scraping || processing || creators.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-[#3ecda5] text-white rounded-lg hover:bg-[#35b892] font-medium disabled:opacity-50 text-sm">
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {scraping ? 'Scraping...' : 'Ejecutar'}
                </button>
              </div>
              {scrapeStatus && <p className="text-xs text-slate-500 mt-2 ml-11">{scrapeStatus}</p>}
            </div>

            {/* Step 2: Generate posts */}
            <div className={`p-5 border-b border-slate-100 ${processing ? 'bg-blue-50' : !scrapeDatasetId ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${scrapeDatasetId ? 'bg-[#032149]' : 'bg-slate-300'} text-white flex items-center justify-center text-sm font-bold`}>2</div>
                  <div>
                    <p className="font-semibold text-[#032149]">Generar tweets propios</p>
                    <p className="text-xs text-slate-400">IA crea posts originales inspirados en los tweets scrapeados</p>
                  </div>
                </div>
                <button onClick={generateIdeas} disabled={!scrapeDatasetId || processing || scraping} className="flex items-center gap-2 px-5 py-2.5 bg-[#032149] text-white rounded-lg hover:bg-[#043264] font-medium disabled:opacity-50 text-sm">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {processing ? 'Generando...' : 'Generar'}
                </button>
              </div>
              {processStatus && <p className="text-xs text-slate-500 mt-2 ml-11">{processStatus}</p>}
            </div>

            {/* Step 3: Review & Approve */}
            <div className={`p-5 border-b border-slate-100 ${pendingPosts === 0 && approvedPosts === 0 ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${pendingPosts > 0 ? 'bg-amber-500' : approvedPosts > 0 ? 'bg-blue-500' : 'bg-slate-300'} text-white flex items-center justify-center text-sm font-bold`}>3</div>
                  <div>
                    <p className="font-semibold text-[#032149]">Revisar y aprobar</p>
                    <p className="text-xs text-slate-400">
                      {pendingPosts > 0 ? `${pendingPosts} posts esperando revisión` :
                       approvedPosts > 0 ? `${approvedPosts} posts aprobados, listos para publicar` :
                       'No hay posts pendientes'}
                    </p>
                  </div>
                </div>
                {pendingPosts > 0 && (
                  <button onClick={() => setTab('posts')} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm">
                    <Check className="w-4 h-4" />
                    Revisar ({pendingPosts})
                  </button>
                )}
                {pendingPosts === 0 && approvedPosts > 0 && (
                  <button onClick={() => setTab('posts')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Ver aprobados ({approvedPosts})
                  </button>
                )}
              </div>
            </div>

            {/* Step 4: Publish */}
            <div className={`p-5 border-b border-slate-100 ${approvedPosts === 0 ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${approvedPosts > 0 ? 'bg-green-500' : 'bg-slate-300'} text-white flex items-center justify-center text-sm font-bold`}>4</div>
                  <div>
                    <p className="font-semibold text-[#032149]">Publicar en X</p>
                    <p className="text-xs text-slate-400">
                      {approvedPosts > 0 ? `${approvedPosts} posts listos para publicar` :
                       postedPosts > 0 ? `${postedPosts} posts ya publicados` :
                       'Aprueba posts en el paso 3 primero'}
                    </p>
                  </div>
                </div>
                {approvedPosts > 0 && (
                  <button
                    onClick={async () => {
                      const approved = posts.filter(p => p.status === 'approved');
                      for (const p of approved) {
                        await postTweetToX(p);
                        await new Promise(res => setTimeout(res, 2000));
                      }
                    }}
                    disabled={posting !== null}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 text-sm"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {posting ? 'Publicando...' : `Publicar todos (${approvedPosts})`}
                  </button>
                )}
              </div>
            </div>

            {/* Step 5: Discover & Follow */}
            <div className={`p-5 ${!scrapeDatasetId ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${discovered.length > 0 ? 'bg-pink-500' : scrapeDatasetId ? 'bg-pink-400' : 'bg-slate-300'} text-white flex items-center justify-center text-sm font-bold`}>5</div>
                  <div>
                    <p className="font-semibold text-[#032149]">Descubrir y seguir cuentas</p>
                    <p className="text-xs text-slate-400">
                      {discovered.length > 0 ? `${discovered.length} cuentas nuevas encontradas` :
                       'Encuentra cuentas mencionadas por tus creators'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {discovered.length === 0 && (
                    <button onClick={discoverAccounts} disabled={!scrapeDatasetId || discovering} className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium disabled:opacity-50 text-sm">
                      {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      {discovering ? 'Buscando...' : 'Descubrir'}
                    </button>
                  )}
                  {discovered.length > 0 && (
                    <button onClick={addAllDiscovered} disabled={following} className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-medium disabled:opacity-50 text-sm">
                      {following ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {following ? 'Siguiendo...' : `Seguir todos (${discovered.length})`}
                    </button>
                  )}
                  <button onClick={() => followCreators()} disabled={following || creators.length === 0} className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 text-sm" title="Follow creators existentes">
                    {following ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Discovered accounts list */}
              {discovered.length > 0 && (
                <div className="mt-4 ml-11 space-y-2 max-h-64 overflow-y-auto">
                  {discovered.map(d => (
                    <div key={d.handle} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[#032149]">@{d.handle}</span>
                          <span className="text-xs text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">{d.mentions}x mencionado</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          por {d.mentionedBy.map(h => `@${h}`).join(', ')}
                        </p>
                      </div>
                      <button onClick={() => addAndFollow(d.handle)} className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-medium hover:bg-pink-600 ml-2 flex-shrink-0">
                        <Plus className="w-3 h-3" /> Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> {pendingPosts} pendientes</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> {approvedPosts} aprobados</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> {postedPosts} publicados</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> {activeCreators} creators</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post error banner */}
      {postError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{postError}</span>
          <button onClick={() => setPostError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
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
                      {reply.views ? (
                        <span className="text-xs text-slate-400">{reply.views >= 1000 ? `${(reply.views / 1000).toFixed(0)}K` : reply.views} views</span>
                      ) : null}
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
                        <p className="font-medium text-xs text-slate-500 mb-1">Quote tweet:</p>
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
                          <>
                            <button onClick={() => postQuoteToX(reply)} disabled={posting === reply.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                              {posting === reply.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              {posting === reply.id ? 'Publicando...' : 'Quote Tweet'}
                            </button>
                            <button onClick={() => likeOnX(reply.tweetUrl)} className="flex items-center gap-1 px-2 py-1.5 bg-pink-50 text-pink-500 rounded-lg text-xs font-medium hover:bg-pink-100">
                              ♥ Like
                            </button>
                          </>
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
                          <button onClick={() => postTweetToX(post)} disabled={posting === post.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                            {posting === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            {posting === post.id ? 'Publicando...' : 'Post to X'}
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

          {/* Seed / Dedup buttons */}
          <div className="flex gap-3">
            {creators.length === 0 && (
              <button
                onClick={seedCreators}
                disabled={seeding}
                className="flex-1 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-[#3ecda5] hover:text-[#3ecda5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {seeding && <Loader2 className="w-4 h-4 animate-spin" />}
                {seeding ? seedStatus : `Cargar ${CREATOR_SEED.length} creators iniciales`}
              </button>
            )}
            {creators.length > 0 && new Set(creators.map(c => c.handle.toLowerCase())).size < creators.length && (
              <button
                onClick={dedupCreators}
                disabled={seeding}
                className="py-2 px-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {seeding && <Loader2 className="w-4 h-4 animate-spin" />}
                {seeding ? seedStatus : `Eliminar duplicados (${creators.length - new Set(creators.map(c => c.handle.toLowerCase())).size})`}
              </button>
            )}
          </div>

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
