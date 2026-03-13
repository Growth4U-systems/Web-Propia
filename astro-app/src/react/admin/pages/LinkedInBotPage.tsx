import { useState, useEffect } from 'react';
import {
  Loader2,
  MessageSquare,
  Users,
  Network,
  BarChart3,
  Check,
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Plus,
  UserPlus,
  Target,
  CalendarCheck,
  Ban,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Building2,
  Send,
  Sparkles,
  Bell,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  getAllLIComments,
  updateLIComment,
  deleteLIComment,
  getAllLIProspects,
  createLIProspect,
  updateLIProspect,
  deleteLIProspect,
  getAllLICreators,
  createLICreator,
  updateLICreator,
  deleteLICreator,
  sendLIBotSlackSummary,
  getAllLICandidates,
  updateLICandidate,
  deleteLICandidate,
  type LIComment,
  type LIProspect,
  type LICreator,
  type LICandidate,
} from '../../../lib/firebase-client';

type Tab = 'overview' | 'comments' | 'candidates' | 'prospects' | 'creators';
type CandidateFilter = 'all' | 'pending' | 'approved' | 'rejected';
type CommentFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'posted';
type ProspectFilter = 'all' | 'detected' | 'connected' | 'nurturing' | 'meeting' | 'disqualified';

const FUNNEL_STAGES: { value: LIProspect['funnelStage']; label: string; icon: any; color: string }[] = [
  { value: 'detected', label: 'Detectado', icon: Eye, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'connected', label: 'Conectado', icon: UserPlus, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { value: 'nurturing', label: 'Nurturing', icon: Target, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'meeting', label: 'Reunión', icon: CalendarCheck, color: 'bg-green-50 text-green-600 border-green-200' },
  { value: 'disqualified', label: 'Descartado', icon: Ban, color: 'bg-slate-50 text-slate-400 border-slate-200' },
];

const G4U_SERVICES = [
  { value: 'growth-marketing', label: 'Growth Marketing Fintech' },
  { value: 'geo-fintechs', label: 'GEO para Fintechs' },
  { value: 'trust-engine', label: 'Trust Engine' },
  { value: 'cac-sostenible', label: 'Lead Magnet: CAC Sostenible' },
  { value: 'meseta-de-crecimiento', label: 'Lead Magnet: Meseta de Crecimiento' },
  { value: 'sistema-de-growth', label: 'Lead Magnet: Sistema de Growth' },
  { value: 'david-vs-goliat', label: 'Lead Magnet: David vs Goliat' },
  { value: 'kit-de-liberacion', label: 'Lead Magnet: Kit de Liberación' },
  { value: 'dashboard-attribution', label: 'Lead Magnet: Dashboard Attribution' },
  { value: 'discovery-call', label: 'Discovery Call directa' },
];

const COMPANY_SECTORS = [
  'Fintech', 'SaaS', 'E-commerce', 'Healthtech', 'Edtech', 'Proptech',
  'Insurtech', 'Marketplace', 'B2B Tech', 'B2C Tech', 'Agency', 'Otro',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const FUNDING_STAGES = ['Pre-seed', 'Seed', 'Serie A', 'Serie B', 'Serie C+', 'Bootstrapped', 'Profitable'];

const PROFILE_TYPES: { value: LIProspect['profileType']; label: string; color: string }[] = [
  { value: 'ceo', label: 'CEO', color: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'cto', label: 'CTO', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'cmo', label: 'CMO', color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { value: 'coo', label: 'COO', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { value: 'vp_growth', label: 'VP Growth', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  { value: 'head_growth', label: 'Head of Growth', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { value: 'founder', label: 'Founder', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'growth_expert', label: 'Growth Expert', color: 'bg-teal-50 text-teal-600 border-teal-200' },
  { value: 'other', label: 'Otro', color: 'bg-slate-50 text-slate-500 border-slate-200' },
];

type CreatorCategory = 'Growth' | 'Founder' | 'VC';

const CREATOR_SEED: { name: string; linkedinUrl: string; category: CreatorCategory }[] = [
  // 🟢 Growth — 16 perfiles
  { name: 'Jose Cortizo', linkedinUrl: 'https://www.linkedin.com/in/jccortizo/', category: 'Growth' },
  { name: 'Juanma Varo', linkedinUrl: 'https://www.linkedin.com/in/growth-marketing-juanma-varo/', category: 'Growth' },
  { name: 'Barbara Galiza', linkedinUrl: 'https://www.linkedin.com/in/barbara-galiza/', category: 'Growth' },
  { name: 'Andrea López', linkedinUrl: 'https://www.linkedin.com/in/andrealopezpalau/', category: 'Growth' },
  { name: 'Andrew Capland', linkedinUrl: 'https://www.linkedin.com/in/acapland/', category: 'Growth' },
  { name: 'Elena Verna', linkedinUrl: 'https://www.linkedin.com/in/elenaverna/', category: 'Growth' },
  { name: 'Adam Fishman', linkedinUrl: 'https://www.linkedin.com/in/adamjfishman/', category: 'Growth' },
  { name: 'Maja Boje', linkedinUrl: 'https://www.linkedin.com/in/majaboje/', category: 'Growth' },
  { name: 'Aakash Gupta', linkedinUrl: 'https://www.linkedin.com/in/aagupta/', category: 'Growth' },
  { name: 'Lenny Rachitsky', linkedinUrl: 'https://www.linkedin.com/in/lennyrachitsky/', category: 'Growth' },
  { name: 'Matt Lerner', linkedinUrl: 'https://www.linkedin.com/in/matthewlerner/', category: 'Growth' },
  { name: 'Crystal Widjaja', linkedinUrl: 'https://www.linkedin.com/in/crystalwidjaja/', category: 'Growth' },
  { name: 'Jorge Cano', linkedinUrl: 'https://www.linkedin.com/in/jcanoce/', category: 'Growth' },
  { name: 'Juan Bello', linkedinUrl: 'https://www.linkedin.com/in/juan-bello', category: 'Growth' },
  { name: 'Javi Platón', linkedinUrl: 'https://www.linkedin.com/in/javier-platon', category: 'Growth' },
  { name: 'Pau Gallinat', linkedinUrl: 'https://www.linkedin.com/in/pau-gallinat/', category: 'Growth' },
  // 🔵 Founders / CEOs — 22 perfiles
  { name: 'Alex Dantart', linkedinUrl: 'https://www.linkedin.com/in/dantart/', category: 'Founder' },
  { name: 'Miquel Martí', linkedinUrl: 'https://www.linkedin.com/in/miquel-marti-41210212/', category: 'Founder' },
  { name: 'Emilio Frójan', linkedinUrl: 'https://www.linkedin.com/in/emiliofrojan/', category: 'Founder' },
  { name: 'Jesús Alonso Gallo', linkedinUrl: 'https://www.linkedin.com/in/jesusalonsogallo/', category: 'Founder' },
  { name: 'Carlos Ortiz', linkedinUrl: 'https://www.linkedin.com/in/carlos-ortiz-startup-advisor/', category: 'Founder' },
  { name: 'Greg Isenberg', linkedinUrl: 'https://www.linkedin.com/in/gisenberg/', category: 'Founder' },
  { name: 'Brian Balfour', linkedinUrl: 'https://www.linkedin.com/in/bbalfour/', category: 'Founder' },
  { name: 'Barbara Mallet', linkedinUrl: 'https://www.linkedin.com/in/barbaramalet/', category: 'Founder' },
  { name: 'Juan Cruz', linkedinUrl: 'https://www.linkedin.com/in/juancruzaliaga/', category: 'Founder' },
  { name: 'Javier Romero', linkedinUrl: 'https://www.linkedin.com/in/javierromeroserrano/', category: 'Founder' },
  { name: 'Juan Pablo Montoya', linkedinUrl: 'https://www.linkedin.com/in/juanpablomontoyam/', category: 'Founder' },
  { name: 'Luis Monje', linkedinUrl: 'https://www.linkedin.com/in/luismonje/', category: 'Founder' },
  { name: 'Luis Díaz del Dedo', linkedinUrl: 'https://www.linkedin.com/in/luisdiazdeldedo/', category: 'Founder' },
  { name: 'Jordi Romero', linkedinUrl: 'https://www.linkedin.com/in/jordiromero/', category: 'Founder' },
  { name: 'Bernat Farrero', linkedinUrl: 'https://www.linkedin.com/in/bernatfarrero/', category: 'Founder' },
  { name: 'Carlos Blanco', linkedinUrl: 'https://www.linkedin.com/in/carlosblanco/', category: 'Founder' },
  { name: 'Oscar Pierre', linkedinUrl: 'https://www.linkedin.com/in/oscarpierremi/', category: 'Founder' },
  { name: 'Euge Oller', linkedinUrl: 'https://www.linkedin.com/in/eugeniooller/', category: 'Founder' },
  { name: 'Jesús Hijas', linkedinUrl: 'https://www.linkedin.com/in/jesushijas/', category: 'Founder' },
  { name: 'Jorge Branger', linkedinUrl: 'https://www.linkedin.com/in/jorgebranger/', category: 'Founder' },
  { name: 'Daniel Olmedo', linkedinUrl: 'https://www.linkedin.com/in/daniel-olmedo-nieto-b929758a/', category: 'Founder' },
  { name: 'Mathieu Carenzo', linkedinUrl: 'https://www.linkedin.com/in/mathieucarenzo/', category: 'Founder' },
  // 🟣 VCs — 9 perfiles
  { name: 'Samuel Gil', linkedinUrl: 'https://www.linkedin.com/in/samuelgil/', category: 'VC' },
  { name: 'Guillermo Flor', linkedinUrl: 'https://www.linkedin.com/in/guillermoflor/', category: 'VC' },
  { name: 'Iñaki Arrola', linkedinUrl: 'https://www.linkedin.com/in/inakiarrola/', category: 'VC' },
  { name: 'Miguel Arias', linkedinUrl: 'https://www.linkedin.com/in/miguelarias/', category: 'VC' },
  { name: 'Jaime Novoa', linkedinUrl: 'https://www.linkedin.com/in/jaimenovoa/', category: 'VC' },
  { name: 'Jose del Barrio', linkedinUrl: 'https://www.linkedin.com/in/josedelbarrio/', category: 'VC' },
  { name: 'Rubén Domínguez Ibar', linkedinUrl: 'https://www.linkedin.com/in/rubendominguezibar/', category: 'VC' },
  { name: 'Enrique Linares', linkedinUrl: 'https://www.linkedin.com/in/enriquelinares/', category: 'VC' },
  { name: 'Itxaso del Palacio', linkedinUrl: 'https://www.linkedin.com/in/itxasodp/', category: 'VC' },
];

type FounderProspectType = 'ceo' | 'cto' | 'cmo' | 'coo' | 'vp_growth' | 'head_growth' | 'founder' | 'growth_expert' | 'other';

const FOUNDER_PROSPECTS: { name: string; title: string; company: string; profileType: FounderProspectType }[] = [
  { name: 'Alex Dantart', title: 'x21 Founder, x32 Investor, LinkedIn Top Voice', company: '', profileType: 'founder' },
  { name: 'Miquel Martí', title: 'CEO Tech Barcelona', company: 'Tech Barcelona', profileType: 'ceo' },
  { name: 'Emilio Frójan', title: 'CEO Velca, Forbes 30u30', company: 'Velca', profileType: 'ceo' },
  { name: 'Jesús Alonso Gallo', title: 'Emprendedor x4, Inversor x80', company: '', profileType: 'founder' },
  { name: 'Carlos Ortiz', title: 'Co-Founder Aloha Poké, Startup Advisor', company: 'Aloha Poké', profileType: 'founder' },
  { name: 'Greg Isenberg', title: 'CEO Late Checkout', company: 'Late Checkout', profileType: 'ceo' },
  { name: 'Brian Balfour', title: 'Founder/CEO Reforge', company: 'Reforge', profileType: 'ceo' },
  { name: 'Barbara Mallet', title: 'Emprendedora', company: '', profileType: 'founder' },
  { name: 'Juan Cruz', title: 'Emprendedor', company: '', profileType: 'founder' },
  { name: 'Javier Romero', title: 'Emprendedor', company: '', profileType: 'founder' },
  { name: 'Juan Pablo Montoya', title: 'Emprendedor', company: '', profileType: 'founder' },
  { name: 'Luis Monje', title: 'Emprendedor / Ventas', company: '', profileType: 'founder' },
  { name: 'Luis Díaz del Dedo', title: 'Founder/CEO', company: '', profileType: 'founder' },
  { name: 'Jordi Romero', title: 'CEO Factorial', company: 'Factorial', profileType: 'ceo' },
  { name: 'Bernat Farrero', title: 'Co-Founder Factorial', company: 'Factorial', profileType: 'founder' },
  { name: 'Carlos Blanco', title: 'Serial entrepreneur, inversor', company: '', profileType: 'founder' },
  { name: 'Oscar Pierre', title: 'CEO Glovo', company: 'Glovo', profileType: 'ceo' },
  { name: 'Euge Oller', title: 'Fundador Emprende Aprendiendo', company: 'Emprende Aprendiendo', profileType: 'founder' },
  { name: 'Jesús Hijas', title: 'Emprendedor / Creador', company: '', profileType: 'founder' },
  { name: 'Jorge Branger', title: 'Emprendedor / Creador', company: '', profileType: 'founder' },
  { name: 'Daniel Olmedo', title: 'Emprendedor / Creador', company: '', profileType: 'founder' },
  { name: 'Mathieu Carenzo', title: 'Emprendedor / Creador', company: '', profileType: 'founder' },
];

// Map founder names to LinkedIn URLs from CREATOR_SEED
const FOUNDER_URL_MAP = new Map(
  CREATOR_SEED.filter((c) => c.category === 'Founder').map((c) => [c.name, c.linkedinUrl])
);

const CATEGORY_COLORS: Record<string, string> = {
  Growth: 'bg-green-50 text-green-600 border-green-200',
  Founder: 'bg-blue-50 text-blue-600 border-blue-200',
  VC: 'bg-purple-50 text-purple-600 border-purple-200',
};

export default function LinkedInBotPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<(LIComment & { id: string })[]>([]);
  const [prospects, setProspects] = useState<(LIProspect & { id: string })[]>([]);
  const [candidates, setCandidates] = useState<(LICandidate & { id: string })[]>([]);
  const [creators, setCreators] = useState<(LICreator & { id: string })[]>([]);
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [prospectFilter, setProspectFilter] = useState<ProspectFilter>('all');
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('all');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showAddCreator, setShowAddCreator] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, p, ca, cr] = await Promise.all([getAllLIComments(), getAllLIProspects(), getAllLICandidates(), getAllLICreators()]);
    setComments(c as any);
    setProspects(p as any);
    setCandidates(ca as any);
    setCreators(cr as any);
    setLoading(false);
  }

  // --- Comment actions ---
  async function approveComment(id: string) {
    await updateLIComment(id, { status: 'approved' });
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c)));
  }

  async function rejectComment(id: string) {
    await updateLIComment(id, { status: 'rejected' });
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c)));
  }

  async function markPosted(id: string) {
    await updateLIComment(id, { status: 'posted' });
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'posted' } : c)));
  }

  async function saveEditComment(id: string) {
    await updateLIComment(id, { commentDraft: editDraft });
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, commentDraft: editDraft } : c)));
    setEditingComment(null);
  }

  async function removeComment(id: string) {
    await deleteLIComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function copyComment(text: string) {
    navigator.clipboard.writeText(text);
  }

  // --- Prospect actions ---
  async function changeProspectStage(id: string, stage: LIProspect['funnelStage']) {
    await updateLIProspect(id, { funnelStage: stage });
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, funnelStage: stage } : p)));
  }

  async function updateProspectField(id: string, updates: Partial<LIProspect>) {
    await updateLIProspect(id, updates);
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function removeProspect(id: string) {
    await deleteLIProspect(id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }

  async function addProspect(data: Omit<LIProspect, 'createdAt' | 'updatedAt'>) {
    const id = await createLIProspect(data);
    setProspects((prev) => [{ ...data, id, createdAt: new Date(), updatedAt: new Date() } as any, ...prev]);
    setShowAddProspect(false);
  }

  // --- Candidate actions ---
  async function approveCandidate(id: string) {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;
    // Move to prospects
    await createLIProspect({
      name: candidate.name,
      title: candidate.title,
      company: candidate.company,
      linkedinUrl: candidate.linkedinUrl,
      email: '',
      source: `linkedin-interaction:${candidate.interactionType}`,
      profileType: candidate.profileType,
      funnelStage: 'detected',
      companySector: '',
      companySize: '',
      fundingStage: '',
      painPoints: '',
      g4uMatch: '',
      outreachMessage: '',
      tags: ['from-candidate'],
      notes: `Detectado via ${candidate.interactionType} en post de ${candidate.sourceCreatorName}. ${candidate.reason}`,
    });
    await updateLICandidate(id, { status: 'approved' });
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'approved' as const } : c)));
    // Reload prospects to show the new one
    const freshProspects = await getAllLIProspects();
    setProspects(freshProspects as any);
  }

  async function rejectCandidate(id: string) {
    await updateLICandidate(id, { status: 'rejected' });
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'rejected' as const } : c)));
  }

  async function removeCandidate(id: string) {
    await deleteLICandidate(id);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  // --- Creator actions ---
  async function addCreator(data: Omit<LICreator, 'createdAt' | 'updatedAt'>) {
    const id = await createLICreator(data);
    setCreators((prev) => [...prev, { ...data, id, createdAt: new Date(), updatedAt: new Date() } as any]);
    setShowAddCreator(false);
  }

  async function removeCreator(id: string) {
    await deleteLICreator(id);
    setCreators((prev) => prev.filter((c) => c.id !== id));
  }

  async function toggleCreatorActive(id: string, active: boolean) {
    await updateLICreator(id, { active });
    setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  async function seedCreators() {
    const existing = new Set(creators.map((c) => c.name.toLowerCase()));
    const toAdd = CREATOR_SEED.filter((s) => !existing.has(s.name.toLowerCase()));
    for (const s of toAdd) {
      await addCreator({
        name: s.name,
        linkedinUrl: s.linkedinUrl,
        category: s.category,
        lastPostDate: '',
        lastCommentDate: '',
        commentCount: 0,
        notes: '',
        active: true,
      });
    }
    setShowAddCreator(false);
  }

  async function seedFounderProspects() {
    const existing = new Set(prospects.map((p) => p.name.toLowerCase()));
    const toAdd = FOUNDER_PROSPECTS.filter((f) => !existing.has(f.name.toLowerCase()));
    for (const f of toAdd) {
      const linkedinUrl = FOUNDER_URL_MAP.get(f.name) || '';
      await addProspect({
        name: f.name,
        title: f.title,
        company: f.company,
        linkedinUrl,
        email: '',
        source: 'linkedin-creator-network',
        profileType: f.profileType as any,
        funnelStage: 'detected',
        companySector: '',
        companySize: '',
        fundingStage: '',
        painPoints: '',
        g4uMatch: '',
        outreachMessage: '',
        tags: ['founder-creator'],
        notes: '',
      });
    }
  }

  // --- Computed stats ---
  const pendingComments = comments.filter((c) => c.status === 'pending').length;
  const approvedToday = comments.filter(
    (c) => c.status === 'approved' && c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const postedTotal = comments.filter((c) => c.status === 'posted').length;
  const activeProspects = prospects.filter((p) => p.funnelStage !== 'disqualified').length;
  const meetingProspects = prospects.filter((p) => p.funnelStage === 'meeting').length;
  const activeCreators = creators.filter((c) => c.active).length;

  const pendingCandidates = candidates.filter((c) => c.status === 'pending').length;

  const filteredComments = commentFilter === 'all' ? comments : comments.filter((c) => c.status === commentFilter);
  const filteredProspects = prospectFilter === 'all' ? prospects : prospects.filter((p) => p.funnelStage === prospectFilter);
  const filteredCandidates = candidateFilter === 'all' ? candidates : candidates.filter((c) => c.status === candidateFilter);

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'comments', label: 'Comentarios', icon: MessageSquare, badge: pendingComments },
    { id: 'candidates', label: 'Candidatos', icon: Eye, badge: pendingCandidates },
    { id: 'prospects', label: 'Prospects', icon: Users, badge: activeProspects },
    { id: 'creators', label: 'Creator Network', icon: Network, badge: activeCreators },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#6351d5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">LinkedIn Bot</h1>
        <p className="text-slate-400 mt-1">Comentarios, prospección y Creator Network</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-[#6351d5] text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-[#6351d5]/10 text-[#6351d5]'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab
        pendingComments={pendingComments}
        approvedToday={approvedToday}
        postedTotal={postedTotal}
        activeProspects={activeProspects}
        meetingProspects={meetingProspects}
        activeCreators={activeCreators}
        prospects={prospects}
        comments={comments}
        onSendSlack={async () => {
          const uncurated = prospects.filter((p) => p.funnelStage === 'detected' && !p.companySector).length;
          return sendLIBotSlackSummary({
            pendingComments,
            approvedToday,
            postedTotal,
            activeProspects,
            uncuratedProspects: uncurated,
            meetingProspects,
            activeCreators,
          });
        }}
        onScrapeComplete={loadAll}
      />}
      {tab === 'comments' && (
        <CommentsTab
          comments={filteredComments}
          filter={commentFilter}
          setFilter={setCommentFilter}
          onApprove={approveComment}
          onReject={rejectComment}
          onPosted={markPosted}
          onDelete={removeComment}
          onCopy={copyComment}
          editingId={editingComment}
          editDraft={editDraft}
          onStartEdit={(id, draft) => { setEditingComment(id); setEditDraft(draft); }}
          onSaveEdit={saveEditComment}
          onCancelEdit={() => setEditingComment(null)}
          setEditDraft={setEditDraft}
        />
      )}
      {tab === 'candidates' && (
        <CandidatesTab
          candidates={filteredCandidates}
          filter={candidateFilter}
          setFilter={setCandidateFilter}
          onApprove={approveCandidate}
          onReject={rejectCandidate}
          onDelete={removeCandidate}
        />
      )}
      {tab === 'prospects' && (
        <ProspectsTab
          prospects={filteredProspects}
          filter={prospectFilter}
          setFilter={setProspectFilter}
          onChangeStage={changeProspectStage}
          onUpdateField={updateProspectField}
          onDelete={removeProspect}
          showAdd={showAddProspect}
          setShowAdd={setShowAddProspect}
          onAdd={addProspect}
          onSeedFounders={seedFounderProspects}
        />
      )}
      {tab === 'creators' && (
        <CreatorsTab
          creators={creators}
          onDelete={removeCreator}
          onToggleActive={toggleCreatorActive}
          showAdd={showAddCreator}
          setShowAdd={setShowAddCreator}
          onAdd={addCreator}
          onSeed={seedCreators}
        />
      )}
    </div>
  );
}

