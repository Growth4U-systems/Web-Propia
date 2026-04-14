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
  FileText,
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Edit3,
  Check,
  ExternalLink,
  Video,
  Lightbulb,
} from 'lucide-react';
import VideoTab from './VideoTab';
import {
  getAllPosts,
  getLIScheduledPosts,
  createLIScheduledPost,
  deleteLIScheduledPost,
  updateLIScheduledPost,
  getAllLIContentPosts,
  createLIContentPost,
  updateLIContentPost,
  deleteLIContentPost,
  getAllContentIdeas,
  type LIContentPost,
  type LIContentFormat,
  type LIContentStatus,
  type LICarouselSlide,
  type ContentIdea,
} from '../../../lib/firebase-client';

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

const FUNCTION_URL = '/api/linkedin';
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
    color: '#3ecda5',
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

async function generateLIImage(text: string, _template: LinkedInAccount['template'], carouselTemplate?: CarouselTemplate): Promise<Blob> {
  const t = carouselTemplate || CAROUSEL_TEMPLATES[0];
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background — from selected template
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // Hex pattern
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = t.cardBg;
  ctx.lineWidth = 0.8;
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 14; col++) {
      const x = col * 100 + (row % 2 ? 50 : 0);
      const y = row * 86;
      drawHexagon(ctx, x, y, 45);
    }
  }
  ctx.globalAlpha = 1;

  // Card
  roundRect(ctx, 60, 80, 960, 1190, 24, t.cardBg);

  // GROWTH4U watermark
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 22px Inter, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GROWTH4U', 100, 56);

  // Decorative sparkle icon
  const cx = 540, cy = 230;
  ctx.fillStyle = t.accentColor;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -30, 5, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Topic pill
  const pillText = 'GROWTH AUTOMATION';
  ctx.font = 'bold 20px Inter, Helvetica, Arial, sans-serif';
  const pillW = ctx.measureText(pillText).width + 60;
  roundRect(ctx, 540 - pillW / 2, 310, pillW, 44, 22, t.badgeBg + '20');
  ctx.fillStyle = t.accentColor;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, 540, 339);

  // Title — auto-size
  const upperText = text.toUpperCase();
  const maxW = 820;
  let fontSize = 62;
  let lines: string[] = [];
  for (fontSize = 62; fontSize >= 28; fontSize -= 2) {
    ctx.font = `900 ${fontSize}px Inter, Helvetica, Arial, sans-serif`;
    lines = wrapText(ctx, upperText, maxW);
    if (lines.length * (fontSize * 1.2) <= 500) break;
  }
  ctx.fillStyle = t.titleColor;
  ctx.textAlign = 'center';
  const lineH = fontSize * 1.2;
  const startY = 420 + (500 - lines.length * lineH) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 540, startY + i * lineH);
  }

  // Slide indicator
  ctx.fillStyle = t.accentColor;
  ctx.font = 'bold 20px Inter, Helvetica, Arial, sans-serif';
  ctx.fillText('1 / 1', 540, 1320);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
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
  const res = await fetch('/api/generate-caption', {
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
  if (data.error) throw new Error(data.error);
  if (!data.caption) throw new Error('No caption returned from AI');
  return data.caption;
}

// --- Content formats ---

const FORMAT_OPTIONS: { value: LIContentFormat; label: string; icon: any; description: string }[] = [
  { value: 'text', label: 'Solo texto', icon: FileText, description: 'Post sin imagen' },
  { value: 'image' as any, label: 'Imagen', icon: ImageIcon, description: 'Texto + imagen single' },
  { value: 'carousel', label: 'Carrusel', icon: Layers, description: 'Documento con slides' },
];

const CONTENT_STATUS_OPTIONS: { value: LIContentStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { value: 'ready', label: 'Listo', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'published', label: 'Publicado', color: 'bg-green-50 text-green-600 border-green-200' },
];

// --- Carousel visual templates ---

interface CarouselTemplate {
  id: string;
  name: string;
  preview: string; // emoji/description for selector
  bg: string;
  cardBg: string;
  titleColor: string;
  bodyColor: string;
  badgeBg: string;
  badgeColor: string;
  accentColor: string;
}

const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'warm',
    name: 'Tech Warm',
    preview: '🧡',
    bg: '#D4845A',
    cardBg: '#F5F0EB',
    titleColor: '#1A1A1A',
    bodyColor: '#4A4A4A',
    badgeBg: '#D4845A',
    badgeColor: '#FFFFFF',
    accentColor: '#D4845A',
  },
  {
    id: 'growth4u',
    name: 'Growth4U',
    preview: '💜',
    bg: '#3ecda5',
    cardBg: '#FFFFFF',
    titleColor: '#032149',
    bodyColor: '#374151',
    badgeBg: '#3ecda5',
    badgeColor: '#FFFFFF',
    accentColor: '#3ecda5',
  },
  {
    id: 'dark',
    name: 'Dark Navy',
    preview: '🌑',
    bg: '#032149',
    cardBg: '#0A3A6B',
    titleColor: '#FFFFFF',
    bodyColor: '#CBD5E1',
    badgeBg: '#0faec1',
    badgeColor: '#FFFFFF',
    accentColor: '#45b6f7',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: '⬜',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    titleColor: '#0F172A',
    bodyColor: '#475569',
    badgeBg: '#0F172A',
    badgeColor: '#FFFFFF',
    accentColor: '#0F172A',
  },
];

