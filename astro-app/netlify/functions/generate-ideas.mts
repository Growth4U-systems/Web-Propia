import type { Context } from "@netlify/functions";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ---- Firebase REST helpers ----

async function fetchCollection(name: string, pageSize = 50): Promise<any[]> {
  try {
    const res = await fetch(`${FIREBASE_BASE}/${name}?pageSize=${pageSize}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.documents || [];
  } catch { return []; }
}

function strVal(doc: any, field: string): string {
  return doc?.fields?.[field]?.stringValue || '';
}

function arrVal(doc: any, field: string): string[] {
  return (doc?.fields?.[field]?.arrayValue?.values || []).map((v: any) => v.stringValue || '');
}

function boolVal(doc: any, field: string): boolean {
  return doc?.fields?.[field]?.booleanValue !== false;
}

// ---- Fetch source data ----

async function fetchXData() {
  const [creators, replies, posts] = await Promise.all([
    fetchCollection('x_creators', 100),
    fetchCollection('x_replies', 50),
    fetchCollection('x_posts', 30),
  ]);
  const activeCreators = creators.filter(d => boolVal(d, 'active')).map(d => ({
    handle: strVal(d, 'handle'),
    category: strVal(d, 'category'),
  }));
  const recentReplies = replies.slice(0, 30).map(d => ({
    handle: strVal(d, 'handle'),
    snippet: strVal(d, 'tweetSnippet').slice(0, 200),
    url: strVal(d, 'tweetUrl'),
  }));
  const recentPosts = posts.slice(0, 20).map(d => ({
    topic: strVal(d, 'topic'),
    angle: strVal(d, 'angle'),
    format: strVal(d, 'format'),
  }));
  return { creators: activeCreators, replies: recentReplies, posts: recentPosts };
}

async function fetchLIData() {
  const [creators, comments, knowledge] = await Promise.all([
    fetchCollection('li_creators', 100),
    fetchCollection('li_comments', 50),
    fetchCollection('li_knowledge', 20),
  ]);
  const activeCreators = creators.filter(d => boolVal(d, 'active')).map(d => ({
    name: strVal(d, 'name'),
    category: strVal(d, 'category'),
  }));
  const recentComments = comments.slice(0, 30).map(d => ({
    profile: strVal(d, 'profileName'),
    postSnippet: strVal(d, 'postSnippet').slice(0, 200),
    url: strVal(d, 'postUrl'),
  }));
  const knowledgeBases = knowledge.slice(0, 10).map(d => ({
    name: strVal(d, 'name'),
    topics: arrVal(d, 'topics').slice(0, 5),
    opinions: arrVal(d, 'opinions').slice(0, 3),
  }));
  return { creators: activeCreators, comments: recentComments, knowledge: knowledgeBases };
}

async function fetchNews(query: string) {
  try {
    const rss = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const xml = await rss.text();
    const chunks = xml.split('<item>').slice(1, 9);
    return chunks.map(chunk => {
      const titleMatch = chunk.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      const linkMatch = chunk.match(/<link\/?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?/);
      return { title: titleMatch?.[1]?.trim() || '', url: linkMatch?.[1]?.trim() || '' };
    }).filter(item => item.title);
  } catch { return []; }
}

// ---- System prompt ----

const SYSTEM_PROMPT = `Eres el estratega de contenido de Growth4U, agencia de Growth Marketing para empresas tech B2B/B2C en España y LATAM.

Tu trabajo: analizar señales de múltiples fuentes (creadores de X/Twitter, creadores de LinkedIn, noticias del sector) y generar ideas de contenido accionables.

Reglas:
- Genera entre 8 y 12 ideas
- Cada idea debe ser específica y accionable, no genérica
- HIGH priority = temas trending o timely
- MEDIUM = temas evergreen relevantes
- LOW = ideas nice-to-have
- Mezcla formatos y plataformas
- Referencia explícitamente la fuente que inspiró cada idea
- Todo en español
- Los temas deben ser relevantes para founders de startups tech, CMOs, y growth teams
- IMPORTANTE: cada fuente viene con su URL entre [corchetes]. DEBES copiar esa URL exacta en sourceUrl. Si no hay URL, usa "".

Responde SOLO con JSON válido (sin markdown, sin backticks):
[
  {
    "topic": "título conciso de la idea",
    "angle": "ángulo específico / hook",
    "platforms": ["linkedin", "twitter", "instagram", "newsletter", "blog"],
    "format": "post|thread|carousel|article|newsletter-section",
    "priority": "high|medium|low",
    "sourceType": "x_creator|li_creator|news|mixed",
    "sourceInspiration": "descripción breve de qué señal inspiró esta idea",
    "sourceUrl": "URL exacta de la fuente (copiar del input). Obligatorio si la fuente tiene URL."
  }
]`;

// ---- Handler ----

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await req.json();
    const { action } = body;

    // ---- Fetch sources (counts only) ----
    if (action === 'fetch-sources') {
      const [xCreators, liCreators, news] = await Promise.all([
        fetchCollection('x_creators', 100),
        fetchCollection('li_creators', 100),
        fetchNews(body.newsQuery || 'growth marketing B2B startup'),
      ]);
      return new Response(JSON.stringify({
        x: { creators: xCreators.filter(d => boolVal(d, 'active')).length },
        li: { creators: liCreators.filter(d => boolVal(d, 'active')).length },
        news: { articles: news.length },
      }), { headers: CORS_HEADERS });
    }

    // ---- Generate ideas ----
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: CORS_HEADERS });
    }

    const sources = body.sources || { x: true, li: true, news: true };
    const customPrompt = body.customPrompt || '';

    // Fetch news source queries from Firebase
    let newsQueries = ['growth marketing B2B startup fintech'];
    if (sources.news) {
      try {
        const nsRes = await fetch(`${FIREBASE_BASE}/news_sources?pageSize=20`);
        if (nsRes.ok) {
          const nsData = await nsRes.json();
          const active = (nsData?.documents || []).filter((d: any) => d?.fields?.active?.booleanValue !== false);
          if (active.length > 0) {
            newsQueries = active.map((d: any) => d?.fields?.query?.stringValue || '').filter(Boolean);
          }
        }
      } catch {}
    }

    // Fetch all sources in parallel
    const newsPromises = sources.news ? newsQueries.map(q => fetchNews(q).catch(() => [])) : [];
    const [xData, liData, ...newsArrays] = await Promise.all([
      sources.x ? fetchXData().catch(() => null) : Promise.resolve(null),
      sources.li ? fetchLIData().catch(() => null) : Promise.resolve(null),
      ...newsPromises,
    ]);
    const newsData = (newsArrays as any[][]).flat();

    const parts: string[] = [];

    if (xData) {
      parts.push(`## Señales de X/Twitter (${xData.creators.length} creadores activos)\n`);
      if (xData.replies.length > 0) {
        parts.push('Últimas interacciones:\n' + xData.replies.slice(0, 15).map(r =>
          `- @${r.handle}: "${r.snippet}"${r.url ? ` [${r.url}]` : ''}`
        ).join('\n'));
      }
      if (xData.posts.length > 0) {
        parts.push('\nIdeas existentes:\n' + xData.posts.slice(0, 10).map(p =>
          `- [${p.format}] ${p.topic} — ${p.angle}`
        ).join('\n'));
      }
    }

    if (liData) {
      parts.push(`\n## Señales de LinkedIn (${liData.creators.length} creadores activos)\n`);
      if (liData.comments.length > 0) {
        parts.push('Últimos posts de creadores:\n' + liData.comments.slice(0, 15).map(c =>
          `- ${c.profile}: "${c.postSnippet}"${c.url ? ` [${c.url}]` : ''}`
        ).join('\n'));
      }
      if (liData.knowledge.length > 0) {
        parts.push('\nTemas trending en nuestra red:\n' + liData.knowledge.slice(0, 5).map(k =>
          `- ${k.name}: ${k.topics.join(', ')}`
        ).join('\n'));
      }
    }

    if (newsData && newsData.length > 0) {
      parts.push(`\n## Noticias del sector (${newsData.length} artículos)\n`);
      parts.push(newsData.map(n => `- ${n.title}${n.url ? ` [${n.url}]` : ''}`).join('\n'));
    }

    const userPrompt = `Analiza estas señales y genera ideas de contenido:\n\n${parts.join('\n')}\n${customPrompt ? `\nContexto adicional: ${customPrompt}` : ''}\n\nGenera el array JSON de ideas.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        temperature: 0.85,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic error: ${err}` }), { status: 500, headers: CORS_HEADERS });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '[]';

    let ideas;
    try {
      const match = text.match(/\[[\s\S]*\]/);
      ideas = match ? JSON.parse(match[0]) : [];
    } catch {
      return new Response(JSON.stringify({ error: 'Error parsing AI response', raw: text.slice(0, 500) }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ideas }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
};
