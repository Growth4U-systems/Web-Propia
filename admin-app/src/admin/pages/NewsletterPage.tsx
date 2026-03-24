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
  Plus,
  Loader2,
  AlertTriangle,
  Copy,
  FileText,
} from 'lucide-react';
import {
  getAllNewsletters,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter,
  getNewsletterSubscribers,
  getAllLeadMagnetLeads,
  type Newsletter,
} from '../../lib/firebase-client';
import { API_BASE } from '../../lib/api';

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

// ============================================
// EMAIL TEMPLATE
// ============================================

function wrapInEmailTemplate(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: #032149; padding: 32px 24px; text-align: center; }
  .header img { height: 32px; }
  .content { padding: 32px 24px; color: #333; font-size: 16px; line-height: 1.6; }
  .content h1 { color: #032149; font-size: 24px; margin-top: 0; }
  .content h2 { color: #032149; font-size: 20px; }
  .content a { color: #6351d5; }
  .cta-button { display: inline-block; background: #6351d5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
  .footer { background: #f4f4f7; padding: 24px; text-align: center; font-size: 12px; color: #999; }
  .footer a { color: #6351d5; }
  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="https://i.imgur.com/imHxGWI.png" alt="Growth4U" />
  </div>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    <hr class="divider" />
    <p>Growth4U — Growth Marketing para empresas tech</p>
    <p><a href="https://growth4u.io">growth4u.io</a></p>
    <p style="margin-top:16px;font-size:11px;color:#bbb;">
      Recibes este email porque te suscribiste a la newsletter de Growth4U.<br/>
      <a href="mailto:hola@growth4u.io?subject=Baja%20newsletter">Darme de baja</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewsletterPage() {
  const [tab, setTab] = useState<Tab>('compose');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, nls] = await Promise.all([
        getNewsletterSubscribers(),
        getAllNewsletters(),
      ]);
      setSubscribers(subs);
      setNewsletters(nls);
    } catch (err) {
      console.error('Error loading newsletter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim()) return alert('Añade un asunto');
    setSaving(true);
    try {
      const fullHtml = wrapInEmailTemplate(bodyHtml, subject);
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
    if (!subject.trim() || !bodyHtml.trim()) return alert('Asunto y contenido son obligatorios');
    if (subscribers.length === 0) return alert('No hay suscriptores');

    const confirmed = confirm(
      `¿Enviar "${subject}" a ${subscribers.length} suscriptor${subscribers.length > 1 ? 'es' : ''}?`
    );
    if (!confirmed) return;

    setSending(true);
    setSendResult(null);

    try {
      const fullHtml = wrapInEmailTemplate(bodyHtml, subject);
      const emails = subscribers.map((s) => s.email);

      const res = await fetch(`${API_BASE}/.netlify/functions/send-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent: fullHtml, recipients: emails }),
      });

      const data = await res.json();

      // Save or update newsletter record
      if (editingId) {
        await updateNewsletter(editingId, {
          subject,
          htmlContent: fullHtml,
          recipientCount: data.sent || 0,
          status: data.ok ? 'sent' : 'failed',
          sentAt: new Date().toISOString(),
        });
      } else {
        await createNewsletter({
          subject,
          htmlContent: fullHtml,
          recipientCount: data.sent || 0,
          status: data.ok ? 'sent' : 'failed',
          sentAt: new Date().toISOString(),
        });
      }

      if (data.ok) {
        setSendResult({ ok: true, message: `Enviado a ${data.sent} suscriptores` });
        setSubject('');
        setBodyHtml('');
        setEditingId(null);
      } else {
        setSendResult({ ok: false, message: `Parcial: ${data.sent}/${data.total} enviados. ${data.errors?.[0] || ''}` });
      }

      await loadData();
    } catch (err: any) {
      setSendResult({ ok: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleEditDraft = (nl: NewsletterWithId) => {
    // Extract body from the full HTML template
    const match = nl.htmlContent?.match(/<div class="content">\s*([\s\S]*?)\s*<\/div>\s*<div class="footer">/);
    const body = match ? match[1].trim() : nl.htmlContent || '';
    setSubject(nl.subject);
    setBodyHtml(body);
    setEditingId(nl.id);
    setTab('compose');
  };

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('¿Eliminar esta newsletter?')) return;
    await deleteNewsletter(id);
    await loadData();
  };

  const updatePreview = () => {
    if (previewRef.current) {
      const doc = previewRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(wrapInEmailTemplate(bodyHtml, subject));
        doc.close();
      }
    }
  };

  useEffect(() => {
    if (previewOpen) updatePreview();
  }, [previewOpen, bodyHtml, subject]);

  const tabList: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'compose', label: 'Componer', icon: Edit3 },
    { key: 'subscribers', label: 'Suscriptores', icon: Users, count: subscribers.length },
    { key: 'history', label: 'Historial', icon: Clock, count: newsletters.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Newsletter</h1>
        <p className="text-slate-400 mt-1">Compón, previsualiza y envía newsletters a tus suscriptores</p>
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
          <span className="text-2xl font-bold text-[#032149]">
            {newsletters.filter((n) => n.status === 'sent').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm">Borradores</span>
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">
            {newsletters.filter((n) => n.status === 'draft').length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabList.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-[#6351d5] text-[#6351d5]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#6351d5]/10 text-[#6351d5]' : 'bg-slate-100 text-slate-400'}`}>
                  {t.count}
                </span>
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
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Esta semana en Growth: cómo reducir tu CAC un 40%"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Contenido (HTML)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Escribe HTML directamente. Usa &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;ul&gt;/&lt;li&gt;.
                Para un CTA: <code className="bg-slate-100 px-1 rounded">&lt;a class="cta-button" href="..."&gt;Texto&lt;/a&gt;</code>
              </p>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder={`<h1>Hola 👋</h1>\n<p>Esta semana te traemos...</p>\n<h2>1. Título de sección</h2>\n<p>Contenido aquí...</p>\n<a class="cta-button" href="https://growth4u.io/blog/">Leer más →</a>`}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5] focus:border-transparent font-mono text-sm"
                rows={16}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                {previewOpen ? 'Ocultar preview' : 'Preview'}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || !subject.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Guardar borrador
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !bodyHtml.trim() || subscribers.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors disabled:opacity-50 ml-auto"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar a {subscribers.length} suscriptor{subscribers.length !== 1 ? 'es' : ''}
              </button>
            </div>
          </div>

          {/* Preview */}
          {previewOpen && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Preview del email</span>
                <span className="text-xs text-slate-400">Asunto: {subject || '(sin asunto)'}</span>
              </div>
              <iframe
                ref={previewRef}
                className="w-full border-0"
                style={{ height: '600px' }}
                title="Email Preview"
              />
            </div>
          )}
        </div>
      )}

      {/* ==================== SUBSCRIBERS TAB ==================== */}
      {tab === 'subscribers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#032149]">Suscriptores de newsletter</h2>
            <button
              onClick={() => {
                const emails = subscribers.map((s) => s.email).join(', ');
                navigator.clipboard.writeText(emails);
                alert(`${subscribers.length} emails copiados`);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar emails
            </button>
          </div>

          {subscribers.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400">No hay suscriptores todavía</p>
              <p className="text-slate-400 text-sm mt-1">Los leads se capturan desde el componente Newsletter en el blog</p>
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
                        {sub.createdAt?.toDate
                          ? sub.createdAt.toDate().toLocaleDateString('es-ES')
                          : sub.createdAt
                          ? new Date(sub.createdAt).toLocaleDateString('es-ES')
                          : '—'}
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
              <p className="text-slate-400">No hay newsletters todavía</p>
            </div>
          ) : (
            newsletters.map((nl) => (
              <div key={nl.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {nl.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {nl.status === 'draft' && <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                      {nl.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <h3 className="font-semibold text-[#032149] truncate">{nl.subject}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>
                        {nl.status === 'sent'
                          ? `Enviado a ${nl.recipientCount} suscriptores`
                          : nl.status === 'draft'
                          ? 'Borrador'
                          : 'Error de envío'}
                      </span>
                      {nl.sentAt && (
                        <span>{new Date(nl.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {!nl.sentAt && nl.createdAt && (
                        <span>
                          Creado {nl.createdAt.toDate
                            ? nl.createdAt.toDate().toLocaleDateString('es-ES')
                            : new Date(nl.createdAt).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {nl.status === 'draft' && (
                      <button
                        onClick={() => handleEditDraft(nl)}
                        className="p-2 text-slate-400 hover:text-[#6351d5] transition-colors"
                        title="Editar borrador"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNewsletter(nl.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
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
