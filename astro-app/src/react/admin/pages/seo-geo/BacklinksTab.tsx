import { useState, useEffect } from 'react';
import {
  Link2,
  Globe,
  Server,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ArrowUpRight,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { DataForSEOMetrics, DomainMetric } from './types';
import { DATA_PATH } from './types';
import { MetricCard, LoadingSpinner, ErrorBanner, SectionHeader } from './shared';

const sources = ['Moz', 'Ahrefs', 'SEMrush', 'Majestic'];

export default function BacklinksTab() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataForSEO, setDataForSEO] = useState<DataForSEOMetrics | null>(null);

  // Manual domain metrics
  const [metrics, setMetrics] = useState<DomainMetric[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    domainAuthority: 0,
    backlinks: 0,
    referringDomains: 0,
    source: 'Moz',
    notes: '',
  });

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const [dfsSnap, metricsSnap] = await Promise.all([
        getDoc(doc(db, DATA_PATH, 'dataforseo_metrics', 'latest')),
        getDocs(query(collection(db, DATA_PATH, 'domain_metrics'), orderBy('date', 'desc'))),
      ]);
      if (dfsSnap.exists()) setDataForSEO(dfsSnap.data() as DataForSEOMetrics);
      setMetrics(metricsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DomainMetric[]);
    } catch {} finally {
      setInitialLoading(false);
    }
  };

  const syncDataForSEO = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/sync-dataforseo', {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setDataForSEO(data);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar DataForSEO. Verifica que DATAFORSEO_LOGIN y DATAFORSEO_PASSWORD esten configurados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, DATA_PATH, 'domain_metrics'), {
        ...newMetric,
        createdAt: new Date().toISOString(),
      });
      setNewMetric({
        date: new Date().toISOString().split('T')[0],
        domainAuthority: 0,
        backlinks: 0,
        referringDomains: 0,
        source: 'Moz',
        notes: '',
      });
      setShowAddForm(false);
      loadInitial();
    } catch (err) {
      console.error('Error adding metric:', err);
      alert('Error al guardar metrica');
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (!confirm('Eliminar esta metrica?')) return;
    try {
      await deleteDoc(doc(db, DATA_PATH, 'domain_metrics', id));
      loadInitial();
    } catch (err) {
      console.error('Error deleting metric:', err);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner text="Cargando datos..." />;
  }

  return (
    <div className="space-y-8">
      {/* DataForSEO Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149]">Backlinks & Domain Authority</h2>
            <p className="text-slate-400 text-sm mt-1">Datos automaticos via DataForSEO + metricas manuales</p>
          </div>
          <button
            onClick={syncDataForSEO}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar DataForSEO'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-medium">Error al sincronizar</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              <p className="text-red-500 text-xs mt-2">
                Asegurate de que las variables de entorno <code className="bg-red-100 px-1 rounded">DATAFORSEO_LOGIN</code> y{' '}
                <code className="bg-red-100 px-1 rounded">DATAFORSEO_PASSWORD</code> estan configuradas en Netlify.
              </p>
            </div>
          </div>
        )}
        {loading && <LoadingSpinner text="Sincronizando datos de backlinks..." />}

        {dataForSEO && !loading && (
          <>
            {/* Main Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <MetricCard
                label="Domain Rank"
                value={dataForSEO.domainRank}
                icon={<Shield className="w-5 h-5 text-[#6351d5]" />}
              />
              <MetricCard
                label="Backlinks Totales"
                value={dataForSEO.backlinks.toLocaleString()}
                icon={<Link2 className="w-5 h-5 text-[#45b6f7]" />}
              />
              <MetricCard
                label="Dominios de Referencia"
                value={dataForSEO.referringDomains.toLocaleString()}
                icon={<Globe className="w-5 h-5 text-green-500" />}
              />
              <MetricCard
                label="IPs de Referencia"
                value={dataForSEO.referringIps.toLocaleString()}
                icon={<Server className="w-5 h-5 text-amber-500" />}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">DoFollow</p>
                <p className="text-lg font-bold text-green-600">{dataForSEO.dofollowBacklinks.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">NoFollow</p>
                <p className="text-lg font-bold text-slate-500">{dataForSEO.nofollowBacklinks.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Paginas de Referencia</p>
                <p className="text-lg font-bold text-[#032149]">{dataForSEO.referringPages.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Backlinks Rotos</p>
                <p className={`text-lg font-bold ${dataForSEO.brokenBacklinks > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {dataForSEO.brokenBacklinks.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Last Updated */}
            <p className="text-xs text-slate-400">
              Ultima sincronizacion: {new Date(dataForSEO.date).toLocaleString('es-ES')}
              {dataForSEO.source && ` | Fuente: ${dataForSEO.source}`}
            </p>
          </>
        )}
      </div>

      {/* Divider */}
      <hr className="border-slate-200" />

      {/* Manual Domain Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Metricas de Autoridad Manual" subtitle="Registra datos de DA desde herramientas externas" />
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Anadir Datos
          </button>
        </div>

        {metrics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <ArrowUpRight className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No hay metricas registradas</p>
            <p className="text-slate-400 text-sm mt-1">Anade datos de DA desde Moz, Ahrefs, SEMrush o Majestic</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase">DA</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Backlinks</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ref. Domains</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fuente</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Notas</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-sm font-bold ${m.domainAuthority >= 40 ? 'text-green-600' : m.domainAuthority >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                          {m.domainAuthority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 text-right">{m.backlinks.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 text-right">{m.referringDomains.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{m.source}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400 max-w-[150px] truncate">{m.notes || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteMetric(m.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Metric Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Anadir Datos de Autoridad</h2>

            <form onSubmit={handleAddMetric} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
                <input type="date" value={newMetric.date}
                  onChange={(e) => setNewMetric({ ...newMetric, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Domain Authority (0-100)</label>
                <input type="number" min={0} max={100} value={newMetric.domainAuthority}
                  onChange={(e) => setNewMetric({ ...newMetric, domainAuthority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Backlinks</label>
                <input type="number" min={0} value={newMetric.backlinks}
                  onChange={(e) => setNewMetric({ ...newMetric, backlinks: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dominios de Referencia</label>
                <input type="number" min={0} value={newMetric.referringDomains}
                  onChange={(e) => setNewMetric({ ...newMetric, referringDomains: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fuente</label>
                <select value={newMetric.source}
                  onChange={(e) => setNewMetric({ ...newMetric, source: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]">
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <input type="text" value={newMetric.notes}
                  onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  placeholder="Observaciones" />
              </div>

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
