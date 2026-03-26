import { useState } from 'react';
import { saveFeedback } from '../lib/firebase-client';
import { TRUSTPILOT_BU_ID, TRUSTPILOT_URL } from '../lib/constants';

interface FormData {
  mainChallenge: string;
  howIdentifiedProblem: string;
  teamIntegration: string;
  proposedSolutions: string;
  technicalExecution: string;
  quizFlowHighlights: string;
  iterativeApproach: string;
  conversionComparison: string;
  autonomousImprovement: string;
  scalingConfidence: string;
  wouldRecommend: string;
  standoutAspects: string;
  additionalComments: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
}

const initialFormData: FormData = {
  mainChallenge: '',
  howIdentifiedProblem: '',
  teamIntegration: '',
  proposedSolutions: '',
  technicalExecution: '',
  quizFlowHighlights: '',
  iterativeApproach: '',
  conversionComparison: '',
  autonomousImprovement: '',
  scalingConfidence: '',
  wouldRecommend: '',
  standoutAspects: '',
  additionalComments: '',
  companyName: '',
  contactName: '',
  contactEmail: '',
};

declare global {
  interface Window {
    tp?: (action: string, data?: unknown) => void;
  }
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200">
      <h3 className="text-lg md:text-xl font-bold text-[#032149]">{title}</h3>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function QuestionField({ label, name, value, onChange, placeholder, required = false }: {
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (name: keyof FormData, value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-6">
      <label className="block text-[#032149] font-semibold mb-2 text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={3}
        className="w-full p-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent transition-all resize-none text-slate-700 placeholder-slate-400"
      />
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder, type = 'text', required = false }: {
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (name: keyof FormData, value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[#032149] font-semibold mb-2 text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-4 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent transition-all text-slate-700 placeholder-slate-400"
      />
    </div>
  );
}

export default function FeedbackForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await saveFeedback(formData);

      if (window.tp && formData.contactEmail) {
        window.tp('createInvitation', {
          recipientEmail: formData.contactEmail,
          recipientName: formData.contactName,
          referenceId: `feedback-${Date.now()}`,
          source: 'InvitationScript',
        });
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.');
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load Trustpilot SDK
  if (typeof window !== 'undefined' && !document.getElementById('trustpilot-invite-sdk')) {
    const script = document.createElement('script');
    script.id = 'trustpilot-invite-sdk';
    script.async = true;
    script.src = 'https://invitejs.trustpilot.com/tp.min.js';
    script.onload = () => {
      if (window.tp) window.tp('register', TRUSTPILOT_BU_ID);
    };
    document.head.appendChild(script);
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#45b6f7] selection:text-white">
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
            <a href="/" className="flex items-center gap-0 cursor-pointer">
              <img src="https://i.imgur.com/imHxGWI.png" alt="Growth4U" className="h-6 w-auto" />
            </a>
            <a href="/" className="text-sm font-bold text-[#3ecda5] flex items-center gap-2 hover:underline">
              Volver a Home
            </a>
          </div>
        </nav>

        <div className="pt-32 pb-20 max-w-2xl mx-auto px-6">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#032149] mb-4">
              ¡Gracias por tu feedback!
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Tu opinión es muy valiosa para nosotros y nos ayuda a seguir mejorando.
            </p>

            <div className="bg-gradient-to-br from-[#effcfd] to-[#f0f4ff] p-8 rounded-2xl border border-[#0faec1]/20 mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ))}
              </div>
              <h2 className="text-lg font-bold text-[#032149] mb-3">
                ¿Te gustaría compartir tu experiencia en Trustpilot?
              </h2>
              <p className="text-slate-600 text-sm mb-6">
                Tu reseña ayuda a otras empresas a conocer nuestro trabajo.
              </p>
              <a
                href={TRUSTPILOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#00b67a] hover:bg-[#009567] text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg"
              >
                Dejar reseña en Trustpilot
              </a>
            </div>

            <a href="/" className="inline-flex items-center gap-2 text-[#3ecda5] font-bold hover:underline">
              Volver a la página principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#45b6f7] selection:text-white">
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-0 cursor-pointer">
            <img src="https://i.imgur.com/imHxGWI.png" alt="Growth4U" className="h-6 w-auto" />
          </a>
          <a href="/" className="text-sm font-bold text-[#3ecda5] flex items-center gap-2 hover:underline">
            Volver a Home
          </a>
        </div>
      </nav>

      <div className="pt-32 pb-20 max-w-4xl mx-auto px-6">
        <div className="bg-white p-8 md:p-12 lg:p-16 rounded-3xl shadow-xl border border-slate-100">
          <div className="text-center mb-12 pb-8 border-b border-slate-100">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#032149] mb-4">
              Formulario de Feedback
            </h1>
            <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
              Gracias por tomarte unos minutos para responder. Tu feedback nos ayudará a documentar
              nuestra colaboración y compartir aprendizajes con otros equipos.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <SectionHeader title="Información de contacto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nombre de la empresa" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Ej: Acme Corp" required />
                <InputField label="Tu nombre" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Ej: María García" required />
              </div>
              <InputField label="Email de contacto" name="contactEmail" value={formData.contactEmail} onChange={handleChange} placeholder="Ej: maria@acme.com" type="email" required />
            </div>

            <div>
              <SectionHeader title="Sobre el reto inicial" subtitle="Cuéntanos sobre la situación antes de trabajar juntos" />
              <QuestionField label="1. ¿Cuál era el principal reto de negocio que teníais antes de trabajar con Growth4U?" name="mainChallenge" value={formData.mainChallenge} onChange={handleChange} placeholder="Describe el principal desafío que enfrentaba tu empresa..." required />
              <QuestionField label="2. ¿Cómo os ayudó Growth4U a identificar y entender el problema real?" name="howIdentifiedProblem" value={formData.howIdentifiedProblem} onChange={handleChange} placeholder="Cuéntanos cómo fue el proceso de diagnóstico..." />
            </div>

            <div>
              <SectionHeader title="Sobre la colaboración y el enfoque" subtitle="Tu experiencia trabajando con nuestro equipo" />
              <QuestionField label="3. ¿Cómo describirías la forma en que el equipo de Growth4U se integró con vosotros para entender el negocio en profundidad?" name="teamIntegration" value={formData.teamIntegration} onChange={handleChange} placeholder="Describe cómo fue la integración del equipo..." />
              <QuestionField label="4. ¿Qué soluciones propuso Growth4U y qué te pareció el enfoque?" name="proposedSolutions" value={formData.proposedSolutions} onChange={handleChange} placeholder="Cuéntanos sobre las propuestas y tu opinión..." />
              <QuestionField label="5. ¿Cómo valorarías la ejecución técnica del proyecto por parte de Growth4U?" name="technicalExecution" value={formData.technicalExecution} onChange={handleChange} placeholder="Comparte tu valoración sobre la implementación técnica..." />
            </div>

            <div>
              <SectionHeader title="Sobre la solución implementada" subtitle="Los resultados del trabajo realizado" />
              <QuestionField label="6. ¿Qué aspectos del quiz y el nuevo flujo de conversión destacarías?" name="quizFlowHighlights" value={formData.quizFlowHighlights} onChange={handleChange} placeholder="¿Qué elementos te parecieron más efectivos?" />
              <QuestionField label="7. ¿Cómo valorarías el enfoque de crear un sistema que se pueda iterar y mejorar con el tiempo, en lugar de una acción puntual?" name="iterativeApproach" value={formData.iterativeApproach} onChange={handleChange} placeholder="Tu opinión sobre el enfoque iterativo..." />
            </div>

            <div>
              <SectionHeader title="Sobre los resultados" subtitle="El impacto en tu negocio" />
              <QuestionField label="8. ¿Cómo compararías la conversión de visitas a Free Trial antes vs después del proyecto?" name="conversionComparison" value={formData.conversionComparison} onChange={handleChange} placeholder="Puedes hablar en términos de 'mejor/peor', 'x veces más', o porcentajes..." />
              <QuestionField label="9. ¿Consideráis que el sistema implementado os permite seguir mejorando la conversión de forma autónoma?" name="autonomousImprovement" value={formData.autonomousImprovement} onChange={handleChange} placeholder="¿Tenéis las herramientas para seguir optimizando?" />
              <QuestionField label="10. ¿El nuevo flujo os ha dado más confianza para escalar las campañas de adquisición?" name="scalingConfidence" value={formData.scalingConfidence} onChange={handleChange} placeholder="Cuéntanos si os sentís más preparados para escalar..." />
            </div>

            <div>
              <SectionHeader title="Sobre la experiencia de trabajo" subtitle="Tu valoración general" />
              <QuestionField label="11. ¿Recomendarías trabajar con Growth4U? ¿Por qué?" name="wouldRecommend" value={formData.wouldRecommend} onChange={handleChange} placeholder="Tu recomendación y razones..." required />
              <QuestionField label="12. ¿Hay algo que destacarías especialmente de nuestra forma de trabajar?" name="standoutAspects" value={formData.standoutAspects} onChange={handleChange} placeholder="¿Qué aspectos te gustaron más?" />
            </div>

            <div>
              <SectionHeader title="Pregunta abierta (opcional)" subtitle="Espacio libre para comentarios adicionales" />
              <QuestionField label="13. ¿Hay algo más que quieras añadir sobre el proyecto o los resultados?" name="additionalComments" value={formData.additionalComments} onChange={handleChange} placeholder="Cualquier comentario adicional es bienvenido..." />
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#3ecda5] hover:bg-[#2ab89a] disabled:bg-slate-400 text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
              </button>
              <p className="text-xs text-slate-500 mt-4">
                Al enviar este formulario, aceptas que tus respuestas puedan ser utilizadas para mejorar nuestros servicios
                y potencialmente compartidas como caso de estudio (previa aprobación).
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
