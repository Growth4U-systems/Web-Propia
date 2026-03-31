import { useState, useEffect, useRef } from 'react';
import {
  Video,
  Loader2,
  Copy,
  Check,
  Play,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Send,
  AlertCircle,
  Film,
  Download,
} from 'lucide-react';

interface Scene {
  id: number;
  type: 'hook' | 'problem' | 'lies' | 'concept' | 'case' | 'question' | 'cta';
  title: string;
  voiceover: string;
  visualNotes: string;
}

interface VideoProject {
  blogTitle: string;
  blogUrl: string;
  scenes: Scene[];
  generatedAt: string;
}

const SCENE_TYPES: { value: Scene['type']; label: string; color: string }[] = [
  { value: 'hook', label: 'Hook', color: '#ff4d4d' },
  { value: 'problem', label: 'Problema', color: '#f59e0b' },
  { value: 'lies', label: 'Mentiras', color: '#ef4444' },
  { value: 'concept', label: 'Concepto', color: '#0faec1' },
  { value: 'case', label: 'Caso Real', color: '#10b981' },
  { value: 'question', label: 'Pregunta', color: '#8b5cf6' },
  { value: 'cta', label: 'CTA', color: '#032149' },
];

const CLOUDINARY_CLOUD = 'dsc0jsbkz';
const CLOUDINARY_PRESET = 'blog_uploads';
const RENDER_SERVER = 'http://localhost:3001';

interface VideoTabProps {
  blogPosts: Array<{ id: string; title: string; slug: string; content?: string; excerpt?: string }>;
  platform: 'instagram' | 'linkedin';
  onPublish: (videoUrl: string, caption: string) => Promise<void>;
}

