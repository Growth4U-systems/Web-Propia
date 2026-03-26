import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  Trash2,
} from 'lucide-react';
import { getAllFeedback, deleteFeedback } from '../../../lib/firebase-client';
import type { FeedbackResponse } from '../../../lib/firebase-client';

function FeedbackCard({ feedback, onDelete }: { feedback: FeedbackResponse; onDelete: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Fecha no disponible';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el feedback de "${feedback.companyName}"?`)) return;
    setDeleting(true);
    await deleteFeedback(feedback.id);
    onDelete(feedback.id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#3ecda5]/10 p-3 rounded-xl">
              <Building2 className="w-6 h-6 text-[#3ecda5]" />
            </div>
            <div>
              <h3 className="font-bold text-[#032149] text-lg">{feedback.companyName}</h3>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {feedback.contactName}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {feedback.contactEmail}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(feedback.createdAt)}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Eliminar"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-6">
          <Section title="Sobre el reto inicial">
            <Question label="1. Reto principal" answer={feedback.mainChallenge} />
            <Question label="2. Identificar problema" answer={feedback.howIdentifiedProblem} />
          </Section>

          <Section title="Sobre la colaboración">
            <Question label="3. Integración equipo" answer={feedback.teamIntegration} />
            <Question label="4. Soluciones propuestas" answer={feedback.proposedSolutions} />
            <Question label="5. Ejecución técnica" answer={feedback.technicalExecution} />
          </Section>

          <Section title="Sobre la solución">
            <Question label="6. Quiz y flujo" answer={feedback.quizFlowHighlights} />
            <Question label="7. Enfoque iterativo" answer={feedback.iterativeApproach} />
          </Section>

          <Section title="Sobre los resultados">
            <Question label="8. Comparación conversión" answer={feedback.conversionComparison} />
            <Question label="9. Mejora autónoma" answer={feedback.autonomousImprovement} />
            <Question label="10. Confianza escalar" answer={feedback.scalingConfidence} />
          </Section>

          <Section title="Sobre la experiencia">
            <Question label="11. Recomendación" answer={feedback.wouldRecommend} />
            <Question label="12. Aspectos destacados" answer={feedback.standoutAspects} />
          </Section>

          <Section title="Comentarios adicionales">
            <Question label="13. Comentarios" answer={feedback.additionalComments} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-bold text-[#032149] mb-3 text-sm uppercase tracking-wide">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Question({ label, answer }: { label: string; answer: string }) {
  if (!answer) return null;
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className="text-slate-700">{answer}</p>
    </div>
  );
}

export default function FeedbackAdminPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeedback() {
      const data = await getAllFeedback();
      setFeedbacks(data);
      setIsLoading(false);
    }
    loadFeedback();
  }, []);

  const handleDelete = (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/" className="flex items-center gap-2 text-[#3ecda5] hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="font-bold text-[#032149] flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Panel de Feedback
            </h1>
          </div>
          <span className="text-sm text-slate-500">
            {feedbacks.length} respuesta{feedbacks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#3ecda5]" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No hay respuestas de feedback todavía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
