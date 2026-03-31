import { useState } from 'react';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);
  const [caption, setCaption] = useState('');

  const blogUrl = customUrl || selectedUrl;

  const generateScript = async () => {
    if (!blogUrl && !selectedUrl) return;
    setGenerating(true);
    setPublishResult(null);
    try {
      // Find the selected post to send content directly (avoids Netlify self-fetch issues)
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
      // Auto-generate caption from scenes
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

  const copyVoiceoverScript = () => {
    if (!project) return;
    const pythonScenes = project.scenes.map(s => `    "${s.voiceover}",`).join('\n');
    const script = `SCENES = [\n${pythonScenes}\n]`;
    navigator.clipboard.writeText(script);
    setCopied('script');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyClaudePrompt = () => {
    if (!project) return;
    const scenesText = project.scenes.map((s, i) =>
      `${i + 1}. [${s.type.toUpperCase()}] ${s.title}\n   Voz: "${s.voiceover}"\n   Visual: ${s.visualNotes}`
    ).join('\n\n');
    const prompt = `/video\n\nBlog: ${project.blogUrl}\nTítulo: ${project.blogTitle}\n\nEscenas:\n${scenesText}`;
    navigator.clipboard.writeText(prompt);
    setCopied('prompt');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setUploadedVideoUrl(null);
    setPublishResult(null);
  };

  const uploadToCloudinary = async () => {
    if (!videoFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', videoFile);
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

  return (
    <div className="space-y-6">
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

          {/* Export buttons */}
          <div className="flex gap-2 mt-4">
            <button onClick={copyVoiceoverScript} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
              {copied === 'script' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              SCENES[]
            </button>
            <button onClick={copyClaudePrompt} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
              {copied === 'prompt' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              Prompt /video
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Upload & Publish */}
      {project && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-[#032149] mb-4">
            3. Subir video y publicar en {platform === 'instagram' ? 'Instagram Reels' : 'LinkedIn'}
          </h3>

          {/* Video upload */}
          <div className="mb-4">
            {!videoPreviewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#0faec1] hover:bg-[#0faec1]/5 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">Subir video renderizado (.mp4)</span>
                <span className="text-xs text-slate-400 mt-1">Renderizado con /video en Claude Code</span>
                <input type="file" accept="video/mp4,video/*" onChange={handleVideoSelect} className="hidden" />
              </label>
            ) : (
              <div className="relative">
                <video src={videoPreviewUrl} controls className="w-full max-h-[400px] rounded-xl bg-black" />
                <button
                  onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); setUploadedVideoUrl(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {!uploadedVideoUrl && (
                  <button
                    onClick={uploadToCloudinary}
                    disabled={uploading}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#0faec1] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#0a9aab] disabled:opacity-50 transition-colors"
                  >
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo a Cloudinary...</> : <><Upload className="w-4 h-4" /> Subir video</>}
                  </button>
                )}
                {uploadedVideoUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4" />
                    Video subido a Cloudinary
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
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