export default function VideoTab({ blogPosts, platform, onPublish }: VideoTabProps) {
  const [selectedUrl, setSelectedUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  // Render state
  const [renderStatus, setRenderStatus] = useState<'idle' | 'generating-voiceover' | 'rendering' | 'done' | 'error' | 'server-offline'>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Upload & publish
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);
  const [caption, setCaption] = useState('');

  const blogUrl = customUrl || selectedUrl;

  // Check render server status on mount
  useEffect(() => {
    fetch(`${RENDER_SERVER}/status`).then(() => {
      setRenderStatus('idle');
    }).catch(() => {
      setRenderStatus('server-offline');
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const generateScript = async () => {
    if (!blogUrl && !selectedUrl) return;
    setGenerating(true);
    setPublishResult(null);
    try {
      const selectedPost = selectedUrl
        ? blogPosts.find(p => selectedUrl.includes(p.slug))
        : null;

      const payload = selectedPost?.content
        ? { blogContent: selectedPost.content, blogTitle: selectedPost.title, blogUrl: blogUrl || `https://growth4u.io/blog/${selectedPost.slug}/` }
        : { blogUrl: blogUrl || selectedUrl };

      const res = await fetch('/.netlify/functions/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProject(data);
      const scenesText = data.scenes
        .filter((s: Scene) => s.type !== 'cta')
        .map((s: Scene) => s.title)
        .join(' | ');
      setCaption(`${data.blogTitle}\n\n${scenesText}\n\n#growth4u #growthmarketing #tech #ia #marketing`);
    } catch (err: any) {
      alert('Error generando guion: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateScene = (id: number, updates: Partial<Scene>) => {
    if (!project) return;
    setProject({
      ...project,
      scenes: project.scenes.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const removeScene = (id: number) => {
    if (!project) return;
    setProject({
      ...project,
      scenes: project.scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, id: i + 1 })),
    });
  };

  const addScene = () => {
    if (!project) return;
    const newId = project.scenes.length + 1;
    setProject({
      ...project,
      scenes: [...project.scenes, { id: newId, type: 'concept', title: 'Nueva escena', voiceover: '', visualNotes: '' }],
    });
    setEditingScene(newId);
  };

  // ─── Render Video ──────────────────────────────────────────────────────

  const startRender = async () => {
    if (!project) return;
    setRenderStatus('generating-voiceover');
    setRenderProgress(0);
    setRenderError('');
    setVideoPreviewUrl(null);
    setUploadedVideoUrl(null);

    try {
      const res = await fetch(`${RENDER_SERVER}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: project.scenes,
          blogTitle: project.blogTitle,
          blogUrl: project.blogUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      // Start polling for status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${RENDER_SERVER}/status`);
          const status = await statusRes.json();
          setRenderStatus(status.status);
          setRenderProgress(status.progress || 0);

          if (status.status === 'done') {
            if (pollRef.current) clearInterval(pollRef.current);
            setVideoPreviewUrl(`${RENDER_SERVER}/video/latest?t=${Date.now()}`);
          } else if (status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            setRenderError(status.error || 'Error desconocido');
          }
        } catch {
          // Server might be busy, keep polling
        }
      }, 2000);
    } catch (err: any) {
      setRenderStatus('error');
      setRenderError(err.message);
    }
  };

  const uploadRenderedVideo = async () => {
    setUploading(true);
    try {
      // Download video from local server
      const videoRes = await fetch(`${RENDER_SERVER}/video/latest`);
      if (!videoRes.ok) throw new Error('No se pudo descargar el video');
      const blob = await videoRes.blob();
      const file = new File([blob], 'video.mp4', { type: 'video/mp4' });

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('resource_type', 'video');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      setUploadedVideoUrl(data.secure_url);
    } catch (err: any) {
      alert('Error subiendo video: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!uploadedVideoUrl || !caption) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      await onPublish(uploadedVideoUrl, caption);
      setPublishResult({ success: true, message: `Publicado en ${platform === 'instagram' ? 'Instagram Reels' : 'LinkedIn'}` });
    } catch (err: any) {
      setPublishResult({ success: false, message: err.message });
    } finally {
      setPublishing(false);
    }
  };

  const totalDuration = project ? project.scenes.reduce((acc, s) => {
    const words = s.voiceover.split(' ').length;
    return acc + Math.max(words / 2.5, 2);
  }, 0) : 0;

  const isRendering = renderStatus === 'generating-voiceover' || renderStatus === 'rendering';

  return (
    <div className="space-y-6">
      {/* Server status banner */}
      {renderStatus === 'server-offline' && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Servidor de render offline. Ejecuta <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">cd growth4u-video && npm run server</code> para activarlo.</span>
        </div>
      )}

      {/* Step 1: Select blog */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-[#0faec1]" />
          <h3 className="text-base font-semibold text-[#032149]">1. Generar guion desde blog</h3>
        </div>

        <div className="space-y-3">
          <select
            value={selectedUrl}
            onChange={(e) => { setSelectedUrl(e.target.value); setCustomUrl(''); }}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0faec1] focus:border-[#0faec1] outline-none"
          >
            <option value="">— Seleccionar post —</option>
            {blogPosts.map((post) => (
              <option key={post.id} value={`https://growth4u.io/blog/${post.slug}/`}>
                {post.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">o URL</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <input
            type="url"
            value={customUrl}
            onChange={(e) => { setCustomUrl(e.target.value); setSelectedUrl(''); }}
            placeholder="https://growth4u.io/blog/..."
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0faec1] focus:border-[#0faec1] outline-none"
          />

          <button
            onClick={generateScript}
            disabled={!blogUrl || generating}
            className="w-full flex items-center justify-center gap-2 bg-[#032149] text-white rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-[#032149]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</>
            ) : (
              <><Play className="w-4 h-4" /> Generar Guion</>
            )}
          </button>
        </div>
      </div>

      {/* Step 2: Edit scenes */}
      {project && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#032149]">2. Escenas ({project.scenes.length}) · ~{Math.round(totalDuration)}s</h3>
              <p className="text-xs text-slate-400 mt-0.5">{project.blogTitle}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addScene} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0faec1] border border-[#0faec1]/30 rounded-lg hover:bg-[#0faec1]/5">
                <Plus className="w-3 h-3" /> Escena
              </button>
              <button onClick={generateScript} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RefreshCw className="w-3 h-3" /> Regenerar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {project.scenes.map((scene) => {
              const typeInfo = SCENE_TYPES.find(t => t.value === scene.type);
              const isEditing = editingScene === scene.id;

              return (
                <div key={scene.id} className="border border-slate-200 rounded-xl overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: typeInfo?.color || '#94a3b8' }}>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (typeInfo?.color || '#94a3b8') + '15', color: typeInfo?.color }}>
                          {scene.id}
                        </span>
                        {isEditing ? (
                          <select value={scene.type} onChange={(e) => updateScene(scene.id, { type: e.target.value as Scene['type'] })} className="text-xs border border-slate-300 rounded px-2 py-0.5">
                            {SCENE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 uppercase">{typeInfo?.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setEditingScene(isEditing ? null : scene.id)} className="p-1 text-slate-400 hover:text-[#0faec1]">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {project.scenes.length > 1 && (
                          <button onClick={() => removeScene(scene.id)} className="p-1 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <input value={scene.title} onChange={(e) => updateScene(scene.id, { title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0faec1] outline-none" placeholder="Titulo visual" />
                        <textarea value={scene.voiceover} onChange={(e) => updateScene(scene.id, { voiceover: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0faec1] outline-none resize-none" placeholder="Texto voz en off" />
                        <input value={scene.visualNotes} onChange={(e) => updateScene(scene.id, { visualNotes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0faec1] outline-none" placeholder="Notas visuales" />
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-sm font-medium text-[#032149]">{scene.title}</p>
                        <p className="text-xs text-slate-500 italic mt-0.5">"{scene.voiceover}"</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Render button */}
          <div className="mt-4">
            <button
              onClick={startRender}
              disabled={isRendering || renderStatus === 'server-offline'}
              className="w-full flex items-center justify-center gap-2 bg-[#0faec1] text-white rounded-lg px-6 py-3 text-sm font-bold hover:bg-[#0a9aab] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRendering ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {renderStatus === 'generating-voiceover' ? 'Generando voz...' : `Renderizando ${renderProgress}%`}</>
              ) : (
                <><Film className="w-4 h-4" /> Renderizar Video</>
              )}
            </button>

            {/* Progress bar */}
            {isRendering && (
              <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0faec1] transition-all duration-500 rounded-full"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            )}

            {renderStatus === 'error' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                {renderError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview & Publish */}
      {videoPreviewUrl && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-[#032149] mb-4">
            3. Preview y publicar en {platform === 'instagram' ? 'Instagram Reels' : 'LinkedIn'}
          </h3>

          {/* Video preview */}
          <div className="mb-4">
            <video src={videoPreviewUrl} controls className="w-full max-h-[400px] rounded-xl bg-black" />

            <div className="flex gap-2 mt-3">
              <a
                href={`${RENDER_SERVER}/video/download`}
                download="video.mp4"
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar
              </a>
              <button
                onClick={uploadRenderedVideo}
                disabled={uploading || !!uploadedVideoUrl}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0faec1] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#0a9aab] disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                ) : uploadedVideoUrl ? (
                  <><Check className="w-4 h-4" /> Subido</>
                ) : (
                  <><Upload className="w-4 h-4" /> Subir a Cloudinary</>
                )}
              </button>
            </div>
          </div>

          {/* Caption & Publish */}
          {uploadedVideoUrl && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0faec1] outline-none resize-none"
                />
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing || !caption}
                className="w-full flex items-center justify-center gap-2 bg-[#032149] text-white rounded-lg px-6 py-3 text-sm font-bold hover:bg-[#032149]/90 disabled:opacity-50 transition-colors"
              >
                {publishing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Publicar {platform === 'instagram' ? 'como Reel' : 'en LinkedIn'}</>
                )}
              </button>

              {publishResult && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${
                  publishResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {publishResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {publishResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
