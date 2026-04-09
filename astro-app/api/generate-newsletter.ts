export const config = { runtime: 'edge' };

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `Eres el redactor de "Growth Signal", la newsletter semanal de Growth4U — agencia de Growth Marketing para empresas tech B2B/B2C en España y LATAM.

Tu trabajo es generar el contenido completo de la newsletter en JSON estructurado.

Secciones:
1. HOOK — Frase impactante con dato real que enganche (1-2 frases). Usa <span> para destacar 1-2 fragmentos clave.
2. ARTÍCULO DESTACADO — Basado en los blogs seleccionados. Resumen ejecutivo con datos, stats (3 métricas), y por qué importa.
3. IA APLICADA A GROWTH — Herramienta o avance de IA relevante para growth/marketing. Nombre, descripción y veredicto práctico.
4. TÁCTICA EJECUTABLE — Framework práctico con 3 pasos numerados y un resultado real con número concreto.
5. RECURSOS CURADOS — 3-4 recursos (artículos, herramientas, podcasts) con título, descripción y emoji.
6. NOTA PERSONAL — Reflexión de Philippe (CEO Growth4U, uruguayo en España) en primera persona. Cercano, honesto, con insight de la semana. 2-3 párrafos.

Reglas:
- Todo en español
- Tono profesional pero cercano, sin ser corporativo ni sonar a IA
- Datos concretos y números siempre que puedas
- Los stats deben ser 3 métricas clave con value + label
- La táctica debe ser implementable esta semana
- La nota personal debe sentirse humana y auténtica
- Si hay noticias recientes del sector, incorpóralas naturalmente

Responde SOLO con JSON válido (sin markdown, sin backticks):
{
  "hook": "texto del hook con <span>palabras destacadas</span>",
  "article": {
    "headline": "título del artículo destacado",
    "body": "2-3 párrafos con <strong>negritas</strong> para datos clave",
    "keyInsight": "dato clave en 1-2 frases",
    "stats": [
      { "value": "€340", "label": "CAC antes" },
      { "value": "€143", "label": "CAC después" },
      { "value": "58%", "label": "Reducción" }
    ],
    "whatWeDid": "párrafo describiendo qué se hizo"
  },
  "aiTool": {
    "name": "nombre herramienta",
    "type": "categoría",
    "description": "qué hace y cómo usarla para growth",
    "verdict": "veredicto práctico en 1 frase"
  },
  "tactic": {
    "title": "nombre del framework/método",
    "intro": "1 frase de contexto",
    "steps": [
      { "title": "título paso", "description": "descripción" },
      { "title": "título paso", "description": "descripción" },
      { "title": "título paso", "description": "descripción" }
    ],
    "result": "resultado real con número concreto"
  },
  "resources": [
    { "emoji": "📄", "colorClass": "blue", "title": "título", "description": "descripción corta", "url": "" },
    { "emoji": "🛠️", "colorClass": "purple", "title": "título", "description": "desc", "url": "" },
    { "emoji": "🎙️", "colorClass": "teal", "title": "título", "description": "desc", "url": "" }
  ],
  "personalNote": "nota personal de Philippe en 2-3 párrafos"
}`;

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // ---- Scrape news from Google News RSS ----
    if (action === 'scrape-news') {
      const q = body.query || 'growth marketing B2B startup';
      try {
        const rss = await fetch(
          `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es&gl=ES&ceid=ES:es`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const xml = await rss.text();
        const chunks = xml.split('<item>').slice(1, 9);
        const items = chunks.map(chunk => {
          const titleMatch = chunk.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
          const linkMatch = chunk.match(/<link\/?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?/);
          const pubMatch = chunk.match(/<pubDate>(.*?)<\/pubDate>/);
          return {
            title: titleMatch?.[1]?.trim() || '',
            url: linkMatch?.[1]?.trim() || '',
            date: pubMatch?.[1]?.trim() || '',
          };
        }).filter(item => item.title);
        return Response.json({ items }, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch {
        return Response.json({ items: [], error: 'Error fetching news' }, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
    }

    // ---- Generate newsletter content ----
    const { blogs, prompt, editionNumber, newsItems } = body;

    const blogContext = (blogs || []).map((b: any, i: number) =>
      `Blog ${i + 1}: "${b.title}"\nExcerpt: ${b.excerpt}\nImagen: ${b.image || 'N/A'}\nContenido: ${(b.content || '').slice(0, 2000)}`
    ).join('\n\n');

    const newsContext = (newsItems || []).length > 0
      ? `\nNoticias recientes del sector:\n${(newsItems as any[]).map((n: any) => `- ${n.title}${n.url ? ` (${n.url})` : ''}`).join('\n')}`
      : '';

    const userPrompt = `Genera la newsletter Growth Signal edición #${editionNumber || 1}.

${blogContext ? `Blogs seleccionados como base del contenido:\n${blogContext}` : 'No hay blogs seleccionados — genera contenido sobre tendencias actuales de growth marketing B2B.'}
${newsContext}
${prompt ? `\nContexto adicional del editor:\n${prompt}` : ''}

Genera el JSON completo de la newsletter.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.8,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Anthropic error: ${err}` }, { status: 500, headers: CORS_HEADERS });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return Response.json({ error: 'Error parsing AI response', raw: text.slice(0, 500) }, { status: 500, headers: CORS_HEADERS });
    }

    return Response.json({ content: parsed }, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}
