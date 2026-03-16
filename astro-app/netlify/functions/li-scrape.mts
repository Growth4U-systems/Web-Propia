import type { Context } from "@netlify/functions";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;
const ACTOR_ID = 'harvestapi~linkedin-profile-posts';

const CREATORS: { name: string; url: string; category: string }[] = [
  { name: 'Jose Cortizo', url: 'https://www.linkedin.com/in/jccortizo/', category: 'Growth' },
  { name: 'Juanma Varo', url: 'https://www.linkedin.com/in/growth-marketing-juanma-varo/', category: 'Growth' },
  { name: 'Barbara Galiza', url: 'https://www.linkedin.com/in/barbara-galiza/', category: 'Growth' },
  { name: 'Andrea López', url: 'https://www.linkedin.com/in/andrealopezpalau/', category: 'Growth' },
  { name: 'Andrew Capland', url: 'https://www.linkedin.com/in/acapland/', category: 'Growth' },
  { name: 'Elena Verna', url: 'https://www.linkedin.com/in/elenaverna/', category: 'Growth' },
  { name: 'Adam Fishman', url: 'https://www.linkedin.com/in/adamjfishman/', category: 'Growth' },
  { name: 'Maja Boje', url: 'https://www.linkedin.com/in/majaboje/', category: 'Growth' },
  { name: 'Aakash Gupta', url: 'https://www.linkedin.com/in/aagupta/', category: 'Growth' },
  { name: 'Lenny Rachitsky', url: 'https://www.linkedin.com/in/lennyrachitsky/', category: 'Growth' },
  { name: 'Matt Lerner', url: 'https://www.linkedin.com/in/matthewlerner/', category: 'Growth' },
  { name: 'Crystal Widjaja', url: 'https://www.linkedin.com/in/crystalwidjaja/', category: 'Growth' },
  { name: 'Jorge Cano', url: 'https://www.linkedin.com/in/jcanoce/', category: 'Growth' },
  { name: 'Juan Bello', url: 'https://www.linkedin.com/in/juan-bello', category: 'Growth' },
  { name: 'Javi Platón', url: 'https://www.linkedin.com/in/javier-platon', category: 'Growth' },
  { name: 'Pau Gallinat', url: 'https://www.linkedin.com/in/pau-gallinat/', category: 'Growth' },
  { name: 'Alex Dantart', url: 'https://www.linkedin.com/in/dantart/', category: 'Founder' },
  { name: 'Miquel Martí', url: 'https://www.linkedin.com/in/miquel-marti-41210212/', category: 'Founder' },
  { name: 'Emilio Frójan', url: 'https://www.linkedin.com/in/emiliofrojan/', category: 'Founder' },
  { name: 'Jesús Alonso Gallo', url: 'https://www.linkedin.com/in/jesusalonsogallo/', category: 'Founder' },
  { name: 'Carlos Ortiz', url: 'https://www.linkedin.com/in/carlos-ortiz-startup-advisor/', category: 'Founder' },
  { name: 'Greg Isenberg', url: 'https://www.linkedin.com/in/gisenberg/', category: 'Founder' },
  { name: 'Brian Balfour', url: 'https://www.linkedin.com/in/bbalfour/', category: 'Founder' },
  { name: 'Barbara Mallet', url: 'https://www.linkedin.com/in/barbaramalet/', category: 'Founder' },
  { name: 'Juan Cruz', url: 'https://www.linkedin.com/in/juancruzaliaga/', category: 'Founder' },
  { name: 'Javier Romero', url: 'https://www.linkedin.com/in/javierromeroserrano/', category: 'Founder' },
  { name: 'Juan Pablo Montoya', url: 'https://www.linkedin.com/in/juanpablomontoyam/', category: 'Founder' },
  { name: 'Luis Monje', url: 'https://www.linkedin.com/in/luismonje/', category: 'Founder' },
  { name: 'Luis Díaz del Dedo', url: 'https://www.linkedin.com/in/luisdiazdeldedo/', category: 'Founder' },
  { name: 'Jordi Romero', url: 'https://www.linkedin.com/in/jordiromero/', category: 'Founder' },
  { name: 'Bernat Farrero', url: 'https://www.linkedin.com/in/bernatfarrero/', category: 'Founder' },
  { name: 'Carlos Blanco', url: 'https://www.linkedin.com/in/carlosblanco/', category: 'Founder' },
  { name: 'Oscar Pierre', url: 'https://www.linkedin.com/in/oscarpierremi/', category: 'Founder' },
  { name: 'Euge Oller', url: 'https://www.linkedin.com/in/eugeniooller/', category: 'Founder' },
  { name: 'Jesús Hijas', url: 'https://www.linkedin.com/in/jesushijas/', category: 'Founder' },
  { name: 'Jorge Branger', url: 'https://www.linkedin.com/in/jorgebranger/', category: 'Founder' },
  { name: 'Daniel Olmedo', url: 'https://www.linkedin.com/in/daniel-olmedo-nieto-b929758a/', category: 'Founder' },
  { name: 'Mathieu Carenzo', url: 'https://www.linkedin.com/in/mathieucarenzo/', category: 'Founder' },
  { name: 'Samuel Gil', url: 'https://www.linkedin.com/in/samuelgil/', category: 'VC' },
  { name: 'Guillermo Flor', url: 'https://www.linkedin.com/in/guillermoflor/', category: 'VC' },
  { name: 'Iñaki Arrola', url: 'https://www.linkedin.com/in/inakiarrola/', category: 'VC' },
  { name: 'Miguel Arias', url: 'https://www.linkedin.com/in/miguelarias/', category: 'VC' },
  { name: 'Jaime Novoa', url: 'https://www.linkedin.com/in/jaimenovoa/', category: 'VC' },
  { name: 'Jose del Barrio', url: 'https://www.linkedin.com/in/josedelbarrio/', category: 'VC' },
  { name: 'Rubén Domínguez Ibar', url: 'https://www.linkedin.com/in/rubendominguezibar/', category: 'VC' },
  { name: 'Enrique Linares', url: 'https://www.linkedin.com/in/enriquelinares/', category: 'VC' },
  { name: 'Itxaso del Palacio', url: 'https://www.linkedin.com/in/itxasodp/', category: 'VC' },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function findCreator(postAuthorUrl: string) {
  if (!postAuthorUrl) return undefined;
  const clean = (u: string) => u.replace(/\/$/, '').replace(/\?.*$/, '').toLowerCase();
  const cleaned = clean(postAuthorUrl);
  // Try exact match first
  const exact = CREATORS.find((c) => clean(c.url) === cleaned);
  if (exact) return exact;
  // Try slug match (Apify sometimes returns just the slug like "jccortizo")
  const slug = cleaned.split('/').filter(Boolean).pop() || '';
  if (slug) {
    return CREATORS.find((c) => {
      const creatorSlug = clean(c.url).split('/').filter(Boolean).pop() || '';
      return creatorSlug === slug;
    });
  }
  return undefined;
}

// Lead magnets disponibles — solo sugerir si hay match natural con el tema del post
const LEAD_MAGNETS = [
  { slug: 'cac-sostenible', tema: 'CAC, coste de adquisición, unit economics, rentabilidad', url: 'https://growth4u.io/recursos/cac-sostenible/' },
  { slug: 'meseta-de-crecimiento', tema: 'estancamiento, meseta, plateau, crecimiento estancado', url: 'https://growth4u.io/recursos/meseta-de-crecimiento/' },
  { slug: 'sistema-de-growth', tema: 'sistema de growth, framework, proceso de growth marketing', url: 'https://growth4u.io/recursos/sistema-de-growth/' },
  { slug: 'david-vs-goliat', tema: 'competir contra grandes, startup vs enterprise, diferenciación', url: 'https://growth4u.io/recursos/david-vs-goliat/' },
  { slug: 'kit-de-liberacion', tema: 'tiempo del founder, delegación, operaciones, escalar equipo', url: 'https://growth4u.io/recursos/kit-de-liberacion/' },
  { slug: 'dashboard-de-attribution', tema: 'attribution, atribución, marketing analytics, medir ROI', url: 'https://growth4u.io/recursos/dashboard-de-attribution/' },
];

const LEAD_MAGNET_CONTEXT = LEAD_MAGNETS.map((lm) => `- "${lm.slug}": ${lm.tema} → ${lm.url}`).join('\n');

// Track comment index to deterministically include lead magnets in ~1 of every 3
let commentIndex = 0;

async function generateComment(authorName: string, content: string): Promise<string> {
  const includeResource = (commentIndex % 3) === 0; // every 3rd comment must include a resource
  commentIndex++;

  // Detect language from post content — count Spanish-specific patterns vs English ones
  const spanishSignals = (content.match(/\b(de|en|los|las|del|para|por|que|una?|con|como|pero|más|también|sobre|esto|esta|puede|tiene|hacer|ser|está|hay|sin|desde|entre|cada|cuando|porque|mejor|todo|solo|mucho|otro|nuestro|empresa|negocio|crecimiento|marketing)\b/gi) || []).length;
  const englishSignals = (content.match(/\b(the|is|are|was|were|have|has|been|will|would|could|should|with|from|this|that|they|their|which|about|into|more|also|just|than|very|most|some|only|your|what|when|how|growth|business|company|marketing|team|product)\b/gi) || []).length;
  const postLang = englishSignals > spanishSignals ? 'inglés' : 'español';

  const resourceInstruction = includeResource
    ? `IMPORTANTE: Este comentario DEBE incluir uno de los recursos de abajo. Elige el que mejor conecte con el tema del post. Cierra el comentario de forma natural mencionando "publicamos un recurso sobre esto" o "escribimos un framework que aborda esto" e incluye el link. No lo pongas como CTA agresivo, sino como aporte extra de valor.`
    : `Si el post conecta claramente con alguno de estos recursos, puedes cerrar el comentario mencionando "publicamos algo sobre esto" e incluir el link. Si no hay conexión clara, haz un comentario puramente de valor sin link.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Eres el community manager de Growth4U, una consultora de Growth Marketing para startups y scale-ups tech B2B/B2C.

Genera un comentario para este post de LinkedIn de ${authorName}:

"""
${content.slice(0, 1500)}
"""

IDIOMA: El post está en ${postLang}. Tu comentario DEBE estar 100% en ${postLang}. No mezcles idiomas.

Reglas:
- Máximo 3-5 líneas
- Tono profesional pero cercano, nunca corporativo
- Aporta valor: añade un dato, perspectiva o pregunta inteligente
- NO seas genérico ("gran post", "totalmente de acuerdo")
- Empieza directamente con el comentario, sin explicación

RECURSOS DE GROWTH4U:
${LEAD_MAGNET_CONTEXT}

${resourceInstruction}

Solo devuelve el comentario en ${postLang}, nada más.`,
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

async function saveComment(comment: {
  profileName: string; profileUrl: string; profileTitle: string;
  postUrl: string; postSnippet: string; commentDraft: string; commentType: string;
  postDate?: string;
}) {
  const fields: Record<string, any> = {
    profileName: { stringValue: comment.profileName },
    profileUrl: { stringValue: comment.profileUrl },
    profileTitle: { stringValue: comment.profileTitle || '' },
    postUrl: { stringValue: comment.postUrl },
    postSnippet: { stringValue: comment.postSnippet },
    commentDraft: { stringValue: comment.commentDraft },
    commentType: { stringValue: comment.commentType },
    status: { stringValue: 'pending' },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (comment.postDate) {
    fields.postDate = { stringValue: comment.postDate };
  }
  const res = await fetch(`${FIREBASE_BASE}/li_comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

// =====================================================
// ASYNC ARCHITECTURE — 3 actions via query param
// =====================================================
// POST ?action=start   → launches Apify run, returns { runId, datasetId }
// GET  ?action=status&runId=xxx → checks if Apify finished
// POST ?action=process&datasetId=xxx → fetches results + generates comments + saves to Firebase
// =====================================================

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!APIFY_TOKEN) {
    return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'start';

  try {
    // ---- ACTION: START ----
    // Launches the Apify actor and returns immediately
    if (action === 'start') {
      const body = await req.json().catch(() => ({}));
      const maxPosts = (body as any)?.maxPosts || 3;
      const categories: string[] = (body as any)?.categories || ['Growth', 'Founder', 'VC'];
      const onlyUrls: string[] = (body as any)?.profileUrls || [];

      const targetCreators = onlyUrls.length > 0
        ? CREATORS.filter((c) => onlyUrls.some((u: string) => c.url.includes(u)))
        : CREATORS.filter((c) => categories.includes(c.category));

      const profileUrls = targetCreators.map((c) => c.url);

      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileUrls, maxPosts }),
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
        creators: targetCreators.length,
        message: `Scraping ${targetCreators.length} perfiles (${profileUrls.length} URLs)...`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: STATUS ----
    // Checks if the Apify run has finished
    if (action === 'status') {
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
        status, // READY, RUNNING, SUCCEEDED, FAILED, ABORTED
        datasetId,
        finished: status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: PROCESS ----
    // Fetches Apify results, generates comments with Claude, saves to Firebase
    if (action === 'process') {
      if (!ANTHROPIC_KEY) {
        return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const datasetId = (body as any)?.datasetId || url.searchParams.get('datasetId');
      const offset = (body as any)?.offset || 0;
      if (!datasetId) {
        return new Response(JSON.stringify({ error: 'Missing datasetId' }), { status: 400, headers: CORS_HEADERS });
      }

      // Fetch posts from Apify dataset with offset + limit
      const batchSize = 5;
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&offset=${offset}&limit=${batchSize}`
      );
      const batch = await itemsRes.json();

      if (!Array.isArray(batch) || batch.length === 0) {
        return new Response(JSON.stringify({ ok: true, phase: 'done', saved: 0, remaining: 0, message: 'All posts processed' }), { status: 200, headers: CORS_HEADERS });
      }
      let saved = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const post of batch) {
        try {
          const postUrl = post.linkedinUrl || '';
          const content = post.content || '';
          if (!content || content.length < 50) { skipped++; continue; }

          const authorName = post.author?.name || 'Unknown';
          const authorUrl = post.author?.linkedinUrl || (typeof post.query === 'string' ? post.query : post.query?.profilePublicIdentifier) || '';
          const authorTitle = post.author?.title || '';
          const creator = findCreator(authorUrl);

          // Skip posts from authors not in our Creator Network
          if (!creator) { skipped++; continue; }

          const commentDraft = await generateComment(authorName, content);
          if (!commentDraft) {
            errorDetails.push(`Empty comment for ${authorName}`);
            errors++;
            continue;
          }

          // Extract post date from Apify data
          const postDate = post.postedAt?.date || '';

          const ok = await saveComment({
            profileName: authorName,
            profileUrl: authorUrl,
            profileTitle: authorTitle,
            postUrl,
            postSnippet: content.slice(0, 300),
            commentDraft,
            commentType: creator?.category === 'VC' ? 'authority' : creator?.category === 'Founder' ? 'founder' : creator?.category === 'Growth' ? 'growth' : 'outbound',
            postDate,
          });

          if (ok) saved++;
          else {
            errorDetails.push(`Failed to save comment for ${authorName}`);
            errors++;
          }
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

    // ---- ACTION: CONNECTION-MSG ----
    // Generate a LinkedIn connection message using Claude
    if (action === 'connection-msg') {
      if (!ANTHROPIC_KEY) {
        return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const { name, title, company, notes, painPoints } = body as any;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Genera un mensaje directo (DM) de LinkedIn para enviar a ${name} (${title}${company ? ` en ${company}` : ''}).

Contexto de Growth4U: Somos una consultora de Growth Marketing especializada en startups y scale-ups tech B2B/B2C. Ayudamos con estrategia de crecimiento, CAC sostenible, attribution y GEO.

${painPoints ? `Pain points detectados: ${painPoints}` : ''}
${notes ? `Notas: ${notes}` : ''}

Reglas:
- Mensaje de 3-5 frases (entre 300 y 600 caracteres)
- Personalizado a su perfil y situación, NO genérico
- Menciona algo específico de su rol, empresa o pain points
- Tono cercano y profesional, como si fuera un peer
- Ofrece valor primero (insight, recurso, perspectiva) antes de pedir algo
- Cierra con una pregunta abierta o propuesta concreta de valor
- NO vendas directamente, busca iniciar conversación genuina
- Si el perfil es en inglés, escribe en inglés
- Si es hispano, escribe en español
- Solo devuelve el mensaje, nada más.`,
          }],
        }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Claude API error' }), { status: 500, headers: CORS_HEADERS });
      }
      const data = await res.json();
      const message = data?.content?.[0]?.text || '';
      return new Response(JSON.stringify({ ok: true, message }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
};
