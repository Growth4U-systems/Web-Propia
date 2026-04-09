import { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Users,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  AlertTriangle,
  Copy,
  FileText,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Newspaper,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getAllNewsletters,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter,
  getNewsletterSubscribers,
  getAllPosts,
  type Newsletter,
} from '../../../lib/firebase-client';

// ============================================
// TYPES
// ============================================

type Tab = 'compose' | 'subscribers' | 'history';

interface Subscriber {
  id: string;
  nombre: string;
  email: string;
  createdAt: any;
}

interface NewsletterWithId extends Newsletter {
  id: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  createdAt: Date | null;
}

interface NewsItem {
  title: string;
  url: string;
  date?: string;
  selected?: boolean;
}

interface NewsletterSections {
  hook: string;
  article: {
    headline: string;
    body: string;
    keyInsight: string;
    stats: { value: string; label: string }[];
    whatWeDid: string;
  };
  aiTool: {
    name: string;
    type: string;
    description: string;
    verdict: string;
  };
  tactic: {
    title: string;
    intro: string;
    steps: { title: string; description: string }[];
    result: string;
  };
  resources: {
    emoji: string;
    colorClass: string;
    title: string;
    description: string;
    url: string;
  }[];
  personalNote: string;
}

// ============================================
// EMAIL TEMPLATE BUILDER (Growth Signal design)
// ============================================

