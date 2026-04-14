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
  Lock,
  Eye,
  EyeOff,
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
  cacUser: number | null;
  cacInvestor: number | null;
  numInvestments: number | null;
  amountInvested: number | null;
  revenue: number | null;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { name: 'JF Calero', type: 'influencer', format: 'Mención en vídeo', cost: 4000, registrations: 150, activeUsers: 67, investors: 71, cacUser: 27, cacInvestor: 56, numInvestments: 29, amountInvested: 275009, revenue: 16501 },
  { name: 'Informe K', type: 'influencer', format: 'Vídeo semi-dedicado', cost: 1200, registrations: 34, activeUsers: 13, investors: 7, cacUser: 35, cacInvestor: 171, numInvestments: 1, amountInvested: 2035, revenue: 122 },
  { name: 'Zumitow', type: 'influencer', format: 'Newsletter', cost: 720, registrations: 21, activeUsers: 11, investors: 10, cacUser: 34, cacInvestor: 72, numInvestments: 1, amountInvested: 1100, revenue: 66 },
  { name: 'Finect (2 meses)', type: 'media', format: 'Artículo', cost: 1830, registrations: 18, activeUsers: 5, investors: 12, cacUser: 102, cacInvestor: 153, numInvestments: 3, amountInvested: 8900, revenue: 534 },
  { name: 'Memoria de Tiburón', type: 'influencer', format: 'Vídeo semi-dedicado', cost: 4000, registrations: 15, activeUsers: 3, investors: 7, cacUser: 267, cacInvestor: 571, numInvestments: 3, amountInvested: 5500, revenue: 330 },
  { name: 'Todocrowdlending', type: 'media', format: 'Artículo, noticias, newsletter', cost: 1595, registrations: 9, activeUsers: 5, investors: 4, cacUser: 177, cacInvestor: 399, numInvestments: null, amountInvested: null, revenue: null },
  { name: 'Geekonomy', type: 'influencer', format: 'Vídeo', cost: 840, registrations: 6, activeUsers: null, investors: 2, cacUser: 140, cacInvestor: 420, numInvestments: null, amountInvested: null, revenue: null },
  { name: 'Invierte Joven', type: 'influencer', format: 'Hilo Twitter + Newsletter', cost: 1020, registrations: 6, activeUsers: 4, investors: 1, cacUser: 170, cacInvestor: 1020, numInvestments: null, amountInvested: null, revenue: null },
  { name: 'Héctor Chamizo', type: 'influencer', format: 'Vídeo podcast', cost: 3000, registrations: 5, activeUsers: 2, investors: 3, cacUser: 600, cacInvestor: 1000, numInvestments: null, amountInvested: null, revenue: null },
  { name: 'Rankia (3 meses)', type: 'media', format: 'Ficha, artículo, newsletter', cost: 5100, registrations: 5, activeUsers: 2, investors: 4, cacUser: 1020, cacInvestor: 1275, numInvestments: 1, amountInvested: 5500, revenue: 330 },
  { name: 'Roams', type: 'media', format: 'Artículo, noticias, RRSS', cost: 1000, registrations: null, activeUsers: null, investors: null, cacUser: null, cacInvestor: null, numInvestments: null, amountInvested: null, revenue: null },
];

const PASSWORD = 'g4u2024';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('es-ES')}${suffix}`;
}

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('es-ES')} €`;
}

