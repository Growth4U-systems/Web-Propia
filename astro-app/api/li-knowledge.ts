export const config = { runtime: 'edge' };

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;
const ACTOR_ID = 'harvestapi~linkedin-profile-posts';

// Growth4U team profiles
const TEAM_PROFILES: { name: string; slug: string; url: string; role: string }[] = [
  { name: 'Philippe Sainthubert', slug: 'philippe', url: 'https://www.linkedin.com/in/philippesainthubert/', role: 'Growth Strategist' },
  { name: 'Alfonso Sainz de Baranda', slug: 'alfonso', url: 'https://www.linkedin.com/in/alfonsosbla/', role: 'Founder & CEO' },
  { name: 'Martín Fila', slug: 'martin', url: 'https://www.linkedin.com/in/martin-fila/', role: 'Founder & COO' },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Extract knowledge from a batch of posts using Claude
async function extractKnowledge(
  personName: string,
  personRole: string,
  posts: { content: string; date: string; likes: number }[]
): Promise<{
  topics: string[];
  opinions: string[];
  experiences: string[];
  tone: string;
  summary: string;
}> {
  const postsText = posts
    .map((p, i) => `--- Post ${i + 1} (${p.date}, ${p.likes} likes) ---\n${p.content}`)
    .join('\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analiza los posts de LinkedIn de ${personName} (${personRole} en Growth4U) y extrae su "segundo cerebro": qué sabe, qué opina, cómo habla.

POSTS:
${postsText}

Devuelve un JSON con exactamente esta estructura (sin markdown, solo JSON puro):
{
  "topics": ["tema 1 que domina", "tema 2", ...],
  "opinions": ["opinión/postura fuerte 1", "opinión 2", ...],
  "experiences": ["experiencia real o caso anonimizado 1", "experiencia 2", ...],
  "tone": "descripción del tono y estilo de escritura en 2-3 frases",
  "summary": "resumen de 3-4 frases de quién es esta persona profesionalmente, qué defiende y desde dónde habla"
}

Reglas:
- topics: máximo 10 temas principales. Sé específico (no "marketing", sino "growth loops para B2B SaaS")
- opinions: posturas claras que toma, cosas que defiende o critica. Mínimo 5
- experiences: casos reales mencionados, resultados, aprendizajes de proyectos. Anonimiza empresas si son clientes. Mínimo 5
- tone: cómo escribe (formal/informal, usa datos, cuenta historias, es directo, usa humor...)
- summary: quién es profesionalmente en el contexto de Growth4U
- Todo en español
- Solo JSON, sin explicaciones`,
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text || '{}';

  // Parse JSON — handle potential markdown wrapping
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');

  return JSON.parse(jsonMatch[0]);
}

// Save knowledge to Firebase
async function saveKnowledge(slug: string, knowledge: {
  name: string;
  slug: string;
  role: string;
  topics: string[];
  opinions: string[];
  experiences: string[];
  tone: string;
  summary: string;
  postCount: number;
  lastUpdated: string;
}) {
  // Use slug as document ID for easy lookup
  const docPath = `${FIREBASE_BASE}/li_knowledge/${slug}`;

  // Check if document exists
  const existsRes = await fetch(`${docPath}?key=`, { method: 'GET' });
  const method = existsRes.ok ? 'PATCH' : 'POST';
  const url = existsRes.ok ? `${docPath}` : `${FIREBASE_BASE}/li_knowledge?documentId=${slug}`;

  const fields: Record<string, any> = {
    name: { stringValue: knowledge.name },
    slug: { stringValue: knowledge.slug },
    role: { stringValue: knowledge.role },
    topics: { arrayValue: { values: knowledge.topics.map((t) => ({ stringValue: t })) } },
    opinions: { arrayValue: { values: knowledge.opinions.map((o) => ({ stringValue: o })) } },
    experiences: { arrayValue: { values: knowledge.experiences.map((e) => ({ stringValue: e })) } },
    tone: { stringValue: knowledge.tone },
    summary: { stringValue: knowledge.summary },
    postCount: { integerValue: String(knowledge.postCount) },
    lastUpdated: { stringValue: knowledge.lastUpdated },
    updatedAt: { timestampValue: new Date().toISOString() },
  };

  const res = await fetch(url, {
    method: method === 'POST' ? 'POST' : 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  return res.ok;
}

// Fetch existing knowledge for use in comment generation
async function getKnowledge(slug: string): Promise<any | null> {
  const res = await fetch(`${FIREBASE_BASE}/li_knowledge/${slug}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.fields || null;
}

// =====================================================
// ASYNC ARCHITECTURE — 3 actions
// =====================================================
// POST ?action=start&slug=philippe  → launches Apify for that person
// GET  ?action=status&runId=xxx     → checks if finished
// POST ?action=process              → extracts knowledge from posts
// GET  ?action=get&slug=philippe    → fetches stored knowledge
// =====================================================

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'get';

  try {
    // ---- ACTION: GET — Fetch stored knowledge ----
    if (action === 'get') {
      const slug = url.searchParams.get('slug');

      if (slug) {
        const knowledge = await getKnowledge(slug);
        return new Response(JSON.stringify({ ok: true, knowledge }), { status: 200, headers: CORS_HEADERS });
      }

      // Fetch all team knowledge
      const allRes = await fetch(`${FIREBASE_BASE}/li_knowledge`);
      if (!allRes.ok) {
        return new Response(JSON.stringify({ ok: true, profiles: [] }), { status: 200, headers: CORS_HEADERS });
      }
      const allData = await allRes.json();
      const profiles = (allData.documents || []).map((doc: any) => {
        const f = doc.fields || {};
        return {
          slug: f.slug?.stringValue || '',
          name: f.name?.stringValue || '',
          role: f.role?.stringValue || '',
          summary: f.summary?.stringValue || '',
          topics: (f.topics?.arrayValue?.values || []).map((v: any) => v.stringValue),
          opinions: (f.opinions?.arrayValue?.values || []).map((v: any) => v.stringValue),
          experiences: (f.experiences?.arrayValue?.values || []).map((v: any) => v.stringValue),
          tone: f.tone?.stringValue || '',
          postCount: parseInt(f.postCount?.integerValue || '0', 10),
          lastUpdated: f.lastUpdated?.stringValue || '',
        };
      });

      return new Response(JSON.stringify({ ok: true, profiles }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: START — Scrape team member posts ----
    if (action === 'start') {
      if (!APIFY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const slugs: string[] = (body as any)?.slugs || TEAM_PROFILES.map((p) => p.slug);
      const maxPosts = (body as any)?.maxPosts || 20;

      const profiles = TEAM_PROFILES.filter((p) => slugs.includes(p.slug));
      if (profiles.length === 0) {
        return new Response(JSON.stringify({ error: 'No matching profiles' }), { status: 400, headers: CORS_HEADERS });
      }

      const profileUrls = profiles.map((p) => p.url);

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
        profiles: profiles.map((p) => p.name),
        message: `Scraping ${maxPosts} posts de ${profiles.length} perfiles...`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: STATUS ----
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
        status,
        datasetId,
        finished: status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED',
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: PROCESS — Extract knowledge from scraped posts ----
    if (action === 'process') {
      if (!ANTHROPIC_KEY) {
        return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: CORS_HEADERS });
      }

      const body = await req.json().catch(() => ({}));
      const datasetId = (body as any)?.datasetId;
      if (!datasetId) {
        return new Response(JSON.stringify({ error: 'Missing datasetId' }), { status: 400, headers: CORS_HEADERS });
      }

      // Fetch all posts from dataset
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=200`
      );
      const allPosts = await itemsRes.json();

      if (!Array.isArray(allPosts) || allPosts.length === 0) {
        return new Response(JSON.stringify({ ok: true, phase: 'done', processed: 0, message: 'No posts found' }), { status: 200, headers: CORS_HEADERS });
      }

      // Group posts by author (match against team profiles)
      const postsByPerson: Record<string, { profile: typeof TEAM_PROFILES[0]; posts: { content: string; date: string; likes: number }[] }> = {};

      for (const post of allPosts) {
        const authorUrl = post.author?.linkedinUrl || (typeof post.query === 'string' ? post.query : post.query?.profilePublicIdentifier) || '';
        const content = post.content || '';
        if (!content || content.length < 100) continue;

        const profile = TEAM_PROFILES.find((p) => authorUrl.includes(p.url.replace('https://www.linkedin.com', '').replace(/\/$/, '')));
        if (!profile) continue;

        if (!postsByPerson[profile.slug]) {
          postsByPerson[profile.slug] = { profile, posts: [] };
        }

        postsByPerson[profile.slug].posts.push({
          content: content.slice(0, 2000), // Cap per post to stay within token limits
          date: post.postedAt?.date || post.postedAt || '',
          likes: post.likes || post.totalReactionCount || 0,
        });
      }

      // Extract knowledge for each person
      const results: { slug: string; name: string; postCount: number; saved: boolean }[] = [];

      for (const [slug, data] of Object.entries(postsByPerson)) {
        try {
          // Sort by likes (most popular first) and take top 30
          const topPosts = data.posts
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 30);

          const knowledge = await extractKnowledge(data.profile.name, data.profile.role, topPosts);

          const saved = await saveKnowledge(slug, {
            name: data.profile.name,
            slug,
            role: data.profile.role,
            ...knowledge,
            postCount: data.posts.length,
            lastUpdated: new Date().toISOString().split('T')[0],
          });

          results.push({ slug, name: data.profile.name, postCount: data.posts.length, saved });
        } catch (err: any) {
          results.push({ slug, name: data.profile.name, postCount: data.posts.length, saved: false });
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'done',
        results,
        totalPosts: allPosts.length,
        message: `Procesados ${results.length} perfiles`,
      }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
