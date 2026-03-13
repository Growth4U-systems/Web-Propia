import type { Context } from "@netlify/functions";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;

const ACTOR_ID = 'harvestapi~linkedin-profile-posts';

// All 47 creators grouped — we scrape in batches to stay within Apify limits
const CREATORS: { name: string; url: string; category: string }[] = [
  // Growth — 16
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
  // Founders — 22
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
  // VCs — 9
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

// --- Helpers ---

async function runApifyActor(profileUrls: string[], maxPosts = 3): Promise<any[]> {
  // Start the actor run
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
  if (!runId) throw new Error('Failed to start Apify run');

  // Poll until finished (max 5 min)
  const maxWait = 300_000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify run ${status}`);
    }
  }

  // Fetch results
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  return itemsRes.json();
}

async function generateComment(post: { authorName: string; content: string; postUrl: string }): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Eres el community manager de Growth4U, una consultora de Growth Marketing para startups y scale-ups tech B2B/B2C.

Genera un comentario para este post de LinkedIn de ${post.authorName}:

"""
${post.content.slice(0, 1500)}
"""

Reglas:
- Máximo 3-4 líneas (280 chars aprox)
- Tono profesional pero cercano, nunca corporativo
- Aporta valor: añade un dato, perspectiva o pregunta inteligente
- NO seas genérico ("gran post", "totalmente de acuerdo")
- NO menciones Growth4U ni vendas nada
- Si el post es en inglés, comenta en inglés
- Si el post es en español, comenta en español
- Empieza directamente con el comentario, sin explicación

Solo devuelve el comentario, nada más.`,
        },
      ],
    }),
  });

  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

// Find creator metadata by LinkedIn URL
function findCreator(postAuthorUrl: string) {
  const clean = (u: string) => u.replace(/\/$/, '').toLowerCase();
  return CREATORS.find((c) => clean(c.url) === clean(postAuthorUrl));
}

// Check if comment already exists for this post (dedup via Firestore REST)
async function postAlreadyProcessed(postUrl: string): Promise<boolean> {
  // Use structured query to check
  const res = await fetch(`${FIREBASE_BASE}/li_comments?pageSize=1`, {
    headers: { 'Content-Type': 'application/json' },
  });
  // Simple approach: fetch recent comments and check URLs
  // For production scale, use a Firestore query filter
  const data = await res.json();
  const docs = data?.documents || [];
  for (const doc of docs) {
    if (doc?.fields?.postUrl?.stringValue === postUrl) return true;
  }
  return false;
}

// Save comment to Firebase via REST
async function saveComment(comment: {
  profileName: string;
  profileUrl: string;
  profileTitle: string;
  postUrl: string;
  postSnippet: string;
  commentDraft: string;
  commentType: string;
}) {
  const res = await fetch(`${FIREBASE_BASE}/li_comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
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
      },
    }),
  });
  return res.ok;
}

// --- Main handler ---

export default async (req: Request, _context: Context) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!APIFY_TOKEN || !ANTHROPIC_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing APIFY_API_TOKEN or ANTHROPIC_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const maxPosts = (body as any)?.maxPosts || 3;
    // Optional: only scrape specific categories
    const categories: string[] = (body as any)?.categories || ['Growth', 'Founder', 'VC'];
    // Optional: limit to specific creator URLs for testing
    const onlyUrls: string[] = (body as any)?.profileUrls || [];

    const targetCreators = onlyUrls.length > 0
      ? CREATORS.filter((c) => onlyUrls.some((u: string) => c.url.includes(u)))
      : CREATORS.filter((c) => categories.includes(c.category));

    const profileUrls = targetCreators.map((c) => c.url);

    // Run Apify — scrape posts
    const posts = await runApifyActor(profileUrls, maxPosts);

    let saved = 0;
    let skipped = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        const postUrl = post.linkedinUrl || '';
        const content = post.content || '';
        if (!content || content.length < 50) {
          skipped++;
          continue;
        }

        // Find author info
        const authorName = post.author?.name || post.query || 'Unknown';
        const authorUrl = post.author?.linkedinUrl || post.query || '';
        const authorTitle = post.author?.title || '';
        const creator = findCreator(authorUrl) || findCreator(post.query || '');

        // Generate comment with Claude
        const commentDraft = await generateComment({
          authorName,
          content,
          postUrl,
        });

        if (!commentDraft) {
          errors++;
          continue;
        }

        // Save to Firebase
        const ok = await saveComment({
          profileName: authorName,
          profileUrl: authorUrl,
          profileTitle: authorTitle,
          postUrl,
          postSnippet: content.slice(0, 300),
          commentDraft,
          commentType: creator?.category === 'VC' ? 'authority' : 'outbound',
        });

        if (ok) saved++;
        else errors++;
      } catch {
        errors++;
      }
    }

    const result = {
      ok: true,
      totalPosts: posts.length,
      saved,
      skipped,
      errors,
      creators: targetCreators.length,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
