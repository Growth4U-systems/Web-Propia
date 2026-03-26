import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ExternalLink,
  Save,
  Copy,
  Link2
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase-client';

const APP_ID = 'growth4u-public-app';
const DATA_PATH = `artifacts/${APP_ID}/public/data`;

interface GEOTest {
  id: string;
  date: string;
  platform: string;
  promptType: string;
  prompt: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  citedUrl: string;
  notes: string;
}

const platforms = [
  { value: 'chatgpt', label: 'ChatGPT', color: 'bg-green-500' },
  { value: 'perplexity', label: 'Perplexity', color: 'bg-blue-500' },
  { value: 'bing-chat', label: 'Bing Chat / Copilot', color: 'bg-cyan-500' },
  { value: 'gemini', label: 'Google Gemini', color: 'bg-purple-500' },
  { value: 'claude', label: 'Claude', color: 'bg-orange-500' },
];

const promptTypes = [
  { value: 'discovery', label: 'Discovery', description: 'Ej: "Mejores agencias de growth para empresas tech"' },
  { value: 'comparison', label: 'Comparativa', description: 'Ej: "Compara agencias growth en España"' },
  { value: 'brand', label: 'Marca Directa', description: 'Ej: "¿Qué servicios ofrece Growth4U?"' },
  { value: 'article', label: 'Artículo', description: 'Ej: "Resume el artículo sobre X de Growth4U"' },
];

const suggestedPrompts = [
  { type: 'discovery', prompt: '¿Cuáles son las mejores agencias de growth para empresas tech en España?' },
  { type: 'discovery', prompt: '¿Qué empresas ayudan a empresas tech a crecer en el mercado español?' },
  { type: 'comparison', prompt: 'Compara las mejores agencias de growth marketing en España' },
  { type: 'brand', prompt: '¿Qué servicios ofrece Growth4U?' },
  { type: 'brand', prompt: '¿Quién es Growth4U y qué hacen?' },
  { type: 'article', prompt: 'Resume el artículo sobre unit economics de Growth4U' },
  { type: 'article', prompt: '¿Qué dice Growth4U sobre el go-to-market en España?' },
];

