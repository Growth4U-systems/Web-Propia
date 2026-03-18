import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Save, Eye, MousePointer, Target, Percent,
  Users, Clock, BarChart3, ExternalLink, TrendingUp, TrendingDown,
  Info, ChevronDown, ChevronUp, RefreshCw, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import { DATA_PATH, metricInfo } from './types';
import type { GSCMetric, AnalyticsMetric } from './types';

// ============================================
// METRIC CARD (inline for this tab)
// ============================================

function MetricCard({
  icon: Icon, label, value, change, changePositive, color, metricKey,
  expandedMetric, setExpandedMetric,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  color: string;
  metricKey: string;
  expandedMetric: string | null;
  setExpandedMetric: (k: string | null) => void;
}) {
  const info = metricInfo[metricKey];
  const isExpanded = expandedMetric === metricKey;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-sm">{label}</span>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-[#032149]">{value}</span>
          {change && (
            <span className={`text-sm flex items-center gap-1 ${changePositive ? 'text-green-500' : 'text-red-500'}`}>
              {changePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {change}
            </span>
          )}
        </div>
      </div>
      {info && (
        <>
          <button
            onClick={() => setExpandedMetric(isExpanded ? null : metricKey)}
            className="w-full px-6 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-slate-500 text-xs transition-colors"
          >
            <Info className="w-3 h-3" />
            {isExpanded ? 'Ocultar' : '¿Por qué medimos esto?'}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {isExpanded && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
              <p className="text-xs text-slate-400 uppercase">Por qué importa</p>
              <p className="text-sm text-slate-600">{info.why}</p>
              <p className="text-xs text-slate-400 uppercase mt-2">Cómo mejorar</p>
              <p className="text-sm text-green-600">{info.improve}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MetricsTab() {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [gscMetrics, setGscMetrics] = useState<GSCMetric[]>([]);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showGscForm, setShowGscForm] = useState(false);
  const [showAnalyticsForm, setShowAnalyticsForm] = useState(false);

  // GSC form
  const [newGsc, setNewGsc] = useState({ date: new Date().toISOString().split('T')[0], impressions: '', clicks: '', position: '', notes: '' });

  // GA form
  const [newGa, setNewGa] = useState({ date: new Date().toISOString().split('T')[0], sessions: '', users: '', pageviews: '', bounceRate: '', avgSessionDuration: '', organicPercent: '', notes: '' });

  // Sync API state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncDays, setSyncDays] = useState(7);

  useEffect(() => {
    loadAll().then(() => {
      // Auto-sync if no data or last sync > 24h ago
      const lastSync = localStorage.getItem('metrics_last_sync');
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (!lastSync || parseInt(lastSync) < dayAgo) {
        handleSync();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadGsc(), loadAnalytics()]);
    setLoading(false);
  };

  const loadGsc = async () => {
    try {
      const q = query(collection(db, DATA_PATH, 'seo_metrics'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setGscMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GSCMetric[]);
    } catch (e) { console.error('Error loading GSC:', e); }
  };

  const loadAnalytics = async () => {
    try {
      const q = query(collection(db, DATA_PATH, 'analytics_metrics'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setAnalyticsMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AnalyticsMetric[]);
    } catch (e) { console.error('Error loading GA:', e); }
  };

  const handleAddGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    const impressions = parseInt(newGsc.impressions);
    const clicks = parseInt(newGsc.clicks);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    try {
      await addDoc(collection(db, DATA_PATH, 'seo_metrics'), {
        date: newGsc.date, impressions, clicks, ctr: parseFloat(ctr.toFixed(2)),
        position: parseFloat(newGsc.position), source: 'Google Search Console',
        notes: newGsc.notes, createdAt: new Date().toISOString(),
      });
      setNewGsc({ date: new Date().toISOString().split('T')[0], impressions: '', clicks: '', position: '', notes: '' });
      setShowGscForm(false);
      loadGsc();
    } catch (e) { console.error(e); alert('Error al guardar'); }
  };

  const handleAddAnalytics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, DATA_PATH, 'analytics_metrics'), {
        date: newGa.date,
        sessions: parseInt(newGa.sessions), users: parseInt(newGa.users),
        pageviews: parseInt(newGa.pageviews), bounceRate: parseFloat(newGa.bounceRate),
        avgSessionDuration: parseFloat(newGa.avgSessionDuration),
        organicPercent: parseFloat(newGa.organicPercent),
        notes: newGa.notes, createdAt: new Date().toISOString(),
      });
      setNewGa({ date: new Date().toISOString().split('T')[0], sessions: '', users: '', pageviews: '', bounceRate: '', avgSessionDuration: '', organicPercent: '', notes: '' });
      setShowAnalyticsForm(false);
      loadAnalytics();
    } catch (e) { console.error(e); alert('Error al guardar'); }
  };

  const deleteGsc = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await deleteDoc(doc(db, DATA_PATH, 'seo_metrics', id));
    loadGsc();
  };

  const deleteAnalytics = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await deleteDoc(doc(db, DATA_PATH, 'analytics_metrics', id));
    loadAnalytics();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/.netlify/functions/sync-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: syncDays }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error desconocido');

      const { gsc, ga, period } = data;
      const dateLabel = `${period.start} → ${period.end}`;

      // Save GSC data to Firebase
      await addDoc(collection(db, DATA_PATH, 'seo_metrics'), {
        date: period.end,
        impressions: gsc.impressions,
        clicks: gsc.clicks,
        ctr: gsc.ctr,
        position: gsc.position,
        source: 'API — Google Search Console',
        notes: `Sync automático (${syncDays}d: ${dateLabel})`,
        createdAt: new Date().toISOString(),
      });

      // Save GA data to Firebase
      await addDoc(collection(db, DATA_PATH, 'analytics_metrics'), {
        date: period.end,
        sessions: ga.sessions,
        users: ga.users,
        pageviews: ga.pageviews,
        bounceRate: ga.bounceRate,
        avgSessionDuration: ga.avgSessionDuration,
        organicPercent: ga.organicPercent,
        notes: `Sync automático (${syncDays}d: ${dateLabel})`,
        createdAt: new Date().toISOString(),
      });

      await loadAll();
      localStorage.setItem('metrics_last_sync', String(Date.now()));
      setSyncResult({ ok: true, message: `Datos sincronizados (${dateLabel})` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setSyncResult({ ok: false, message: msg });
    } finally {
      setSyncing(false);
    }
  };

  const getChange = (a: number, b: number) => b ? ((a - b) / b * 100).toFixed(1) : null;

  const lg = gscMetrics[0];
  const pg = gscMetrics[1];
  const la = analyticsMetrics[0];
  const pa = analyticsMetrics[1];

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando datos...</div>;

  return (
    <div className="space-y-10">
      {/* ============ GSC ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149]">Google Search Console</h2>
            <p className="text-slate-500 text-sm">Visibilidad en Google</p>
          </div>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg text-sm">
            <ExternalLink className="w-4 h-4" /> Abrir GSC
          </a>
        </div>

        {lg ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <MetricCard icon={Eye} label="Impresiones" value={lg.impressions.toLocaleString()}
              change={pg ? `${getChange(lg.impressions, pg.impressions)}%` : undefined}
              changePositive={pg ? lg.impressions >= pg.impressions : undefined}
              color="text-blue-500" metricKey="impressions" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={MousePointer} label="Clics" value={lg.clicks.toLocaleString()}
              change={pg ? `${getChange(lg.clicks, pg.clicks)}%` : undefined}
              changePositive={pg ? lg.clicks >= pg.clicks : undefined}
              color="text-green-500" metricKey="clicks" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Percent} label="CTR" value={`${lg.ctr.toFixed(2)}%`}
              change={pg ? `${getChange(lg.ctr, pg.ctr)}%` : undefined}
              changePositive={pg ? lg.ctr >= pg.ctr : undefined}
              color="text-purple-500" metricKey="ctr" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Target} label="Posición Media" value={lg.position.toFixed(1)}
              change={pg ? `${Math.abs(lg.position - pg.position).toFixed(1)} pos` : undefined}
              changePositive={pg ? lg.position <= pg.position : undefined}
              color="text-orange-500" metricKey="position" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-4">
            <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No hay datos de Search Console</p>
          </div>
        )}

        {gscMetrics.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-slate-500 hover:text-[#032149] text-sm">Ver historial ({gscMetrics.length} registros)</summary>
            <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-500">Fecha</th>
                    <th className="px-4 py-3 text-left text-slate-500">Impresiones</th>
                    <th className="px-4 py-3 text-left text-slate-500">Clics</th>
                    <th className="px-4 py-3 text-left text-slate-500">CTR</th>
                    <th className="px-4 py-3 text-left text-slate-500">Posición</th>
                    <th className="px-4 py-3 text-right text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gscMetrics.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-slate-600">{m.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{m.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{m.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-slate-600">{m.position.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteGsc(m.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ============ GA ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#032149]">Google Analytics</h2>
            <p className="text-slate-500 text-sm">Tráfico y comportamiento de usuarios</p>
          </div>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg text-sm">
            <ExternalLink className="w-4 h-4" /> Abrir GA
          </a>
        </div>

        {la ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <MetricCard icon={Users} label="Sesiones" value={la.sessions.toLocaleString()}
              change={pa ? `${getChange(la.sessions, pa.sessions)}%` : undefined}
              changePositive={pa ? la.sessions >= pa.sessions : undefined}
              color="text-blue-500" metricKey="sessions" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Users} label="Usuarios" value={la.users.toLocaleString()}
              change={pa ? `${getChange(la.users, pa.users)}%` : undefined}
              changePositive={pa ? la.users >= pa.users : undefined}
              color="text-green-500" metricKey="users" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Eye} label="Páginas Vistas" value={la.pageviews.toLocaleString()}
              change={pa ? `${getChange(la.pageviews, pa.pageviews)}%` : undefined}
              changePositive={pa ? la.pageviews >= pa.pageviews : undefined}
              color="text-purple-500" metricKey="pageviews" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Target} label="Tasa de Rebote" value={`${la.bounceRate.toFixed(1)}%`}
              change={pa ? `${(la.bounceRate - pa.bounceRate).toFixed(1)}%` : undefined}
              changePositive={pa ? la.bounceRate <= pa.bounceRate : undefined}
              color="text-orange-500" metricKey="bounceRate" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={Clock} label="Duración Media"
              value={`${Math.floor(la.avgSessionDuration / 60)}:${String(Math.floor(la.avgSessionDuration % 60)).padStart(2, '0')}`}
              change={pa ? `${getChange(la.avgSessionDuration, pa.avgSessionDuration)}%` : undefined}
              changePositive={pa ? la.avgSessionDuration >= pa.avgSessionDuration : undefined}
              color="text-cyan-500" metricKey="avgSessionDuration" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
            <MetricCard icon={TrendingUp} label="% Orgánico" value={`${la.organicPercent.toFixed(1)}%`}
              change={pa ? `${(la.organicPercent - pa.organicPercent).toFixed(1)}%` : undefined}
              changePositive={pa ? la.organicPercent >= pa.organicPercent : undefined}
              color="text-emerald-500" metricKey="organicPercent" expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric} />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-4">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No hay datos de Analytics</p>
          </div>
        )}

        {analyticsMetrics.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-slate-500 hover:text-[#032149] text-sm">Ver historial ({analyticsMetrics.length} registros)</summary>
            <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-500">Fecha</th>
                    <th className="px-4 py-3 text-left text-slate-500">Sesiones</th>
                    <th className="px-4 py-3 text-left text-slate-500">Usuarios</th>
                    <th className="px-4 py-3 text-left text-slate-500">Pageviews</th>
                    <th className="px-4 py-3 text-left text-slate-500">Rebote</th>
                    <th className="px-4 py-3 text-left text-slate-500">% Orgánico</th>
                    <th className="px-4 py-3 text-right text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyticsMetrics.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-[#032149]">{new Date(m.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-slate-600">{m.sessions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{m.users.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{m.pageviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{m.bounceRate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-600">{m.organicPercent.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteAnalytics(m.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ============ SYNC API ============ */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#032149]">Sincronizar via API</h3>
            <p className="text-slate-500 text-sm">Obtén datos automáticamente de GSC y GA4 con Service Account</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Período:</label>
            <select
              value={syncDays}
              onChange={e => setSyncDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#032149]"
              disabled={syncing}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
              <option value={28}>Últimos 28 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2 bg-[#6351d5] hover:bg-[#5242b8] disabled:bg-[#6351d5]/50 text-white rounded-lg text-sm transition-colors"
          >
            {syncing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Sincronizar GSC + GA4</>
            )}
          </button>
        </div>

        {syncResult && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            syncResult.ok
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {syncResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {syncResult.message}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-600 text-xs">Configuración requerida</summary>
          <div className="mt-3 text-xs text-slate-500 space-y-2 bg-slate-50 rounded-lg p-4">
            <p><strong>Variables de entorno en Netlify:</strong></p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><code>GOOGLE_SA_CLIENT_EMAIL</code> — Email de la Service Account</li>
              <li><code>GOOGLE_SA_PRIVATE_KEY</code> — Private key (incluyendo BEGIN/END)</li>
              <li><code>GSC_SITE_URL</code> — URL verificada en GSC (ej: https://growth4u.io)</li>
              <li><code>GA4_PROPERTY_ID</code> — Property ID numérico de GA4</li>
            </ul>
            <p className="pt-2"><strong>Pasos:</strong></p>
            <ol className="space-y-1 ml-4 list-decimal">
              <li>Crea un proyecto en Google Cloud Console</li>
              <li>Habilita APIs: Search Console API + Google Analytics Data API</li>
              <li>Crea Service Account → descarga JSON key</li>
              <li>En GSC: añade el email de la SA como usuario (lectura)</li>
              <li>En GA4: añade el email de la SA como visor</li>
              <li>Pega el JSON en Netlify → Environment Variables</li>
            </ol>
          </div>
        </details>
      </section>

      {/* ============ MANUAL FALLBACK ============ */}
      <details>
        <summary className="cursor-pointer text-slate-400 hover:text-slate-600 text-sm">Añadir datos manualmente</summary>
        <div className="mt-3 bg-white border border-slate-200 rounded-xl p-6">
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-[#032149] mb-2">Google Search Console</h4>
              <ol className="text-slate-500 space-y-1">
                <li>1. Abre Search Console</li>
                <li>2. Ve a Rendimiento → Resultados</li>
                <li>3. Selecciona últimos 7 días</li>
                <li>4. Copia totales aquí</li>
              </ol>
              <button onClick={() => setShowGscForm(true)} className="mt-3 text-sm text-[#6351d5] hover:underline">+ Añadir manualmente</button>
            </div>
            <div>
              <h4 className="font-medium text-[#032149] mb-2">Google Analytics</h4>
              <ol className="text-slate-500 space-y-1">
                <li>1. Abre GA4</li>
                <li>2. Informes → Vista general</li>
                <li>3. Selecciona últimos 28 días</li>
                <li>4. Copia sesiones, usuarios, etc.</li>
              </ol>
              <button onClick={() => setShowAnalyticsForm(true)} className="mt-3 text-sm text-[#6351d5] hover:underline">+ Añadir manualmente</button>
            </div>
          </div>
        </div>
      </details>

      {/* ============ GSC MODAL ============ */}
      {showGscForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Añadir datos de Search Console</h2>
            <form onSubmit={handleAddGsc} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
                <input type="date" value={newGsc.date} onChange={e => setNewGsc({ ...newGsc, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Impresiones</label>
                  <input type="number" value={newGsc.impressions} onChange={e => setNewGsc({ ...newGsc, impressions: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Clics</label>
                  <input type="number" value={newGsc.clicks} onChange={e => setNewGsc({ ...newGsc, clicks: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Posición Media</label>
                <input type="number" step="0.1" value={newGsc.position} onChange={e => setNewGsc({ ...newGsc, position: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <input type="text" value={newGsc.notes} onChange={e => setNewGsc({ ...newGsc, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" placeholder="Ej: Publicado nuevo artículo" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGscForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg">Cancelar</button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ GA MODAL ============ */}
      {showAnalyticsForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#032149] mb-4">Añadir datos de Google Analytics</h2>
            <form onSubmit={handleAddAnalytics} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Período (fecha final)</label>
                <input type="date" value={newGa.date} onChange={e => setNewGa({ ...newGa, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Sesiones</label>
                  <input type="number" value={newGa.sessions} onChange={e => setNewGa({ ...newGa, sessions: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Usuarios</label>
                  <input type="number" value={newGa.users} onChange={e => setNewGa({ ...newGa, users: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Páginas vistas</label>
                <input type="number" value={newGa.pageviews} onChange={e => setNewGa({ ...newGa, pageviews: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tasa de rebote (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={newGa.bounceRate}
                    onChange={e => setNewGa({ ...newGa, bounceRate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Duración media (seg)</label>
                  <input type="number" step="1" value={newGa.avgSessionDuration}
                    onChange={e => setNewGa({ ...newGa, avgSessionDuration: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">% Tráfico orgánico</label>
                <input type="number" step="0.1" min="0" max="100" value={newGa.organicPercent}
                  onChange={e => setNewGa({ ...newGa, organicPercent: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" required />
                <p className="text-xs text-slate-400 mt-1">En GA4: Informes → Adquisición → Visión general</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <input type="text" value={newGa.notes} onChange={e => setNewGa({ ...newGa, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-[#032149]" placeholder="Ej: Campaña de email" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAnalyticsForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg">Cancelar</button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#5242b8] text-white rounded-lg">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
