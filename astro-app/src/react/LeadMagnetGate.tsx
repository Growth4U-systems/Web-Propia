import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { getLeadMagnetById } from '../lib/firebase-client';

interface Props {
  magnetId: string;
  magnetSlug: string;
  magnetTitle: string;
  excerpt: string;
  contentUrl?: string;
}

// Gate liberado: el contenido completo se carga y se muestra siempre, sin pedir email.
export default function LeadMagnetGate({ magnetId, excerpt, contentUrl }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getLeadMagnetById(magnetId);
        if (!cancelled && result) setContent(result.content);
      } catch (err) {
        console.error('Error fetching content:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [magnetId]);

  const excerptHtml = marked.parse(excerpt || '', { gfm: true }) as string;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center gap-3 text-slate-500">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Cargando contenido...</span>
        </div>
      </div>
    );
  }

  const contentHtml = marked.parse(content, { gfm: true }) as string;

  return (
    <div>
      <div className="prose prose-lg mx-auto">
        <div dangerouslySetInnerHTML={{ __html: excerptHtml }} />
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>
      {contentUrl && (
        <div className="mt-10 text-center">
          <a
            href={contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#3ecda5] hover:bg-[#35b894] text-white font-bold py-4 px-8 rounded-full text-lg transition-all hover:scale-105 shadow-lg shadow-[#3ecda5]/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Descargar recurso
          </a>
        </div>
      )}
      <div className="mt-16 bg-[#032149] rounded-2xl p-8 text-center">
        <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-3">¿Quieres implementarlo en tu empresa tech?</p>
        <h3 className="text-2xl font-bold text-white mb-4">Hablamos 30 minutos y te digo dónde está tu mayor oportunidad</h3>
        <a
          href="https://now.growth4u.io/widget/booking/pWyNHUVPawhN9o0uU63W"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#3ecda5] hover:bg-[#35b894] text-white font-bold py-4 px-8 rounded-full text-lg transition-all hover:scale-105 shadow-lg shadow-[#3ecda5]/30"
        >
          Reservar sesión gratuita →
        </a>
      </div>
    </div>
  );
}
