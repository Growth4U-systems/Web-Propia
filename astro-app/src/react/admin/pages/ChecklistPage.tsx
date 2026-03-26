import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  CalendarDays,
  Save,
  History,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase-client';

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  link?: string;
  checked: boolean;
}

interface ChecklistRecord {
  id: string;
  type: 'weekly' | 'monthly';
  completedAt: string;
  items: ChecklistItem[];
  notes: string;
}

const weeklyChecklist: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'gsc-errors',
    label: 'Revisar GSC por errores de cobertura',
    description: 'Verificar que no hay nuevos errores de indexación',
    link: 'https://search.google.com/search-console'
  },
  {
    id: 'geo-test-1',
    label: 'Prueba GEO: Pregunta discovery en Perplexity',
    description: 'Ej: "Mejores agencias growth empresas tech España"'
  },
  {
    id: 'geo-test-2',
    label: 'Prueba GEO: Pregunta sobre último artículo',
    description: 'Verificar si la IA encuentra y resume bien el contenido'
  },
  {
    id: 'geo-test-3',
    label: 'Prueba GEO: Pregunta comparativa',
    description: 'Verificar posición vs competencia'
  },
  {
    id: 'bing-check',
    label: 'Revisar impresiones en Bing Webmaster Tools',
    description: 'Importante para visibilidad en ChatGPT',
    link: 'https://www.bing.com/webmasters'
  },
  {
    id: 'new-content',
    label: 'Verificar nuevo contenido publicado',
    description: 'Si publicaste artículo, verificar que está indexándose'
  }
];

