import { marked } from 'marked';

interface Props {
  magnetSlug: string;
  magnetTitle: string;
  excerpt: string;        // Markdown — intro
  fullContent: string;    // HTML — full content
}

// Gate liberado: el contenido completo se muestra siempre, sin pedir email.
export default function StaticLeadMagnetGate({ excerpt, fullContent }: Props) {
  const excerptHtml = marked.parse(excerpt || '', { gfm: true }) as string;

  return (
    <div>
      <div className="prose prose-lg mx-auto" dangerouslySetInnerHTML={{ __html: excerptHtml }} />
      <div className="prose prose-lg mx-auto" dangerouslySetInnerHTML={{ __html: fullContent }} />
      <div className="mt-16 bg-[#032149] rounded-2xl p-8 text-center">
        <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-3">¿Quieres implementarlo en tu empresa?</p>
        <h3 className="text-2xl font-bold text-white mb-4">Hablamos 30 minutos y te digo dónde está tu mayor oportunidad</h3>
        <a
          href="https://now.growth4u.io/widget/bookings/llamada-estrategica-alfonso-w"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#3ecda5] hover:bg-[#35b894] text-white font-bold py-4 px-8 rounded-full text-lg transition-all hover:scale-105 shadow-lg shadow-[#3ecda5]/30"
        >
          Agendar llamada →
        </a>
      </div>
    </div>
  );
}