// =================== OVERVIEW ===================
function OverviewTab({
  pendingComments, approvedToday, postedTotal, activeProspects, meetingProspects, activeCreators, prospects, comments, onSendSlack, onScrapeComplete,
}: {
  pendingComments: number; approvedToday: number; postedTotal: number;
  activeProspects: number; meetingProspects: number; activeCreators: number;
  prospects: (LIProspect & { id: string })[];
  comments: (LIComment & { id: string })[];
  onSendSlack: () => Promise<boolean>;
  onScrapeComplete?: () => void;
}) {
  const [slackSending, setSlackSending] = useState(false);
  const [slackSent, setSlackSent] = useState<'ok' | 'error' | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ ok: boolean; saved?: number; totalPosts?: number; error?: string } | null>(null);

  async function handleSendSlack() {
    setSlackSending(true);
    setSlackSent(null);
    const ok = await onSendSlack();
    setSlackSent(ok ? 'ok' : 'error');
    setSlackSending(false);
    if (ok) setTimeout(() => setSlackSent(null), 3000);
  }

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch('/.netlify/functions/li-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPosts: 3 }),
      });
      const data = await res.json();
      setScrapeResult(data);
      if (data.ok && onScrapeComplete) onScrapeComplete();
    } catch (err: any) {
      setScrapeResult({ ok: false, error: err.message });
    }
    setScraping(false);
  }
  const stats = [
    { label: 'Pendientes de aprobar', value: pendingComments, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Aprobados hoy', value: approvedToday, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { label: 'Comentarios publicados', value: postedTotal, color: 'text-[#6351d5]', bg: 'bg-[#6351d5]/5 border-[#6351d5]/20' },
    { label: 'Prospects activos', value: activeProspects, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'En reunión', value: meetingProspects, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Creator Network', value: activeCreators, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  ];

  // Funnel breakdown
  const funnelCounts = FUNNEL_STAGES.map((s) => ({
    ...s,
    count: prospects.filter((p) => p.funnelStage === s.value).length,
  }));

  // Comment types
  const outboundCount = comments.filter((c) => c.commentType === 'outbound').length;
  const authorityCount = comments.filter((c) => c.commentType === 'authority').length;

  return (
    <div className="space-y-6">
      {/* KPI Cards + Slack */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h3 className="font-semibold text-[#032149]">KPIs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
              scrapeResult?.ok
                ? 'bg-green-50 text-green-600 border-green-200'
                : scrapeResult && !scrapeResult.ok
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-[#6351d5] text-white border-[#6351d5] hover:bg-[#5241c5]'
            } disabled:opacity-50`}
          >
            {scraping ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {scraping
              ? 'Scraping + IA...'
              : scrapeResult?.ok
              ? `${scrapeResult.saved} comentarios nuevos`
              : scrapeResult?.error
              ? 'Error'
              : 'Lanzar Scraper'}
          </button>
          <button
            onClick={handleSendSlack}
            disabled={slackSending}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
              slackSent === 'ok'
                ? 'bg-green-50 text-green-600 border-green-200'
                : slackSent === 'error'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#6351d5] hover:text-[#6351d5]'
            } disabled:opacity-50`}
          >
            {slackSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {slackSent === 'ok' ? 'Enviado a Slack' : slackSent === 'error' ? 'Error al enviar' : 'Slack'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#032149] mb-4">Funnel de Prospects</h3>
          <div className="space-y-3">
            {funnelCounts.map((s) => {
              const maxCount = Math.max(...funnelCounts.map((f) => f.count), 1);
              const width = Math.max((s.count / maxCount) * 100, 4);
              return (
                <div key={s.value} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 shrink-0">{s.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center px-2 transition-all ${s.color.split(' ')[0]} ${s.color.split(' ')[1]}`}
                      style={{ width: `${width}%`, minWidth: '24px' }}
                    >
                      <span className="text-xs font-medium">{s.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comment split */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#032149] mb-4">Comentarios por tipo</h3>
          <div className="flex items-end gap-8 h-40">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-full bg-blue-100 rounded-t-lg transition-all"
                style={{ height: `${Math.max((outboundCount / Math.max(outboundCount + authorityCount, 1)) * 120, 8)}px` }}
              />
              <p className="text-2xl font-bold text-blue-600 mt-2">{outboundCount}</p>
              <p className="text-xs text-slate-500">Outbound</p>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-full bg-purple-100 rounded-t-lg transition-all"
                style={{ height: `${Math.max((authorityCount / Math.max(outboundCount + authorityCount, 1)) * 120, 8)}px` }}
              />
              <p className="text-2xl font-bold text-purple-600 mt-2">{authorityCount}</p>
              <p className="text-xs text-slate-500">Autoridad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-phase flow */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#032149] mb-1">Fase 1 — Comentar en referentes</h3>
          <p className="text-xs text-slate-400 mb-3">Prioridad actual</p>
          <div className="space-y-2 text-sm">
            {['Scrapear posts de 47 perfiles', 'IA genera comentarios de valor', 'G4U revisa y aprueba', 'Publicar manualmente', 'Trackear engagement'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#6351d5]/10 text-[#6351d5] text-xs flex items-center justify-center font-medium">{i + 1}</span>
                <span className="text-slate-600">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#032149] mb-1">Fase 2 — Captar C-levels</h3>
          <p className="text-xs text-slate-400 mb-3">Segunda fase</p>
          <div className="space-y-2 text-sm">
            {['Scrapear quién interactúa', 'Filtrar C-levels de startups', 'Curar: empresa, sector, dolor', 'Match con servicio G4U', 'Outreach personalizado'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#032149]/10 text-[#032149] text-xs flex items-center justify-center font-medium">{i + 1}</span>
                <span className="text-slate-600">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Limits reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-500 text-lg shrink-0">⚠</span>
        <div className="text-sm text-amber-800">
          <p className="font-medium">Límites de LinkedIn</p>
          <p className="text-amber-700 mt-1">~120 comentarios/día max · 100 conexiones/semana · Solo horario laboral · Sin lead magnets en cada comentario</p>
        </div>
      </div>
    </div>
  );
}

// =================== COMMENTS ===================
function CommentsTab({
  comments, filter, setFilter, onApprove, onReject, onPosted, onDelete, onCopy,
  editingId, editDraft, onStartEdit, onSaveEdit, onCancelEdit, setEditDraft,
}: {
  comments: (LIComment & { id: string })[];
  filter: CommentFilter;
  setFilter: (f: CommentFilter) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPosted: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  editingId: string | null;
  editDraft: string;
  onStartEdit: (id: string, draft: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  setEditDraft: (d: string) => void;
}) {
  const filters: { value: CommentFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'posted', label: 'Publicados' },
    { value: 'rejected', label: 'Rechazados' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    approved: 'bg-green-50 text-green-600 border-green-200',
    posted: 'bg-blue-50 text-blue-600 border-blue-200',
    rejected: 'bg-red-50 text-red-400 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    posted: 'Publicado',
    rejected: 'Rechazado',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filter === f.value
                ? 'bg-[#032149] text-white border-[#032149]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay comentarios {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
          <p className="text-sm text-slate-400 mt-1">Los comentarios se generarán desde n8n / scraper</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Profile info */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#032149]">{c.profileName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      c.commentType === 'outbound' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'
                    }`}>
                      {c.commentType === 'outbound' ? 'Outbound' : 'Autoridad'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{c.profileTitle}</p>

                  {/* Post snippet */}
                  {c.postSnippet && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-600 border-l-2 border-slate-300">
                      {c.postSnippet.length > 200 ? c.postSnippet.slice(0, 200) + '...' : c.postSnippet}
                    </div>
                  )}

                  {/* Comment draft */}
                  {editingId === c.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#6351d5] focus:border-[#6351d5] outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => onSaveEdit(c.id)} className="px-3 py-1.5 text-xs bg-[#6351d5] text-white rounded-lg">
                          Guardar
                        </button>
                        <button onClick={onCancelEdit} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#032149] bg-[#6351d5]/5 rounded-lg p-3 border border-[#6351d5]/10">
                      {c.commentDraft}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  {c.status === 'pending' && (
                    <>
                      <button onClick={() => onApprove(c.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Aprobar">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => onReject(c.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Rechazar">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {c.status === 'approved' && (
                    <button onClick={() => onPosted(c.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Marcar publicado">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onCopy(c.commentDraft)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg" title="Copiar">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartEdit(c.id, c.commentDraft)}
                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {c.postUrl && (
                    <a href={c.postUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg" title="Ver post">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => onDelete(c.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-lg" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== CANDIDATES ===================
function CandidatesTab({
  candidates, filter, setFilter, onApprove, onReject, onDelete,
}: {
  candidates: (LICandidate & { id: string })[];
  filter: CandidateFilter;
  setFilter: (f: CandidateFilter) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const filters: { value: CandidateFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'rejected', label: 'Rechazados' },
  ];

  const interactionIcons: Record<string, string> = {
    like: '👍',
    comment: '💬',
    repost: '🔁',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === f.value
                  ? 'bg-[#032149] text-white border-[#032149]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {candidates.filter((c) => c.status === 'pending').length} pendientes de validar
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay candidatos todavía</p>
          <p className="text-sm text-slate-400 mt-1">Los candidatos aparecerán cuando el scraper detecte interacciones de C-levels en los posts de tu red</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className={`bg-white rounded-xl border p-4 ${
              c.status === 'approved' ? 'border-green-200 bg-green-50/30' :
              c.status === 'rejected' ? 'border-slate-200 opacity-50' :
              'border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{interactionIcons[c.interactionType] || '👤'}</span>
                    <h4 className="font-semibold text-[#032149] truncate">{c.name}</h4>
                    {c.status === 'approved' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600 font-medium">Aprobado</span>
                    )}
                    {c.status === 'rejected' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">Rechazado</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{c.title}</p>
                  {c.company && <p className="text-sm text-slate-400">{c.company}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>Fuente: {c.sourceCreatorName}</span>
                    {c.reason && <span className="text-[#6351d5] font-medium">• {c.reason}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.linkedinUrl && (
                    <a
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Ver perfil"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {c.sourcePostUrl && (
                    <a
                      href={c.sourcePostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="Ver post"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                  {c.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove(c.id)}
                        className="p-2 text-slate-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Aprobar → mover a Prospects"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onReject(c.id)}
                        className="p-2 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title="Rechazar"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(c.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =================== PROSPECTS ===================
function ProspectsTab({
  prospects, filter, setFilter, onChangeStage, onUpdateField, onDelete, showAdd, setShowAdd, onAdd, onSeedFounders,
}: {
  prospects: (LIProspect & { id: string })[];
  filter: ProspectFilter;
  setFilter: (f: ProspectFilter) => void;
  onChangeStage: (id: string, stage: LIProspect['funnelStage']) => void;
  onUpdateField: (id: string, updates: Partial<LIProspect>) => void;
  onDelete: (id: string) => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  onAdd: (data: Omit<LIProspect, 'createdAt' | 'updatedAt'>) => void;
  onSeedFounders: () => Promise<void>;
}) {
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filters: { value: ProspectFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    ...FUNNEL_STAGES.map((s) => ({ value: s.value as ProspectFilter, label: s.label })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filter === f.value
                  ? 'bg-[#032149] text-white border-[#032149]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => { setSeeding(true); await onSeedFounders(); setSeeding(false); }}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-slate-600 border border-slate-200 rounded-lg hover:border-[#6351d5] hover:text-[#6351d5] disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {seeding ? 'Cargando...' : 'Seed 22 Founders'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#6351d5] text-white rounded-lg hover:bg-[#5040b0]"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
      </div>

      {showAdd && <AddProspectForm onAdd={onAdd} onCancel={() => setShowAdd(false)} />}

      {prospects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay prospects {filter !== 'all' ? `en "${filter}"` : ''}</p>
          <p className="text-sm text-slate-400 mt-1">Se generarán desde el scraping de interacciones</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {prospects.map((p) => {
            const stage = FUNNEL_STAGES.find((s) => s.value === p.funnelStage) || FUNNEL_STAGES[0];
            const profileType = PROFILE_TYPES.find((pt) => pt.value === p.profileType);
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Main row */}
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#032149] flex items-center justify-center text-white font-medium shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#032149]">{p.name}</span>
                      {profileType && profileType.value !== 'other' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${profileType.color}`}>{profileType.label}</span>
                      )}
                      {p.companySector && (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">{p.companySector}</span>
                      )}
                      {p.g4uMatch && (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-[#6351d5]/10 text-[#6351d5] border-[#6351d5]/20">
                          <Sparkles className="w-3 h-3 inline mr-0.5" />
                          {G4U_SERVICES.find((s) => s.value === p.g4uMatch)?.label || p.g4uMatch}
                        </span>
                      )}
                      {p.linkedinUrl && (
                        <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#0077B5]" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{p.title}{p.company ? ` · ${p.company}` : ''}</p>
                    {p.source && <p className="text-xs text-slate-400 mt-0.5">Fuente: {p.source}</p>}
                  </div>

                  <select
                    value={p.funnelStage}
                    onChange={(e) => onChangeStage(p.id, e.target.value as LIProspect['funnelStage'])}
                    className={`text-xs px-2 py-1 rounded-lg border ${stage.color} outline-none cursor-pointer shrink-0`}
                  >
                    {FUNNEL_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button onClick={() => onDelete(p.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    {/* Company Intelligence */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Inteligencia de empresa
                      </h4>
                      <div className="grid md:grid-cols-4 gap-2">
                        <select value={p.companySector} onChange={(e) => onUpdateField(p.id, { companySector: e.target.value })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]">
                          <option value="">Sector...</option>
                          {COMPANY_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={p.companySize} onChange={(e) => onUpdateField(p.id, { companySize: e.target.value })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]">
                          <option value="">Tamaño...</option>
                          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={p.fundingStage} onChange={(e) => onUpdateField(p.id, { fundingStage: e.target.value })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]">
                          <option value="">Funding...</option>
                          {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={p.profileType} onChange={(e) => onUpdateField(p.id, { profileType: e.target.value as LIProspect['profileType'] })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]">
                          {PROFILE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Pain Points */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" /> Pain points detectados
                      </h4>
                      <textarea
                        value={p.painPoints}
                        onChange={(e) => onUpdateField(p.id, { painPoints: e.target.value })}
                        placeholder="¿Qué problemas tiene? ¿CAC alto? ¿No escalan? ¿Dependen de paid? ¿No tienen attribution?"
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]"
                      />
                    </div>

                    {/* G4U Match */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Match con Growth4U
                      </h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        <select value={p.g4uMatch} onChange={(e) => onUpdateField(p.id, { g4uMatch: e.target.value })}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]">
                          <option value="">Seleccionar servicio/recurso...</option>
                          {G4U_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <div className="text-xs text-slate-400 flex items-center px-2">
                          Servicio o lead magnet más relevante para este prospect
                        </div>
                      </div>
                    </div>

                    {/* Outreach Message */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Mensaje de outreach
                      </h4>
                      <textarea
                        value={p.outreachMessage}
                        onChange={(e) => onUpdateField(p.id, { outreachMessage: e.target.value })}
                        placeholder="Mensaje personalizado para DM o email basado en su perfil y pain points..."
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]"
                      />
                      {p.outreachMessage && (
                        <button onClick={() => navigator.clipboard.writeText(p.outreachMessage)}
                          className="mt-1 flex items-center gap-1 text-xs text-[#6351d5] hover:underline">
                          <Copy className="w-3 h-3" /> Copiar mensaje
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <textarea
                        value={p.notes}
                        onChange={(e) => onUpdateField(p.id, { notes: e.target.value })}
                        placeholder="Notas internas..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white outline-none focus:ring-1 focus:ring-[#6351d5]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddProspectForm({ onAdd, onCancel }: {
  onAdd: (data: Omit<LIProspect, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: '', title: '', company: '', linkedinUrl: '', email: '', source: '', notes: '',
    profileType: 'other' as LIProspect['profileType'],
    companySector: '', companySize: '', fundingStage: '',
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-medium text-[#032149] mb-3">Nuevo Prospect</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <select value={form.profileType} onChange={(e) => setForm({ ...form, profileType: e.target.value as LIProspect['profileType'] })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]">
          {PROFILE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
        </select>
        <input placeholder="Cargo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <input placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <select value={form.companySector} onChange={(e) => setForm({ ...form, companySector: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]">
          <option value="">Sector...</option>
          {COMPANY_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]">
          <option value="">Tamaño...</option>
          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <input placeholder="Fuente (ej: Post de Lenny)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => form.name && onAdd({
            ...form, funnelStage: 'detected', tags: [],
            fundingStage: form.fundingStage, painPoints: '', g4uMatch: '', outreachMessage: '',
          })}
          disabled={!form.name}
          className="px-4 py-2 text-sm bg-[#6351d5] text-white rounded-lg hover:bg-[#5040b0] disabled:opacity-40"
        >
          Guardar
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// =================== CREATORS ===================
function CreatorsTab({
  creators, onDelete, onToggleActive, showAdd, setShowAdd, onAdd, onSeed,
}: {
  creators: (LICreator & { id: string })[];
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  onAdd: (data: Omit<LICreator, 'createdAt' | 'updatedAt'>) => void;
  onSeed: () => void;
}) {
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    await onSeed();
    setSeeding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">{creators.length} perfiles · {creators.filter((c) => c.active).length} activos</p>
        <div className="flex gap-2">
          {creators.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#032149] text-white rounded-lg hover:bg-[#0a3366] disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
              Cargar 47 perfiles
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#6351d5] text-white rounded-lg hover:bg-[#5040b0]"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && <AddCreatorForm onAdd={onAdd} onCancel={() => setShowAdd(false)} />}

      {/* Creator grid */}
      {creators.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay perfiles en el Creator Network</p>
          <p className="text-sm text-slate-400 mt-1">Usa "Cargar 47 perfiles" para iniciar con la lista completa</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {creators.map((c) => (
            <div key={c.id} className={`bg-white rounded-xl border p-4 transition-colors ${c.active ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#6351d5] flex items-center justify-center text-white text-sm font-medium">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#032149] text-sm">{c.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[c.category] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {c.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {c.linkedinUrl && (
                    <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-[#0077B5]">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onToggleActive(c.id, !c.active)}
                    className={`p-1 rounded ${c.active ? 'text-green-500' : 'text-slate-300'}`}
                    title={c.active ? 'Desactivar' : 'Activar'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(c.id)} className="p-1 text-red-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span>{c.commentCount} comentarios</span>
                {c.lastCommentDate && <span>Último: {c.lastCommentDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCreatorForm({ onAdd, onCancel }: {
  onAdd: (data: Omit<LICreator, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: '', linkedinUrl: '', category: 'Growth', notes: '' });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-medium text-[#032149] mb-3">Nuevo Perfil</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]">
          <option>Growth</option>
          <option>Founder</option>
          <option>VC</option>
        </select>
        <input placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6351d5]" />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => form.name && onAdd({ ...form, lastPostDate: '', lastCommentDate: '', commentCount: 0, active: true })}
          disabled={!form.name}
          className="px-4 py-2 text-sm bg-[#6351d5] text-white rounded-lg hover:bg-[#5040b0] disabled:opacity-40"
        >
          Guardar
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg">
          Cancelar
        </button>
      </div>
    </div>
  );
}
