import { useState } from 'react';
import {
  Copy,
  CheckCircle2,
  Building2,
  FileText,
  HelpCircle,
  User,
  Plus,
  Trash2,
  Code2,
} from 'lucide-react';
import { SectionHeader } from './shared';

interface OrganizationData {
  name: string;
  url: string;
  logo: string;
  description: string;
  foundingDate: string;
  email: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  instagram: string;
}

interface ArticleData {
  title: string;
  publishDate: string;
  description: string;
  url: string;
  wordCount: number;
  authorName: string;
  authorTitle: string;
  authorCredentials: string;
  authorLinkedin: string;
  authorTwitter: string;
  coverImage: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface PersonData {
  name: string;
  jobTitle: string;
  credentials: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  instagram: string;
  expertiseTags: string;
  profileUrl: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-1.5 bg-[#6351d5] hover:bg-[#5242b8] text-white text-xs rounded-lg transition-colors">
      {copied ? <><CheckCircle2 className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
    </button>
  );
}

function SchemaPreview({ json, label }: { json: string; label: string }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-500">JSON-LD generado</p>
        <CopyButton text={json} />
      </div>
      <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
        <code>{json}</code>
      </pre>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', required = false }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
      />
    </div>
  );
}

// ===== Organization Schema =====
function OrganizationSchema() {
  const [data, setData] = useState<OrganizationData>({
    name: 'Growth4U', url: 'https://growth4u.io', logo: 'https://growth4u.io/logo.png',
    description: 'Especialistas en Growth Marketing para empresas tech B2B y B2C',
    foundingDate: '', email: '', linkedin: '', twitter: '', youtube: '', instagram: '',
  });

  const socialUrls = [data.linkedin, data.twitter, data.youtube, data.instagram].filter(Boolean);

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    ...(data.foundingDate && { foundingDate: data.foundingDate }),
    ...(data.email && { email: data.email }),
    ...(socialUrls.length > 0 && { sameAs: socialUrls }),
  }, null, 2);

  const u = (field: keyof OrganizationData) => (v: string) => setData({ ...data, [field]: v });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-[#6351d5]" />
        <h3 className="text-lg font-bold text-[#032149]">Organization</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">Identifica tu empresa ante Google y motores de IA. Fundamental para brand queries.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InputField label="Nombre" value={data.name} onChange={u('name')} required />
        <InputField label="URL" value={data.url} onChange={u('url')} type="url" required />
        <InputField label="Logo URL" value={data.logo} onChange={u('logo')} type="url" />
        <InputField label="Fecha de Fundacion" value={data.foundingDate} onChange={u('foundingDate')} type="date" />
        <InputField label="Email" value={data.email} onChange={u('email')} type="email" />
        <div className="md:col-span-2">
          <InputField label="Descripcion" value={data.description} onChange={u('description')} />
        </div>
        <InputField label="LinkedIn URL" value={data.linkedin} onChange={u('linkedin')} placeholder="https://linkedin.com/company/..." />
        <InputField label="Twitter URL" value={data.twitter} onChange={u('twitter')} placeholder="https://twitter.com/..." />
        <InputField label="YouTube URL" value={data.youtube} onChange={u('youtube')} placeholder="https://youtube.com/@..." />
        <InputField label="Instagram URL" value={data.instagram} onChange={u('instagram')} placeholder="https://instagram.com/..." />
      </div>

      <SchemaPreview json={schema} label="Organization" />
    </div>
  );
}

// ===== Article Schema =====
function ArticleSchema() {
  const [data, setData] = useState<ArticleData>({
    title: '', publishDate: new Date().toISOString().split('T')[0], description: '', url: '',
    wordCount: 0, authorName: '', authorTitle: '', authorCredentials: '', authorLinkedin: '', authorTwitter: '', coverImage: '',
  });

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    datePublished: data.publishDate,
    description: data.description,
    url: data.url,
    ...(data.wordCount > 0 && { wordCount: data.wordCount }),
    ...(data.coverImage && { image: data.coverImage }),
    ...(data.authorName && {
      author: {
        '@type': 'Person',
        name: data.authorName,
        ...(data.authorTitle && { jobTitle: data.authorTitle }),
        ...(data.authorCredentials && { description: data.authorCredentials }),
        ...([data.authorLinkedin, data.authorTwitter].filter(Boolean).length > 0 && {
          sameAs: [data.authorLinkedin, data.authorTwitter].filter(Boolean),
        }),
      },
    }),
    publisher: {
      '@type': 'Organization',
      name: 'Growth4U',
      url: 'https://growth4u.io',
    },
  }, null, 2);

  const u = (field: keyof ArticleData) => (v: string) => setData({ ...data, [field]: field === 'wordCount' ? parseInt(v) || 0 : v });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-[#6351d5]" />
        <h3 className="text-lg font-bold text-[#032149]">Article</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">Ayuda a los LLMs a entender y citar correctamente tus articulos de blog. Incluye E-E-A-T del autor.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <InputField label="Titulo del Articulo" value={data.title} onChange={u('title')} required />
        </div>
        <InputField label="Fecha de Publicacion" value={data.publishDate} onChange={u('publishDate')} type="date" />
        <InputField label="URL" value={data.url} onChange={u('url')} type="url" />
        <div className="md:col-span-2">
          <InputField label="Descripcion" value={data.description} onChange={u('description')} />
        </div>
        <InputField label="Conteo de Palabras" value={data.wordCount} onChange={u('wordCount')} type="number" />
        <InputField label="Imagen de Portada URL" value={data.coverImage} onChange={u('coverImage')} type="url" />
        <InputField label="Nombre del Autor" value={data.authorName} onChange={u('authorName')} />
        <InputField label="Titulo/Cargo del Autor" value={data.authorTitle} onChange={u('authorTitle')} placeholder="CEO, Growth Strategist..." />
        <div className="md:col-span-2">
          <InputField label="Credenciales del Autor" value={data.authorCredentials} onChange={u('authorCredentials')} placeholder="Bio profesional..." />
        </div>
        <InputField label="LinkedIn del Autor" value={data.authorLinkedin} onChange={u('authorLinkedin')} />
        <InputField label="Twitter del Autor" value={data.authorTwitter} onChange={u('authorTwitter')} />
      </div>

      <SchemaPreview json={schema} label="Article" />
    </div>
  );
}

