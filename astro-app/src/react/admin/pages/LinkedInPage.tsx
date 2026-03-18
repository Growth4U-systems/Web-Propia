import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  X,
  ImageIcon,
  Trash2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  Lock,
  Heart,
  MessageCircle,
  Share2,
  User,
  ChevronDown,
} from 'lucide-react';
import { getAllPosts, getLIScheduledPosts, createLIScheduledPost, deleteLIScheduledPost, updateLIScheduledPost } from '../../../lib/firebase-client';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: string;
  createdAt: string | null;
}

interface QueueItem {
  post: BlogPost;
  caption: string;
  liImageUrl: string;
  status: 'generating' | 'draft' | 'sending' | 'sent' | 'scheduling' | 'scheduled' | 'error';
  error?: string;
  scheduledDate: string;
  scheduledTime: string;
  firestoreId?: string;
  account: string;
}

interface SavedPost {
  id: string;
  imageUrl: string;
  caption: string;
  blogTitle: string;
  blogSlug: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  account: string;
  createdAt: Date | null;
}

interface LIMetricsPost {
  id: string;
  text: string;
  createdAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  clicks: number;
}

interface LIMetrics {
  authorUrn: string;
  posts: LIMetricsPost[];
}

const FUNCTION_URL = '/.netlify/functions/linkedin';
const CLOUDINARY_CLOUD = 'dsc0jsbkz';
const CLOUDINARY_PRESET = 'blog_uploads';

// LinkedIn accounts — each with its own template
interface LinkedInAccount {
  id: string;
  name: string;
  color: string;
  template: {
    url: string;
    textX: number;
    textY: number;
    textW: number;
    textH: number;
  };
}

const ACCOUNTS: LinkedInAccount[] = [
  {
    id: 'growth4u',
    name: 'Growth4U',
    color: '#6351d5',
    template: {
      url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772734314/li-template-1.jpg',
      textX: 100,
      textY: 700,
      textW: 1528,
      textH: 900,
    },
  },
  {
    id: 'philippe',
    name: 'Philippe',
    color: '#0077B5',
    template: {
      url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772734314/li-template-1.jpg',
      textX: 100,
      textY: 700,
      textW: 1528,
      textH: 900,
    },
  },
  {
    id: 'martin',
    name: 'Martin',
    color: '#0faec1',
    template: {
      url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772734314/li-template-1.jpg',
      textX: 100,
      textY: 700,
      textW: 1528,
      textH: 900,
    },
  },
];

// --- Canvas image generator ---

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generateLIImage(text: string, template: LinkedInAccount['template']): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1728;
  canvas.height = 2304;
  const ctx = canvas.getContext('2d')!;

  // Draw template
  const templateImg = await loadImage(template.url);
  ctx.drawImage(templateImg, 0, 0, 1728, 2304);

  // Text area
  const { textX, textY, textW, textH } = template;
  const padding = 40;
  const innerW = textW - padding * 2;
  const innerH = textH - padding * 2;

  // Clip to text area so text never overflows
  ctx.save();
  ctx.beginPath();
  ctx.rect(textX, textY, textW, textH);
  ctx.clip();

  // Determine font size (try from large to small) — start big to fill the box
  const upperText = text.toUpperCase();
  let fontSize = 120;
  let lines: string[] = [];

  for (fontSize = 120; fontSize >= 28; fontSize -= 2) {
    ctx.font = `900 ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    lines = wrapText(ctx, upperText, innerW);
    const lineHeight = fontSize * 1.15;
    const totalH = lines.length * lineHeight;
    if (totalH <= innerH) break;
  }

  // Draw text centered in the box
  const lineHeight = fontSize * 1.15;
  const totalTextH = lines.length * lineHeight;
  const startY = textY + padding + (innerH - totalTextH) / 2 + fontSize;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX + textW / 2, startY + i * lineHeight);
  }

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
  });
}

async function uploadToCloudinary(blob: Blob, slug: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', CLOUDINARY_PRESET);
  form.append('public_id', `li-post-${slug}-${Date.now()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}

// --- Caption generator (AI-powered using linkedin-post-skill) ---

async function generateCaption(post: BlogPost): Promise<string> {
  try {
    const res = await fetch('/.netlify/functions/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'linkedin',
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        category: post.category,
      }),
    });
    const data = await res.json();
    if (data.caption) return data.caption;
  } catch (err) {
    console.error('AI caption generation failed, using fallback:', err);
  }
  // Fallback to basic template
  return `${post.title}\n\nLee el articulo completo:\ngrowth4u.io/blog/${post.slug}/\n\n#GrowthMarketing #Growth4U #B2B`;
}

// --- Main component ---

