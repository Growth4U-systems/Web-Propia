import { useState } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Wallet,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type ChannelType = 'influencer' | 'media';

interface Channel {
  name: string;
  type: ChannelType;
  format: string;
  cost: number | null;
  registrations: number | null;
  activeUsers: number | null;
  investors: number | null;
  cdis: number | null;
  cacUser: number | null;
  cacInvestor: number | null;
  numInvestments: number | null;
  amountInvested: number | null;
  revenue: number | null;
  revenueAdjusted: number | null;
  roi: number | null;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { name: 'JF Calero', type: 'influencer', format: 'Mención en vídeo', cost: 4000, registrations: 150, activeUsers: 67, investors: 71, cdis: 4970, cacUser: 27, cacInvestor: 56, numInvestments: 29, amountInvested: 275009, revenue: 16501, revenueAdjusted: 14471, roi: 2.62 },
  { name: 'Informe K', type: 'influencer', format: 'Vídeo semi-dedicado', cost: 1200, registrations: 34, activeUsers: 13, investors: 7, cdis: 490, cacUser: 35, cacInvestor: 171, numInvestments: 1, amountInvested: 2035, revenue: 122, revenueAdjusted: 52, roi: -0.96 },
  { name: 'Zumitow', type: 'influencer', format: 'Newsletter', cost: 720, registrations: 21, activeUsers: 11, investors: 10, cdis: 700, cacUser: 34, cacInvestor: 72, numInvestments: 1, amountInvested: 1100, revenue: 66, revenueAdjusted: -4, roi: -1.01 },
  { name: 'Memoria de Tiburón', type: 'influencer', format: 'Vídeo semi-dedicado', cost: null, registrations: 15, activeUsers: 3, investors: 7, cdis: 490, cacUser: null, cacInvestor: null, numInvestments: 3, amountInvested: 5500, revenue: 330, revenueAdjusted: 120, roi: null },
  { name: 'Geekonomy', type: 'influencer', format: 'Vídeo', cost: 840, registrations: 6, activeUsers: null, investors: 2, cdis: 140, cacUser: 140, cacInvestor: 420, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: -1.00 },
  { name: 'Invierte Joven', type: 'influencer', format: 'Hilo Twitter + Newsletter', cost: 1020, registrations: 6, activeUsers: 4, investors: 1, cdis: 70, cacUser: 170, cacInvestor: 1020, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: -1.00 },
  { name: 'Héctor Chamizo', type: 'influencer', format: 'Vídeo podcast', cost: 3000, registrations: 5, activeUsers: 2, investors: 3, cdis: 210, cacUser: 600, cacInvestor: 1000, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: -1.00 },
  { name: 'Finect (2 meses)', type: 'media', format: 'Artículo', cost: 1830, registrations: 18, activeUsers: 5, investors: 12, cdis: 840, cacUser: 102, cacInvestor: 153, numInvestments: 3, amountInvested: 8900, revenue: 534, revenueAdjusted: 324, roi: -0.82 },
  { name: 'Todocrowdlending', type: 'media', format: 'Artículo, noticias, newsletter', cost: 1595, registrations: 9, activeUsers: 5, investors: 4, cdis: 280, cacUser: 177, cacInvestor: 399, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: -1.00 },
  { name: 'Rankia (3 meses)', type: 'media', format: 'Ficha, artículo, newsletter', cost: 5100, registrations: 5, activeUsers: 2, investors: 4, cdis: 280, cacUser: 1020, cacInvestor: 1275, numInvestments: 1, amountInvested: 5500, revenue: 330, revenueAdjusted: 260, roi: -0.95 },
  { name: 'Trustpilot', type: 'media', format: 'Plan anual', cost: null, registrations: null, activeUsers: null, investors: null, cdis: null, cacUser: null, cacInvestor: null, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: null },
  { name: 'Roams', type: 'media', format: 'Artículo, noticias, RRSS', cost: null, registrations: null, activeUsers: null, investors: null, cdis: null, cacUser: null, cacInvestor: null, numInvestments: null, amountInvested: null, revenue: null, revenueAdjusted: null, roi: null },
];

const CAC_TARGET = 100; // €

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('es-ES')}${suffix}`;
}

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('es-ES')} €`;
}

function fmtRoi(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const pct = (n * 100).toFixed(0);
  return `${n > 0 ? '+' : ''}${pct}%`;
}