// ===== FAQ Schema =====
function FAQSchema() {
  const [faqs, setFaqs] = useState<FAQItem[]>([
    { question: '', answer: '' },
  ]);

  const addFAQ = () => setFaqs([...faqs, { question: '', answer: '' }]);
  const removeFAQ = (idx: number) => setFaqs(faqs.filter((_, i) => i !== idx));
  const updateFAQ = (idx: number, field: keyof FAQItem, value: string) => {
    const updated = [...faqs];
    updated[idx] = { ...updated[idx], [field]: value };
    setFaqs(updated);
  };

  const validFaqs = faqs.filter(f => f.question && f.answer);

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }, null, 2);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-5 h-5 text-[#6351d5]" />
        <h3 className="text-lg font-bold text-[#032149]">FAQPage</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">Las FAQs son el formato preferido por los LLMs para citar respuestas. Cada FAQ es una oportunidad de citacion.</p>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Pregunta {idx + 1}</span>
              {faqs.length > 1 && (
                <button onClick={() => removeFAQ(idx)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              type="text" value={faq.question} onChange={(e) => updateFAQ(idx, 'question', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5] mb-2"
              placeholder="Ej: Que es el growth marketing?"
            />
            <textarea
              value={faq.answer} onChange={(e) => updateFAQ(idx, 'answer', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#032149] focus:outline-none focus:ring-2 focus:ring-[#6351d5] h-20"
              placeholder="Respuesta concisa en 2-3 frases..."
            />
          </div>
        ))}
        <button onClick={addFAQ} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors text-sm">
          <Plus className="w-4 h-4" /> Anadir Pregunta
        </button>
      </div>

      {validFaqs.length > 0 && <SchemaPreview json={schema} label="FAQPage" />}
    </div>
  );
}

// ===== Person (Author E-E-A-T) Schema =====
function PersonSchema() {
  const [data, setData] = useState<PersonData>({
    name: '', jobTitle: '', credentials: '',
    linkedin: '', twitter: '', youtube: '', instagram: '',
    expertiseTags: '', profileUrl: '',
  });

  const socialUrls = [data.linkedin, data.twitter, data.youtube, data.instagram].filter(Boolean);
  const expertise = data.expertiseTags.split(',').map(t => t.trim()).filter(Boolean);

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    ...(data.jobTitle && { jobTitle: data.jobTitle }),
    ...(data.credentials && { description: data.credentials }),
    ...(data.profileUrl && { url: data.profileUrl }),
    ...(socialUrls.length > 0 && { sameAs: socialUrls }),
    ...(expertise.length > 0 && { knowsAbout: expertise }),
  }, null, 2);

  const u = (field: keyof PersonData) => (v: string) => setData({ ...data, [field]: v });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-5 h-5 text-[#6351d5]" />
        <h3 className="text-lg font-bold text-[#032149]">Person (Author E-E-A-T)</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">Establece la autoridad del autor. Los LLMs priorizan contenido de autores verificables con expertise demostrable.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InputField label="Nombre Completo" value={data.name} onChange={u('name')} required />
        <InputField label="Titulo/Cargo" value={data.jobTitle} onChange={u('jobTitle')} placeholder="CEO, CMO, Growth Lead..." />
        <div className="md:col-span-2">
          <InputField label="Credenciales / Bio" value={data.credentials} onChange={u('credentials')} placeholder="Experiencia profesional, logros..." />
        </div>
        <div className="md:col-span-2">
          <InputField label="Areas de Expertise (separadas por coma)" value={data.expertiseTags} onChange={u('expertiseTags')} placeholder="Growth Marketing, SEO, B2B SaaS, Unit Economics" />
        </div>
        <InputField label="URL del Perfil" value={data.profileUrl} onChange={u('profileUrl')} type="url" placeholder="https://growth4u.io/team/..." />
        <InputField label="LinkedIn" value={data.linkedin} onChange={u('linkedin')} placeholder="https://linkedin.com/in/..." />
        <InputField label="Twitter" value={data.twitter} onChange={u('twitter')} placeholder="https://twitter.com/..." />
        <InputField label="YouTube" value={data.youtube} onChange={u('youtube')} placeholder="https://youtube.com/@..." />
        <InputField label="Instagram" value={data.instagram} onChange={u('instagram')} placeholder="https://instagram.com/..." />
      </div>

      <SchemaPreview json={schema} label="Person" />
    </div>
  );
}

// ===== Main Tab =====
export default function SchemaTab() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-5 h-5 text-[#6351d5]" />
          <h2 className="text-xl font-bold text-[#032149]">JSON-LD Schema Generator</h2>
        </div>
        <p className="text-slate-400 text-sm">
          Genera datos estructurados para que los motores de IA entiendan y citen tu contenido correctamente.
          Copia el JSON-LD generado y pegalo en el {'<head>'} de tus paginas.
        </p>
      </div>

      <OrganizationSchema />
      <ArticleSchema />
      <FAQSchema />
      <PersonSchema />
    </div>
  );
}
