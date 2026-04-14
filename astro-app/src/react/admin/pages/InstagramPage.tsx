import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  X,
  ImageIcon,
  BarChart3,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Users,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Video,
  Lightbulb,
  FileText,
  Edit3,
} from 'lucide-react';
import {
  getAllPosts,
  getIGScheduledPosts,
  createIGScheduledPost,
  deleteIGScheduledPost,
  getAllContentIdeas,
  type ContentIdea,
} from '../../../lib/firebase-client';
import VideoTab from './VideoTab';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  createdAt: string | null;
}

interface SavedScheduledPost {
  id: string;
  imageUrl: string;
  caption: string;
  blogTitle: string;
  blogSlug: string;
  scheduledAt: Date;
  status: string;
  error: string;
  mediaId: string;
  createdAt: Date | null;
}

const FUNCTION_URL = '/api/instagram';
const CLOUDINARY_CLOUD = 'dsc0jsbkz';
const CLOUDINARY_PRESET = 'blog_uploads';

// Avatar templates on Cloudinary (5 variants) with text area coordinates (at 1728x2304)
const AVATAR_TEMPLATES = [
  { url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772721430/ig-avatar-0.jpg', textX: 840, textY: 191, textW: 724, textH: 836 },
  { url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772721433/ig-avatar-1.jpg', textX: 172, textY: 196, textW: 754, textH: 858 },
  { url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772721450/ig-avatar-2.jpg', textX: 848, textY: 192, textW: 712, textH: 850 },
  { url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772721454/ig-avatar-3.jpg', textX: 164, textY: 175, textW: 772, textH: 872 },
  { url: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1772721458/ig-avatar-4.jpg', textX: 168, textY: 199, textW: 756, textH: 858 },
];

// --- Canvas image generator (1080x1350 vertical with avatar) ---

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

async function generateIGImage(title: string, _category: string, templateIndex: number): Promise<Blob> {
  // Work at original template resolution (1728x2304) for quality
  const W = 1728;
  const H = 2304;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Load avatar template with its text area coordinates
  const template = AVATAR_TEMPLATES[templateIndex % AVATAR_TEMPLATES.length];
  const templateImg = await loadImage(template.url);

  // Draw template at full resolution
  ctx.drawImage(templateImg, 0, 0, W, H);

  // Write title text inside the empty speech bubble
  const { textX, textY, textW, textH } = template;
  const padding = 60;
  const maxTextWidth = textW - padding * 2;

  // Comic-style bold font — dynamically sized to fit bubble, uppercase for punch
  const titleUpper = title.toUpperCase();
  const fontFamily = '"Comic Sans MS", "Comic Neue", Impact, system-ui, sans-serif';

  // Start with a base font size and shrink until text fits within the bubble
  let fontSize = titleUpper.length > 100 ? 42 : titleUpper.length > 70 ? 48 : titleUpper.length > 40 ? 56 : 64;
  const minFontSize = 28;
  let lines: string[];
  let lineHeight: number;
  let totalTextHeight: number;

  do {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    lines = wrapText(ctx, titleUpper, maxTextWidth);
    lineHeight = fontSize * 1.25;
    totalTextHeight = lines.length * lineHeight;
    if (totalTextHeight <= textH - padding) break;
    fontSize -= 2;
  } while (fontSize >= minFontSize);

  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';

  const textCenterX = textX + textW / 2;
  const textStartY = textY + (textH - totalTextHeight) / 2 + fontSize * 0.35;

  // Clip to bubble area so text never overflows
  ctx.save();
  ctx.beginPath();
  ctx.rect(textX, textY, textW, textH);
  ctx.clip();

  // Draw each line with slight letter spacing for comic feel
  lines.forEach((line, i) => {
    const y = textStartY + i * lineHeight;
    // Draw text with tracking (letter-spacing) by drawing char by char
    const spacing = 2;
    const totalWidth = ctx.measureText(line).width + (line.length - 1) * spacing;
    let x = textCenterX - totalWidth / 2;
    for (const char of line) {
      ctx.fillText(char, x + ctx.measureText(char).width / 2, y);
      x += ctx.measureText(char).width + spacing;
    }
  });

  ctx.restore();

  // Scale down to 1080x1350 for Instagram
  const outCanvas = document.createElement('canvas');
  outCanvas.width = 1080;
  outCanvas.height = 1350;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.drawImage(canvas, 0, 0, 1080, 1350);

  return new Promise((resolve) => {
    outCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
  });
}

async function uploadToCloudinary(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: form }
  );
  const data = await res.json();
  return data.secure_url;
}

// --- Metrics types ---

interface IGAccount {
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

interface IGMedia {
  id: string;
  caption: string;
  like_count: number;
  comments_count: number;
  timestamp: string;
  media_url: string;
  permalink: string;
  media_type: string;
  impressions: number;
  reach: number;
  saved: number;
  shares: number;
}

// ============================================================
// CREATE IG TAB — Source → Editor → Preview (same flow as LinkedIn)
// ============================================================

type IGCreateStep = 'source' | 'editor' | 'preview';

function CreateIGTab({ ideasList, blogList, publishedSlugs, onPublish, onSchedule }: {
  ideasList: (ContentIdea & { id: string })[];
  blogList: BlogPost[];
  publishedSlugs: Set<string>;
  onPublish: (title: string, caption: string, imageUrl: string, blogSlug?: string) => Promise<void>;
  onSchedule: (title: string, caption: string, imageUrl: string, blogSlug: string | undefined, scheduledAt: Date) => Promise<void>;
}) {
  const [step, setStep] = useState<IGCreateStep>('source');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-select idea from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ideaId = params.get('ideaId');
    if (ideaId && ideasList.length > 0) {
      const idea = ideasList.find(i => i.id === ideaId);
      if (idea) {
        setTitle(idea.topic);
        setCaption(idea.angle + (idea.sourceInspiration ? `\n\nInspiración: ${idea.sourceInspiration}` : ''));
        setStep('editor');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [ideasList]);

  // Render preview image when on preview step
  useEffect(() => {
    if (step !== 'preview' || !previewCanvasRef.current || generatedImageUrl) return;
    // Auto-generate image on preview step
    (async () => {
      try {
        const templateIdx = Math.floor(Math.random() * AVATAR_TEMPLATES.length);
        const blob = await generateIGImage(title, '', templateIdx);
        const url = await uploadToCloudinary(blob);
        setGeneratedImageUrl(url);
      } catch (err) {
        console.error('Error generating image:', err);
        setError('Error generando imagen');
      }
    })();
  }, [step]);

  function selectIdea(idea: ContentIdea & { id: string }) {
    setTitle(idea.topic);
    setCaption(idea.angle + (idea.sourceInspiration ? `\n\nInspiración: ${idea.sourceInspiration}` : ''));
    setBlogSlug('');
    setStep('editor');
  }

  function selectBlog(blog: BlogPost) {
    setTitle(blog.title);
    setCaption(blog.excerpt);
    setBlogSlug(blog.slug);
    setStep('editor');
  }

  function startManual() {
    setTitle('');
    setCaption('');
    setBlogSlug('');
    setStep('editor');
  }

  async function handleGenerateCaption() {
    if (!title.trim()) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/generate-caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'instagram', title, excerpt: caption || title, slug: blogSlug, category: 'Growth' }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
    } catch (err: any) { setError(err.message); }
    setGenerating(false);
  }

  async function handlePublish() {
    setPublishing(true); setError('');
    try {
      let imageUrl = generatedImageUrl;
      if (!imageUrl) {
        const templateIdx = Math.floor(Math.random() * AVATAR_TEMPLATES.length);
        const blob = await generateIGImage(title, '', templateIdx);
        imageUrl = await uploadToCloudinary(blob);
        setGeneratedImageUrl(imageUrl);
      }
      await onPublish(title, caption, imageUrl, blogSlug || undefined);
      // Reset
      setStep('source'); setTitle(''); setCaption(''); setBlogSlug(''); setGeneratedImageUrl('');
    } catch (err: any) { setError(err.message); }
    setPublishing(false);
  }

  async function handleSchedule() {
    if (!scheduledDate) { setError('Selecciona fecha'); return; }
    setPublishing(true); setError('');
    try {
      let imageUrl = generatedImageUrl;
      if (!imageUrl) {
        const templateIdx = Math.floor(Math.random() * AVATAR_TEMPLATES.length);
        const blob = await generateIGImage(title, '', templateIdx);
        imageUrl = await uploadToCloudinary(blob);
        setGeneratedImageUrl(imageUrl);
      }
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      await onSchedule(title, caption, imageUrl, blogSlug || undefined, dateTime);
      setStep('source'); setTitle(''); setCaption(''); setBlogSlug(''); setGeneratedImageUrl(''); setScheduledDate('');
    } catch (err: any) { setError(err.message); }
    setPublishing(false);
  }

  // ===================== STEP 1: SOURCE =====================
  if (step === 'source') {
    return (
      <div className="space-y-6">
        {/* Quick create */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={startManual}
            className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-pink-400 transition-all text-left">
            <Edit3 className="w-6 h-6 text-pink-500 mb-3" />
            <p className="font-semibold text-[#032149]">Crear manual</p>
            <p className="text-xs text-slate-400 mt-1">Escribe tu post desde cero</p>
          </button>
          <button onClick={() => { startManual(); setTimeout(() => handleGenerateCaption(), 100); }}
            disabled={generating}
            className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-[#3ecda5] transition-all text-left">
            <Sparkles className="w-6 h-6 text-[#3ecda5] mb-3" />
            <p className="font-semibold text-[#032149]">Generar con IA</p>
            <p className="text-xs text-slate-400 mt-1">Claude genera el contenido completo</p>
          </button>
          <div className="p-6 bg-gradient-to-br from-[#6351d5]/5 to-pink-500/5 border-2 border-[#6351d5]/20 rounded-xl">
            <Lightbulb className="w-6 h-6 text-[#6351d5] mb-3" />
            <p className="font-semibold text-[#032149]">Desde Ideas Hub</p>
            <p className="text-xs text-slate-400 mt-1">{ideasList.length} ideas disponibles</p>
          </div>
        </div>

        {/* Ideas from Hub */}
        {ideasList.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#032149] mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#6351d5]" /> Ideas Hub ({ideasList.length})
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {ideasList.map(idea => (
                <button key={idea.id} onClick={() => selectIdea(idea)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-[#6351d5] hover:bg-[#6351d5]/5 transition-colors">
                  <p className="text-sm font-medium text-[#032149]">{idea.topic}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{idea.angle}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blog posts */}
        {blogList.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#032149] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-500" /> Blog Posts ({blogList.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto">
              {blogList.filter(b => !publishedSlugs.has(b.slug)).slice(0, 12).map(blog => (
                <button key={blog.id} onClick={() => selectBlog(blog)}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-pink-400 transition-colors">
                  {blog.image && <img src={blog.image} alt="" className="w-full h-16 object-cover rounded mb-1.5" />}
                  <p className="text-[11px] font-medium text-[#032149] line-clamp-2">{blog.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== STEP 2: EDITOR =====================
  if (step === 'editor') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => { setStep('source'); setGeneratedImageUrl(''); }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Volver a fuentes
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Título / Tema</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-400"
              placeholder="El tema principal del post" />
          </div>

          {/* Generate caption button */}
          {title.trim() && (
            <button onClick={handleGenerateCaption}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#3ecda5] to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 w-full justify-center">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generando...' : 'Generar caption con IA'}
            </button>
          )}

          {/* Caption */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-400 font-mono"
              placeholder="El caption del post de Instagram..." />
            <p className="text-xs text-slate-400 mt-1">{caption.length} / 2,200 caracteres</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Next: Preview */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setStep('preview'); setGeneratedImageUrl(''); setError(''); }} disabled={!caption.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 disabled:opacity-50 transition-colors ml-auto">
              <Eye className="w-4 h-4" /> Vista previa y publicar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== STEP 3: PREVIEW & PUBLISH =====================
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setStep('editor')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          ← Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-xs font-medium text-slate-500 mb-3">Preview imagen (4:5)</h4>
          {generatedImageUrl ? (
            <img src={generatedImageUrl} alt={title} className="w-full rounded-lg shadow-lg" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
          ) : (
            <div className="w-full bg-gradient-to-br from-[#032149] via-[#1a3690] to-pink-500 rounded-lg flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <canvas ref={previewCanvasRef} className="hidden" />
        </div>

        {/* Right: Caption + Publish */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-medium text-slate-500">Caption</h4>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-[#032149] whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {caption}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Publish now */}
          <button onClick={handlePublish} disabled={publishing || !caption.trim() || !generatedImageUrl}
            className="w-full flex items-center gap-2 justify-center px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Publicando...' : 'Publicar ahora'}
          </button>

          {/* Schedule */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">O programar para después</p>
            <div className="flex items-center gap-2">
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-400" />
              <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-400" />
              <button onClick={handleSchedule} disabled={publishing || !caption.trim() || !generatedImageUrl || !scheduledDate}
                className="flex items-center gap-1 text-xs text-pink-500 border border-pink-500 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 transition-colors disabled:opacity-50">
                <Clock className="w-3.5 h-3.5" /> Programar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function CameraPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'publish' | 'metrics' | 'video'>('publish');
  const [metrics, setMetrics] = useState<{ account: IGAccount; media: IGMedia[] } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [savedPosts, setSavedPosts] = useState<SavedScheduledPost[]>([]);
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set());
  const [ideasList, setIdeasList] = useState<(ContentIdea & { id: string })[]>([]);

  useEffect(() => {
    Promise.all([
      getAllPosts().then(allPosts => setPosts(allPosts as BlogPost[])),
      getIGScheduledPosts().then(saved => {
        setSavedPosts(saved as SavedScheduledPost[]);
        const slugs = new Set<string>();
        for (const p of saved) {
          if (p.status === 'pending' || p.status === 'published' || p.status === 'publishing') {
            slugs.add(p.blogSlug);
          }
        }
        setPublishedSlugs(slugs);
      }),
      getAllContentIdeas().then(all => setIdeasList(all.filter(i => i.status === 'idea' || i.status === 'draft' || i.status === 'assigned'))),
    ]).catch(e => console.error('Error loading data:', e)).finally(() => setLoading(false));
  }, []);

  async function loadSavedPosts() {
    try {
      const saved = await getIGScheduledPosts();
      setSavedPosts(saved as SavedScheduledPost[]);
      const slugs = new Set<string>();
      for (const p of saved) {
        if (p.status === 'pending' || p.status === 'published' || p.status === 'publishing') {
          slugs.add(p.blogSlug);
        }
      }
      setPublishedSlugs(slugs);
    } catch (e) {
      console.error('Error loading saved posts:', e);
    }
  }

  async function loadMetrics() {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const res = await fetch(FUNCTION_URL);
      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Función no disponible (${res.status})`);
      }
      if (!res.ok) {
        throw new Error((data.error as string) || `Error ${res.status}`);
      }
      setMetrics(data as unknown as { account: IGAccount; media: IGMedia[] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cargando métricas';
      setMetricsError(msg);
    }
    setMetricsLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#3ecda5] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#032149] flex items-center gap-3">
            <Camera className="w-7 h-7 text-pink-500" />
            Instagram
          </h1>
          <p className="text-slate-500 mt-1">
            Publica y programa posts desde tu contenido del blog
          </p>
        </div>
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
          onClick={() => { setActiveTab('metrics'); if (!metrics && !metricsLoading) loadMetrics(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'metrics'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Métricas
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'video'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
      </div>

      {/* Video Tab */}
      {activeTab === 'video' && (
        <VideoTab
          blogPosts={posts.map(p => ({ id: p.id, title: p.title, slug: p.slug, content: p.content, excerpt: p.excerpt }))}
          platform="instagram"
          onPublish={async (videoUrl, caption) => {
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'publish-reel', video_url: videoUrl, caption }),
            });
            const text = await res.text();
            let data: Record<string, unknown>;
            try { data = JSON.parse(text); } catch { throw new Error(`Error (${res.status}): ${text.slice(0, 200)}`); }
            if (!res.ok) throw new Error((data.error as string) || `Error ${res.status}`);
          }}
        />
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div>
          {metricsLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#3ecda5] animate-spin" />
            </div>
          )}

          {metricsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
              {metricsError}
            </div>
          )}

          {metrics && !metricsLoading && (
            <>
              {/* Account overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    Seguidores
                  </div>
                  <p className="text-2xl font-bold text-[#032149]">
                    {metrics.account.followers_count.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    Siguiendo
                  </div>
                  <p className="text-2xl font-bold text-[#032149]">
                    {metrics.account.follows_count.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Publicaciones
                  </div>
                  <p className="text-2xl font-bold text-[#032149]">
                    {metrics.account.media_count.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Engagement rate
                  </div>
                  <p className="text-2xl font-bold text-[#032149]">
                    {metrics.media.length > 0
                      ? (
                          (metrics.media.reduce((sum, m) => sum + m.like_count + m.comments_count, 0) /
                            metrics.media.length /
                            Math.max(metrics.account.followers_count, 1)) *
                          100
                        ).toFixed(2) + '%'
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Refresh button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#032149]">
                  Últimas publicaciones
                </h2>
                <button
                  onClick={loadMetrics}
                  disabled={metricsLoading}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#3ecda5] transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>

              {/* Media table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left p-3 font-medium text-slate-500">Post</th>
                        <th className="text-center p-3 font-medium text-slate-500">
                          <Heart className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-3 font-medium text-slate-500">
                          <MessageCircle className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-3 font-medium text-slate-500">
                          <Bookmark className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-3 font-medium text-slate-500">
                          <Share2 className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-3 font-medium text-slate-500">
                          <Eye className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-3 font-medium text-slate-500">Alcance</th>
                        <th className="text-center p-3 font-medium text-slate-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.media.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {m.media_url && (
                                <img
                                  src={m.media_url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-[#032149] line-clamp-2 leading-tight">
                                  {m.caption?.split('\n')[0]?.slice(0, 80) || '—'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(m.timestamp).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.like_count}</td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.comments_count}</td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.saved}</td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.shares}</td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.impressions.toLocaleString()}</td>
                          <td className="text-center p-3 text-slate-700 font-medium">{m.reach.toLocaleString()}</td>
                          <td className="text-center p-3">
                            <a
                              href={m.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-[#3ecda5] transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Publish Tab — Stepped flow: Source → Editor → Preview */}
      {activeTab === 'publish' && <>

      {/* Saved scheduled posts from Firebase */}
      {savedPosts.filter((p) => p.status === 'pending').length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#032149] flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Programados ({savedPosts.filter((p) => p.status === 'pending').length})
            </h2>
            <button
              onClick={async () => {
                const res = await fetch(`${FUNCTION_URL}?action=cron`);
                const data = await res.json();
                alert(`Publicados: ${data.processed || 0}`);
                loadSavedPosts();
              }}
              className="flex items-center gap-2 text-sm text-[#3ecda5] hover:underline"
            >
              <Send className="w-4 h-4" />
              Publicar pendientes ahora
            </button>
          </div>
          <div className="space-y-3">
            {savedPosts
              .filter((p) => p.status === 'pending')
              .map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-blue-200 bg-blue-50/30 p-4 flex items-center justify-between">
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt="" className="w-12 h-15 rounded-lg object-cover flex-shrink-0 mr-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#032149] text-sm">{p.blogTitle}</h3>
                    <p className="text-xs text-blue-600 mt-1">
                      Programado: {p.scheduledAt.toLocaleDateString('es-ES')} a las {p.scheduledAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {p.imageUrl && (
                      <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-[#3ecda5] transition-colors"
                        title="Preview">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await deleteIGScheduledPost(p.id);
                      loadSavedPosts();
                    }}
                    className="text-xs text-red-400 hover:text-red-600 ml-4"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Reset button */}
      {savedPosts.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={async () => {
              if (!confirm('¿Reiniciar todo? Se borrarán todos los posts programados/publicados guardados y se desbloquearán todos los blogs.')) return;
              for (const p of savedPosts) {
                await deleteIGScheduledPost(p.id);
              }
              setSavedPosts([]);
              setPublishedSlugs(new Set());
            }}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reiniciar todo (desbloquear blogs)
          </button>
        </div>
      )}

      <CreateIGTab
        ideasList={ideasList}
        blogList={posts}
        publishedSlugs={publishedSlugs}
        onPublish={async (title, caption, imageUrl, blogSlug) => {
          try {
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'publish', image_url: imageUrl, caption }),
            });
            const text = await res.text();
            let data: Record<string, unknown>;
            try { data = JSON.parse(text); } catch { throw new Error(`Función no disponible (${res.status})`); }
            if (!res.ok) throw new Error((data.error as string) || `Error ${res.status}`);

            await createIGScheduledPost({
              imageUrl,
              caption,
              blogTitle: title,
              blogSlug: blogSlug || '',
              scheduledAt: new Date(),
            });
            if (blogSlug) setPublishedSlugs(prev => new Set([...prev, blogSlug]));
            loadSavedPosts();
          } catch (err: any) {
            throw err;
          }
        }}
        onSchedule={async (title, caption, imageUrl, blogSlug, scheduledAt) => {
          await createIGScheduledPost({
            imageUrl,
            caption,
            blogTitle: title,
            blogSlug: blogSlug || '',
            scheduledAt,
          });
          if (blogSlug) setPublishedSlugs(prev => new Set([...prev, blogSlug]));
          loadSavedPosts();
        }}
      />

      </>}
    </div>
  );
}