function typeBadge(t: ChannelType) {
  return t === 'influencer'
    ? { label: 'Influencer', cls: 'bg-purple-100 text-purple-700' }
    : { label: 'Media', cls: 'bg-blue-100 text-blue-700' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CaptacionDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [filterType, setFilterType] = useState<'all' | ChannelType>('all');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#032149] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#032149]">Dashboard Captación</h1>
            <p className="text-slate-400 text-sm mt-1">Acceso restringido</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setPwError(false); }}
                placeholder="Contraseña"
                className={`w-full px-4 py-3 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3ecda5] focus:border-transparent ${pwError ? 'border-red-300' : 'border-slate-200'}`}
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwError && <p className="text-red-500 text-sm">Contraseña incorrecta</p>}
            <button type="submit" className="w-full py-3 bg-[#3ecda5] hover:bg-[#35b894] text-white font-bold rounded-xl transition-colors">
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const filtered = CHANNELS.filter((c) => filterType === 'all' || c.type === filterType);

  const totalCost = filtered.reduce((s, c) => s + (c.cost || 0), 0);
  const totalRegistrations = filtered.reduce((s, c) => s + (c.registrations || 0), 0);
  const totalActiveUsers = filtered.reduce((s, c) => s + (c.activeUsers || 0), 0);
  const totalInvestors = filtered.reduce((s, c) => s + (c.investors || 0), 0);
  const totalInvestments = filtered.reduce((s, c) => s + (c.numInvestments || 0), 0);
  const totalAmountInvested = filtered.reduce((s, c) => s + (c.amountInvested || 0), 0);
  const totalRevenue = filtered.reduce((s, c) => s + (c.revenue || 0), 0);

  const channelsWithCAC = filtered.filter((c) => c.cacUser !== null);
  const bestCACUser = channelsWithCAC.length ? Math.min(...channelsWithCAC.map((c) => c.cacUser!)) : null;
  const avgCACUser = channelsWithCAC.length ? Math.round(channelsWithCAC.reduce((s, c) => s + c.cacUser!, 0) / channelsWithCAC.length) : null;

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#032149]">Sistema de Captación Escalable</h1>
          <p className="text-slate-400 mt-1">Seguimiento de influencers y medios</p>
        </div>
        <img src="https://i.imgur.com/imHxGWI.png" alt="Growth4U" className="h-6 opacity-50" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KPICard icon={DollarSign} label="Inversión" value={fmtEur(totalCost)} color="text-[#032149]" />
        <KPICard icon={Users} label="Registros" value={fmt(totalRegistrations)} color="text-blue-600" />
        <KPICard icon={Users} label="Usuarios" value={fmt(totalActiveUsers)} color="text-amber-600" />
        <KPICard icon={Users} label="Inversores" value={fmt(totalInvestors)} color="text-green-600" />
        <KPICard icon={TrendingUp} label="Ingresos" value={fmtEur(totalRevenue)} color="text-[#3ecda5]" />
        <KPICard icon={TrendingDown} label="CAC medio" value={avgCACUser !== null ? fmtEur(avgCACUser) : '—'} color="text-indigo-600" />
        <KPICard icon={BarChart3} label="Mejor CAC" value={bestCACUser !== null ? fmtEur(bestCACUser) : '—'} color="text-[#3ecda5]" />
      </div>

      {/* Funnel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#032149] mb-3">Funnel de conversión</h3>
        <div className="flex items-end gap-2 h-24">
          <FunnelBar label="Registros" value={totalRegistrations} max={totalRegistrations} color="bg-blue-500" />
          <FunnelBar label="Usuarios" value={totalActiveUsers} max={totalRegistrations} color="bg-amber-500" />
          <FunnelBar label="Inversores" value={totalInvestors} max={totalRegistrations} color="bg-green-500" />
          <FunnelBar label="Inversiones" value={totalInvestments} max={totalRegistrations} color="bg-[#3ecda5]" />
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3ecda5]"
        >
          <option value="all">Todos los canales</option>
          <option value="influencer">Influencers</option>
          <option value="media">Medios</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} canales</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Canal</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Formato</th>
                <th className="px-4 py-3 text-right">Inversión</th>
                <th className="px-4 py-3 text-right">Registros</th>
                <th className="px-4 py-3 text-right">Usuarios</th>
                <th className="px-4 py-3 text-right">Inversores</th>
                <th className="px-4 py-3 text-right">Ingresos</th>
                <th className="px-4 py-3 text-right">CAC Usr.</th>
                <th className="px-4 py-3 text-right">CAC Inv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ch) => {
                const tb = typeBadge(ch.type);
                const cacColor =
                  ch.cacUser === null ? 'text-slate-400'
                  : ch.cacUser <= 100 ? 'text-green-600 font-bold'
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
                    <td className="px-4 py-3 text-right text-[#3ecda5] font-medium">{fmtEur(ch.revenue)}</td>
                    <td className={`px-4 py-3 text-right ${cacColor}`}>
                      {fmtEur(ch.cacUser)}
                      {ch.cacUser !== null && (
                        ch.cacUser <= 100
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
                <td className="px-4 py-3 text-right text-[#3ecda5]">{fmtEur(totalRevenue)}</td>
                <td className="px-4 py-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top performer */}
      <div className="bg-gradient-to-r from-[#032149] to-[#0a3a6b] rounded-xl p-6 text-white">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Top performer</h3>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-2xl font-bold">JF Calero</p>
            <p className="text-white/60 text-sm">Mención en vídeo</p>
          </div>
          <div className="flex flex-wrap gap-6 ml-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">150</p>
              <p className="text-xs text-white/60">Registros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">67</p>
              <p className="text-xs text-white/60">Usuarios</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">71</p>
              <p className="text-xs text-white/60">Inversores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">16.501 €</p>
              <p className="text-xs text-white/60">Ingresos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3ecda5]">27 €</p>
              <p className="text-xs text-white/60">CAC usuario</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
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
