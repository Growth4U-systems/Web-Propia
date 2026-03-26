import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  FileText,
  BookOpen,
  Trophy,
  Download,
  MessageSquare,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase-client';

const APP_ID = 'growth4u-public-app';

interface ContentCounts {
  blogs: number;
  articulos: number;
  casos: number;
  leadMagnets: number;
  feedback: number;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<ContentCounts>({ blogs: 0, articulos: 0, casos: 0, leadMagnets: 0, feedback: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [blogsSnap, artSnap, casosSnap, lmSnap, fbSnap] = await Promise.all([
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'blog_posts')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'articles')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'case_studies')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'lead_magnets')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedback')),
      ]);
      setCounts({
        blogs: blogsSnap.size,
        articulos: artSnap.size,
        casos: casosSnap.size,
        leadMagnets: lmSnap.size,
        feedback: fbSnap.size,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Dashboard</h1>
        <p className="text-slate-400 mt-2">Resumen de contenido y herramientas</p>
      </div>

      {/* Content Counts */}
      <div>
        <h2 className="text-lg font-bold text-[#032149] mb-4">Contenido publicado</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link to="/admin/blog/" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#3ecda5]/40 transition-colors">
            <FileText className="w-6 h-6 text-[#3ecda5] mb-3" />
            <p className="text-3xl font-bold text-[#032149]">{counts.blogs}</p>
            <p className="text-sm text-slate-500 mt-1">Blog posts</p>
          </Link>
          <Link to="/admin/articulos/" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#3ecda5]/40 transition-colors">
            <BookOpen className="w-6 h-6 text-[#45b6f7] mb-3" />
            <p className="text-3xl font-bold text-[#032149]">{counts.articulos}</p>
            <p className="text-sm text-slate-500 mt-1">Artículos</p>
          </Link>
          <Link to="/admin/casos-de-exito/" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#3ecda5]/40 transition-colors">
            <Trophy className="w-6 h-6 text-[#0faec1] mb-3" />
            <p className="text-3xl font-bold text-[#032149]">{counts.casos}</p>
            <p className="text-sm text-slate-500 mt-1">Casos de éxito</p>
          </Link>
          <Link to="/admin/lead-magnets/" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#3ecda5]/40 transition-colors">
            <Download className="w-6 h-6 text-emerald-500 mb-3" />
            <p className="text-3xl font-bold text-[#032149]">{counts.leadMagnets}</p>
            <p className="text-sm text-slate-500 mt-1">Lead magnets</p>
          </Link>
          <Link to="/admin/feedback/" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#3ecda5]/40 transition-colors">
            <MessageSquare className="w-6 h-6 text-orange-400 mb-3" />
            <p className="text-3xl font-bold text-[#032149]">{counts.feedback}</p>
            <p className="text-sm text-slate-500 mt-1">Feedback</p>
          </Link>
        </div>
      </div>

      {/* Validation Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#032149] mb-4">Estado de Validación</h2>
        <div className="space-y-3">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-[#032149]">Google Search Console</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://www.bing.com/webmasters"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-[#032149]">Bing Webmaster Tools</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://validator.schema.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-[#032149]">Schema Validator</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        </div>
        <Link
          to="/admin/seo/"
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 text-[#032149] rounded-lg transition-colors"
        >
          Ver Métricas SEO & GEO <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
