import { useState, useEffect } from 'react';
import { Users, Loader2, ChevronDown, ChevronUp, Mail, Building2 } from 'lucide-react';
import { getAllLeadMagnetLeads, getAllArticleLeads } from '../../lib/firebase-client';

type Lead = {
  id: string;
  nombre: string;
  email: string;
  tag?: string;
  source: string;
  sourceSlug: string;
  createdAt: any;
};

const formatDate = (createdAt: any) => {
  if (!createdAt) return '—';
  const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function LeadsAdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const [magnetLeads, articleLeads] = await Promise.all([
      getAllLeadMagnetLeads(),
      getAllArticleLeads(),
    ]);
    const all: Lead[] = [
      ...magnetLeads.map((l: any) => ({
        id: l.id,
        nombre: l.nombre,
        email: l.email,
        tag: l.tag,
        source: l.magnetTitle || l.magnetSlug,
        sourceSlug: l.magnetSlug,
        createdAt: l.createdAt,
      })),
      ...articleLeads.map((l: any) => ({
        id: l.id,
        nombre: l.nombre,
        email: l.email,
        tag: l.tag,
        source: l.articleTitle || l.articleSlug,
        sourceSlug: l.articleSlug,
        createdAt: l.createdAt,
      })),
    ].sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    setLeads(all);
    setLoading(false);
  };

  // Group by sourceSlug
  const grouped = leads.reduce<Record<string, Lead[]>>((acc, lead) => {
    const key = lead.sourceSlug || 'sin-asignar';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#032149]">Leads</h1>
          <p className="text-slate-400 mt-2">Todos los contactos capturados por lead magnets y artículos</p>
        </div>
        <div className="bg-[#6351d5]/10 border border-[#6351d5]/20 rounded-xl px-5 py-3 text-center">
          <p className="text-2xl font-bold text-[#6351d5]">{leads.length}</p>
          <p className="text-xs text-slate-500">leads totales</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#6351d5]" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay leads todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([slug, groupLeads]) => (
            <div key={slug} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedSlug(expandedSlug === slug ? null : slug)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#6351d5]/10 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-[#6351d5]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#032149]">{groupLeads[0].source || slug}</p>
                    <p className="text-xs text-slate-400 font-mono">{slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-[#6351d5]/10 text-[#6351d5] text-sm font-bold px-3 py-1 rounded-full">
                    {groupLeads.length} lead{groupLeads.length !== 1 ? 's' : ''}
                  </span>
                  {expandedSlug === slug
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedSlug === slug && (
                <div className="border-t border-slate-200 divide-y divide-slate-100">
                  {groupLeads.map((lead) => (
                    <div key={lead.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[#6351d5]">
                            {lead.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#032149] truncate">{lead.nombre}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {lead.email}
                          </p>
                          {lead.tag && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              {lead.tag}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
