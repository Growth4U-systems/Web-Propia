import { useState, useEffect } from 'react';
import {
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  Heart,
  MessageCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Database,
  Settings,
  BarChart3,
  Activity,
  Play,
  Timer,
  ExternalLink,
} from 'lucide-react';
import { getIGBotStats, type IGBotStats, type IGBotDailyStats, type IGBotActivity } from '../../../lib/firebase-client';

type Tab = 'overview' | 'activity' | 'history' | 'config';

export default function InstagramBotPage() {
  const [stats, setStats] = useState<IGBotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getIGBotStats();
      if (!data) {
        setError('No hay datos del bot todavía. Ejecuta el bot al menos una vez para sincronizar.');
      } else {
        setStats(data);
      }
    } catch (e) {
      setError('Error cargando datos del bot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#032149] mb-6">Instagram Bot</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  const lastRun = stats.lastRunAt ? new Date(stats.lastRunAt) : null;
  const sessionStart = stats.sessionStartedAt ? new Date(stats.sessionStartedAt) : null;
  const sessionEnd = stats.sessionEndedAt ? new Date(stats.sessionEndedAt) : null;
  const isStale = lastRun ? (Date.now() - lastRun.getTime()) > 24 * 60 * 60 * 1000 : true;
  // Consider "running" if session ended less than 5 minutes ago (bot syncs at end)
  const isRunning = sessionEnd ? (Date.now() - sessionEnd.getTime()) < 5 * 60 * 1000 : false;

  // Calculate 7-day totals
  const last7 = (stats.dailyStats || []).slice(-7);
  const sum7 = last7.reduce(
    (acc, d) => ({
      follows: acc.follows + d.follows,
      unfollows: acc.unfollows + d.unfollows,
      likes: acc.likes + d.likes,
      comments: acc.comments + d.comments,
    }),
    { follows: 0, unfollows: 0, likes: 0, comments: 0 }
  );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'activity', label: 'Actividad', icon: Activity },
    { id: 'history', label: 'Historial', icon: Clock },
    { id: 'config', label: 'Config', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#032149]">Instagram Bot</h1>
          <p className="text-slate-500 text-sm mt-1">
            Growth phantom — @growth4u_systems
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isRunning
              ? 'bg-green-50 text-green-600 border border-green-200'
              : isStale
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-green-400 animate-pulse' : isStale ? 'bg-amber-400' : 'bg-blue-400'
            }`} />
            {isRunning ? 'Ejecutando ahora' : lastRun ? `Última: ${formatTimeAgo(lastRun)}` : 'Sin datos'}
          </div>
          <button
            onClick={fetchStats}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Session Banner */}
      <SessionBanner
        sessionStart={sessionStart}
        sessionEnd={sessionEnd}
        durationMin={stats.sessionDurationMin || 0}
        isRunning={isRunning}
        todayStats={stats.todayStats}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-[#032149] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab stats={stats} sum7={sum7} last7={last7} />
      )}
      {tab === 'activity' && (
        <ActivityTab activities={stats.recentActivity || []} />
      )}
      {tab === 'history' && (
        <HistoryTab dailyStats={stats.dailyStats || []} />
      )}
      {tab === 'config' && (
        <ConfigTab stats={stats} />
      )}
    </div>
  );
}

// --- Session Banner ---

function SessionBanner({ sessionStart, sessionEnd, durationMin, isRunning, todayStats }: {
  sessionStart: Date | null;
  sessionEnd: Date | null;
  durationMin: number;
  isRunning: boolean;
  todayStats: IGBotDailyStats;
}) {
  return (
    <div className={`rounded-xl border p-4 mb-6 ${
      isRunning ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center gap-6 flex-wrap">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isRunning ? 'bg-green-100' : 'bg-slate-100'}`}>
            {isRunning ? <Play className="w-4 h-4 text-green-600" /> : <Timer className="w-4 h-4 text-slate-500" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${isRunning ? 'text-green-700' : 'text-[#032149]'}`}>
              {isRunning ? 'Sesion en curso' : 'Ultima sesion'}
            </p>
            <p className="text-xs text-slate-500">
              {sessionStart ? formatDateTime(sessionStart) : '-'}
              {sessionEnd && !isRunning ? ` — ${formatTime(sessionEnd)}` : ''}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="text-center">
          <p className="text-lg font-bold text-[#032149]">{durationMin}min</p>
          <p className="text-xs text-slate-500">Duracion</p>
        </div>

        {/* Session summary */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5 text-sm">
            <UserPlus className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-medium text-[#032149]">{todayStats?.follows || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <UserMinus className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-[#032149]">{todayStats?.unfollows || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
            <span className="font-medium text-[#032149]">{todayStats?.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-medium text-[#032149]">{todayStats?.comments || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Activity Tab ---

const ACTIVITY_ICONS: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  follow: { icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Followed' },
  unfollow: { icon: UserMinus, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Unfollowed' },
  like: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', label: 'Liked' },
  comment: { icon: MessageCircle, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Commented' },
};

function ActivityTab({ activities }: { activities: IGBotActivity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        No hay actividad reciente. La actividad se registra tras cada ejecucion del bot.
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, IGBotActivity[]> = {};
  for (const a of activities) {
    const date = a.timestamp?.slice(0, 10) || 'unknown';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">{formatDateLabel(date)}</h3>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {items.map((activity, i) => {
              const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.follow;
              const Icon = config.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`p-1.5 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#032149]">
                        {config.label}
                      </span>
                      <a
                        href={`https://www.instagram.com/${activity.username}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#6351d5] hover:underline"
                      >
                        @{activity.username}
                      </a>
                    </div>
                    {activity.detail && activity.type === 'comment' && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">"{activity.detail}"</p>
                    )}
                    {activity.detail && activity.type === 'like' && (
                      <a
                        href={activity.detail}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver post
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {activity.timestamp ? formatTime(new Date(activity.timestamp)) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({ stats, sum7, last7 }: {
  stats: IGBotStats;
  sum7: { follows: number; unfollows: number; likes: number; comments: number };
  last7: IGBotDailyStats[];
}) {
  const todayStats = stats.todayStats || { follows: 0, unfollows: 0, likes: 0, comments: 0 };
  const limits = stats.limits || { maxFollowsPerDay: 250, maxLikesPerDay: 500, maxCommentsPerDay: 80, maxUnfollowsPerDay: 250 };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Pool de usuarios"
          value={stats.poolSize}
          icon={Database}
          color="bg-blue-50 text-blue-600"
          sub={`${stats.blacklistCount} en blacklist`}
        />
        <KPICard
          label="Follows activos"
          value={stats.activeFollows}
          icon={Users}
          color="bg-purple-50 text-purple-600"
          sub={`${stats.totalFollowed} total historico`}
        />
        <KPICard
          label="Total likes"
          value={stats.totalLikes}
          icon={Heart}
          color="bg-pink-50 text-pink-600"
        />
        <KPICard
          label="Unfollowed"
          value={stats.totalUnfollowed}
          icon={UserMinus}
          color="bg-slate-50 text-slate-500"
          sub={`ratio: ${stats.totalFollowed > 0 ? Math.round((stats.totalUnfollowed / stats.totalFollowed) * 100) : 0}%`}
        />
      </div>

      {/* Today's Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-[#032149] mb-4">Progreso de hoy</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressBar label="Follows" current={todayStats.follows} max={limits.maxFollowsPerDay} icon={UserPlus} color="#6351d5" />
          <ProgressBar label="Unfollows" current={todayStats.unfollows} max={limits.maxUnfollowsPerDay} icon={UserMinus} color="#64748b" />
          <ProgressBar label="Likes" current={todayStats.likes} max={limits.maxLikesPerDay} icon={Heart} color="#ec4899" />
          <ProgressBar label="Comments" current={todayStats.comments} max={limits.maxCommentsPerDay} icon={MessageCircle} color="#0faec1" />
        </div>
      </div>

      {/* 7-day summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-[#032149] mb-4">Ultimos 7 dias</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="Follows" value={sum7.follows} icon={UserPlus} />
          <MiniStat label="Unfollows" value={sum7.unfollows} icon={UserMinus} />
          <MiniStat label="Likes" value={sum7.likes} icon={Heart} />
          <MiniStat label="Comments" value={sum7.comments} icon={MessageCircle} />
        </div>

        {/* Mini chart */}
        {last7.length > 0 && (
          <div className="mt-6">
            <div className="flex items-end gap-1 h-32">
              {last7.map((day, i) => {
                const total = day.follows + day.likes + day.comments;
                const maxTotal = Math.max(...last7.map((d) => d.follows + d.likes + d.comments), 1);
                const height = Math.max((total / maxTotal) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${height}%` }}>
                      <div className="w-full rounded-t bg-[#6351d5]" style={{ flex: day.follows }} title={`${day.follows} follows`} />
                      <div className="w-full bg-pink-400" style={{ flex: day.likes }} title={`${day.likes} likes`} />
                      <div className="w-full rounded-b bg-teal-400" style={{ flex: day.comments || 0.01 }} title={`${day.comments} comments`} />
                    </div>
                    <span className="text-[10px] text-slate-400">{day.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6351d5]" /> Follows</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> Likes</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /> Comments</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- History Tab ---

function HistoryTab({ dailyStats }: { dailyStats: IGBotDailyStats[] }) {
  const reversed = [...dailyStats].reverse();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Follows</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Unfollows</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Likes</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Comments</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {reversed.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay datos historicos</td>
              </tr>
            ) : (
              reversed.map((day, i) => (
                <tr key={day.date} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-2.5 text-[#032149] font-medium">{day.date}</td>
                  <td className="px-4 py-2.5 text-right"><span className="text-purple-600 font-medium">{day.follows}</span></td>
                  <td className="px-4 py-2.5 text-right"><span className="text-slate-500">{day.unfollows}</span></td>
                  <td className="px-4 py-2.5 text-right"><span className="text-pink-500 font-medium">{day.likes}</span></td>
                  <td className="px-4 py-2.5 text-right"><span className="text-teal-600 font-medium">{day.comments}</span></td>
                  <td className="px-4 py-2.5 text-right text-slate-700 font-medium">
                    {day.follows + day.unfollows + day.likes + day.comments}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Config Tab ---

function ConfigTab({ stats }: { stats: IGBotStats }) {
  const limits = stats.limits || { maxFollowsPerDay: 0, maxUnfollowsPerDay: 0, maxLikesPerDay: 0, maxCommentsPerDay: 0, unfollowAfterDays: 3 };
  const targets = stats.targetAccounts || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-[#032149] mb-4">Limites diarios</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{limits.maxFollowsPerDay || '-'}</p>
            <p className="text-xs text-purple-500 mt-1">Follows / sesion</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-600">{limits.maxUnfollowsPerDay || '-'}</p>
            <p className="text-xs text-slate-500 mt-1">Unfollows / sesion</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">{limits.maxLikesPerDay || '-'}</p>
            <p className="text-xs text-pink-500 mt-1">Likes / dia</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{limits.maxCommentsPerDay || '-'}</p>
            <p className="text-xs text-teal-500 mt-1">Comments / dia</p>
          </div>
        </div>
        <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          Unfollow automatico a los <strong>{limits.unfollowAfterDays || 3} dias</strong> si no devuelven follow
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-[#032149] mb-4">
          Cuentas objetivo ({targets.length})
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Se scrapean los followers de estas cuentas para alimentar el pool
        </p>
        <div className="flex flex-wrap gap-2">
          {targets.map((account) => (
            <a
              key={account}
              href={`https://www.instagram.com/${account}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm transition-colors"
            >
              @{account}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- UI Components ---

function KPICard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#032149]">{value.toLocaleString('es-ES')}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, current, max, icon: Icon, color }: {
  label: string; current: number; max: number; icon: any; color: string;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm text-slate-600">{label}</span>
        </div>
        <span className="text-sm font-medium text-[#032149]">{current}/{max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: {
  label: string; value: number; icon: any;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
      <Icon className="w-4 h-4 text-slate-400" />
      <div>
        <p className="text-lg font-bold text-[#032149]">{value.toLocaleString('es-ES')}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// --- Formatting helpers ---

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) +
    ' ' + formatTime(date);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Hoy';
  if (dateStr === yesterday) return 'Ayer';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
