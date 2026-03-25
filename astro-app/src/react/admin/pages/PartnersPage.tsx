import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Loader2,
  Users,
  Handshake,
  Eye,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Sparkles,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  type Partner,
  type PartnerType,
  type PartnerStatus,
  type OutreachEvent,
} from '../../../lib/firebase-client';

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTNER_TYPES: { value: PartnerType; label: string; color: string }[] = [
  { value: 'influencer', label: 'Influencer', color: 'bg-purple-100 text-purple-700' },
  { value: 'media', label: 'Media', color: 'bg-blue-100 text-blue-700' },
  { value: 'referral', label: 'Referral', color: 'bg-teal-100 text-teal-700' },
  { value: 'agency', label: 'Agency', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'community', label: 'Community', color: 'bg-emerald-100 text-emerald-700' },
];

const PARTNER_STATUSES: { value: PartnerStatus; label: string; color: string }[] = [
  { value: 'discovered', label: 'Descubierto', color: 'bg-slate-100 text-slate-700' },
  { value: 'contacted', label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  { value: 'negotiating', label: 'Negociando', color: 'bg-amber-100 text-amber-700' },
  { value: 'active', label: 'Activo', color: 'bg-green-100 text-green-700' },
  { value: 'inactive', label: 'Inactivo', color: 'bg-red-100 text-red-700' },
];

const PLATFORMS = ['LinkedIn', 'Instagram', 'YouTube', 'Twitter/X', 'Blog', 'Podcast', 'Other'];

const OUTREACH_TYPES: { value: OutreachEvent['type']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'dm', label: 'DM' },
  { value: 'call', label: 'Llamada' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'other', label: 'Otro' },
];

const PIPELINE_STAGES: { status: PartnerStatus; label: string; color: string }[] = [
  { status: 'discovered', label: 'Descubiertos', color: 'bg-slate-400' },
  { status: 'contacted', label: 'Contactados', color: 'bg-blue-500' },
  { status: 'negotiating', label: 'Negociando', color: 'bg-amber-500' },
  { status: 'active', label: 'Activos', color: 'bg-green-500' },
];

type PartnerWithId = Partner & { id: string };

type Tab = 'overview' | 'partners' | 'discover';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: PartnerStatus) {
  const s = PARTNER_STATUSES.find((ps) => ps.value === status);
  return s || PARTNER_STATUSES[0];
}

function getTypeBadge(type: PartnerType) {
  const t = PARTNER_TYPES.find((pt) => pt.value === type);
  return t || PARTNER_TYPES[0];
}

