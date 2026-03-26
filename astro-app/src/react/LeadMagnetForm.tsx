import { useState } from 'react';
import { saveLeadMagnetLead } from '../lib/firebase-client';

interface Props {
  magnetSlug: string;
  magnetTitle: string;
  contentUrl: string;
}

export default function LeadMagnetForm({ magnetSlug, magnetTitle, contentUrl }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', tag: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await saveLeadMagnetLead({
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        tag: formData.tag.trim(),
        magnetSlug,
        magnetTitle,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error saving lead:', err);
      setError('Hubo un problema. Por favor, inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#032149] mb-2">¡Listo, {formData.nombre.split(' ')[0]}!</h3>
        <p className="text-slate-500 mb-6">Aquí tienes acceso a tu recurso.</p>
        <a
          href={contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#3ecda5] hover:bg-[#35b894] text-white font-bold py-4 px-8 rounded-full text-lg transition-all hover:scale-105 shadow-lg shadow-[#3ecda5]/20"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Descargar ahora
        </a>
        <p className="text-slate-400 text-xs mt-4">Si el botón no funciona, <a href={contentUrl} target="_blank" rel="noopener noreferrer" className="text-[#3ecda5] underline">haz clic aquí</a>.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#3ecda5]/10 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#3ecda5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-[#032149]">Acceso gratuito</p>
          <p className="text-slate-500 text-sm">Déjanos tus datos y descarga al instante.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tu nombre *</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="María García"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tu email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="maria@tuempresa.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">¿Sobre qué temática buscabas?</label>
          <input
            type="text"
            value={formData.tag}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            placeholder="Ej: GEO para empresas tech, reducir CAC..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#3ecda5] hover:bg-[#35b894] disabled:bg-slate-300 text-white font-bold rounded-xl text-lg transition-all hover:scale-[1.02] shadow-lg shadow-[#3ecda5]/20 mt-2"
        >
          {submitting ? 'Enviando...' : 'Descargar gratis →'}
        </button>

        <p className="text-slate-400 text-xs text-center">Sin spam. Puedes darte de baja cuando quieras.</p>
      </form>
    </div>
  );
}