const monthlyChecklist: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'kpi-record',
    label: 'Registrar KPIs SEO del mes',
    description: 'Anotar impresiones, clics, CTR y posición media en el tracker'
  },
  {
    id: 'kpi-compare',
    label: 'Comparar KPIs SEO vs mes anterior',
    description: 'Identificar tendencias y anomalías'
  },
  {
    id: 'geo-audit',
    label: 'Auditoría GEO completa',
    description: 'Revisar todas las pruebas del mes, calcular tasa de mención'
  },
  {
    id: 'hallucination-test',
    label: 'Test de alucinación',
    description: 'Preguntar a ChatGPT "¿Qué servicios ofrece Growth4U?" y verificar precisión'
  },
  {
    id: 'competitor-check',
    label: 'Check competencia en respuestas IA',
    description: 'Verificar si competidores están ganando terreno'
  },
  {
    id: 'schema-audit',
    label: 'Auditoría de Schema markup',
    description: 'Verificar que todos los artículos tienen Schema correcto',
    link: 'https://validator.schema.org/'
  },
  {
    id: 'sitemap-verify',
    label: 'Verificar sitemap actualizado',
    description: 'Comprobar que incluye todos los artículos nuevos'
  },
  {
    id: 'backlink-check',
    label: 'Revisar nuevos backlinks',
    description: 'Identificar oportunidades de link building'
  }
];

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [weeklyItems, setWeeklyItems] = useState<ChecklistItem[]>(
    weeklyChecklist.map(item => ({ ...item, checked: false }))
  );
  const [monthlyItems, setMonthlyItems] = useState<ChecklistItem[]>(
    monthlyChecklist.map(item => ({ ...item, checked: false }))
  );
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<{ weekly?: string; monthly?: string }>({});

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyQuery = query(
        collection(db, 'checklists'),
        orderBy('completedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(historyQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChecklistRecord[];
      setHistory(data);

      // Find last completed for each type
      const lastWeekly = data.find(r => r.type === 'weekly');
      const lastMonthly = data.find(r => r.type === 'monthly');
      setLastCompleted({
        weekly: lastWeekly?.completedAt,
        monthly: lastMonthly?.completedAt
      });
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    if (activeTab === 'weekly') {
      setWeeklyItems(items =>
        items.map(item =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
    } else {
      setMonthlyItems(items =>
        items.map(item =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
    }
  };

  const handleSaveChecklist = async () => {
    const items = activeTab === 'weekly' ? weeklyItems : monthlyItems;
    const completedCount = items.filter(i => i.checked).length;

    if (completedCount === 0) {
      alert('Completa al menos un ítem antes de guardar');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'checklists'), {
        type: activeTab,
        completedAt: new Date().toISOString(),
        items: items,
        notes: notes,
        completedCount,
        totalCount: items.length
      });

      // Reset
      if (activeTab === 'weekly') {
        setWeeklyItems(weeklyChecklist.map(item => ({ ...item, checked: false })));
      } else {
        setMonthlyItems(monthlyChecklist.map(item => ({ ...item, checked: false })));
      }
      setNotes('');
      loadHistory();

      alert(`Checklist ${activeTab === 'weekly' ? 'semanal' : 'mensual'} guardado correctamente`);
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Error al guardar el checklist');
    } finally {
      setSaving(false);
    }
  };

  const currentItems = activeTab === 'weekly' ? weeklyItems : monthlyItems;
  const completedCount = currentItems.filter(i => i.checked).length;
  const progress = (completedCount / currentItems.length) * 100;

  const getDaysSinceLastCompleted = (dateStr?: string) => {
    if (!dateStr) return null;
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const weeklyDays = getDaysSinceLastCompleted(lastCompleted.weekly);
  const monthlyDays = getDaysSinceLastCompleted(lastCompleted.monthly);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Checklists de Control</h1>
        <p className="text-slate-400 mt-2">Rutina semanal y mensual para mantener la salud SEO & GEO</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl p-6 ${
          weeklyDays === null ? 'bg-white border border-slate-200' :
          weeklyDays > 7 ? 'bg-red-900/30 border border-red-500/30' :
          weeklyDays > 5 ? 'bg-yellow-900/30 border border-yellow-500/30' :
          'bg-green-900/30 border border-green-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-bold text-[#032149]">Checklist Semanal</h3>
          </div>
          {weeklyDays !== null ? (
            <>
              <p className="text-slate-300">
                Último completado: <span className="font-medium">{new Date(lastCompleted.weekly!).toLocaleDateString('es-ES')}</span>
              </p>
              <p className={`text-sm mt-1 ${
                weeklyDays > 7 ? 'text-red-400' :
                weeklyDays > 5 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {weeklyDays === 0 ? 'Completado hoy' : `Hace ${weeklyDays} días`}
                {weeklyDays > 7 && ' - ¡Pendiente!'}
              </p>
            </>
          ) : (
            <p className="text-slate-400">Nunca completado</p>
          )}
        </div>

        <div className={`rounded-xl p-6 ${
          monthlyDays === null ? 'bg-white border border-slate-200' :
          monthlyDays > 35 ? 'bg-red-900/30 border border-red-500/30' :
          monthlyDays > 28 ? 'bg-yellow-900/30 border border-yellow-500/30' :
          'bg-green-900/30 border border-green-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-bold text-[#032149]">Checklist Mensual</h3>
          </div>
          {monthlyDays !== null ? (
            <>
              <p className="text-slate-300">
                Último completado: <span className="font-medium">{new Date(lastCompleted.monthly!).toLocaleDateString('es-ES')}</span>
              </p>
              <p className={`text-sm mt-1 ${
                monthlyDays > 35 ? 'text-red-400' :
                monthlyDays > 28 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                Hace {monthlyDays} días
                {monthlyDays > 35 && ' - ¡Pendiente!'}
              </p>
            </>
          ) : (
            <p className="text-slate-400">Nunca completado</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-[#3ecda5] text-white'
              : 'bg-white border border-slate-200 text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Semanal
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-[#3ecda5] text-white'
              : 'bg-white border border-slate-200 text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-4 h-4 inline mr-2" />
          Mensual
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#032149] font-medium">Progreso</span>
          <span className="text-slate-400">{completedCount}/{currentItems.length} completados</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3ecda5] to-[#2ab89a] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-700">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => toggleItem(item.id)}
          >
            <button className="mt-0.5">
              {item.checked ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <Circle className="w-6 h-6 text-slate-500" />
              )}
            </button>
            <div className="flex-1">
              <p className={`font-medium ${item.checked ? 'text-slate-400 line-through' : 'text-[#032149]'}`}>
                {item.label}
              </p>
              {item.description && (
                <p className="text-slate-400 text-sm mt-1">{item.description}</p>
              )}
            </div>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-slate-400 hover:text-[#032149] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Notes & Save */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3ecda5] h-24"
          placeholder="Observaciones, problemas encontrados, acciones pendientes..."
        />

        <button
          onClick={handleSaveChecklist}
          disabled={saving || completedCount === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3ecda5] hover:bg-[#35b894] disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : `Guardar Checklist ${activeTab === 'weekly' ? 'Semanal' : 'Mensual'}`}
        </button>
      </div>

      {/* History */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-[#032149]">Historial</h2>
        </div>

        {history.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No hay checklists completados</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {record.type === 'weekly' ? (
                    <Calendar className="w-5 h-5 text-blue-400" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-purple-400" />
                  )}
                  <div>
                    <p className="text-[#032149] font-medium">
                      {record.type === 'weekly' ? 'Semanal' : 'Mensual'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {new Date(record.completedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#032149]">
                    {record.items?.filter(i => i.checked).length || 0}/{record.items?.length || 0}
                  </p>
                  <p className="text-slate-400 text-xs">completados</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