function formatDate(d: any) {
  if (!d) return '--';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

const emptyForm = (): Omit<Partner, 'createdAt' | 'updatedAt'> => ({
  name: '',
  type: 'influencer',
  platform: 'LinkedIn',
  contactName: '',
  contactEmail: '',
  contactUrl: '',
  status: 'discovered',
  relevanceScore: 5,
  niche: '',
  audienceSize: '',
  notes: '',
  outreachHistory: [],
  tags: [],
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerWithId | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // New outreach event
  const [newEvent, setNewEvent] = useState<OutreachEvent>({ date: '', type: 'email', notes: '' });

  // Filters
  const [filterStatus, setFilterStatus] = useState<PartnerStatus | ''>('');
  const [filterType, setFilterType] = useState<PartnerType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Discover
  const [discoverNiche, setDiscoverNiche] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const all = await getAllPartners();
      setPartners(all as PartnerWithId[]);
    } catch (err) {
      console.error('Error loading partners:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD ───────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData(emptyForm());
    setTagsInput('');
    setNewEvent({ date: '', type: 'email', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (p: PartnerWithId) => {
    setEditingPartner(p);
    setFormData({
      name: p.name,
      type: p.type,
      platform: p.platform,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      contactUrl: p.contactUrl,
      status: p.status,
      relevanceScore: p.relevanceScore,
      niche: p.niche,
      audienceSize: p.audienceSize,
      notes: p.notes,
      outreachHistory: p.outreachHistory || [],
      tags: p.tags || [],
    });
    setTagsInput((p.tags || []).join(', '));
    setNewEvent({ date: '', type: 'email', notes: '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean) };
      if (editingPartner) {
        await updatePartner(editingPartner.id, payload);
      } else {
        await createPartner(payload);
      }
      setShowModal(false);
      await loadPartners();
    } catch (err) {
      console.error('Error saving partner:', err);
      alert('Error al guardar el partner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PartnerWithId) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deletePartner(p.id);
      await loadPartners();
    } catch (err) {
      console.error('Error deleting partner:', err);
      alert('Error al eliminar el partner');
    }
  };

  // ─── Outreach events ───────────────────────────────────────────────

  const addOutreachEvent = () => {
    if (!newEvent.date) return;
    setFormData((prev) => ({
      ...prev,
      outreachHistory: [...prev.outreachHistory, { ...newEvent }],
    }));
    setNewEvent({ date: '', type: 'email', notes: '' });
  };

  const removeOutreachEvent = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      outreachHistory: prev.outreachHistory.filter((_, i) => i !== idx),
    }));
  };

  // ─── Discover ───────────────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!discoverNiche.trim()) return;
    setDiscoverLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/partner-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: discoverNiche,
          existingPartners: partners.map((p) => p.name),
        }),
      });
      if (!res.ok) throw new Error('Error en la respuesta');
      const data = await res.json();
      setSuggestions(data.suggestions || data || []);
    } catch (err) {
      console.error('Error discovering partners:', err);
      alert('Error al buscar sugerencias. Asegúrate de que la función partner-suggest está desplegada.');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const addSuggestionToPipeline = async (suggestion: any, idx: number) => {
    setAddingIdx(idx);
    try {
      await createPartner({
        name: suggestion.name || '',
        type: suggestion.type || 'influencer',
        platform: suggestion.platform || 'LinkedIn',
        contactName: '',
        contactEmail: '',
        contactUrl: '',
        status: 'discovered',
        relevanceScore: 5,
        niche: discoverNiche,
        audienceSize: suggestion.audienceEstimate || suggestion.audience || '',
        notes: suggestion.reason || '',
        outreachHistory: [],
        tags: [],
      });
      await loadPartners();
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      console.error('Error adding suggestion:', err);
      alert('Error al añadir el partner');
    } finally {
      setAddingIdx(null);
    }
  };

  // ─── Computed values ────────────────────────────────────────────────

  const countByStatus = (status: PartnerStatus) => partners.filter((p) => p.status === status).length;
  const totalPartners = partners.length;

  const filteredPartners = partners.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterType && p.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.niche.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const recentOutreach = partners
    .flatMap((p) =>
      (p.outreachHistory || []).map((ev) => ({
        ...ev,
        partnerName: p.name,
        partnerType: p.type,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const maxStage = Math.max(...PIPELINE_STAGES.map((s) => countByStatus(s.status)), 1);

  // ─── Render ─────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'partners', label: 'Partners' },
    { key: 'discover', label: 'Descubrir' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#032149]">Partners</h1>
          <p className="text-slate-400 mt-2">Gestiona tus relaciones con influencers, medios y referidos</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#6351d5] hover:bg-[#4a3cb0] text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Partner
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#6351d5] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#6351d5]" />
        </div>
      ) : (
        <>
          {/* ═══ Tab: Overview ═══ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Partners', count: totalPartners, icon: Users, iconColor: 'text-[#6351d5]' },
                  { label: 'Activos', count: countByStatus('active'), icon: Handshake, iconColor: 'text-green-500' },
                  { label: 'Negociando', count: countByStatus('negotiating'), icon: MessageSquare, iconColor: 'text-amber-500' },
                  { label: 'Descubiertos', count: countByStatus('discovered'), icon: Eye, iconColor: 'text-slate-500' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{stat.label}</span>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <p className="text-3xl font-bold text-[#032149] mt-2">{stat.count}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline Funnel */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#032149] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#6351d5]" />
                  Pipeline de Partners
                </h2>
                <div className="space-y-3">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = countByStatus(stage.status);
                    const width = Math.max((count / maxStage) * 100, 4);
                    return (
                      <div key={stage.status} className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 w-28 text-right">{stage.label}</span>
                        <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden">
                          <div
                            className={`h-full ${stage.color} rounded-lg flex items-center px-3 transition-all duration-500`}
                            style={{ width: `${width}%` }}
                          >
                            <span className="text-white text-sm font-bold">{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Flow arrows */}
                <div className="flex items-center justify-center gap-2 mt-4 text-slate-400 text-xs">
                  {PIPELINE_STAGES.map((stage, i) => (
                    <span key={stage.status} className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${stage.color}`} />
                      {stage.label}
                      {i < PIPELINE_STAGES.length - 1 && <ArrowRight className="w-3 h-3 mx-1" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Outreach */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#032149] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#6351d5]" />
                  Actividad Reciente
                </h2>
                {recentOutreach.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4 text-center">
                    No hay actividad de outreach registrada
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {recentOutreach.map((ev, i) => {
                      const typeBadge = getTypeBadge(ev.partnerType);
                      return (
                        <div key={i} className="py-3 flex items-center gap-4">
                          <div className="w-9 h-9 rounded-full bg-[#6351d5]/10 flex items-center justify-center flex-shrink-0">
                            {ev.type === 'email' && <Mail className="w-4 h-4 text-[#6351d5]" />}
                            {ev.type === 'dm' && <MessageSquare className="w-4 h-4 text-[#6351d5]" />}
                            {ev.type === 'call' && <Phone className="w-4 h-4 text-[#6351d5]" />}
                            {ev.type === 'meeting' && <Users className="w-4 h-4 text-[#6351d5]" />}
                            {ev.type === 'other' && <Calendar className="w-4 h-4 text-[#6351d5]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#032149] font-medium truncate">
                              {ev.partnerName}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${typeBadge.color}`}>
                                {typeBadge.label}
                              </span>
                            </p>
                            <p className="text-xs text-slate-400 truncate">{ev.notes || 'Sin notas'}</p>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">{ev.date}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Tab: Partners ═══ */}
          {activeTab === 'partners' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, nicho o tags..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as PartnerStatus | '')}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                >
                  <option value="">Todos los estados</option>
                  {PARTNER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as PartnerType | '')}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                >
                  <option value="">Todos los tipos</option>
                  {PARTNER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Plataforma</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Relevancia</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nicho</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredPartners.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p>No se encontraron partners</p>
                          </td>
                        </tr>
                      ) : (
                        filteredPartners.map((p) => {
                          const statusBadge = getStatusBadge(p.status);
                          const typeBadge = getTypeBadge(p.type);
                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                              onClick={() => openEditModal(p)}
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-[#032149]">{p.name}</p>
                                  {p.contactName && (
                                    <p className="text-xs text-slate-400">{p.contactName}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeBadge.color}`}>
                                  {typeBadge.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{p.platform}</td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#6351d5] rounded-full"
                                      style={{ width: `${(p.relevanceScore / 10) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500">{p.relevanceScore}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{p.niche || '--'}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => openEditModal(p)}
                                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(p)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Tab: Discover ═══ */}
          {activeTab === 'discover' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#032149] mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#6351d5]" />
                  Descubrir Partners
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Introduce un nicho o tema y la IA sugerirá partners potenciales para tu pipeline.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={discoverNiche}
                    onChange={(e) => setDiscoverNiche(e.target.value)}
                    placeholder="Ej: fintech B2B en España, marketing SaaS..."
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                  />
                  <button
                    onClick={handleDiscover}
                    disabled={discoverLoading || !discoverNiche.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6351d5] hover:bg-[#4a3cb0] disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {discoverLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    Sugerir Partners
                  </button>
                </div>
              </div>

              {discoverLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#6351d5] mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Buscando partners potenciales...</p>
                  </div>
                </div>
              )}

              {!discoverLoading && suggestions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((s, idx) => {
                    const typeBadge = PARTNER_TYPES.find((t) => t.value === s.type) || PARTNER_TYPES[0];
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-[#032149]">{s.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge.color}`}>
                                {typeBadge.label}
                              </span>
                              <span className="text-xs text-slate-400">{s.platform}</span>
                            </div>
                          </div>
                        </div>
                        {s.reason && (
                          <p className="text-sm text-slate-500 mb-3">{s.reason}</p>
                        )}
                        {(s.audienceEstimate || s.audience) && (
                          <p className="text-xs text-slate-400 mb-3">
                            Audiencia estimada: <span className="font-medium text-[#032149]">{s.audienceEstimate || s.audience}</span>
                          </p>
                        )}
                        <button
                          onClick={() => addSuggestionToPipeline(s, idx)}
                          disabled={addingIdx === idx}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#6351d5] text-[#6351d5] hover:bg-[#6351d5] hover:text-white disabled:opacity-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          {addingIdx === idx ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Añadir al Pipeline
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-[#032149]">
                {editingPartner ? 'Editar Partner' : 'Nuevo Partner'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-[#032149] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Name, Type, Platform */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="Nombre del partner"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PartnerType })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Plataforma</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status, Relevance, Audience */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PartnerStatus })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  >
                    {PARTNER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">
                    Relevancia ({formData.relevanceScore}/10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.relevanceScore}
                    onChange={(e) => setFormData({ ...formData, relevanceScore: Math.min(10, Math.max(1, Number(e.target.value))) })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Audiencia</label>
                  <input
                    type="text"
                    value={formData.audienceSize}
                    onChange={(e) => setFormData({ ...formData, audienceSize: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="Ej: 10K-50K"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Nombre de contacto</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="Persona de contacto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Email de contacto</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">URL de contacto</label>
                  <input
                    type="text"
                    value={formData.contactUrl}
                    onChange={(e) => setFormData({ ...formData, contactUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Niche, Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Nicho</label>
                  <input
                    type="text"
                    value={formData.niche}
                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="Ej: Fintech, SaaS B2B..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Tags (separados por coma)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    placeholder="growth, fintech, españa"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5] h-24"
                  placeholder="Notas internas sobre este partner..."
                />
              </div>

              {/* Outreach History */}
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Historial de Outreach</label>
                {formData.outreachHistory.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formData.outreachHistory.map((ev, idx) => {
                      const typeLabel = OUTREACH_TYPES.find((t) => t.value === ev.type)?.label || ev.type;
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-500 font-mono">{ev.date}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#6351d5]/10 text-[#6351d5] font-medium">
                            {typeLabel}
                          </span>
                          <span className="text-sm text-slate-600 flex-1 truncate">{ev.notes || '--'}</span>
                          <button
                            type="button"
                            onClick={() => removeOutreachEvent(idx)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as OutreachEvent['type'] })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                    >
                      {OUTREACH_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-slate-400 mb-1">Notas</label>
                    <input
                      type="text"
                      value={newEvent.notes}
                      onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
                      placeholder="Descripción breve"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOutreachEvent())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addOutreachEvent}
                    disabled={!newEvent.date}
                    className="px-4 py-2 bg-[#6351d5] hover:bg-[#4a3cb0] disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#6351d5] hover:bg-[#4a3cb0] disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
