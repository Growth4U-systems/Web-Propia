import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  PlayCircle,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import { metricInfo } from './types';
import type { Recommendation, SEOIssue } from './types';

// ============================================
// MetricInfoTooltip — expandable "why we measure this"
// ============================================
export function MetricInfoTooltip({ metricKey }: { metricKey: string }) {
  const [open, setOpen] = useState(false);
  const info = metricInfo[metricKey];
  if (!info) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-0.5 text-slate-300 hover:text-[#6351d5] transition-colors"
        title="Por que medimos esto"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute z-20 top-6 right-0 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-left">
          <h5 className="text-sm font-semibold text-[#032149] mb-2">{info.name}</h5>
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Por que importa</span>
              <p className="text-xs text-slate-600 mt-0.5">{info.why}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-[#6351d5] uppercase tracking-wide">Como mejorar</span>
              <p className="text-xs text-slate-600 mt-0.5">{info.improve}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MetricCard — metric with icon, label, value, change%, info
// ============================================
export function MetricCard({
  label,
  value,
  icon,
  subtitle,
  changePct,
  metricKey,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  changePct?: number;
  metricKey?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className="flex items-center gap-1">
          {metricKey && <MetricInfoTooltip metricKey={metricKey} />}
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#032149]">{value}</span>
        {changePct !== undefined && changePct !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${
              changePct > 0 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {changePct > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {changePct > 0 ? '+' : ''}
            {changePct.toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================
// SectionHeader — title with icon, subtitle, priority badge
// ============================================
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  priority,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  priority?: 1 | 2 | 3 | 4 | 5;
}) {
  const priorityColors: Record<number, string> = {
    1: 'bg-red-500/20 text-red-600',
    2: 'bg-orange-500/20 text-orange-600',
    3: 'bg-amber-500/20 text-amber-600',
    4: 'bg-blue-500/20 text-blue-600',
    5: 'bg-slate-500/20 text-slate-600',
  };

  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon && (
        <div className="p-2 bg-[#6351d5]/10 rounded-lg mt-0.5">
          <Icon className="w-5 h-5 text-[#6351d5]" />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#032149]">{title}</h2>
          {priority && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityColors[priority]}`}
            >
              P{priority}
            </span>
          )}
        </div>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ============================================
// ScoreGauge — circular score display (0-100)
// ============================================
export function ScoreGauge({
  label,
  score,
  size = 'md',
}: {
  label: string;
  score: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const color =
    score >= 70
      ? 'text-green-500'
      : score >= 40
        ? 'text-amber-500'
        : 'text-red-500';
  const bgColor =
    score >= 70
      ? 'bg-green-500/10'
      : score >= 40
        ? 'bg-amber-500/10'
        : 'bg-red-500/10';
  const ringColor =
    score >= 70
      ? 'stroke-green-500'
      : score >= 40
        ? 'stroke-amber-500'
        : 'stroke-red-500';

  const dims = size === 'lg' ? 120 : size === 'md' ? 96 : 72;
  const strokeWidth = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const radius = (dims - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const fontSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex flex-col items-center p-4 ${bgColor} rounded-xl`}>
      <div className="relative" style={{ width: dims, height: dims }}>
        <svg width={dims} height={dims} className="transform -rotate-90">
          <circle
            cx={dims / 2}
            cy={dims / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className="stroke-slate-200"
          />
          <circle
            cx={dims / 2}
            cy={dims / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className={ringColor}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${fontSize} font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-sm text-slate-500 mt-2 font-medium text-center">{label}</span>
    </div>
  );
}

// ============================================
// StatusBadge — small colored badge for statuses
// ============================================
export function StatusBadge({
  status,
}: {
  status: 'pass' | 'fail' | 'warning' | 'open' | 'in_progress' | 'resolved' | 'dismissed';
}) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pass: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'OK',
      className: 'bg-green-500/10 text-green-600 border-green-200',
    },
    fail: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: 'Fallo',
      className: 'bg-red-500/10 text-red-600 border-red-200',
    },
    warning: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'Aviso',
      className: 'bg-amber-500/10 text-amber-600 border-amber-200',
    },
    open: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'Pendiente',
      className: 'bg-slate-500/10 text-slate-600 border-slate-200',
    },
    in_progress: {
      icon: <PlayCircle className="w-3.5 h-3.5" />,
      label: 'En progreso',
      className: 'bg-blue-500/10 text-blue-600 border-blue-200',
    },
    resolved: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'Resuelto',
      className: 'bg-green-500/10 text-green-600 border-green-200',
    },
    dismissed: {
      icon: <Ban className="w-3.5 h-3.5" />,
      label: 'Descartado',
      className: 'bg-slate-500/10 text-slate-400 border-slate-200',
    },
  };

  const c = config[status] || config.open;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ============================================
// SeverityBadge
// ============================================
export function SeverityBadge({
  severity,
}: {
  severity: 'critical' | 'high' | 'medium' | 'low';
}) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-600 border-red-300',
    high: 'bg-orange-500/20 text-orange-600 border-orange-300',
    medium: 'bg-amber-500/20 text-amber-600 border-amber-300',
    low: 'bg-blue-500/20 text-blue-600 border-blue-300',
  };
  const labels: Record<string, string> = {
    critical: 'Critico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded border ${colors[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}

// ============================================
// RecommendationCard — with severity, fix steps, impact, status buttons
// ============================================
export function RecommendationCard({
  rec,
  onStatusChange,
}: {
  rec: Recommendation;
  onStatusChange?: (status: Recommendation['status']) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const sourceLabels: Record<string, string> = {
    audit: 'Auditoria SEO',
    geo_analysis: 'Analisis GEO',
    own_media: 'Medios Propios',
  };

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all ${
        rec.status === 'resolved'
          ? 'border-green-200 opacity-70'
          : rec.status === 'dismissed'
            ? 'border-slate-200 opacity-50'
            : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <SeverityBadge severity={rec.severity} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[#032149] text-sm leading-tight">{rec.title}</h4>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{rec.description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
              {rec.category}
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
              {sourceLabels[rec.source] || rec.source}
            </span>
            <span className="text-xs text-[#6351d5] font-semibold">
              +{rec.expectedImpactPct}% impacto
            </span>
          </div>

          {expanded && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm text-[#032149] font-medium mb-2">{rec.fixOverview}</p>
              <ol className="list-decimal list-inside space-y-1.5">
                {rec.fixSteps.map((step, i) => (
                  <li key={i} className="text-xs text-slate-600 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Status action buttons */}
          {onStatusChange && expanded && (
            <div className="flex flex-wrap gap-2 mt-3">
              {rec.status !== 'in_progress' && (
                <button
                  onClick={() => onStatusChange('in_progress')}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  En progreso
                </button>
              )}
              {rec.status !== 'resolved' && (
                <button
                  onClick={() => onStatusChange('resolved')}
                  className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resuelto
                </button>
              )}
              {rec.status !== 'dismissed' && (
                <button
                  onClick={() => onStatusChange('dismissed')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Descartar
                </button>
              )}
              {rec.status !== 'open' && (
                <button
                  onClick={() => onStatusChange('open')}
                  className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Reabrir
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-slate-400 hover:text-[#6351d5] hover:bg-[#6351d5]/5 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ============================================
// IssueCard
// ============================================
export function IssueCard({ issue }: { issue: SEOIssue }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabels: Record<string, string> = {
    technical_seo: 'SEO Tecnico',
    performance: 'Rendimiento',
    content: 'Contenido',
    geo: 'GEO',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <SeverityBadge severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[#032149] text-sm leading-tight">{issue.title}</h4>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{issue.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">
              {typeLabels[issue.type] || issue.type}
            </span>
            <span className="text-xs text-[#6351d5] font-semibold">
              +{issue.expectedImpactPct}% impacto estimado
            </span>
          </div>
          {expanded && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm text-[#032149] font-medium mb-2">Pasos para solucionar:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                {issue.fixSteps.map((step, i) => (
                  <li key={i} className="text-xs text-slate-600 leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-slate-400 hover:text-[#6351d5] hover:bg-[#6351d5]/5 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ============================================
// LoadingSpinner
// ============================================
export function LoadingSpinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-[#6351d5] animate-spin mb-3" />
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

// ============================================
// ErrorBanner
// ============================================
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-red-700 text-sm">{message}</p>
    </div>
  );
}
