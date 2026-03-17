import { useState, lazy, Suspense } from 'react';
import {
  Search,
  Bot,
  Radar,
  Zap,
  Globe,
  Link2,
  Code2,
  BarChart3,
  Loader2,
} from 'lucide-react';

// Lazy load tabs for code splitting
const AuditTab = lazy(() => import('./seo-geo/AuditTab'));
const VitalsTab = lazy(() => import('./seo-geo/VitalsTab'));
const GeoTab = lazy(() => import('./seo-geo/GeoTab'));
const OwnMediaTab = lazy(() => import('./seo-geo/OwnMediaTab'));
const BacklinksTab = lazy(() => import('./seo-geo/BacklinksTab'));
const SchemaTab = lazy(() => import('./seo-geo/SchemaTab'));
const MetricsTab = lazy(() => import('./seo-geo/MetricsTab'));
const DashboardTab = lazy(() => import('./seo-geo/DashboardTab'));

type Tab = 'dashboard' | 'audit' | 'vitals' | 'geo' | 'own-media' | 'backlinks' | 'schema' | 'metrics';

const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Resumen y recomendaciones' },
  { key: 'audit', label: 'Auditoría', icon: Radar, description: 'SEO on-page (15 checks)' },
  { key: 'vitals', label: 'Vitals', icon: Zap, description: 'Core Web Vitals' },
  { key: 'geo', label: 'GEO', icon: Bot, description: 'Visibilidad en IAs' },
  { key: 'own-media', label: 'Own Media', icon: Globe, description: 'Blog, social, tech' },
  { key: 'backlinks', label: 'Backlinks', icon: Link2, description: 'Autoridad de dominio' },
  { key: 'schema', label: 'Schema', icon: Code2, description: 'JSON-LD generator' },
  { key: 'metrics', label: 'Métricas', icon: Search, description: 'GSC + GA manual' },
];

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-[#6351d5] animate-spin" />
    </div>
  );
}

export default function VisibilidadPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Visibilidad</h1>
        <p className="text-slate-400 mt-1">SEO + GEO + Own Media — todo en un solo panel</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[#6351d5] text-[#6351d5] bg-[#6351d5]/5'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`hidden lg:inline text-xs ${isActive ? 'text-[#6351d5]/60' : 'text-slate-400'}`}>
                — {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <Suspense fallback={<TabFallback />}>
        <div>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'audit' && <AuditTab />}
          {activeTab === 'vitals' && <VitalsTab />}
          {activeTab === 'geo' && <GeoTab />}
          {activeTab === 'own-media' && <OwnMediaTab />}
          {activeTab === 'backlinks' && <BacklinksTab />}
          {activeTab === 'schema' && <SchemaTab />}
          {activeTab === 'metrics' && <MetricsTab />}
        </div>
      </Suspense>
    </div>
  );
}