// --- Canvas slide renderer ---

function renderSlideToCanvas(
  canvas: HTMLCanvasElement,
  slide: { badge?: string; title: string; body: string },
  template: CarouselTemplate,
  slideIndex: number,
  totalSlides: number,
  iscover: boolean,
) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = template.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle hex pattern
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = template.cardBg;
  ctx.lineWidth = 1;
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 100 + (row % 2 ? 50 : 0);
      const y = row * 86;
      drawHexagon(ctx, x, y, 45);
    }
  }
  ctx.globalAlpha = 1;

  // Card
  const cardMargin = 60;
  const cardY = 80;
  const cardW = W - cardMargin * 2;
  const cardH = H - cardY - 80;
  roundRect(ctx, cardMargin, cardY, cardW, cardH, 24, template.cardBg);

  const pad = 70;
  const contentX = cardMargin + pad;
  const contentW = cardW - pad * 2;

  // Clip all text to card bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(cardMargin, cardY, cardW, cardH);
  ctx.clip();

  if (iscover) {
    // Cover slide — big centered title with auto-sizing
    ctx.textAlign = 'center';
    const maxTitleH = slide.body ? cardH * 0.5 : cardH * 0.7;
    let titleSize = 64;
    let titleLines: string[];
    let titleLineH: number;
    do {
      ctx.font = `bold ${titleSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      titleLines = wrapText(ctx, slide.title.toUpperCase(), contentW);
      titleLineH = titleSize * 1.22;
      if (titleLines.length * titleLineH <= maxTitleH) break;
      titleSize -= 2;
    } while (titleSize >= 28);

    ctx.fillStyle = template.titleColor;
    const totalH = titleLines.length * titleLineH + (slide.body ? 30 : 0);
    let subLines: string[] = [];
    let subSize = 28;
    let subLineH = 40;
    if (slide.body) {
      // Auto-size subtitle to fit remaining space
      const remainingH = cardH - 2 * pad - titleLines.length * titleLineH - 30;
      do {
        ctx.font = `400 ${subSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
        subLines = wrapText(ctx, slide.body, contentW - 40);
        subLineH = subSize * 1.4;
        if (subLines.length * subLineH <= remainingH) break;
        subSize -= 2;
      } while (subSize >= 18);
    }
    const totalContentH = titleLines.length * titleLineH + (subLines.length > 0 ? 30 + subLines.length * subLineH : 0);
    const startY = cardY + (cardH - totalContentH) / 2 + titleSize * 0.35;

    ctx.font = `bold ${titleSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = template.titleColor;
    for (let i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], W / 2, startY + i * titleLineH);
    }
    if (subLines.length > 0) {
      ctx.font = `400 ${subSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = template.bodyColor;
      const subY = startY + titleLines.length * titleLineH + 30;
      for (let i = 0; i < subLines.length; i++) {
        ctx.fillText(subLines[i], W / 2, subY + i * subLineH);
      }
    }
  } else {
    // Content slide
    let y = cardY + pad;
    ctx.textAlign = 'left';

    // Badge
    if (slide.badge) {
      ctx.font = `600 22px "Inter", "Helvetica Neue", Arial, sans-serif`;
      const badgeW = ctx.measureText(slide.badge).width + 32;
      roundRect(ctx, contentX, y, badgeW, 42, 8, template.badgeBg);
      ctx.fillStyle = template.badgeColor;
      ctx.fillText(slide.badge, contentX + 16, y + 29);
      y += 66;
    }

    // Title — auto-size
    const maxTitleArea = cardH * 0.35;
    let titleSize = 44;
    let titleLines: string[];
    let titleLineH: number;
    do {
      ctx.font = `bold ${titleSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      titleLines = wrapText(ctx, slide.title, contentW);
      titleLineH = titleSize * 1.28;
      if (titleLines.length * titleLineH <= maxTitleArea) break;
      titleSize -= 2;
    } while (titleSize >= 24);

    ctx.fillStyle = template.titleColor;
    for (let i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], contentX, y + i * titleLineH);
    }
    y += titleLines.length * titleLineH + 20;

    // Body — auto-size to fit remaining card space
    const bottomMargin = 60;
    const remainingH = (cardY + cardH - bottomMargin) - y;
    let bodySize = 28;
    let bodyLines: string[];
    let bodyLineH: number;
    do {
      ctx.font = `400 ${bodySize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
      bodyLines = wrapText(ctx, slide.body, contentW);
      bodyLineH = bodySize * 1.5;
      if (bodyLines.length * bodyLineH <= remainingH) break;
      bodySize -= 2;
    } while (bodySize >= 16);

    ctx.fillStyle = template.bodyColor;
    for (let i = 0; i < bodyLines.length; i++) {
      ctx.fillText(bodyLines[i], contentX, y + i * bodyLineH);
    }
  }

  ctx.restore();

  // Slide indicator
  ctx.textAlign = 'center';
  ctx.fillStyle = template.accentColor;
  ctx.font = `600 20px "Inter", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(`${slideIndex + 1} / ${totalSlides}`, W / 2, H - 30);
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// --- AI content generator ---

async function generateContent(format: 'text' | 'carousel', prompt: string, numSlides?: number) {
  const res = await fetch('/api/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, prompt, numSlides }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content;
}

// ============================================================
// UNIFIED CREATE TAB — Source → Format → Generate → Preview → Publish
// ============================================================

type CreateStep = 'source' | 'editor' | 'preview';
type PostFormat = 'text' | 'image' | 'carousel';

function CreateTab({ selectedAccount, onPublish }: {
  selectedAccount: LinkedInAccount;
  onPublish: (caption: string, imageUrl: string) => Promise<void>;
}) {
  // Step state
  const [step, setStep] = useState<CreateStep>('source');
  const [postFormat, setPostFormat] = useState<PostFormat>('text');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [slides, setSlides] = useState<{ badge?: string; title: string; body: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate>(CAROUSEL_TEMPLATES[0]);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Source picker
  const [ideasList, setIdeasList] = useState<(ContentIdea & { id: string })[]>([]);
  const [blogList, setBlogList] = useState<BlogPost[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);

  // Preview canvas
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load sources + auto-select idea from URL param
  useEffect(() => {
    Promise.all([
      getAllContentIdeas().then(all => {
        const filtered = all.filter(i => i.status === 'idea' || i.status === 'draft' || i.status === 'assigned');
        setIdeasList(filtered);
        // Auto-select idea if ideaId in URL
        const params = new URLSearchParams(window.location.search);
        const ideaId = params.get('ideaId');
        if (ideaId) {
          const idea = filtered.find(i => i.id === ideaId) || all.find(i => i.id === ideaId);
          if (idea) {
            setTitle(idea.topic);
            setCaption(idea.angle + (idea.sourceInspiration ? `\n\nInspiración: ${idea.sourceInspiration}` : ''));
            setStep('editor');
          }
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        return filtered;
      }),
      getAllPosts().then(all => setBlogList(all as BlogPost[])),
    ]).then(() => setSourcesLoaded(true)).catch(() => setSourcesLoaded(true));
  }, []);

  // Render preview image when on preview step
  useEffect(() => {
    if (step !== 'preview' || !previewCanvasRef.current) return;
    if (postFormat === 'text') return;
    if (postFormat === 'image') {
      generateLIImage(title, selectedAccount.template, selectedTemplate).then(async (blob) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = previewCanvasRef.current!;
          canvas.width = 1080; canvas.height = 1350;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
    } else if (postFormat === 'carousel' && slides.length > 0) {
      renderSlideToCanvas(previewCanvasRef.current, slides[0], selectedTemplate, 0, slides.length, true);
    }
  }, [step, postFormat, title, selectedTemplate, slides]);

  function selectIdea(idea: ContentIdea & { id: string }) {
    setTitle(idea.topic);
    setCaption(idea.angle + (idea.sourceInspiration ? `\n\nInspiración: ${idea.sourceInspiration}` : ''));
    setStep('editor');
  }

  function selectBlog(blog: BlogPost) {
    setTitle(blog.title);
    setCaption(blog.excerpt);
    setStep('editor');
  }

  function startManual() {
    setTitle('');
    setCaption('');
    setStep('editor');
  }

  async function handleGenerateCaption() {
    if (!title.trim()) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/generate-caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'linkedin', title, excerpt: caption || title, slug: '', category: 'Growth' }),
      });
      const data = await res.json();
      if (data.caption) {
        const clean = data.caption.replace(/growth4u\.io\/blog\/undefined\/?/g, 'growth4u.io').replace(/growth4u\.io\/blog\/\//g, 'growth4u.io');
        setCaption(clean);
      }
    } catch (err: any) { setError(err.message); }
    setGenerating(false);
  }

  async function handleGenerateCarousel() {
    if (!title.trim()) return;
    setGenerating(true); setError('');
    try {
      const content = await generateContent('carousel', title, 6);
      if (content.slides) {
        setSlides(content.slides);
        setCaption(content.caption || content.body || '');
      }
    } catch (err: any) { setError(err.message); }
    setGenerating(false);
  }

  async function handlePublish() {
    setPublishing(true); setError('');
    try {
      let imageUrl = '';
      if (postFormat === 'image') {
        const blob = await generateLIImage(title, selectedAccount.template, selectedTemplate);
        imageUrl = await uploadToCloudinary(blob, `li-${Date.now()}`);
      } else if (postFormat === 'carousel' && slides.length > 0) {
        // Upload cover slide
        const canvas = document.createElement('canvas');
        renderSlideToCanvas(canvas, slides[0], selectedTemplate, 0, slides.length, true);
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
        imageUrl = await uploadToCloudinary(blob, `li-carousel-${Date.now()}`);
      }
      await onPublish(caption, imageUrl);
      // Reset
      setStep('source'); setTitle(''); setCaption(''); setSlides([]); setGeneratedImageUrl('');
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
            className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-[#0077B5] transition-all text-left">
            <Edit3 className="w-6 h-6 text-[#0077B5] mb-3" />
            <p className="font-semibold text-[#032149]">Crear manual</p>
            <p className="text-xs text-slate-400 mt-1">Escribe tu post desde cero</p>
          </button>
          <button onClick={handleGenerateCarousel}
            disabled={generating}
            className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-[#3ecda5] transition-all text-left">
            <Sparkles className="w-6 h-6 text-[#3ecda5] mb-3" />
            <p className="font-semibold text-[#032149]">Generar con IA</p>
            <p className="text-xs text-slate-400 mt-1">Claude genera el contenido completo</p>
          </button>
          <div className="p-6 bg-gradient-to-br from-[#6351d5]/5 to-[#0077B5]/5 border-2 border-[#6351d5]/20 rounded-xl">
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
              <FileText className="w-4 h-4 text-[#0077B5]" /> Blog Posts ({blogList.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto">
              {blogList.slice(0, 12).map(blog => (
                <button key={blog.id} onClick={() => selectBlog(blog)}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-[#0077B5] transition-colors">
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
          <button onClick={() => setStep('source')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Volver
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {/* Format selector */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">Formato</label>
            <div className="flex gap-3">
              {[
                { value: 'text' as PostFormat, label: 'Solo texto', icon: FileText, desc: 'Sin imagen' },
                { value: 'image' as PostFormat, label: 'Imagen', icon: ImageIcon, desc: 'Texto + imagen' },
                { value: 'carousel' as PostFormat, label: 'Carrusel', icon: Layers, desc: 'Slides' },
              ].map(f => (
                <button key={f.value} onClick={() => {
                  setPostFormat(f.value);
                  if (f.value === 'carousel' && slides.length === 0) setSlides([{ title: '', body: '' }, { title: '', body: '' }, { title: '', body: '' }]);
                }}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${postFormat === f.value ? 'border-[#0077B5] bg-[#0077B5]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <f.icon className={`w-5 h-5 ${postFormat === f.value ? 'text-[#0077B5]' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${postFormat === f.value ? 'text-[#0077B5]' : 'text-slate-600'}`}>{f.label}</p>
                    <p className="text-[10px] text-slate-400">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template selector (for image and carousel) */}
          {postFormat !== 'text' && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Plantilla visual</label>
              <div className="flex gap-3">
                {CAROUSEL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t)}
                    className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 transition-all ${selectedTemplate.id === t.id ? 'border-[#0077B5] bg-[#0077B5]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="w-10 h-14 rounded" style={{ background: t.bg, position: 'relative', overflow: 'hidden' }}>
                      <div className="absolute bottom-1 left-1 right-1 top-3 rounded-sm" style={{ background: t.cardBg }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Título / Tema</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0077B5]"
              placeholder="El tema principal del post" />
          </div>

          {/* Generate caption button */}
          {title.trim() && (
            <button onClick={postFormat === 'carousel' ? handleGenerateCarousel : handleGenerateCaption}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#3ecda5] to-[#0077B5] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 w-full justify-center">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generando...' : postFormat === 'carousel' ? 'Generar carrusel con IA' : 'Generar caption con IA'}
            </button>
          )}

          {/* Caption / Body */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">
              {postFormat === 'carousel' ? 'Caption (texto que acompaña el carrusel)' : 'Cuerpo del post'}
            </label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0077B5] font-mono"
              placeholder="El contenido del post..." />
            <p className="text-xs text-slate-400 mt-1">{caption.length} / 3,000 caracteres</p>
          </div>

          {/* Carousel slides */}
          {postFormat === 'carousel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Slides ({slides.length})</label>
                <button onClick={() => setSlides(prev => [...prev, { title: '', body: '' }])}
                  className="flex items-center gap-1 text-xs text-[#0077B5] hover:text-[#005f8d] font-medium">
                  <Plus className="w-3.5 h-3.5" /> Añadir slide
                </button>
              </div>
              {slides.map((slide, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {i === 0 ? 'Portada' : i === slides.length - 1 ? 'CTA Final' : `Slide ${i + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { if (i > 0) { const s = [...slides]; [s[i], s[i-1]] = [s[i-1], s[i]]; setSlides(s); } }}
                        disabled={i === 0} className="p-1 text-slate-400 hover:text-[#0077B5] disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (i < slides.length - 1) { const s = [...slides]; [s[i], s[i+1]] = [s[i+1], s[i]]; setSlides(s); } }}
                        disabled={i === slides.length - 1} className="p-1 text-slate-400 hover:text-[#0077B5] disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {slides.length > 2 && (
                        <button onClick={() => setSlides(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                  <input value={slide.title} onChange={e => { const s = [...slides]; s[i] = { ...s[i], title: e.target.value }; setSlides(s); }}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white" placeholder={i === 0 ? 'Título portada' : 'Título slide'} />
                  <textarea value={slide.body} onChange={e => { const s = [...slides]; s[i] = { ...s[i], body: e.target.value }; setSlides(s); }}
                    rows={2} className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white" placeholder="Contenido" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Next: Preview */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('preview')} disabled={!caption.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0077B5] text-white text-sm font-medium rounded-lg hover:bg-[#005f8d] disabled:opacity-50 transition-colors ml-auto">
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
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500">
            {postFormat === 'text' ? 'Solo texto' : postFormat === 'image' ? 'Con imagen' : `Carrusel (${slides.length} slides)`}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500">{selectedAccount.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image/Carousel preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-xs font-medium text-slate-500 mb-3">
            {postFormat === 'text' ? 'Sin imagen' : postFormat === 'carousel' ? 'Preview carrusel' : 'Preview imagen'}
          </h4>
          {postFormat === 'text' ? (
            <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Post de solo texto — sin imagen adjunta
            </div>
          ) : (
            <canvas ref={previewCanvasRef} className="w-full rounded-lg shadow-lg" style={{ maxHeight: 400 }} />
          )}
          {postFormat === 'carousel' && slides.length > 1 && (
            <div className="flex gap-1.5 mt-3 justify-center">
              {slides.map((_, i) => (
                <button key={i} onClick={() => {
                  if (previewCanvasRef.current) renderSlideToCanvas(previewCanvasRef.current, slides[i], selectedTemplate, i, slides.length, i === 0);
                }}
                  className="w-7 h-7 rounded text-xs font-medium bg-slate-100 text-slate-500 hover:bg-[#0077B5] hover:text-white transition-colors">
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Caption preview + Publish */}
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

          <div className="flex gap-3 pt-2">
            <button onClick={handlePublish} disabled={publishing || !caption.trim()}
              className="flex-1 flex items-center gap-2 justify-center px-5 py-3 bg-[#0077B5] text-white text-sm font-semibold rounded-lg hover:bg-[#005f8d] disabled:opacity-50 transition-colors">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? 'Publicando...' : 'Publicar ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Old ContentTab — replaced by CreateTab above
// (old ContentTab and ReadyContentList removed — replaced by CreateTab above)

// --- Main component ---

export default function LinkedInPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set());
  const [linkedinStatus, setLinkedinStatus] = useState<{ connected: boolean; org?: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'metrics' | 'video'>('create');
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
      const res = await fetch('/api/metricool', {
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
        {/* Publish all removed — unified create flow handles publishing */}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          Crear
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-[#032149] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Historial
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
          platform="linkedin"
          onPublish={async (videoUrl, caption) => {
            const res = await fetch('/api/linkedin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: caption,
                imageUrl: videoUrl,
                account: selectedAccount.id,
              }),
            });
            const text = await res.text();
            let data: Record<string, unknown>;
            try { data = JSON.parse(text); } catch { throw new Error(`Error (${res.status}): ${text.slice(0, 200)}`); }
            if (!res.ok) throw new Error((data.error as string) || `Error ${res.status}`);
          }}
        />
      )}

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

      {/* Content Tab */}
      {/* Create Tab — unified flow */}
      {activeTab === 'create' && (
        <CreateTab
          selectedAccount={selectedAccount}
          onPublish={async (caption, imageUrl) => {
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: caption, imageUrl: imageUrl || undefined, account: selectedAccount.id }),
            });
            const text = await res.text();
            let data: any;
            try { data = JSON.parse(text); } catch { throw new Error(`Error (${res.status}): ${text.slice(0, 200)}`); }
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            // Save to history
            await createLIScheduledPost({
              imageUrl: imageUrl || '',
              caption,
              blogTitle: '',
              blogSlug: '',
              scheduledDate: new Date().toISOString().split('T')[0],
              scheduledTime: new Date().toTimeString().slice(0, 5),
              status: 'sent',
              account: selectedAccount.id,
            });
            loadSavedPosts();
          }}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && <>

      {/* TODO: remove queue, keep only saved posts */}
      {false && accountQueue.length > 0 && (
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

      {/* Empty state for history */}
      {accountSavedPosts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay posts enviados todavía</p>
          <p className="text-sm text-slate-400 mt-1">Los posts publicados desde la pestaña Crear aparecerán aquí</p>
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