export default function GeoPage() {
  const [tests, setTests] = useState<GEOTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTest, setNewTest] = useState({
    platform: 'perplexity',
    promptType: 'discovery',
    prompt: '',
    mentioned: true,
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    citedUrl: '',
    notes: ''
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const testsQuery = query(
        collection(db, DATA_PATH, 'geo_tests'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(testsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GEOTest[];
      setTests(data);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, DATA_PATH, 'geo_tests'), {
        ...newTest,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setNewTest({
        platform: 'perplexity',
        promptType: 'discovery',
        prompt: '',
        mentioned: true,
        sentiment: 'neutral',
        citedUrl: '',
        notes: ''
      });
      setShowAddForm(false);
      loadTests();
    } catch (error) {
      console.error('Error adding test:', error);
      alert('Error al guardar la prueba');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('¿Eliminar esta prueba?')) return;

    try {
      await deleteDoc(doc(db, DATA_PATH, 'geo_tests', id));
      loadTests();
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  // Calculate stats
  const totalTests = tests.length;
  const mentionedTests = tests.filter(t => t.mentioned).length;
  const mentionRate = totalTests > 0 ? (mentionedTests / totalTests * 100).toFixed(0) : 0;
  const positiveTests = tests.filter(t => t.sentiment === 'positive').length;
  const citedTests = tests.filter(t => t.citedUrl).length;

  const platformStats = platforms.map(p => ({
    ...p,
    total: tests.filter(t => t.platform === p.value).length,
    mentioned: tests.filter(t => t.platform === p.value && t.mentioned).length
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#032149]">Tracker GEO</h1>
          <p className="text-slate-400 mt-2">Monitorea cómo los motores de IA mencionan tu marca</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3ecda5] hover:bg-[#35b894] text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Prueba
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Pruebas Totales</span>
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{totalTests}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Tasa de Mención</span>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{mentionRate}%</span>
          <span className="text-slate-400 text-sm ml-2">({mentionedTests}/{totalTests})</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Sentimiento Positivo</span>
            <ThumbsUp className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{positiveTests}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Con Cita/Link</span>
            <Link2 className="w-5 h-5 text-orange-400" />
          </div>
          <span className="text-2xl font-bold text-[#032149]">{citedTests}</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#032149] mb-4">Menciones por Plataforma</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {platformStats.map(p => (
            <div key={p.value} className="text-center">
              <div className={`w-12 h-12 ${p.color} rounded-xl mx-auto mb-2 flex items-center justify-center`}>
                <Bot className="w-6 h-6 text-[#032149]" />
              </div>
              <p className="text-[#032149] font-medium">{p.label}</p>
              <p className="text-slate-400 text-sm">
                {p.mentioned}/{p.total} mencionado
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#032149] mb-4">Prompts Sugeridos para Probar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestedPrompts.map((sp, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
              <div className="flex-1">
                <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                  sp.type === 'discovery' ? 'bg-blue-500/20 text-blue-400' :
                  sp.type === 'comparison' ? 'bg-purple-500/20 text-purple-400' :
                  sp.type === 'brand' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {promptTypes.find(pt => pt.value === sp.type)?.label}
                </span>
                <p className="text-slate-300 text-sm mt-1">{sp.prompt}</p>
              </div>
              <button
                onClick={() => copyPrompt(sp.prompt)}
                className="p-2 text-slate-400 hover:text-[#032149] transition-colors"
                title="Copiar prompt"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-[#032149]">Historial de Pruebas</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando...</div>
        ) : tests.length === 0 ? (
          <div className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No hay pruebas registradas</p>
            <p className="text-slate-500 text-sm mt-1">Empieza preguntando a ChatGPT o Perplexity sobre tu marca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Plataforma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Prompt</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Mencionado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Sentimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Notas</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-[#032149] text-sm">
                      {new Date(test.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs text-[#032149] ${
                        platforms.find(p => p.value === test.platform)?.color || 'bg-slate-500'
                      }`}>
                        {platforms.find(p => p.value === test.platform)?.label || test.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm max-w-[250px]">
                      <p className="truncate">{test.prompt}</p>
                      {test.citedUrl && (
                        <a
                          href={test.citedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#3ecda5] hover:underline flex items-center gap-1 mt-1"
                        >
                          <Link2 className="w-3 h-3" /> URL citada
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {test.mentioned ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {test.sentiment === 'positive' && <ThumbsUp className="w-5 h-5 text-green-400 mx-auto" />}
                      {test.sentiment === 'neutral' && <Minus className="w-5 h-5 text-slate-400 mx-auto" />}
                      {test.sentiment === 'negative' && <ThumbsDown className="w-5 h-5 text-red-400 mx-auto" />}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-[150px] truncate">
                      {test.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteTest(test.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Test Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Registrar Prueba GEO</h2>

            <form onSubmit={handleAddTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Plataforma</label>
                <div className="grid grid-cols-3 gap-2">
                  {platforms.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setNewTest({ ...newTest, platform: p.value })}
                      className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                        newTest.platform === p.value
                          ? `${p.color} text-[#032149]`
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Prompt</label>
                <div className="grid grid-cols-2 gap-2">
                  {promptTypes.map(pt => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setNewTest({ ...newTest, promptType: pt.value })}
                      className={`p-3 rounded-lg text-left transition-colors ${
                        newTest.promptType === pt.value
                          ? 'bg-[#3ecda5] text-white'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <p className="font-medium">{pt.label}</p>
                      <p className="text-xs opacity-70">{pt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Prompt usado</label>
                <textarea
                  value={newTest.prompt}
                  onChange={(e) => setNewTest({ ...newTest, prompt: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#3ecda5] h-24"
                  placeholder="Escribe la pregunta que hiciste a la IA"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">¿Mencionó a Growth4U?</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewTest({ ...newTest, mentioned: true })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      newTest.mentioned
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTest({ ...newTest, mentioned: false })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      !newTest.mentioned
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <XCircle className="w-5 h-5" /> No
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sentimiento</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewTest({ ...newTest, sentiment: 'positive' })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      newTest.sentiment === 'positive'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTest({ ...newTest, sentiment: 'neutral' })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      newTest.sentiment === 'neutral'
                        ? 'bg-slate-500 text-[#032149]'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTest({ ...newTest, sentiment: 'negative' })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      newTest.sentiment === 'negative'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">URL citada (opcional)</label>
                <input
                  type="url"
                  value={newTest.citedUrl}
                  onChange={(e) => setNewTest({ ...newTest, citedUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#3ecda5]"
                  placeholder="https://growth4u.io/blog/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newTest.notes}
                  onChange={(e) => setNewTest({ ...newTest, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#3ecda5]"
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3ecda5] hover:bg-[#35b894] text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
