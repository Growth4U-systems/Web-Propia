import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Globe,
  BookOpen,
  Share2,
  Server,
  Code2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  FileText,
  Hash,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Facebook,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase-client';
import type { OwnMediaResult } from './types';
import { DATA_PATH } from './types';
import { ScoreGauge, LoadingSpinner, ErrorBanner, SectionHeader, MetricCard } from './shared';

const socialPlatforms = [
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { key: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'bg-black' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-600' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { key: 'tiktok', label: 'TikTok', icon: Globe, color: 'bg-slate-800' },
];

const criticalSchemas = ['Organization', 'Article', 'FAQPage', 'Person', 'HowTo'];

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  sporadic: 'Esporadica',
  inactive: 'Inactiva',
  none: 'Sin blog',
};

export default function OwnMediaTab() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownMedia, setOwnMedia] = useState<OwnMediaResult | null>(null);

  useEffect(() => {
    getDoc(doc(db, DATA_PATH, 'site_data', 'latest_own_media'))
      .then(snap => { if (snap.exists()) setOwnMedia(snap.data() as OwnMediaResult); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/own-media-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://growth4u.io' }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setOwnMedia(data);
      await setDoc(doc(db, DATA_PATH, 'site_data', 'latest_own_media'), data).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Error al escanear Own Media');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner text="Cargando datos..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#032149]">Own Media Scanner</h2>
          <p className="text-slate-400 text-sm mt-1">Analiza tu presencia digital propia: blog, redes, tech stack y schemas</p>
        </div>
        <button
          onClick={runScan}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6351d5] hover:bg-[#5242b8] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Escaneando...' : 'Escanear Own Media'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner text="Escaneando presencia digital..." />}

      {ownMedia && !loading && (
        <>
          {/* Score Gauges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreGauge label="Overall" score={ownMedia.scores.overallScore} />
            <ScoreGauge label="Contenido" score={ownMedia.scores.contentScore} />
            <ScoreGauge label="Social" score={ownMedia.scores.socialScore} />
            <ScoreGauge label="Tecnico" score={ownMedia.scores.technicalScore} />
          </div>

          {/* Blog Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#6351d5]" />
              <h3 className="text-lg font-bold text-[#032149]">Blog</h3>
              {ownMedia.blog.hasBlog ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            {ownMedia.blog.hasBlog ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard label="Posts" value={ownMedia.blog.postCount} icon={<FileText className="w-4 h-4 text-[#6351d5]" />} />
                  <MetricCard
                    label="Ultimo Post"
                    value={ownMedia.blog.lastPostDate ? new Date(ownMedia.blog.lastPostDate).toLocaleDateString('es-ES') : '—'}
                    icon={<Calendar className="w-4 h-4 text-slate-400" />}
                  />
                  <MetricCard label="Palabras Promedio" value={ownMedia.blog.avgWordCount} icon={<Hash className="w-4 h-4 text-slate-400" />} />
                  <MetricCard label="Frecuencia" value={frequencyLabels[ownMedia.blog.postingFrequency]} icon={<RefreshCw className="w-4 h-4 text-slate-400" />} />
                </div>

                {ownMedia.blog.categories.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-500 mb-2">Categorias</p>
                    <div className="flex flex-wrap gap-2">
                      {ownMedia.blog.categories.map((cat, i) => (
                        <span key={i} className="text-xs bg-[#6351d5]/10 text-[#6351d5] px-2 py-1 rounded">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}

                {ownMedia.blog.samplePosts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Posts recientes (top 10)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Titulo</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Palabras</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ownMedia.blog.samplePosts.slice(0, 10).map((post, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-[#032149]">
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#6351d5] flex items-center gap-1">
                                  {post.title} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-500">{new Date(post.date).toLocaleDateString('es-ES')}</td>
                              <td className="px-4 py-2 text-sm text-slate-500 text-right">{post.wordCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">No se detecto un blog. Tener un blog es fundamental para SEO y GEO.</p>
            )}
          </div>

          {/* Social Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-5 h-5 text-[#6351d5]" />
              <h3 className="text-lg font-bold text-[#032149]">Redes Sociales</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {socialPlatforms.map(({ key, label, icon: Icon, color }) => {
                const url = ownMedia.social[key];
                const found = !!url;
                return (
                  <div key={key} className={`flex items-center gap-3 p-4 rounded-xl border ${found ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${found ? color : 'bg-slate-300'}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${found ? 'text-[#032149]' : 'text-slate-400'}`}>{label}</p>
                      {found ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6351d5] hover:underline truncate block">
                          Conectado
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">No encontrado</p>
                      )}
                    </div>
                    {found ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-slate-300" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tech Stack Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-[#6351d5]" />
              <h3 className="text-lg font-bold text-[#032149]">Tech Stack</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'CMS', value: ownMedia.techStack.cms },
                { label: 'Framework', value: ownMedia.techStack.framework },
                { label: 'Hosting', value: ownMedia.techStack.hosting },
                { label: 'CDN', value: ownMedia.techStack.cdn },
                { label: 'Analytics', value: ownMedia.techStack.analytics.join(', ') || null },
                { label: 'Tag Manager', value: ownMedia.techStack.tagManager },
              ].map((item) => (
                <div key={item.label} className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                  <p className={`text-sm font-medium ${item.value ? 'text-[#032149]' : 'text-slate-300'}`}>
                    {item.value || 'No detectado'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Schema Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-5 h-5 text-[#6351d5]" />
              <h3 className="text-lg font-bold text-[#032149]">Schema / JSON-LD</h3>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-2">Tipos criticos para GEO:</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {criticalSchemas.map((schema) => {
                  const found = ownMedia.schemaTypes.includes(schema);
                  return (
                    <div key={schema} className={`flex items-center gap-2 p-3 rounded-lg border ${found ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      {found ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className={`text-sm font-medium ${found ? 'text-green-700' : 'text-red-700'}`}>{schema}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {ownMedia.schemaTypes.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Todos los tipos detectados:</p>
                <div className="flex flex-wrap gap-2">
                  {ownMedia.schemaTypes.map((type, i) => (
                    <span key={i} className="text-xs bg-[#6351d5]/10 text-[#6351d5] px-2 py-1 rounded">{type}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {(() => {
            const gaps: string[] = [];
            const missingSocial = socialPlatforms.filter(p => !ownMedia.social[p.key]);
            if (missingSocial.length > 0) gaps.push(`Crea perfiles en: ${missingSocial.map(p => p.label).join(', ')}`);
            const missingSchemas = criticalSchemas.filter(s => !ownMedia.schemaTypes.includes(s));
            if (missingSchemas.length > 0) gaps.push(`Agrega schemas JSON-LD: ${missingSchemas.join(', ')}`);
            if (!ownMedia.blog.hasBlog) gaps.push('Crea un blog con contenido regular optimizado para GEO');
            else if (ownMedia.blog.postingFrequency === 'inactive' || ownMedia.blog.postingFrequency === 'sporadic') gaps.push('Aumenta la frecuencia de publicacion del blog');
            if (ownMedia.blog.avgWordCount < 800) gaps.push('Aumenta la longitud promedio de los posts a 800+ palabras');
            if (!ownMedia.techStack.analytics.length) gaps.push('Implementa analytics (Google Analytics 4)');

            if (gaps.length === 0) return null;

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <SectionHeader title="Recomendaciones" subtitle="Basadas en las brechas detectadas" />
                <ul className="space-y-2">
                  {gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-500 mt-0.5">&#x2022;</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
