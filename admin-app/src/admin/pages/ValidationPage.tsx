import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileCode,
  Globe,
  Bot,
  Search
} from 'lucide-react';

interface ValidationResult {
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
}

export default function ValidationPage() {
  const [urlToValidate, setUrlToValidate] = useState('https://growth4u.io');
  const [isValidating, setIsValidating] = useState(false);
  const [schemaResult, setSchemaResult] = useState<ValidationResult | null>(null);

  const validationTools = [
    {
      name: 'Google Search Console',
      description: 'Verificar errores de indexación, cobertura y Core Web Vitals',
      url: 'https://search.google.com/search-console',
      icon: Search,
      category: 'SEO',
      actions: [
        'Revisar "Páginas" → errores de indexación',
        'Verificar "Experiencia" → Core Web Vitals',
        'Comprobar "Sitemaps" → procesado correctamente'
      ]
    },
    {
      name: 'Bing Webmaster Tools',
      description: 'Importante para ChatGPT (usa Bing). Verificar sitemap y rastreo',
      url: 'https://www.bing.com/webmasters',
      icon: Bot,
      category: 'GEO',
      actions: [
        'Verificar sitemap procesado',
        'Revisar errores de rastreo',
        'Comprobar URLs indexadas'
      ]
    },
    {
      name: 'Schema Markup Validator',
      description: 'Validar datos estructurados (Article, Organization) para que IA entienda tu contenido',
      url: 'https://validator.schema.org/',
      icon: FileCode,
      category: 'GEO',
      actions: [
        'Pegar URL del último post',
        'Verificar entidad "Article" detectada',
        'Verificar entidad "Organization" detectada'
      ]
    },
    {
      name: 'Rich Results Test',
      description: 'Ver cómo aparecerá tu página en resultados de Google',
      url: 'https://search.google.com/test/rich-results',
      icon: Globe,
      category: 'SEO',
      actions: [
        'Probar URL de post de blog',
        'Verificar que aparece como "Article"',
        'Sin errores ni advertencias'
      ]
    }
  ];

  const manualChecks = [
    {
      title: 'Robots.txt accesible',
      test: `Visita: ${urlToValidate}/robots.txt`,
      expected: 'Debe mostrar "User-agent: *" y "Allow: /"'
    },
    {
      title: 'Sitemap.xml accesible',
      test: `Visita: ${urlToValidate}/sitemap.xml`,
      expected: 'Debe listar todas las URLs del blog'
    },
    {
      title: 'Prueba site: en Google',
      test: `Busca: site:growth4u.io`,
      expected: 'Deben aparecer todas las páginas indexadas'
    },
    {
      title: 'Snippet correcto',
      test: `Busca: site:growth4u.io "título de tu post"`,
      expected: 'El snippet debe mostrar title y description correctos'
    }
  ];

  const geoTests = [
    {
      platform: 'Perplexity.ai',
      prompt: 'Resume el artículo sobre [Tema] de Growth4U',
      validation: 'Si menciona datos de tus tablas y citas, el Markdown funciona'
    },
    {
      platform: 'ChatGPT',
      prompt: '¿Qué servicios ofrece Growth4U?',
      validation: 'Si responde correctamente, tu contenido "Sobre Nosotros" está bien estructurado'
    },
    {
      platform: 'Perplexity.ai',
      prompt: '¿Cuáles son las mejores agencias de growth para empresas tech en España?',
      validation: 'Verificar si Growth4U aparece en la lista'
    }
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;
    return <div className="w-5 h-5 rounded-full border-2 border-slate-500" />;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#032149]">Validación Técnica</h1>
        <p className="text-slate-400 mt-2">Fase A: ¿Me pueden leer? - Verificar Schema, robots.txt y estado de indexación</p>
      </div>

      {/* URL Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          URL a validar
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={urlToValidate}
            onChange={(e) => setUrlToValidate(e.target.value)}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-lg text-[#032149] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6351d5]"
            placeholder="https://growth4u.io/blog/tu-post"
          />
        </div>
      </div>

      {/* Validation Tools */}
      <div>
        <h2 className="text-xl font-bold text-[#032149] mb-4">Herramientas de Validación</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {validationTools.map((tool) => (
            <div key={tool.name} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tool.category === 'SEO' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                    <tool.icon className={`w-5 h-5 ${tool.category === 'SEO' ? 'text-blue-400' : 'text-purple-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#032149]">{tool.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${tool.category === 'SEO' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {tool.category}
                    </span>
                  </div>
                </div>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>
              </div>

              <p className="text-slate-400 text-sm mb-4">{tool.description}</p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase">Acciones:</p>
                {tool.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Checks */}
      <div>
        <h2 className="text-xl font-bold text-[#032149] mb-4">Verificaciones Manuales</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Check</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Cómo probar</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Resultado esperado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {manualChecks.map((check, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-[#032149] font-medium">{check.title}</td>
                  <td className="px-6 py-4 text-slate-300 text-sm font-mono">{check.test}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{check.expected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GEO Content Validation */}
      <div>
        <h2 className="text-xl font-bold text-[#032149] mb-2">Validación de Contenido GEO</h2>
        <p className="text-slate-400 mb-4">Fase B: ¿Me entienden? - Probar que la IA interpreta bien tu contenido</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {geoTests.map((test, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-[#032149]">{test.platform}</span>
              </div>

              <div className="bg-slate-100 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-300 italic">"{test.prompt}"</p>
              </div>

              <p className="text-xs text-slate-400">
                <span className="text-green-400 font-medium">✓ Validación:</span> {test.validation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#032149] mb-4">Accesos Rápidos</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`${urlToValidate}/robots.txt`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-[#032149] rounded-lg text-sm transition-colors"
          >
            Ver robots.txt
          </a>
          <a
            href={`${urlToValidate}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-[#032149] rounded-lg text-sm transition-colors"
          >
            Ver sitemap.xml
          </a>
          <a
            href={`https://validator.schema.org/#url=${encodeURIComponent(urlToValidate)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-[#032149] rounded-lg text-sm transition-colors"
          >
            Validar Schema
          </a>
          <a
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(urlToValidate)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            Rich Results Test
          </a>
        </div>
      </div>
    </div>
  );
}
