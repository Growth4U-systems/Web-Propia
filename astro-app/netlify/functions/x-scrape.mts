import type { Context } from "@netlify/functions";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;
const ACTOR_ID = 'apidojo~tweet-scraper';

// Hardcoded fallback creators (used when Firebase collection is empty)
const FALLBACK_HANDLES = [
  'coreyhainesco', 'askokara', 'DeRonin_', 'ai_vaidehi', 'dotta',
  'kanikabk', 'indexsy', 'presswhizz', 'everestchris6', 'oliverhenry',
  'jacobsklug', 'bcherny', 'moltbook', 'Rasmic', 'remotion',
  '_guillecasaus', 'oliviscusai', 'prukalpa', 'gregisenberg',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Knowledge base for reply generation
const G4U_KNOWLEDGE = `
GROWTH4U — Consultora de Growth Marketing para startups y scale-ups tech B2B/B2C.

TEMAS CLAVE (úsalos como contexto, no como pitch):
- CAC sostenible: unit economics, payback periods, LTV/CAC
- Mesetas de crecimiento: diagnosticar estancamiento, pivotes de canal
- Sistemas de growth: frameworks de experimentación, north star metrics
- GEO (Generative Engine Optimization): optimizar para LLMs, no solo SEO
- Growth para fintechs: compliance como ventaja, trust loops
- Signal-based outreach: detectar intención antes de contactar
- Attribution multi-touch: medir ROI real, dashboards accionables
`.trim();

// Fetch X creators from Firebase
async function fetchXCreators(): Promise<{ handle: string; category: string; active: boolean }[]> {
  try {
    const res = await fetch(`${FIREBASE_BASE}/x_creators?pageSize=200`);
    if (!res.ok) return [];
    const data = await res.json();
    const docs = data?.documents || [];
    return docs.map((d: any) => ({
      handle: d.fields?.handle?.stringValue || '',
      category: d.fields?.category?.stringValue || '',
      active: d.fields?.active?.booleanValue !== false,
    })).filter((c: any) => c.handle && c.active);
  } catch {
    return [];
  }
}

async function generateReply(authorHandle: string, tweetContent: string, personSlug?: string): Promise<string> {
  // Detect language
  const spanishSignals = (tweetContent.match(/\b(de|en|los|las|del|para|por|que|una?|con|como|pero|más|también|sobre|puede|tiene|hacer|empresa|negocio|crecimiento|marketing)\b/gi) || []).length;
  const englishSignals = (tweetContent.match(/\b(the|is|are|was|were|have|has|been|will|would|could|should|with|from|this|that|they|their|which|about|growth|business|company|marketing|team|product)\b/gi) || []).length;
  const lang = englishSignals > spanishSignals ? 'inglés' : 'español';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Genera un reply para este tweet de @${authorHandle} en X (Twitter):

"""
${tweetContent.slice(0, 800)}
"""

IDIOMA: El tweet está en ${lang}. Tu reply DEBE estar 100% en ${lang}.

${G4U_KNOWLEDGE}

Reglas para replies en X:
- MÁXIMO 280 caracteres (esto es X/Twitter, no LinkedIn)
- Aporta valor real: dato, perspectiva, pregunta inteligente o experiencia
- Si el tema conecta con expertise de Growth4U, incorpóralo como opinión propia — NUNCA como pitch
- Tono directo, informal pero inteligente (estilo X, no LinkedIn)
- NUNCA: "Gran tweet", "Totalmente de acuerdo", "Esto 👆" ni respuestas genéricas
- NUNCA links, URLs, hashtags ni menciones a @growth4u
- NUNCA emojis excesivos (máximo 1 si es natural)
- Empieza directo con el contenido, sin preámbulo
- El objetivo: que el autor te responda (el algoritmo amplifica x150 si responde)

Solo devuelve el reply en ${lang}, nada más.`,
      }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

async function generatePostIdeas(tweets: { handle: string; content: string }[]): Promise<string> {
  const tweetSummaries = tweets.map(t => `@${t.handle}: ${t.content.slice(0, 200)}`).join('\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analiza estos tweets de influencers y genera 5 ideas de posts para la cuenta de Growth4U en X.

TWEETS RECIENTES DE LA RED:
${tweetSummaries}

${G4U_KNOWLEDGE}

Para cada idea genera un JSON en este formato (devuelve un array JSON, sin markdown):
[
  {
    "topic": "tema del post",
    "angle": "ángulo o perspectiva única de Growth4U",
    "format": "tweet | thread | quote",
    "draft": "el draft del tweet (max 280 chars) o el primer tweet del thread",
    "threadSlides": ["slide 2", "slide 3", "..."] // solo si format=thread, max 6 slides
    "inspiration": "@handle del tweet que inspiró esta idea",
    "language": "es | en"
  }
]

Reglas:
- Cada idea debe conectar con expertise de Growth4U pero sin ser pitch
- Variedad de formatos: mínimo 1 thread y 1 tweet corto
- Tweets en español salvo que el público target sea claramente anglosajón
- Tono: directo, opinado, con datos concretos cuando sea posible
- No repitas el tema del influencer — dale un giro propio
- SOLO devuelve el JSON válido, nada más`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.text || '[]';
}

async function saveReply(reply: {
  handle: string; tweetUrl: string; tweetSnippet: string;
  replyDraft: string; category: string;
}) {
  const fields: Record<string, any> = {
    handle: { stringValue: reply.handle },
    tweetUrl: { stringValue: reply.tweetUrl },
    tweetSnippet: { stringValue: reply.tweetSnippet },
    replyDraft: { stringValue: reply.replyDraft },
    category: { stringValue: reply.category },
    status: { stringValue: 'pending' },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const res = await fetch(`${FIREBASE_BASE}/x_replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

async function savePostIdea(idea: {
  topic: string; angle: string; format: string; draft: string;
  threadSlides?: string[]; inspiration: string; language: string;
}) {
  const fields: Record<string, any> = {
    topic: { stringValue: idea.topic },
    angle: { stringValue: idea.angle },
    format: { stringValue: idea.format },
    draft: { stringValue: idea.draft },
    inspiration: { stringValue: idea.inspiration },
    language: { stringValue: idea.language || 'es' },
    status: { stringValue: 'idea' },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (idea.threadSlides?.length) {
    fields.threadSlides = {
      arrayValue: {
        values: idea.threadSlides.map(s => ({ stringValue: s })),
      },
    };
  }
  const res = await fetch(`${FIREBASE_BASE}/x_posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

// =====================================================
// ASYNC ARCHITECTURE — 4 actions via query param
// =====================================================
// POST ?action=start       → launches Apify run, returns { runId, datasetId }
// GET  ?action=status      → checks if Apify finished
// POST ?action=process     → fetches results + generates replies + saves
// POST ?action=ideas       → generates post ideas from scraped tweets
// =====================================================

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'start';

  try {
    // ---- ACTION: START ----
    if (action === 'start') {
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const maxTweets = (body as any)?.maxTweets || 5;
      const handles: string[] = (body as any)?.handles || [];

      // If no handles provided, fetch from Firebase (fallback to hardcoded list)
      let targetHandles = handles;
      if (targetHandles.length === 0) {
        const creators = await fetchXCreators();
        targetHandles = creators.map(c => c.handle);
      }
      if (targetHandles.length === 0) {
        targetHandles = FALLBACK_HANDLES;
      }

      if (targetHandles.length === 0) {
        return new Response(JSON.stringify({ error: 'No creators configured. Add creators first.' }), { status: 400, headers: CORS_HEADERS });
      }

      // Apify tweet scraper input
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handles: targetHandles,
            tweetsDesired: maxTweets,
            addUserInfo: true,
          }),
        }
      );
      const runData = await runRes.json();
      const runId = runData?.data?.id;
      const datasetId = runData?.data?.defaultDatasetId;

      if (!runId) {
        return new Response(JSON.stringify({ error: 'Failed to start Apify run', details: runData }), { status: 500, headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'started',
        runId,
        datasetId,
        creators: targetHandles.length,
        message: `Scraping ${targetHandles.length} perfiles de X...`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: STATUS ----
    if (action === 'status') {
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const runId = url.searchParams.get('runId');
      if (!runId) {
        return new Response(JSON.stringify({ error: 'Missing runId' }), { status: 400, headers: CORS_HEADERS });
      }

      const statusRes = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      const status = statusData?.data?.status;
      const datasetId = statusData?.data?.defaultDatasetId;

      return new Response(JSON.stringify({
        ok: true,
        status,
        datasetId,
        finished: status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: PROCESS ----
    if (action === 'process') {
      if (!ANTHROPIC_KEY) {
        return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: CORS_HEADERS });
      }
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const datasetId = (body as any)?.datasetId || url.searchParams.get('datasetId');
      const offset = (body as any)?.offset || 0;
      const personSlug: string | undefined = (body as any)?.personSlug;
      if (!datasetId) {
        return new Response(JSON.stringify({ error: 'Missing datasetId' }), { status: 400, headers: CORS_HEADERS });
      }

      const batchSize = 5;
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&offset=${offset}&limit=${batchSize}`
      );
      const batch = await itemsRes.json();

      if (!Array.isArray(batch) || batch.length === 0) {
        return new Response(JSON.stringify({ ok: true, phase: 'done', saved: 0, remaining: 0, message: 'All tweets processed' }), { status: 200, headers: CORS_HEADERS });
      }

      let saved = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const tweet of batch) {
        try {
          const content = tweet.full_text || tweet.text || '';
          if (!content || content.length < 30) { skipped++; continue; }

          // Skip retweets
          if (content.startsWith('RT @')) { skipped++; continue; }

          const handle = tweet.user?.screen_name || tweet.author?.userName || '';
          const tweetUrl = handle && tweet.id_str
            ? `https://x.com/${handle}/status/${tweet.id_str}`
            : tweet.url || '';

          if (!handle) { skipped++; continue; }

          // Skip tweets older than 7 days (X engagement window is much shorter than LinkedIn)
          const tweetDate = tweet.created_at ? new Date(tweet.created_at) : null;
          if (tweetDate) {
            const age = Date.now() - tweetDate.getTime();
            if (age > 7 * 24 * 60 * 60 * 1000) { skipped++; continue; }
          }

          const replyDraft = await generateReply(handle, content, personSlug);
          if (!replyDraft) { errors++; continue; }

          // Truncate to 280 chars if needed
          const finalReply = replyDraft.length > 280 ? replyDraft.slice(0, 277) + '...' : replyDraft;

          const ok = await saveReply({
            handle,
            tweetUrl,
            tweetSnippet: content.slice(0, 300),
            replyDraft: finalReply,
            category: 'engagement',
          });

          if (ok) saved++;
          else { errors++; errorDetails.push(`Failed to save reply for @${handle}`); }
        } catch (e: any) {
          errorDetails.push(e.message || 'Unknown error');
          errors++;
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'process',
        processed: batch.length,
        nextOffset: offset + batch.length,
        hasMore: batch.length === batchSize,
        saved,
        skipped,
        errors,
        errorDetails: errorDetails.slice(0, 5),
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: IDEAS ----
    if (action === 'ideas') {
      if (!ANTHROPIC_KEY) {
        return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: CORS_HEADERS });
      }
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const datasetId = (body as any)?.datasetId;
      if (!datasetId) {
        return new Response(JSON.stringify({ error: 'Missing datasetId' }), { status: 400, headers: CORS_HEADERS });
      }

      // Fetch top tweets from dataset (first 20)
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`
      );
      const items = await itemsRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ ok: true, ideas: [], message: 'No tweets to analyze' }), { status: 200, headers: CORS_HEADERS });
      }

      // Filter to good content (non-RT, decent length)
      const goodTweets = items
        .filter((t: any) => {
          const text = t.full_text || t.text || '';
          return text.length >= 50 && !text.startsWith('RT @');
        })
        .map((t: any) => ({
          handle: t.user?.screen_name || t.author?.userName || 'unknown',
          content: t.full_text || t.text || '',
        }))
        .slice(0, 15);

      if (goodTweets.length === 0) {
        return new Response(JSON.stringify({ ok: true, ideas: [], message: 'No quality tweets found' }), { status: 200, headers: CORS_HEADERS });
      }

      const rawIdeas = await generatePostIdeas(goodTweets);

      // Parse and save ideas
      let ideas: any[] = [];
      try {
        ideas = JSON.parse(rawIdeas.trim());
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Failed to parse ideas JSON', raw: rawIdeas }), { status: 500, headers: CORS_HEADERS });
      }

      let saved = 0;
      for (const idea of ideas) {
        const ok = await savePostIdea(idea);
        if (ok) saved++;
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'ideas',
        ideas: ideas.length,
        saved,
        message: `${saved} ideas de post generadas`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack?.split('\n').slice(0, 3) }), { status: 500, headers: CORS_HEADERS });
  }
};