function typeBadge(t: ChannelType) {
  return t === 'influencer'
    ? { label: 'Influencer', cls: 'bg-purple-100 text-purple-700' }
    : { label: 'Media', cls: 'bg-blue-100 text-blue-700' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InfluencerDashboardPage() {
  const [filterType, setFilterType] = useState<'all' | ChannelType>('all');
  const [tab, setTab] = useState<'acquisition' | 'revenue'>('acquisition');

  const filtered = CHANNELS.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  // Aggregates
  const totalCost = filtered.reduce((s, c) => s + (c.cost || 0), 0);
  const totalCDIs = filtered.reduce((s, c) => s + (c.cdis || 0), 0);
  const totalRegistrations = filtered.reduce((s, c) => s + (c.registrations || 0), 0);
  const totalActiveUsers = filtered.reduce((s, c) => s + (c.activeUsers || 0), 0);
  const totalInvestors = filtered.reduce((s, c) => s + (c.investors || 0), 0);
  const totalInvestments = filtered.reduce((s, c) => s + (c.numInvestments || 0), 0);
  const totalAmountInvested = filtered.reduce((s, c) => s + (c.amountInvested || 0), 0);
  const totalRevenue = filtered.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalRevenueAdj = filtered.reduce((s, c) => s + (c.revenueAdjusted || 0), 0);
  const totalSpend = totalCost + totalCDIs;
  const overallROI = totalSpend > 0 ? (totalRevenueAdj - totalSpend) / totalSpend : null;

  const channelsWithCAC = filtered.filter((c) => c.cacUser !== null);
  const bestCACUser = channelsWithCAC.length
    ? Math.min(...channelsWithCAC.map((c) => c.cacUser!))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Sistema de Captación Escalable</h1>
        <p className="text-slate-400 mt-2">Seguimiento de influencers y medios — métricas de campaña</p>
      </div>

      {/* KPI cards row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard icon={DollarSign} label="Coste canales" value={fmtEur(totalCost)} color="text-[#032149]" />
        <KPICard icon={Wallet} label="CDIs (x70€)" value={fmtEur(totalCDIs)} color="text-amber-600" />
        <KPICard icon={Users} label="Registros" value={fmt(totalRegistrations)} color="text-blue-600" />
        <KPICard icon={Users} label="Inversores" value={fmt(totalInvestors)} color="text-green-600" />
        <KPICard icon={TrendingUp} label="Vol. invertido" value={fmtEur(totalAmountInvested)} color="text-[#3ecda5]" />
        <KPICard
          icon={BarChart3}
          label="ROI global"
          value={overallROI !== null ? fmtRoi(overallROI) : '—'}
          color={overallROI !== null && overallROI > 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* KPI cards row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={TrendingDown} label="Mejor CAC usuario" value={bestCACUser !== null ? fmtEur(bestCACUser) : '—'} color="text-[#3ecda5]" />
        <KPICard icon={ArrowUpRight} label="Ingresos" value={fmtEur(totalRevenue)} color="text-blue-600" />
        <KPICard icon={ArrowUpRight} label="Ingresos ajustados" value={fmtEur(totalRevenueAdj)} color="text-indigo-600" />
        <KPICard icon={BarChart3} label="# Inversiones" value={fmt(totalInvestments)} color="text-[#032149]" />
      </div>

      {/* Funnel bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#032149] mb-3">Funnel de conversión</h3>
        <div className="flex items-end gap-2 h-24">
          <FunnelBar label="Registros" value={totalRegistrations} max={totalRegistrations} color="bg-blue-500" />
          <FunnelBar label="Usuarios activos" value={totalActiveUsers} max={totalRegistrations} color="bg-amber-500" />
          <FunnelBar label="Inversores" value={totalInvestors} max={totalRegistrations} color="bg-green-500" />
          <FunnelBar label="Inversiones" value={totalInvestments} max={totalRegistrations} color="bg-[#3ecda5]" />
        </div>
      </div>

      {/* Filters + Tab toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3ecda5]"
        >
          <option value="all">Todos los tipos</option>
          <option value="influencer">Influencers</option>
          <option value="media">Medios</option>
        </select>
        <div className="flex bg-slate-100 rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setTab('acquisition')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'acquisition' ? 'bg-white text-[#032149] shadow-sm' : 'text-slate-500'}`}
          >
            Adquisición
          </button>
          <button
            onClick={() => setTab('revenue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'revenue' ? 'bg-white text-[#032149] shadow-sm' : 'text-slate-500'}`}
          >
            Inversiones & Revenue
          </button>
        </div>
        <span className="text-xs text-slate-400">{filtered.length} canales</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'acquisition' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Formato</th>
                  <th className="px-4 py-3 text-right">Coste</th>
                  <th className="px-4 py-3 text-right">Registros</th>
                  <th className="px-4 py-3 text-right">Activos</th>
                  <th className="px-4 py-3 text-right">Inversores</th>
                  <th className="px-4 py-3 text-right">CDIs</th>
                  <th className="px-4 py-3 text-right">CAC Usr.</th>
                  <th className="px-4 py-3 text-right">CAC Inv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ch) => {
                  const tb = typeBadge(ch.type);
                  const cacColor =
                    ch.cacUser === null ? 'text-slate-400'
                    : ch.cacUser <= CAC_TARGET ? 'text-green-600 font-bold'
                    : 'text-red-600 font-bold';
                  return (
                    <tr key={ch.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#032149] whitespace-nowrap">{ch.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tb.cls}`}>{tb.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{ch.format}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtEur(ch.cost)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(ch.registrations)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(ch.activeUsers)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(ch.investors)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmtEur(ch.cdis)}</td>
                      <td className={`px-4 py-3 text-right ${cacColor}`}>
                        {fmtEur(ch.cacUser)}
                        {ch.cacUser !== null && (
                          ch.cacUser <= CAC_TARGET
                            ? <ArrowDownRight className="inline w-3.5 h-3.5 ml-1 text-green-500" />
                            : <ArrowUpRight className="inline w-3.5 h-3.5 ml-1 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtEur(ch.cacInvestor)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-[#032149]">
                  <td className="px-4 py-3" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right">{fmtEur(totalCost)}</td>
                  <td className="px-4 py-3 text-right">{fmt(totalRegistrations)}</td>
                  <td className="px-4 py-3 text-right">{fmt(totalActiveUsers)}</td>
                  <td className="px-4 py-3 text-right">{fmt(totalInvestors)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmtEur(totalCDIs)}</td>
                  <td className="px-4 py-3 text-right" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Coste</th>
                  <th className="px-4 py-3 text-right">CDIs</th>
                  <th className="px-4 py-3 text-right"># Inversiones</th>
                  <th className="px-4 py-3 text-right">Vol. Invertido</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">I. Ajustados</th>
                  <th className="px-4 py-3 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ch) => {
                  const tb = typeBadge(ch.type);
                  const roiColor =
                    ch.roi === null ? 'text-slate-400'
                    : ch.roi > 0 ? 'text-green-600 font-bold'
                    : 'text-red-600 font-bold';
                  return (
                    <tr key={ch.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#032149] whitespace-nowrap">{ch.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tb.cls}`}>{tb.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtEur(ch.cost)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmtEur(ch.cdis)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(ch.numInvestments)}</td>
                      <td className="px-4 py-3 text-right text-[#032149] font-medium">{fmtEur(ch.amountInvested)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{fmtEur(ch.revenue)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{fmtEur(ch.revenueAdjusted)}</td>
                      <td className={`px-4 py-3 text-right ${roiColor}`}>
                        {fmtRoi(ch.roi)}
                        {ch.roi !== null && (
                          ch.roi > 0
                            ? <ArrowUpRight className="inline w-3.5 h-3.5 ml-1 text-green-500" />
                            : <ArrowDownRight className="inline w-3.5 h-3.5 ml-1 text-red-500" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-[#032149]">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right">{fmtEur(totalCost)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmtEur(totalCDIs)}</td>
                  <td className="px-4 py-3 text-right">{fmt(totalInvestments)}</td>
                  <td className="px-4 py-3 text-right">{fmtEur(totalAmountInvested)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtEur(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right text-indigo-600">{fmtEur(totalRevenueAdj)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${overallROI !== null && overallROI > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallROI !== null ? fmtRoi(overallROI) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Top performer highlight */}
      <div className="bg-gradient-to-r from-[#032149] to-[#0a3a6b] rounded-xl p-6 text-white">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Top performer</h3>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-bold">JF Calero</p>
            <p className="text-white/60 text-sm">Mención en vídeo</p>
          </div>
          <div className="flex gap-6 ml-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">150</p>
              <p className="text-xs text-white/60">Registros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">71</p>
              <p className="text-xs text-white/60">Inversores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">275.009 €</p>
              <p className="text-xs text-white/60">Vol. invertido</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">27 €</p>
              <p className="text-xs text-white/60">CAC usuario</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">+262%</p>
              <p className="text-xs text-white/60">ROI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decision rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4" /> Regla de escalado
          </h3>
          <p className="text-green-700 text-sm">
            Si el CAC de un canal es <strong>menor que {CAC_TARGET} €</strong> → escalar inversión, negociar más contenido con ese creador.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> Regla de pausa
          </h3>
          <p className="text-red-700 text-sm">
            Si el CAC de un canal es <strong>mayor que {CAC_TARGET * 2} € (2×)</strong> → pausar y reasignar presupuesto a canales con mejor rendimiento.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color, sub }: {
  icon: any;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 4) : 4;
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-[#032149]">{value}</span>
      <div className="w-full rounded-t-lg overflow-hidden bg-slate-100" style={{ height: '64px' }}>
        <div className={`${color} rounded-t-lg w-full transition-all`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}