function buildNewsletterHtml(
  sections: NewsletterSections,
  editionNumber: number,
  editionDate: string,
  featuredImage?: string,
): string {
  const resourceColors: Record<string, string> = {
    blue: '#eef8ff',
    purple: '#f3f0ff',
    teal: '#e6fafb',
    orange: '#fff4e6',
  };

  const stepsHtml = sections.tactic.steps.map((s, i) => `
    <tr>
      <td style="padding:0 0 16px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:32px;vertical-align:top;padding-right:14px;">
            <div style="width:32px;height:32px;background:#6351d5;color:#fff;border-radius:50%;text-align:center;line-height:32px;font-size:14px;font-weight:700;">${i + 1}</div>
          </td>
          <td style="vertical-align:top;">
            <strong style="font-size:15px;color:#032149;">${s.title}</strong>
            <p style="margin:4px 0 0;font-size:14px;color:#374151;line-height:1.6;">${s.description}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join('');

  const resourcesHtml = sections.resources.map(r => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #f0eef9;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:40px;vertical-align:top;padding-right:14px;">
            <div style="width:40px;height:40px;background:${resourceColors[r.colorClass] || '#f3f0ff'};border-radius:10px;text-align:center;line-height:40px;font-size:18px;">${r.emoji}</div>
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:14px;font-weight:600;color:${r.url ? '#6351d5' : '#032149'};margin-bottom:2px;">
              ${r.url ? `<a href="${r.url}" style="color:#6351d5;text-decoration:none;">${r.title}</a>` : r.title}
            </div>
            <div style="font-size:13px;color:#6b7280;line-height:1.5;">${r.description}</div>
          </td>
        </tr></table>
      </td>
    </tr>`).join('');

  const statsHtml = sections.article.stats.map(s => `
    <td style="background:#f8f6ff;border-radius:10px;padding:16px;text-align:center;width:33%;">
      <div style="font-size:24px;font-weight:700;color:#6351d5;">${s.value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${s.label}</div>
    </td>`).join('\n    <td style="width:12px;"></td>\n    ');

  const personalNoteParagraphs = sections.personalNote.split('\n').filter(Boolean).map(p =>
    `<p style="font-size:15px;color:#4a4a4a;font-style:italic;margin:0 0 12px;line-height:1.7;">${p}</p>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Growth Signal #${editionNumber.toString().padStart(3, '0')}</title>
</head>
<body style="margin:0;padding:24px 16px;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;line-height:1.7;">

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#032149 0%,#6351d5 100%);border-radius:16px 16px 0 0;padding:32px 36px;text-align:center;">
    <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Growth <span style="color:#45b6f7;">Signal</span></div>
    <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px;letter-spacing:1px;text-transform:uppercase;">Edici&oacute;n #${editionNumber.toString().padStart(3, '0')} &middot; ${editionDate}</div>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;">

    <!-- HOOK -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="background:linear-gradient(135deg,#f8f6ff 0%,#eef8ff 100%);padding:28px 36px;border-bottom:3px solid #6351d5;">
        <div style="font-size:20px;font-weight:600;color:#032149;line-height:1.4;">${sections.hook.replace(/<span>/g, '<span style="color:#6351d5;">') }</div>
      </td>
    </tr></table>

    <!-- FEATURED ARTICLE -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding:32px 36px;border-bottom:1px solid #f0eef9;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6351d5;margin-bottom:12px;">&#x1F4CA; Caso de la semana</div>
        <h2 style="font-size:22px;font-weight:700;color:#032149;line-height:1.3;margin:0 0 14px;">${sections.article.headline}</h2>
        ${featuredImage ? `<img src="${featuredImage}" alt="" style="width:100%;max-width:548px;border-radius:10px;margin-bottom:16px;" />` : ''}
        ${sections.article.body.split('\n').filter(Boolean).map(p => `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.7;">${p}</p>`).join('')}

        <!-- Stats -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;"><tr>
          ${statsHtml}
        </tr></table>

        ${sections.article.whatWeDid ? `<h3 style="font-size:16px;font-weight:600;color:#032149;margin:16px 0 8px;">Qu&eacute; hicimos</h3><p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.7;">${sections.article.whatWeDid}</p>` : ''}

        <!-- Key insight -->
        <div style="background:#f8f6ff;border-left:4px solid #6351d5;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="font-size:14px;color:#4a3f8a;margin:0;line-height:1.6;"><strong>El dato clave:</strong> ${sections.article.keyInsight}</p>
        </div>
      </td>
    </tr></table>

    <!-- AI TOOL -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding:32px 36px;border-bottom:1px solid #f0eef9;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6351d5;margin-bottom:12px;">&#x1F916; IA aplicada a growth</div>
        <h2 style="font-size:22px;font-weight:700;color:#032149;line-height:1.3;margin:0 0 14px;">${sections.aiTool.name}</h2>
        <div style="background:#032149;border-radius:12px;padding:24px;margin:16px 0;">
          <div style="font-size:18px;font-weight:700;color:#45b6f7;margin-bottom:4px;">${sections.aiTool.name}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">${sections.aiTool.type}</div>
          <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;line-height:1.6;">${sections.aiTool.description}</p>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);font-size:13px;color:#0faec1;font-weight:600;">&#x2705; Veredicto: ${sections.aiTool.verdict}</div>
        </div>
      </td>
    </tr></table>

    <!-- TACTIC -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding:32px 36px;border-bottom:1px solid #f0eef9;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6351d5;margin-bottom:12px;">&#x1F4A1; T&aacute;ctica ejecutable</div>
        <h2 style="font-size:22px;font-weight:700;color:#032149;line-height:1.3;margin:0 0 14px;">${sections.tactic.title}</h2>
        <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.7;">${sections.tactic.intro}</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${stepsHtml}</table>
        <div style="background:#f8f6ff;border-left:4px solid #6351d5;padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="font-size:14px;color:#4a3f8a;margin:0;line-height:1.6;"><strong>Resultado real:</strong> ${sections.tactic.result}</p>
        </div>
      </td>
    </tr></table>

    <!-- RESOURCES -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding:32px 36px;border-bottom:1px solid #f0eef9;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6351d5;margin-bottom:12px;">&#x1F517; Recursos curados</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${resourcesHtml}</table>
      </td>
    </tr></table>

    <!-- PERSONAL NOTE -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="padding:32px 36px;border-bottom:1px solid #f0eef9;background:#fefcf3;border-left:4px solid #f59e0b;">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6351d5;margin-bottom:12px;">&#x1F4DD; Nota personal</div>
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6351d5,#45b6f7);text-align:center;line-height:48px;color:white;font-weight:700;font-size:18px;margin-bottom:14px;">P</div>
        ${personalNoteParagraphs}
        <p style="font-style:normal;font-weight:600;color:#032149;margin:16px 0 0;">&mdash; Philippe, Growth4U</p>
      </td>
    </tr></table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="background:linear-gradient(135deg,#6351d5 0%,#4a3db8 100%);padding:32px 36px;text-align:center;">
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0 0 20px;line-height:1.6;">&iquest;Tu CAC est&aacute; fuera de control y no sabes por d&oacute;nde empezar? Hablemos 20 minutos. Sin compromiso, sin pitch &mdash; solo diagn&oacute;stico.</p>
        <a href="https://calendly.com/growth4u/consulta-estrategica" style="display:inline-block;background:#ffffff;color:#6351d5;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">Reservar diagn&oacute;stico gratuito &rarr;</a>
      </td>
    </tr></table>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#032149;border-radius:0 0 16px 16px;padding:28px 36px;text-align:center;">
    <div style="margin-bottom:16px;">
      <a href="https://linkedin.com/company/growth4u-io" style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 10px;text-decoration:none;">LinkedIn</a>
      <a href="https://x.com/growth4u_io" style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 10px;text-decoration:none;">Twitter/X</a>
      <a href="https://growth4u.io" style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 10px;text-decoration:none;">Web</a>
    </div>

    <!-- Claude badge -->
    <div style="margin:16px 0;">
      <span style="display:inline-block;background:rgba(99,81,213,0.25);border:1px solid rgba(99,81,213,0.4);color:#c4b5fd;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;">&#x2728; Generado con Claude AI por Anthropic</span>
    </div>

    <div style="background:rgba(99,81,213,0.15);border:1px solid rgba(99,81,213,0.3);border-radius:10px;padding:20px;margin-top:16px;">
      <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;line-height:1.6;">&#x1F4EC; <strong style="color:#45b6f7;">&iquest;Te ha gustado? Reenv&iacute;a este email a un colega founder.</strong><br/>
      Cada referido que se suscriba te acerca a acceso exclusivo a nuestros frameworks y templates premium.</p>
    </div>

    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:16px 0 8px;">Growth Signal by Growth4U &middot; growth4u.io</p>
    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;">Madrid, Espa&ntilde;a</p>
    <p style="margin-top:12px;font-size:11px;color:rgba(255,255,255,0.4);">
      <a href="mailto:hola@growth4u.io?subject=Baja%20newsletter" style="color:#45b6f7;text-decoration:none;">Desuscribirse</a>
    </p>
  </td></tr>

</table>
</body>
</html>`;
}

// ============================================
// SECTION LABELS
// ============================================

const SECTION_META: { key: keyof NewsletterSections; emoji: string; label: string }[] = [
  { key: 'hook', emoji: '🎯', label: 'Hook' },
  { key: 'article', emoji: '📊', label: 'Artículo destacado' },
  { key: 'aiTool', emoji: '🤖', label: 'IA aplicada a growth' },
  { key: 'tactic', emoji: '💡', label: 'Táctica ejecutable' },
  { key: 'resources', emoji: '🔗', label: 'Recursos curados' },
  { key: 'personalNote', emoji: '📝', label: 'Nota personal' },
];

// ============================================
// MAIN COMPONENT
// ============================================

const EMPTY_SECTIONS: NewsletterSections = {
  hook: '',
  article: { headline: '', body: '', keyInsight: '', stats: [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }], whatWeDid: '' },
  aiTool: { name: '', type: '', description: '', verdict: '' },
  tactic: { title: '', intro: '', steps: [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }], result: '' },
  resources: [
    { emoji: '📄', colorClass: 'blue', title: '', description: '', url: '' },
    { emoji: '🛠️', colorClass: 'purple', title: '', description: '', url: '' },
    { emoji: '🎙️', colorClass: 'teal', title: '', description: '', url: '' },
  ],
  personalNote: '',
};

export default function NewsletterPage() {
  const [tab, setTab] = useState<Tab>('compose');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterWithId[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [selectedBlogIds, setSelectedBlogIds] = useState<Set<string>>(new Set());
  const [editionNumber, setEditionNumber] = useState(1);
  const [editionDate, setEditionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()) % 7 || 7); // next Monday
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  });
  const [prompt, setPrompt] = useState('');
  const [newsQuery, setNewsQuery] = useState('growth marketing B2B startup');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [sections, setSections] = useState<NewsletterSections | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, nls, allBlogs] = await Promise.all([
        getNewsletterSubscribers(),
        getAllNewsletters(),
        getAllPosts(),
      ]);
      setSubscribers(subs);
      setNewsletters(nls);
      setBlogs(allBlogs as BlogPost[]);
      // Set edition number based on sent newsletters
      const sentCount = nls.filter((n: any) => n.status === 'sent').length;
      setEditionNumber(sentCount + 1);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- News scraping ---
  const handleScrapeNews = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scrape-news', query: newsQuery }),
      });
      const data = await res.json();
      setNewsItems((data.items || []).map((n: any) => ({ ...n, selected: true })));
    } catch {
      setNewsItems([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // --- AI generation ---
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const selectedBlogs = blogs.filter(b => selectedBlogIds.has(b.id));
      const selectedNews = newsItems.filter(n => n.selected);

      const res = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          blogs: selectedBlogs.map(b => ({
            title: b.title,
            excerpt: b.excerpt,
            content: b.content,
            image: b.image,
            slug: b.slug,
          })),
          newsItems: selectedNews,
          prompt,
          editionNumber,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSections(data.content);
      setExpandedSection('hook');
    } catch (err: any) {
      setGenError(err.message || 'Error generando newsletter');
    } finally {
      setGenerating(false);
    }
  };

  // --- Build final HTML ---
  const getFeaturedImage = (): string | undefined => {
    const selectedBlogs = blogs.filter(b => selectedBlogIds.has(b.id));
    return selectedBlogs[0]?.image || undefined;
  };

  const getFullHtml = (): string => {
    if (!sections) return '';
    return buildNewsletterHtml(sections, editionNumber, editionDate, getFeaturedImage());
  };

  // --- Preview ---
  const updatePreview = () => {
    if (previewRef.current) {
      const doc = previewRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(getFullHtml());
        doc.close();
      }
    }
  };

  useEffect(() => {
    if (previewOpen && sections) updatePreview();
  }, [previewOpen, sections]);

  // --- Save / Send ---
  const handleSaveDraft = async () => {
    if (!sections) return;
    setSaving(true);
    try {
      const fullHtml = getFullHtml();
      const subject = `Growth Signal #${editionNumber.toString().padStart(3, '0')} — ${sections.article.headline}`;
      if (editingId) {
        await updateNewsletter(editingId, { subject, htmlContent: fullHtml, status: 'draft' });
      } else {
        const id = await createNewsletter({ subject, htmlContent: fullHtml, recipientCount: 0, status: 'draft' });
        setEditingId(id);
      }
      await loadData();
      setSendResult({ ok: true, message: 'Borrador guardado' });
      setTimeout(() => setSendResult(null), 3000);
    } catch (err: any) {
      setSendResult({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!sections) return;
    if (subscribers.length === 0) return alert('No hay suscriptores');
    const confirmed = confirm(`¿Enviar Growth Signal #${editionNumber} a ${subscribers.length} suscriptor${subscribers.length > 1 ? 'es' : ''}?`);
    if (!confirmed) return;

    setSending(true);
    setSendResult(null);
    try {
      const fullHtml = getFullHtml();
      const subject = `Growth Signal #${editionNumber.toString().padStart(3, '0')} — ${sections.article.headline}`;
      const emails = subscribers.map(s => s.email);

      const res = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent: fullHtml, recipients: emails }),
      });
      const data = await res.json();

      if (editingId) {
        await updateNewsletter(editingId, { subject, htmlContent: fullHtml, recipientCount: data.sent || 0, status: data.ok ? 'sent' : 'failed', sentAt: new Date().toISOString() });
      } else {
        await createNewsletter({ subject, htmlContent: fullHtml, recipientCount: data.sent || 0, status: data.ok ? 'sent' : 'failed', sentAt: new Date().toISOString() });
      }

      if (data.ok) {
        setSendResult({ ok: true, message: `Enviado a ${data.sent} suscriptores` });
        setSections(null);
        setSelectedBlogIds(new Set());
        setEditingId(null);
      } else {
        setSendResult({ ok: false, message: `Parcial: ${data.sent}/${data.total}. ${data.errors?.[0] || ''}` });
      }
      await loadData();
    } catch (err: any) {
      setSendResult({ ok: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('¿Eliminar esta newsletter?')) return;
    await deleteNewsletter(id);
    await loadData();
  };

  // --- Section update helpers ---
  const updateSection = <K extends keyof NewsletterSections>(key: K, value: NewsletterSections[K]) => {
    if (!sections) return;
    setSections({ ...sections, [key]: value });
  };

  const toggleBlog = (id: string) => {
    setSelectedBlogIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- Tabs ---
  const tabList: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'compose', label: 'Componer', icon: Edit3 },
    { key: 'subscribers', label: 'Suscriptores', icon: Users, count: subscribers.length },
    { key: 'history', label: 'Historial', icon: Clock, count: newsletters.length },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[#032149]">Growth Signal</h1>
          <span className="text-xs px-3 py-1 rounded-full bg-[#6351d5]/10 text-[#6351d5] font-medium">Newsletter</span>
        </div>
        <p className="text-slate-400 mt-1">Genera newsletters con IA desde tus blogs + noticias del sector</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm">Suscriptores</span>
            <Users className="w-5 h-5 text-[#6351d5]" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{subscribers.length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm">Enviadas</span>
            <Send className="w-5 h-5 text-green-500" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{newsletters.filter(n => n.status === 'sent').length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm">Pr&oacute;xima edici&oacute;n</span>
            <FileText className="w-5 h-5 text-[#6351d5]" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">#{editionNumber.toString().padStart(3, '0')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabList.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-[#6351d5] text-[#6351d5]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#6351d5]/10 text-[#6351d5]' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Result banner */}
      {sendResult && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${sendResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {sendResult.ok ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span className={sendResult.ok ? 'text-green-700' : 'text-red-700'}>{sendResult.message}</span>
        </div>
      )}

      {/* ==================== COMPOSE TAB ==================== */}
      {tab === 'compose' && (
        <div className="space-y-6">

          {/* Edition config */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Edici&oacute;n #</label>
                <input type="number" value={editionNumber} onChange={e => setEditionNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de edici&oacute;n</label>
                <input value={editionDate} onChange={e => setEditionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
              </div>
            </div>
          </div>

          {/* Blog picker */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#032149] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#6351d5]" />
                Selecciona blogs para la newsletter
              </h3>
              <span className="text-xs text-slate-400">{selectedBlogIds.size} seleccionados</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
              {blogs.slice(0, 20).map(blog => {
                const selected = selectedBlogIds.has(blog.id);
                return (
                  <button key={blog.id} onClick={() => toggleBlog(blog.id)}
                    className={`relative text-left rounded-xl overflow-hidden border-2 transition-all ${selected ? 'border-[#6351d5] ring-2 ring-[#6351d5]/20' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    {blog.image ? (
                      <img src={blog.image} alt="" className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-gradient-to-br from-[#6351d5]/10 to-[#45b6f7]/10 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    {selected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#6351d5] rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-[#032149] line-clamp-2 leading-tight">{blog.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{blog.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* News scraping */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#032149] flex items-center gap-2 mb-4">
              <Newspaper className="w-4 h-4 text-[#6351d5]" />
              Noticias del sector
            </h3>
            <div className="flex gap-2 mb-4">
              <input value={newsQuery} onChange={e => setNewsQuery(e.target.value)} placeholder="growth marketing B2B startup"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
              <button onClick={handleScrapeNews} disabled={newsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#032149] text-white rounded-lg text-sm font-medium hover:bg-[#032149]/90 disabled:opacity-50 transition-colors">
                {newsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {newsItems.length > 0 && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {newsItems.map((item, i) => (
                  <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${item.selected ? 'border-[#6351d5] bg-[#6351d5]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={item.selected || false}
                      onChange={() => setNewsItems(prev => prev.map((n, j) => j === i ? { ...n, selected: !n.selected } : n))}
                      className="mt-0.5 accent-[#6351d5]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#032149] line-clamp-2">{item.title}</p>
                      {item.url && <p className="text-xs text-slate-400 truncate mt-0.5">{item.url}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Additional prompt */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <label className="block text-sm font-medium text-slate-600 mb-1">Contexto adicional (opcional)</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              placeholder="Ej: Esta semana enfocarnos en CAC para fintechs, mencionar el caso de Bnext..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-4">
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6351d5] to-[#45b6f7] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-[#6351d5]/20">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {generating ? 'Generando con Claude...' : 'Generar newsletter con Claude'}
            </button>
            {generating && <span className="text-sm text-slate-400">Esto puede tardar ~15 segundos</span>}
          </div>

          {genError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {genError}
            </div>
          )}

          {/* ---- Section editors (shown after generation) ---- */}
          {sections && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#032149]">Contenido generado</h3>
                <button onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-1.5 text-xs text-[#6351d5] font-medium hover:text-[#4a3db8]">
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                  Regenerar
                </button>
              </div>

              {SECTION_META.map(({ key, emoji, label }) => {
                const isExpanded = expandedSection === key;
                return (
                  <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedSection(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#032149]">
                        <span className="text-lg">{emoji}</span>
                        {label}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
                        {/* HOOK */}
                        {key === 'hook' && (
                          <textarea value={sections.hook} onChange={e => updateSection('hook', e.target.value)} rows={3}
                            className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                        )}

                        {/* ARTICLE */}
                        {key === 'article' && (
                          <div className="space-y-3 mt-3">
                            <input value={sections.article.headline} onChange={e => updateSection('article', { ...sections.article, headline: e.target.value })}
                              placeholder="Titular" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            <textarea value={sections.article.body} onChange={e => updateSection('article', { ...sections.article, body: e.target.value })} rows={6}
                              placeholder="Cuerpo del artículo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            <div className="grid grid-cols-3 gap-2">
                              {sections.article.stats.map((s, i) => (
                                <div key={i} className="space-y-1">
                                  <input value={s.value} onChange={e => { const stats = [...sections.article.stats]; stats[i] = { ...stats[i], value: e.target.value }; updateSection('article', { ...sections.article, stats }); }}
                                    placeholder="Valor" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-center font-bold text-[#6351d5] focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                  <input value={s.label} onChange={e => { const stats = [...sections.article.stats]; stats[i] = { ...stats[i], label: e.target.value }; updateSection('article', { ...sections.article, stats }); }}
                                    placeholder="Label" className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-center text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                </div>
                              ))}
                            </div>
                            <textarea value={sections.article.whatWeDid} onChange={e => updateSection('article', { ...sections.article, whatWeDid: e.target.value })} rows={3}
                              placeholder="Qué hicimos" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            <textarea value={sections.article.keyInsight} onChange={e => updateSection('article', { ...sections.article, keyInsight: e.target.value })} rows={2}
                              placeholder="Dato clave" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                          </div>
                        )}

                        {/* AI TOOL */}
                        {key === 'aiTool' && (
                          <div className="space-y-3 mt-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input value={sections.aiTool.name} onChange={e => updateSection('aiTool', { ...sections.aiTool, name: e.target.value })}
                                placeholder="Nombre herramienta" className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                              <input value={sections.aiTool.type} onChange={e => updateSection('aiTool', { ...sections.aiTool, type: e.target.value })}
                                placeholder="Tipo / Categoría" className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            </div>
                            <textarea value={sections.aiTool.description} onChange={e => updateSection('aiTool', { ...sections.aiTool, description: e.target.value })} rows={4}
                              placeholder="Descripción" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            <input value={sections.aiTool.verdict} onChange={e => updateSection('aiTool', { ...sections.aiTool, verdict: e.target.value })}
                              placeholder="Veredicto" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                          </div>
                        )}

                        {/* TACTIC */}
                        {key === 'tactic' && (
                          <div className="space-y-3 mt-3">
                            <input value={sections.tactic.title} onChange={e => updateSection('tactic', { ...sections.tactic, title: e.target.value })}
                              placeholder="Título del framework" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            <input value={sections.tactic.intro} onChange={e => updateSection('tactic', { ...sections.tactic, intro: e.target.value })}
                              placeholder="Introducción" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                            {sections.tactic.steps.map((s, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <span className="w-7 h-7 bg-[#6351d5] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">{i + 1}</span>
                                <div className="flex-1 space-y-1">
                                  <input value={s.title} onChange={e => { const steps = [...sections.tactic.steps]; steps[i] = { ...steps[i], title: e.target.value }; updateSection('tactic', { ...sections.tactic, steps }); }}
                                    placeholder="Título del paso" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                  <input value={s.description} onChange={e => { const steps = [...sections.tactic.steps]; steps[i] = { ...steps[i], description: e.target.value }; updateSection('tactic', { ...sections.tactic, steps }); }}
                                    placeholder="Descripción" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                </div>
                              </div>
                            ))}
                            <input value={sections.tactic.result} onChange={e => updateSection('tactic', { ...sections.tactic, result: e.target.value })}
                              placeholder="Resultado real" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                          </div>
                        )}

                        {/* RESOURCES */}
                        {key === 'resources' && (
                          <div className="space-y-3 mt-3">
                            {sections.resources.map((r, i) => (
                              <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg">
                                <input value={r.emoji} onChange={e => { const res = [...sections.resources]; res[i] = { ...res[i], emoji: e.target.value }; updateSection('resources', res); }}
                                  className="w-10 text-center text-lg border border-slate-200 rounded py-1" />
                                <div className="flex-1 space-y-1.5">
                                  <input value={r.title} onChange={e => { const res = [...sections.resources]; res[i] = { ...res[i], title: e.target.value }; updateSection('resources', res); }}
                                    placeholder="Título" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-medium text-[#032149] focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                  <input value={r.description} onChange={e => { const res = [...sections.resources]; res[i] = { ...res[i], description: e.target.value }; updateSection('resources', res); }}
                                    placeholder="Descripción" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                  <input value={r.url} onChange={e => { const res = [...sections.resources]; res[i] = { ...res[i], url: e.target.value }; updateSection('resources', res); }}
                                    placeholder="URL (opcional)" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6351d5]" />
                                </div>
                                {sections.resources.length > 2 && (
                                  <button onClick={() => updateSection('resources', sections.resources.filter((_, j) => j !== i))}
                                    className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            ))}
                            <button onClick={() => updateSection('resources', [...sections.resources, { emoji: '📌', colorClass: 'orange', title: '', description: '', url: '' }])}
                              className="flex items-center gap-1.5 text-xs text-[#6351d5] font-medium hover:text-[#4a3db8]">
                              <Plus className="w-3.5 h-3.5" /> Añadir recurso
                            </button>
                          </div>
                        )}

                        {/* PERSONAL NOTE */}
                        {key === 'personalNote' && (
                          <textarea value={sections.personalNote} onChange={e => updateSection('personalNote', e.target.value)} rows={6}
                            className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button onClick={() => { setPreviewOpen(!previewOpen); if (!previewOpen) setTimeout(updatePreview, 100); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  {previewOpen ? 'Ocultar preview' : 'Preview'}
                </button>
                <button onClick={handleSaveDraft} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Guardar borrador
                </button>
                <button onClick={handleSend} disabled={sending || subscribers.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#4a3db8] text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 ml-auto">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar a {subscribers.length} suscriptor{subscribers.length !== 1 ? 'es' : ''}
                </button>
              </div>

              {/* Preview */}
              {previewOpen && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Preview del email</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#6351d5]/10 text-[#6351d5] font-medium">Growth Signal #{editionNumber.toString().padStart(3, '0')}</span>
                      <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <iframe ref={previewRef} className="w-full border-0" style={{ height: '800px' }} title="Newsletter Preview" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUBSCRIBERS TAB ==================== */}
      {tab === 'subscribers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#032149]">Suscriptores</h2>
            <button onClick={() => { navigator.clipboard.writeText(subscribers.map(s => s.email).join(', ')); alert(`${subscribers.length} emails copiados`); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
              <Copy className="w-4 h-4" />
              Copiar emails
            </button>
          </div>
          {subscribers.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400">No hay suscriptores todav&iacute;a</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscribers.map((sub, i) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-400 text-sm">{i + 1}</td>
                      <td className="px-6 py-3 text-[#032149] font-medium text-sm">{sub.nombre}</td>
                      <td className="px-6 py-3 text-slate-600 text-sm">{sub.email}</td>
                      <td className="px-6 py-3 text-slate-400 text-sm">
                        {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleDateString('es-ES') : sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('es-ES') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== HISTORY TAB ==================== */}
      {tab === 'history' && (
        <div className="space-y-4">
          {newsletters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400">No hay newsletters todav&iacute;a</p>
            </div>
          ) : (
            newsletters.map(nl => (
              <div key={nl.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {nl.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      {nl.status === 'draft' && <FileText className="w-4 h-4 text-amber-500 shrink-0" />}
                      {nl.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <h3 className="font-semibold text-[#032149] truncate">{nl.subject}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{nl.status === 'sent' ? `Enviado a ${nl.recipientCount}` : nl.status === 'draft' ? 'Borrador' : 'Error'}</span>
                      {nl.sentAt && <span>{new Date(nl.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteNewsletter(nl.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