export default function LinkedInPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set());
  const [linkedinStatus, setLinkedinStatus] = useState<{ connected: boolean; org?: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'publish' | 'metrics'>('publish');
  const [metrics, setMetrics] = useState<LIMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedInAccount>(ACCOUNTS[0]);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    loadPosts();
    checkLinkedInConnection();
    loadSavedPosts();
  }, []);

  // Recalculate published slugs when account changes
  useEffect(() => {
    updatePublishedSlugs(savedPosts, selectedAccount.id);
  }, [selectedAccount.id, savedPosts]);

  async function loadSavedPosts() {
    try {
      const saved = await getLIScheduledPosts();
      const now = new Date();
      // Auto-update scheduled posts whose date/time has passed
      for (const sp of saved) {
        if (sp.status === 'scheduled' && sp.scheduledDate && sp.scheduledTime) {
          const scheduled = new Date(`${sp.scheduledDate}T${sp.scheduledTime}:00`);
          if (scheduled <= now) {
            sp.status = 'sent';
            updateLIScheduledPost(sp.id, { status: 'sent' }).catch(() => {});
          }
        }
      }
      setSavedPosts(saved);
      // Mark slugs as used — filtered by selected account
      updatePublishedSlugs(saved, selectedAccount.id);
    } catch (err) {
      console.error('Error loading saved LI posts:', err);
    }
  }

  function updatePublishedSlugs(posts: SavedPost[], accountId: string) {
    const slugs = new Set(
      posts.filter((p) => (p.account || 'growth4u') === accountId).map((p) => p.blogSlug)
    );
    setPublishedSlugs(slugs);
  }

  async function loadMetrics() {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const res = await fetch(`${FUNCTION_URL}?action=metrics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setMetrics(data as LIMetrics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cargando metricas';
      setMetricsError(msg);
    }
    setMetricsLoading(false);
  }

  async function checkLinkedInConnection() {
    try {
      const res = await fetch(FUNCTION_URL);
      const data = await res.json();
      setLinkedinStatus(data);
    } catch {
      setLinkedinStatus({ connected: false });
    }
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts as BlogPost[]);
    } catch {
      console.error('Error loading posts');
    }
    setLoading(false);
  }

  async function addToQueue(post: BlogPost) {
    // Add to queue immediately with generating status
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const account = selectedAccount;
    const newItem: QueueItem = {
      post,
      caption: 'Generando caption con IA...',
      liImageUrl: '',
      status: 'generating',
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: '10:00',
      account: account.id,
    };

    setQueue((prev) => [...prev, newItem]);
    const idx = queue.length;

    try {
      // Generate caption and image in parallel
      const [caption, blob] = await Promise.all([
        generateCaption(post),
        generateLIImage(post.title, account.template),
      ]);

      const url = await uploadToCloudinary(blob, post.slug);

      setQueue((prev) => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], caption, liImageUrl: url, status: 'draft' };
        }
        return updated;
      });
    } catch (err) {
      setQueue((prev) => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], status: 'error', error: String(err) };
        }
        return updated;
      });
    }
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, updates: Partial<QueueItem>) {
    setQueue((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }

  async function publishNow(index: number) {
    const item = queue[index];
    updateItem(index, { status: 'sending', error: undefined });

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.caption,
          imageUrl: item.liImageUrl,
          account: item.account,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');

      // Save to Firestore
      const firestoreId = await createLIScheduledPost({
        imageUrl: item.liImageUrl,
        caption: item.caption,
        blogTitle: item.post.title,
        blogSlug: item.post.slug,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().slice(0, 5),
        status: 'sent',
        account: item.account,
      });

      updateItem(index, { status: 'sent', firestoreId });
      setPublishedSlugs((prev) => new Set([...prev, item.post.slug]));
      loadSavedPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      updateItem(index, { status: 'error', error: msg });
    }
  }

  async function publishAll() {
    const drafts = queue
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.status === 'draft');

    for (const { i } of drafts) {
      await publishNow(i);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  async function schedulePost(index: number) {
    const item = queue[index];
    if (!item.liImageUrl || !item.caption) return;

    updateItem(index, { status: 'scheduling', error: undefined });

    try {
      const dateTime = `${item.scheduledDate}T${item.scheduledTime}:00`;
      const res = await fetch('/.netlify/functions/metricool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.caption,
          imageUrl: item.liImageUrl,
          account: item.account,
          publicationDate: {
            dateTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al programar');

      // Save to Firestore
      const firestoreId = await createLIScheduledPost({
        imageUrl: item.liImageUrl,
        caption: item.caption,
        blogTitle: item.post.title,
        blogSlug: item.post.slug,
        scheduledDate: item.scheduledDate,
        scheduledTime: item.scheduledTime,
        status: 'scheduled',
        account: item.account,
      });

      updateItem(index, { status: 'scheduled', firestoreId });
      setPublishedSlugs((prev) => new Set([...prev, item.post.slug]));
      loadSavedPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      updateItem(index, { status: 'error', error: msg });
    }
  }

  async function markAsPublished(post: BlogPost) {
    try {
      await createLIScheduledPost({
        imageUrl: post.image || '',
        caption: '(publicado manualmente)',
        blogTitle: post.title,
        blogSlug: post.slug,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().slice(0, 5),
        status: 'sent',
        account: selectedAccount.id,
      });
      setPublishedSlugs((prev) => new Set([...prev, post.slug]));
      loadSavedPosts();
    } catch (err) {
      console.error('Error marking as published:', err);
    }
  }

  async function deleteSavedPost(id: string, slug: string) {
    try {
      await deleteLIScheduledPost(id);
      setSavedPosts((prev) => prev.filter((p) => p.id !== id));
      setPublishedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    } catch (err) {
      console.error('Error deleting saved post:', err);
    }
  }

  const accountSavedPosts = savedPosts.filter((p) => (p.account || 'growth4u') === selectedAccount.id);
  const accountQueue = queue.filter((q) => q.account === selectedAccount.id);
  const draftCount = accountQueue.filter((i) => i.status === 'draft').length;

  const DELAY_MSG = 'Enviado a Metricool. Puede tardar ~5 min en aparecer en LinkedIn.';

  return (
    <div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#032149]">LinkedIn</h1>
            {/* Account selector */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedAccount.color }}>
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-[#032149]">{selectedAccount.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showAccountMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 min-w-[160px]">
                  {ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => { setSelectedAccount(acc); setShowAccountMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        acc.id === selectedAccount.id ? 'bg-slate-50 font-medium' : ''
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: acc.color }}>
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span>{acc.name}</span>
                      {acc.id === selectedAccount.id && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-slate-500 mt-1">Genera y publica posts de LinkedIn desde tus blogs</p>
          {linkedinStatus && (
            <div className="mt-2">
              {linkedinStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Conectado: {linkedinStatus.org}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" /> No conectado
                </span>
              )}
            </div>
          )}
        </div>
        {activeTab === 'publish' && draftCount > 0 && (
          <button
            onClick={publishAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#005f8d] transition-colors"
          >
            <Send className="w-4 h-4" />
            Publicar todos ({draftCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('publish')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'publish'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          Publicar
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'metrics'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Metricas
        </button>
      </div>

      {/* Metrics Tab — shows posts from Firestore */}
      {activeTab === 'metrics' && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Total posts
              </div>
              <p className="text-2xl font-bold text-[#032149]">{accountSavedPosts.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enviados
              </div>
              <p className="text-2xl font-bold text-green-600">
                {accountSavedPosts.filter((p) => p.status === 'sent').length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Programados
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {accountSavedPosts.filter((p) => p.status === 'scheduled').length}
              </p>
            </div>
          </div>

          {/* Posts history */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#032149]">Historial de publicaciones</h2>
            <button
              onClick={loadSavedPosts}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0077B5] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {accountSavedPosts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay posts publicados todavia para {selectedAccount.name}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left p-3 font-medium text-slate-500">Post</th>
                      <th className="text-left p-3 font-medium text-slate-500">Estado</th>
                      <th className="text-left p-3 font-medium text-slate-500">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSavedPosts.map((sp) => (
                      <tr key={sp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {sp.imageUrl && (
                              <img
                                src={sp.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                                onClick={() => setPreviewUrl(sp.imageUrl)}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[#032149] line-clamp-1">{sp.blogTitle}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{sp.caption.split('\n')[0]?.slice(0, 80)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {sp.status === 'sent' && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Enviado</span>
                          )}
                          {sp.status === 'scheduled' && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Programado</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {sp.scheduledDate} {sp.scheduledTime}
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

      {/* Publish Tab */}
      {activeTab === 'publish' && <>

      {/* Queue — always on top */}
      {accountQueue.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#032149] mb-4">
            Cola de publicacion ({accountQueue.length})
          </h2>
          <div className="space-y-4">
            {queue.map((item, index) => {
              if (item.account !== selectedAccount.id) return null;
              return (
              <div
                key={`${item.post.slug}-${index}`}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="relative w-32 flex-shrink-0">
                    {item.status === 'generating' ? (
                      <div className="w-32 h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#0077B5] animate-spin" />
                      </div>
                    ) : item.liImageUrl ? (
                      <div className="relative group">
                        <img
                          src={item.liImageUrl}
                          alt=""
                          className="w-32 h-40 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setPreviewUrl(item.liImageUrl)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
                        >
                          <Eye className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-40 bg-red-50 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#032149] text-sm">{item.post.title}</h3>
                      <div className="flex items-center gap-2">
                        {/* Status badge */}
                        {item.status === 'generating' && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" /> Generando...
                          </span>
                        )}
                        {item.status === 'draft' && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Listo
                          </span>
                        )}
                        {item.status === 'sending' && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" /> Enviando a Metricool...
                          </span>
                        )}
                        {item.status === 'scheduling' && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" /> Programando...
                          </span>
                        )}
                        {item.status === 'sent' && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Enviado a Metricool
                          </span>
                        )}
                        {item.status === 'scheduled' && (
                          <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            <Calendar className="w-3 h-3" /> Programado
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                        <button
                          onClick={() => removeFromQueue(index)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Caption */}
                    <textarea
                      value={item.caption}
                      onChange={(e) => updateItem(index, { caption: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0077B5]"
                      rows={3}
                    />

                    {/* Schedule controls */}
                    {item.status === 'draft' && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="date"
                            value={item.scheduledDate}
                            onChange={(e) => updateItem(index, { scheduledDate: e.target.value })}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0077B5]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="time"
                            value={item.scheduledTime}
                            onChange={(e) => updateItem(index, { scheduledTime: e.target.value })}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0077B5]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      {item.status === 'draft' && (
                        <>
                          <button
                            onClick={() => publishNow(index)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-[#0077B5] text-white rounded-lg hover:bg-[#005f8d] transition-colors"
                          >
                            <Send className="w-3 h-3" /> Publicar ahora
                          </button>
                          <button
                            onClick={() => schedulePost(index)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Calendar className="w-3 h-3" /> Programar
                          </button>
                        </>
                      )}

                      {item.status === 'error' && (
                        <button
                          onClick={() => updateItem(index, { status: 'draft', error: undefined })}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Reintentar
                        </button>
                      )}
                    </div>

                    {(item.status === 'sent' || item.status === 'scheduled') && (
                      <p className="text-xs text-slate-400 mt-1">{DELAY_MSG}</p>
                    )}

                    {item.error && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Saved/Sent posts */}
      {accountSavedPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#032149] mb-4">
            Posts enviados ({accountSavedPosts.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 font-medium text-slate-500">Post</th>
                    <th className="text-left p-3 font-medium text-slate-500">Estado</th>
                    <th className="text-left p-3 font-medium text-slate-500">Fecha</th>
                    <th className="text-center p-3 font-medium text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {accountSavedPosts.map((sp) => (
                    <tr key={sp.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {sp.imageUrl && (
                            <img
                              src={sp.imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                              onClick={() => setPreviewUrl(sp.imageUrl)}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#032149] line-clamp-1">{sp.blogTitle}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{sp.caption.split('\n')[0]?.slice(0, 80)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {sp.status === 'sent' && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Enviado</span>
                        )}
                        {sp.status === 'scheduled' && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Programado</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {sp.scheduledDate} {sp.scheduledTime}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteSavedPost(sp.id, sp.blogSlug)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          title="Eliminar y desbloquear blog"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Blog posts grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[#032149] mb-4">Seleccionar blog posts</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#0077B5] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => {
              const inQueue = queue.some((q) => q.post.slug === post.slug);
              const isUsed = publishedSlugs.has(post.slug);
              return (
                <div
                  key={post.id}
                  className={`bg-white rounded-xl border p-4 transition-all ${
                    isUsed
                      ? 'border-green-200 bg-green-50/50 opacity-60'
                      : inQueue
                      ? 'border-[#0077B5] bg-blue-50 opacity-60'
                      : 'border-slate-200 hover:border-[#0077B5] hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => !inQueue && !isUsed && addToQueue(post)}
                >
                  <div className="flex items-start gap-3">
                    {post.image ? (
                      <img src={post.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[#032149] line-clamp-2">{post.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {post.category}
                        </span>
                        {isUsed && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Publicado en LI
                          </span>
                        )}
                      </div>
                    </div>
                    {!isUsed && !inQueue && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsPublished(post); }}
                        className="p-1 text-slate-300 hover:text-green-500 transition-colors flex-shrink-0"
                        title="Marcar como ya publicado"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    {inQueue && !isUsed && <CheckCircle2 className="w-5 h-5 text-[#0077B5] flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty state */}
      {accountQueue.length === 0 && accountSavedPosts.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Selecciona blog posts para generar contenido de LinkedIn</p>
        </div>
      )}

      </>}

      {/* Full-size preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-lg w-full">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewUrl} alt="Preview" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
