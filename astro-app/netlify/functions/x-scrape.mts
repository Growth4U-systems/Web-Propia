import type { Context } from "@netlify/functions";
import crypto from 'crypto';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const X_API_KEY = '4XyeTSZC5R9oNxrz4qOF4VPC7';
const X_API_SECRET = 'NF70gJUqskz2IxWGnmQH8GUfluugAd6lKx0eVpP2KTwMteImy4';
const X_ACCESS_TOKEN = '1946182743441731584-5WBIwp3Xss91TmbRPPTpkjCJAxgMDI';
const X_ACCESS_SECRET = 'ux4s1aJEOKtWveFPxjAv3VZP49zupcUBxc6vACNr9Glyu';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;
const ACTOR_ID = 'apidojo~tweet-scraper';

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

// ---- Firebase helpers ----
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

// ---- Claude AI helpers ----
async function generateQuoteTweet(authorHandle: string, tweetContent: string): Promise<string> {
  const spanishSignals = (tweetContent.match(/\b(de|en|los|las|del|para|por|que|una?|con|como|pero|más|también|sobre|puede|tiene|hacer|empresa|negocio|crecimiento|marketing)\b/gi) || []).length;
  const englishSignals = (tweetContent.match(/\b(the|is|are|was|were|have|has|been|will|would|could|should|with|from|this|that|they|their|which|about|growth|business|company|marketing|team|product)\b/gi) || []).length;
  const lang = englishSignals > spanishSignals ? 'inglés' : 'español';

  const formats = [
    '"Yes, and..." — coincide y extiende con un dato o ejemplo concreto',
    '"Framework" — toma su punto y conviértelo en un mini-framework o modelo mental',
    '"Ángulo contrario" — ofrece respetuosamente una perspectiva diferente',
    '"Data drop" — añade un dato relevante o caso de estudio',
  ];
  const randomFormat = formats[Math.floor(Math.random() * formats.length)];

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
        content: `Genera un quote tweet para este tweet de @${authorHandle} en X:

"""
${tweetContent.slice(0, 800)}
"""

IDIOMA: ${lang}. Tu quote tweet DEBE estar 100% en ${lang}.

${G4U_KNOWLEDGE}

FORMATO a usar: ${randomFormat}

Reglas para quote tweets en X:
- MÁXIMO 200 caracteres (corto y potente — el tweet original ya da contexto)
- Aporta valor real: dato, perspectiva propia, pregunta inteligente o insight
- Si el tema conecta con expertise de Growth4U, incorpóralo como opinión propia — NUNCA como pitch
- Tono directo, informal pero inteligente (estilo X)
- NUNCA: "Gran punto", "Totalmente de acuerdo", "Esto 👆" ni respuestas genéricas
- NUNCA links, URLs, hashtags ni menciones a @growth4u
- NUNCA emojis excesivos (máximo 1 si es natural)
- NO menciones al autor con @ — el quote tweet ya lo muestra
- Empieza directo con tu take, sin preámbulo

Solo devuelve el quote tweet en ${lang}, nada más.`,
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

// ---- Firebase save helpers ----
async function saveQuoteTweet(qt: {
  handle: string; tweetUrl: string; tweetSnippet: string;
  quoteDraft: string; category: string; views?: number;
}) {
  const fields: Record<string, any> = {
    handle: { stringValue: qt.handle },
    tweetUrl: { stringValue: qt.tweetUrl },
    tweetSnippet: { stringValue: qt.tweetSnippet },
    replyDraft: { stringValue: qt.quoteDraft },
    category: { stringValue: qt.category },
    views: { integerValue: qt.views || 0 },
    type: { stringValue: 'quote' },
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

// ---- OAuth 1.0a for X API ----
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
}

function buildOAuthHeader(method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');

  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(X_API_SECRET)}&${percentEncode(X_ACCESS_SECRET)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;
  const header = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');
  return `OAuth ${header}`;
}

async function postTweet(text: string, opts?: { replyTo?: string; quoteTweetId?: string }): Promise<{ id: string; text: string }> {
  const url = 'https://api.twitter.com/2/tweets';
  const body: any = { text };
  if (opts?.replyTo) {
    body.reply = { in_reply_to_tweet_id: opts.replyTo };
  }
  if (opts?.quoteTweetId) {
    body.quote_tweet_id = opts.quoteTweetId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': buildOAuthHeader('POST', url),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`X API ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.data || {};
}

async function xApiCall(method: string, endpoint: string, body?: any): Promise<any> {
  const url = `https://api.twitter.com/2${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': buildOAuthHeader(method, url),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`X API ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// =====================================================
// ACTIONS via query param
// =====================================================
// GET  ?action=me           → verify X connection, return user info
// POST ?action=start        → launches Apify run
// GET  ?action=status       → checks if Apify finished
// POST ?action=process      → generates quote tweets from scraped data
// POST ?action=discover     → find new accounts from scraped tweets
// POST ?action=ideas        → generates post ideas
// POST ?action=post-quote   → posts a quote tweet to X
// POST ?action=post-tweet   → posts a tweet/thread to X
// POST ?action=like         → likes a tweet
// POST ?action=follow       → follows creators
// =====================================================

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'start';

  try {
    // ---- ACTION: ME (verify X connection) ----
    if (action === 'me') {
      if (!X_API_KEY || !X_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ ok: false, error: 'X API keys not configured' }), { status: 200, headers: CORS_HEADERS });
      }
      try {
        const data = await xApiCall('GET', '/users/me?user.fields=public_metrics,profile_image_url');
        return new Response(JSON.stringify({
          ok: true,
          user: {
            id: data?.data?.id,
            name: data?.data?.name,
            username: data?.data?.username,
            avatar: data?.data?.profile_image_url,
            followers: data?.data?.public_metrics?.followers_count || 0,
            following: data?.data?.public_metrics?.following_count || 0,
            tweets: data?.data?.public_metrics?.tweet_count || 0,
          },
        }), { status: 200, headers: CORS_HEADERS });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 200, headers: CORS_HEADERS });
      }
    }

    // ---- ACTION: START ----
    if (action === 'start') {
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const maxTweets = (body as any)?.maxTweets || 5;
      const handles: string[] = (body as any)?.handles || [];

      let targetHandles = handles;
      if (targetHandles.length === 0) {
        const creators = await fetchXCreators();
        targetHandles = creators.map(c => c.handle);
      }
      if (targetHandles.length === 0) {
        targetHandles = FALLBACK_HANDLES;
      }
      if (targetHandles.length === 0) {
        return new Response(JSON.stringify({ error: 'No creators configured.' }), { status: 400, headers: CORS_HEADERS });
      }

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
        ok: true, phase: 'started', runId, datasetId,
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
        ok: true, status, datasetId,
        finished: status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: PROCESS (generates quote tweets) ----
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
          if (content.startsWith('RT @')) { skipped++; continue; }

          const handle = tweet.user?.screen_name || tweet.author?.userName || '';
          const tweetUrl = handle && tweet.id_str
            ? `https://x.com/${handle}/status/${tweet.id_str}`
            : tweet.url || '';

          if (!handle) { skipped++; continue; }

          const tweetDate = tweet.created_at ? new Date(tweet.created_at) : null;
          if (tweetDate) {
            const age = Date.now() - tweetDate.getTime();
            if (age > 7 * 24 * 60 * 60 * 1000) { skipped++; continue; }
          }

          const views = tweet.views_count || tweet.viewCount || tweet.ext_views?.count || tweet.views?.count || 0;
          if (views < 20000) { skipped++; continue; }

          const quoteDraft = await generateQuoteTweet(handle, content);
          if (!quoteDraft) { errors++; continue; }

          const finalQuote = quoteDraft.length > 280 ? quoteDraft.slice(0, 277) + '...' : quoteDraft;

          const ok = await saveQuoteTweet({
            handle, tweetUrl,
            tweetSnippet: content.slice(0, 300),
            quoteDraft: finalQuote,
            category: 'engagement',
            views,
          });

          if (ok) saved++;
          else { errors++; errorDetails.push(`Failed to save quote for @${handle}`); }
        } catch (e: any) {
          errorDetails.push(e.message || 'Unknown error');
          errors++;
        }
      }

      return new Response(JSON.stringify({
        ok: true, phase: 'process',
        processed: batch.length, nextOffset: offset + batch.length,
        hasMore: batch.length === batchSize,
        saved, skipped, errors,
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

      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`
      );
      const items = await itemsRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ ok: true, ideas: [], message: 'No tweets to analyze' }), { status: 200, headers: CORS_HEADERS });
      }

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
        ok: true, phase: 'ideas', ideas: ideas.length, saved,
        message: `${saved} ideas de post generadas`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: DISCOVER (find new accounts from scraped tweets) ----
    if (action === 'discover') {
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const datasetId = (body as any)?.datasetId;
      const existingHandles: string[] = ((body as any)?.existingHandles || []).map((h: string) => h.toLowerCase());

      if (!datasetId) {
        return new Response(JSON.stringify({ error: 'Missing datasetId' }), { status: 400, headers: CORS_HEADERS });
      }

      // Fetch all tweets from dataset
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
      );
      const items = await itemsRes.json();
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ ok: true, discovered: [] }), { status: 200, headers: CORS_HEADERS });
      }

      // Extract all mentioned handles, quoted users, reply-to users
      const mentionCounts: Record<string, { count: number; mentionedBy: Set<string>; context: string }> = {};

      for (const tweet of items) {
        const text = tweet.full_text || tweet.text || '';
        const author = (tweet.user?.screen_name || tweet.author?.userName || '').toLowerCase();

        // Extract @mentions from text
        const mentions = text.match(/@([a-zA-Z0-9_]+)/g) || [];
        for (const m of mentions) {
          const handle = m.slice(1).toLowerCase();
          if (handle === author || existingHandles.includes(handle)) continue;
          if (!mentionCounts[handle]) mentionCounts[handle] = { count: 0, mentionedBy: new Set(), context: '' };
          mentionCounts[handle].count++;
          mentionCounts[handle].mentionedBy.add(author);
          if (!mentionCounts[handle].context) mentionCounts[handle].context = text.slice(0, 150);
        }

        // Extract quoted user if present
        const quotedUser = (tweet.quoted_status?.user?.screen_name || tweet.quotedTweet?.author?.userName || '').toLowerCase();
        if (quotedUser && quotedUser !== author && !existingHandles.includes(quotedUser)) {
          if (!mentionCounts[quotedUser]) mentionCounts[quotedUser] = { count: 0, mentionedBy: new Set(), context: '' };
          mentionCounts[quotedUser].count++;
          mentionCounts[quotedUser].mentionedBy.add(author);
        }

        // Extract reply-to user
        const replyTo = (tweet.in_reply_to_screen_name || '').toLowerCase();
        if (replyTo && replyTo !== author && !existingHandles.includes(replyTo)) {
          if (!mentionCounts[replyTo]) mentionCounts[replyTo] = { count: 0, mentionedBy: new Set(), context: '' };
          mentionCounts[replyTo].count++;
          mentionCounts[replyTo].mentionedBy.add(author);
        }
      }

      // Sort by mention count, return top 20
      const discovered = Object.entries(mentionCounts)
        .map(([handle, data]) => ({
          handle,
          mentions: data.count,
          mentionedBy: Array.from(data.mentionedBy).slice(0, 5),
          context: data.context,
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 20);

      return new Response(JSON.stringify({
        ok: true, discovered,
        message: `${discovered.length} nuevas cuentas encontradas`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: POST-QUOTE (quote tweet) ----
    if (action === 'post-quote') {
      if (!X_API_KEY || !X_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing X API credentials' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const replyId = (body as any)?.replyId;
      const quoteText = (body as any)?.replyText || (body as any)?.quoteText;
      const tweetUrl = (body as any)?.tweetUrl;

      if (!quoteText) {
        return new Response(JSON.stringify({ error: 'Missing quote text' }), { status: 400, headers: CORS_HEADERS });
      }

      const tweetId = tweetUrl?.split('/status/')[1]?.split('?')[0];
      if (!tweetId) {
        return new Response(JSON.stringify({ error: 'Could not extract tweet ID from URL' }), { status: 400, headers: CORS_HEADERS });
      }

      const posted = await postTweet(quoteText, { quoteTweetId: tweetId });

      if (replyId) {
        await fetch(`${FIREBASE_BASE}/x_replies/${replyId}?updateMask.fieldPaths=status&updateMask.fieldPaths=postedTweetId&updateMask.fieldPaths=postedAt`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              status: { stringValue: 'posted' },
              postedTweetId: { stringValue: posted.id },
              postedAt: { timestampValue: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }

      return new Response(JSON.stringify({
        ok: true, phase: 'post-quote', tweetId: posted.id,
        message: 'Quote tweet posted to X',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: POST-TWEET ----
    if (action === 'post-tweet') {
      if (!X_API_KEY || !X_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing X API credentials' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const postId = (body as any)?.postId;
      const draft = (body as any)?.draft;
      const format = (body as any)?.format || 'tweet';
      const threadSlides: string[] = (body as any)?.threadSlides || [];

      if (!draft) {
        return new Response(JSON.stringify({ error: 'Missing draft text' }), { status: 400, headers: CORS_HEADERS });
      }

      const postedIds: string[] = [];

      if (format === 'thread') {
        const main = await postTweet(draft);
        postedIds.push(main.id);

        let lastId = main.id;
        for (const slideText of threadSlides) {
          if (!slideText) continue;
          const reply = await postTweet(slideText, { replyTo: lastId });
          postedIds.push(reply.id);
          lastId = reply.id;
        }
      } else {
        const posted = await postTweet(draft);
        postedIds.push(posted.id);
      }

      if (postId) {
        await fetch(`${FIREBASE_BASE}/x_posts/${postId}?updateMask.fieldPaths=status&updateMask.fieldPaths=postedTweetId&updateMask.fieldPaths=postedAt`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              status: { stringValue: 'posted' },
              postedTweetId: { stringValue: postedIds[0] },
              postedAt: { timestampValue: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }

      return new Response(JSON.stringify({
        ok: true, phase: 'post-tweet', tweetIds: postedIds,
        message: format === 'thread' ? `Thread posted (${postedIds.length} tweets)` : 'Tweet posted to X',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: LIKE ----
    if (action === 'like') {
      if (!X_API_KEY || !X_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing X API credentials' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const tweetUrl = (body as any)?.tweetUrl;
      const tweetId = tweetUrl?.split('/status/')[1]?.split('?')[0] || (body as any)?.tweetId;

      if (!tweetId) {
        return new Response(JSON.stringify({ error: 'Missing tweetId or tweetUrl' }), { status: 400, headers: CORS_HEADERS });
      }

      // Need user ID for likes endpoint — extract from access token (format: userId-rest)
      const userId = X_ACCESS_TOKEN.split('-')[0];

      await xApiCall('POST', `/users/${userId}/likes`, { tweet_id: tweetId });

      return new Response(JSON.stringify({
        ok: true, phase: 'like', message: 'Tweet liked',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: FOLLOW ----
    if (action === 'follow') {
      if (!X_API_KEY || !X_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing X API credentials' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const handles: string[] = (body as any)?.handles || [];

      if (handles.length === 0) {
        return new Response(JSON.stringify({ error: 'No handles provided' }), { status: 400, headers: CORS_HEADERS });
      }

      const userId = X_ACCESS_TOKEN.split('-')[0];
      const results: { handle: string; ok: boolean; error?: string }[] = [];

      for (const handle of handles) {
        try {
          // Lookup user ID by username
          const lookup = await xApiCall('GET', `/users/by/username/${handle}`);
          const targetId = lookup?.data?.id;
          if (!targetId) {
            results.push({ handle, ok: false, error: 'User not found' });
            continue;
          }

          await xApiCall('POST', `/users/${userId}/following`, { target_user_id: targetId });
          results.push({ handle, ok: true });
        } catch (e: any) {
          results.push({ handle, ok: false, error: e.message?.slice(0, 100) });
        }
      }

      const followed = results.filter(r => r.ok).length;
      return new Response(JSON.stringify({
        ok: true, phase: 'follow', followed, total: handles.length, results,
        message: `Followed ${followed}/${handles.length} creators`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack?.split('\n').slice(0, 3) }), { status: 500, headers: CORS_HEADERS });
  }
};
