import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Copy,
  Link2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { GEOTest, GEOAutoResult } from './types';
import { platforms, promptTypes, suggestedPrompts, DATA_PATH } from './types';
import { LoadingSpinner, ErrorBanner, SectionHeader, MetricCard } from './shared';

export default function GeoTab() {
  // Manual tracker state
  const [tests, setTests] = useState<GEOTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTest, setNewTest] = useState({
    platform: 'perplexity',
    promptType: 'discovery',
    prompt: '',
    mentioned: true,
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    position: undefined as number | undefined,
    citedUrl: '',
    testedBy: '',
    notes: '',
  });

  // Auto GEO state
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoResults, setAutoResults] = useState<GEOAutoResult[]>([]);
  const [geoScore, setGeoScore] = useState<number | null>(null);

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
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
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
        position: newTest.position || null,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      setNewTest({
        platform: 'perplexity',
        promptType: 'discovery',
        prompt: '',
        mentioned: true,
        sentiment: 'neutral',
        position: undefined,
        citedUrl: '',
        testedBy: '',
        notes: '',
      });
      setShowAddForm(false);
      loadTests();
    } catch (error) {
      console.error('Error adding test:', error);
      alert('Error al guardar la prueba');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Eliminar esta prueba?')) return;
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

  const runAutoGEO = async () => {
    setAutoLoading(true);
    setAutoError(null);
    try {
      const promptsToTest = suggestedPrompts.map(sp => sp.prompt);
      const res = await fetch('/.netlify/functions/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsToTest,
          domain: 'growth4u.io',
          brandName: 'Growth4U',
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setAutoResults(data.results || []);
      setGeoScore(data.geoScore ?? null);
    } catch (err: any) {
      setAutoError(err.message || 'Error al ejecutar analisis GEO automatico');
    } finally {
      setAutoLoading(false);
    }
  };

  // Stats
  const totalTests = tests.length;
  const mentionedTests = tests.filter(t => t.mentioned).length;
  const mentionRate = totalTests > 0 ? (mentionedTests / totalTests * 100).toFixed(0) : '0';
  const positiveTests = tests.filter(t => t.sentiment === 'positive').length;
  const citedTests = tests.filter(t => t.citedUrl).length;

  const platformStats = platforms.map(p => ({
    ...p,
    total: tests.filter(t => t.platform === p.value).length,
    mentioned: tests.filter(t => t.platform === p.value && t.mentioned).length,
  }));

  return (
    <div className="space-y-8">
      {/* ===== SECTION 1: Auto GEO Analysis ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6351d5]" />
              Analisis GEO Automatico
            </h2>
            <p className="text-slate-400 text-sm mt-1">Pregunta a motores de IA sobre tu marca automaticamente</p>
          </div>
          <button
            onClick={runAutoGEO}
            disabled={autoLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${autoLoading ? 'animate-spin' : ''}`} />
            {autoLoading ? 'Analizando...' : 'Ejecutar Analisis GEO'}
          </button>
        </div>

        {autoError && <ErrorBanner message={autoError} />}
        {autoLoading && <LoadingSpinner text="Consultando motores de IA..." />}

        {geoScore !== null && autoResults.length > 0 && !autoLoading && (
          <div className="space-y-4">
            {/* GEO Score + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#6351d5]/5 border border-[#6351d5]/20 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500 mb-1">GEO Score</p>
                <p className="text-5xl font-bold text-[#6351d5]">{geoScore}</p>
                <p className="text-xs text-slate-400 mt-1">/100</p>
              </div>
              <MetricCard
                label="Tasa de Mencion"
                value={`${Math.round(autoResults.filter(r => r.mentioned).length / autoResults.length * 100)}%`}
                icon={<Target className="w-5 h-5 text-green-500" />}
                subtitle={`${autoResults.filter(r => r.mentioned).length}/${autoResults.length} prompts`}
              />
              <MetricCard
                label="Con Cita URL"
                value={autoResults.filter(r => r.citedUrls.length > 0).length}
                icon={<Link2 className="w-5 h-5 text-[#45b6f7]" />}
                subtitle="URLs de growth4u.io citadas"
              />
            </div>

            {/* Per-platform results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoResults.map((result, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      platforms.find(p => p.value === result.platform)?.color || 'bg-slate-500'
                    } text-white`}>
                      {platforms.find(p => p.value === result.platform)?.label || result.platform}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.mentioned ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      {result.sentiment === 'positive' && <ThumbsUp className="w-4 h-4 text-green-500" />}
                      {result.sentiment === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
                      {result.sentiment === 'negative' && <ThumbsDown className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-1">{result.prompt}</p>
                  {result.responseSnippet && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 line-clamp-3">
                      {result.responseSnippet}
                    </p>
                  )}
                  {result.citedUrls.length > 0 && (
                    <div className="mt-2">
                      {result.citedUrls.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6351d5] hover:underline flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> {url}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{new Date(result.testedAt).toLocaleString('es-ES')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-slate-200" />

      {/* ===== SECTION 2: Manual GEO Tracker ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149]">Tracker Manual GEO</h2>
            <p className="text-slate-400 text-sm mt-1">Registra pruebas manuales en motores de IA</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Prueba
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Pruebas Totales" value={totalTests} icon={<Bot className="w-5 h-5 text-purple-400" />} />
          <MetricCard
            label="Tasa de Mencion"
            value={`${mentionRate}%`}
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
            subtitle={`${mentionedTests}/${totalTests}`}
          />
          <MetricCard label="Sentimiento Positivo" value={positiveTests} icon={<ThumbsUp className="w-5 h-5 text-blue-400" />} />
          <MetricCard label="Con Cita/Link" value={citedTests} icon={<Link2 className="w-5 h-5 text-orange-400" />} />
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-[#032149] mb-4">Menciones por Plataforma</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {platformStats.map(p => (
              <div key={p.value} className="text-center">
                <div className={`w-12 h-12 ${p.color} rounded-xl mx-auto mb-2 flex items-center justify-center`}>
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <p className="text-[#032149] font-medium text-sm">{p.label}</p>
                <p className="text-slate-400 text-xs">{p.mentioned}/{p.total} mencionado</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-[#032149] mb-4">Prompts Sugeridos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedPrompts.map((sp, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                    sp.type === 'discovery' ? 'bg-blue-500/20 text-blue-600' :
                    sp.type === 'comparison' ? 'bg-purple-500/20 text-purple-600' :
                    sp.type === 'brand' ? 'bg-green-500/20 text-green-600' :
                    'bg-orange-500/20 text-orange-600'
                  }`}>
                    {promptTypes.find(pt => pt.value === sp.type)?.label}
                  </span>
                  <p className="text-slate-600 text-sm mt-1">{sp.prompt}</p>
                </div>
                <button
                  onClick={() => copyPrompt(sp.prompt)}
                  className="p-2 text-slate-400 hover:text-[#032149] transition-colors flex-shrink-0"
                  title="Copiar prompt"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tests History Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-[#032149]">Historial de Pruebas</h3>
          </div>

          {loading ? (
            <LoadingSpinner text="Cargando pruebas..." />
          ) : tests.length === 0 ? (
            <div className="p-8 text-center">
              <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No hay pruebas registradas</p>
              <p className="text-slate-400 text-sm mt-1">Empieza preguntando a ChatGPT o Perplexity sobre tu marca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plataforma</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prompt</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">Mencionado</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">Sentimiento</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">Pos.</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Notas</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-[#032149] text-sm">
                        {new Date(test.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs text-white ${
                          platforms.find(p => p.value === test.platform)?.color || 'bg-slate-500'
                        }`}>
                          {platforms.find(p => p.value === test.platform)?.label || test.platform}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-sm max-w-[250px]">
                        <p className="truncate">{test.prompt}</p>
                        {test.citedUrl && (
                          <a href={test.citedUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#6351d5] hover:underline flex items-center gap-1 mt-1">
                            <Link2 className="w-3 h-3" /> URL citada
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {test.mentioned ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {test.sentiment === 'positive' && <ThumbsUp className="w-5 h-5 text-green-500 mx-auto" />}
                        {test.sentiment === 'neutral' && <Minus className="w-5 h-5 text-slate-400 mx-auto" />}
                        {test.sentiment === 'negative' && <ThumbsDown className="w-5 h-5 text-red-500 mx-auto" />}
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-slate-600">{test.position ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-sm max-w-[150px] truncate">{test.notes || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteTest(test.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
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
      </div>

      {/* Add Test Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Registrar Prueba GEO</h2>

            <form onSubmit={handleAddTest} className="space-y-4">
              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Plataforma</label>
                <div className="grid grid-cols-3 gap-2">
                  {platforms.map(p => (
                    <button
                      key={p.value} type="button"
                      onClick={() => setNewTest({ ...newTest, platform: p.value })}
                      className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                        newTest.platform === p.value ? `${p.color} text-white` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Tipo de Prompt</label>
                <div className="grid grid-cols-2 gap-2">
                  {promptTypes.map(pt => (
                    <button
                      key={pt.value} type="button"
                      onClick={() => setNewTest({ ...newTest, promptType: pt.value })}
                      className={`p-3 rounded-lg text-left transition-colors ${
                        newTest.promptType === pt.value ? 'bg-[#6351d5] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <p className="font-medium text-sm">{pt.label}</p>
                      <p className="text-xs opacity-70">{pt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Text */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Prompt usado</label>
                <textarea
                  value={newTest.prompt}
                  onChange={(e) => setNewTest({ ...newTest, prompt: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5] h-24"
                  placeholder="Escribe la pregunta que hiciste a la IA"
                  required
                />
              </div>

              {/* Mentioned */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Menciono a Growth4U?</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setNewTest({ ...newTest, mentioned: true })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      newTest.mentioned ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    <CheckCircle2 className="w-5 h-5" /> Si
                  </button>
                  <button type="button" onClick={() => setNewTest({ ...newTest, mentioned: false })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      !newTest.mentioned ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    <XCircle className="w-5 h-5" /> No
                  </button>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Sentimiento</label>
                <div className="flex gap-3">
                  {(['positive', 'neutral', 'negative'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setNewTest({ ...newTest, sentiment: s })}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                        newTest.sentiment === s
                          ? s === 'positive' ? 'bg-green-500 text-white' : s === 'negative' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {s === 'positive' && <ThumbsUp className="w-5 h-5" />}
                      {s === 'neutral' && <Minus className="w-5 h-5" />}
                      {s === 'negative' && <ThumbsDown className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Posicion en respuesta (1-10, opcional)</label>
                <input
                  type="number" min={1} max={10}
                  value={newTest.position ?? ''}
                  onChange={(e) => setNewTest({ ...newTest, position: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Ej: 1 = primera mencion"
                />
              </div>

              {/* Cited URL */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">URL citada (opcional)</label>
                <input
                  type="url"
                  value={newTest.citedUrl}
                  onChange={(e) => setNewTest({ ...newTest, citedUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="https://growth4u.io/blog/..."
                />
              </div>

              {/* Tested By */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Probado por (opcional)</label>
                <input
                  type="text"
                  value={newTest.testedBy}
                  onChange={(e) => setNewTest({ ...newTest, testedBy: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Nombre"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newTest.notes}
                  onChange={(e) => setNewTest({ ...newTest, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Observaciones adicionales"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors">
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
