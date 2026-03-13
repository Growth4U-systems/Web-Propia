import type { Context } from "@netlify/functions";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;

const REACTIONS_ACTOR = 'harvestapi~linkedin-post-reactions';
const COMMENTS_ACTOR = 'harvestapi~linkedin-post-comments';

// C-level and senior titles to match
const CLEVEL_PATTERNS = [
  /\bceo\b/i, /\bcto\b/i, /\bcmo\b/i, /\bcoo\b/i, /\bcfo\b/i, /\bcpo\b/i, /\bcro\b/i,
  /\bchief\b/i,
  /\bfounder\b/i, /\bco-?founder\b/i, /\bfundador/i,
  /\bvp\b/i, /\bvice president\b/i,
  /\bhead of\b/i, /\bdirector\b/i,
  /\bgeneral manager\b/i, /\bmanaging director\b/i,
  /\bpartner\b/i,
];

// Tech/startup company indicators
const TECH_PATTERNS = [
  /\bsaas\b/i, /\bfintech\b/i, /\bstartup\b/i, /\bscale-?up\b/i,
  /\btech\b/i, /\bsoftware\b/i, /\bplatform\b/i, /\bapp\b/i,
  /\bai\b/i, /\bml\b/i, /\bdata\b/i, /\bcloud\b/i,
  /\be-?commerce\b/i, /\bmarketplace\b/i, /\bdigital\b/i,
];

// --- Helpers ---

async function runApifyActor(actorId: string, input: Record<string, any>): Promise<any[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  const runData = await runRes.json();
  const runId = runData?.data?.id;
  const datasetId = runData?.data?.defaultDatasetId;
  if (!runId) throw new Error(`Failed to start Apify actor ${actorId}`);

  // Poll until done (max 5 min)
  const maxWait = 300_000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify actor ${actorId} ${status}`);
    }
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  return itemsRes.json();
}

function isCLevel(headline: string): boolean {
  return CLEVEL_PATTERNS.some((p) => p.test(headline));
}

function isTechRelated(headline: string): boolean {
  return TECH_PATTERNS.some((p) => p.test(headline));
}

function detectProfileType(headline: string): string {
  const h = headline.toLowerCase();
  if (/\bceo\b/.test(h)) return 'ceo';
  if (/\bcto\b/.test(h)) return 'cto';
  if (/\bcmo\b/.test(h)) return 'cmo';
  if (/\bcoo\b/.test(h)) return 'coo';
  if (/\bvp.*(growth|marketing|product)\b/.test(h)) return 'vp_growth';
  if (/\bhead.*(growth|marketing)\b/.test(h)) return 'head_growth';
  if (/\b(founder|co-?founder|fundador)\b/.test(h)) return 'founder';
  if (/\b(growth)\b/.test(h)) return 'growth_expert';
  return 'other';
}

// Extract person info from reaction or comment — handles various Apify output formats
function extractPerson(item: any, type: 'reaction' | 'comment'): {
  name: string; title: string; company: string; linkedinUrl: string;
} | null {
  if (type === 'reaction') {
    // harvestapi format: firstName, lastName, headline, profileUrl, OR nested author
    const firstName = item.firstName || item.author?.firstName || '';
    const lastName = item.lastName || item.author?.lastName || '';
    const name = (item.name || `${firstName} ${lastName}`).trim();
    const title = item.headline || item.title || item.author?.headline || '';
    const linkedinUrl = item.profileUrl || item.linkedinUrl || item.author?.linkedinUrl || '';
    if (!name || !title) return null;
    // Try to extract company from headline (usually "Title at Company")
    const atMatch = title.match(/(?:at|en|@)\s+(.+?)(?:\s*\||$)/i);
    const company = atMatch ? atMatch[1].trim() : '';
    return { name, title, company, linkedinUrl };
  } else {
    // Comment format: author object with profile data
    const author = item.author || item;
    const firstName = author.firstName || '';
    const lastName = author.lastName || '';
    const name = (author.name || `${firstName} ${lastName}`).trim();
    const title = author.headline || author.title || '';
    const linkedinUrl = author.profileUrl || author.linkedinUrl || '';
    if (!name || !title) return null;
    const atMatch = title.match(/(?:at|en|@)\s+(.+?)(?:\s*\||$)/i);
    const company = atMatch ? atMatch[1].trim() : '';
    return { name, title, company, linkedinUrl };
  }
}

// Use Claude to generate a reason why this person is a good prospect
async function generateReason(person: { name: string; title: string; company: string }): Promise<string> {
  if (!ANTHROPIC_KEY) return `${person.title}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `En máximo 15 palabras, explica por qué ${person.name} (${person.title}${person.company ? ` en ${person.company}` : ''}) es un prospect interesante para una consultora de Growth Marketing para startups tech B2B/B2C. Solo la razón, sin preámbulo.`,
        }],
      }),
    });
    const data = await res.json();
    return data?.content?.[0]?.text || person.title;
  } catch {
    return person.title;
  }
}

// Save candidate to Firebase
async function saveCandidate(candidate: {
  name: string; title: string; company: string; linkedinUrl: string;
  sourcePostUrl: string; sourceCreatorName: string; interactionType: string;
  profileType: string; reason: string;
}): Promise<boolean> {
  const res = await fetch(`${FIREBASE_BASE}/li_candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: { stringValue: candidate.name },
        title: { stringValue: candidate.title },
        company: { stringValue: candidate.company },
        linkedinUrl: { stringValue: candidate.linkedinUrl },
        sourcePostUrl: { stringValue: candidate.sourcePostUrl },
        sourceCreatorName: { stringValue: candidate.sourceCreatorName },
        interactionType: { stringValue: candidate.interactionType },
        profileType: { stringValue: candidate.profileType },
        reason: { stringValue: candidate.reason },
        status: { stringValue: 'pending' },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  return res.ok;
}

// Check existing candidates to avoid duplicates
async function getExistingCandidateUrls(): Promise<Set<string>> {
  const res = await fetch(`${FIREBASE_BASE}/li_candidates?pageSize=500`);
  const data = await res.json();
  const urls = new Set<string>();
  for (const doc of data?.documents || []) {
    const url = doc?.fields?.linkedinUrl?.stringValue;
    if (url) urls.add(url.replace(/\/$/, '').toLowerCase());
  }
  return urls;
}

// Also check existing prospects to avoid duplicates
async function getExistingProspectUrls(): Promise<Set<string>> {
  const res = await fetch(`${FIREBASE_BASE}/li_prospects?pageSize=500`);
  const data = await res.json();
  const urls = new Set<string>();
  for (const doc of data?.documents || []) {
    const url = doc?.fields?.linkedinUrl?.stringValue;
    if (url) urls.add(url.replace(/\/$/, '').toLowerCase());
  }
  return urls;
}

// --- Main handler ---

export default async (req: Request, _context: Context) => {
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

  if (!APIFY_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Missing APIFY_API_TOKEN' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    // Accept post URLs + creator names to scan
    const posts: { postUrl: string; creatorName: string }[] = (body as any)?.posts || [];
    const maxReactions = (body as any)?.maxReactions || 50;
    const maxComments = (body as any)?.maxComments || 30;

    if (posts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No posts provided. Send { posts: [{ postUrl, creatorName }] }' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const postUrls = posts.map((p) => p.postUrl);
    const creatorMap = new Map(posts.map((p) => [p.postUrl, p.creatorName]));

    // Fetch existing to dedup
    const [existingCandidates, existingProspects] = await Promise.all([
      getExistingCandidateUrls(),
      getExistingProspectUrls(),
    ]);
    const allExisting = new Set([...existingCandidates, ...existingProspects]);

    // Scrape reactions and comments in parallel
    const [reactions, comments] = await Promise.all([
      runApifyActor(REACTIONS_ACTOR, { postUrls, maxReactions }).catch(() => []),
      runApifyActor(COMMENTS_ACTOR, { postUrls, maxComments }).catch(() => []),
    ]);

    // Process all interactions
    const allPeople: {
      person: { name: string; title: string; company: string; linkedinUrl: string };
      interactionType: 'like' | 'comment';
      postUrl: string;
    }[] = [];

    for (const r of reactions) {
      const person = extractPerson(r, 'reaction');
      if (!person) continue;
      const postUrl = r.postUrl || r.query || postUrls[0] || '';
      allPeople.push({ person, interactionType: 'like', postUrl });
    }

    for (const c of comments) {
      const person = extractPerson(c, 'comment');
      if (!person) continue;
      const postUrl = c.postUrl || c.query || postUrls[0] || '';
      allPeople.push({ person, interactionType: 'comment', postUrl });
    }

    // Filter: C-level + tech related + not already known
    let saved = 0;
    let filtered = 0;
    let duplicates = 0;

    for (const { person, interactionType, postUrl } of allPeople) {
      // Must be C-level/senior
      if (!isCLevel(person.title)) {
        filtered++;
        continue;
      }

      // Dedup
      const cleanUrl = person.linkedinUrl.replace(/\/$/, '').toLowerCase();
      if (cleanUrl && allExisting.has(cleanUrl)) {
        duplicates++;
        continue;
      }

      // Generate reason (use Claude Haiku for speed/cost)
      const reason = await generateReason(person);
      const profileType = detectProfileType(person.title);
      const creatorName = creatorMap.get(postUrl) || 'Unknown';

      const ok = await saveCandidate({
        name: person.name,
        title: person.title,
        company: person.company,
        linkedinUrl: person.linkedinUrl,
        sourcePostUrl: postUrl,
        sourceCreatorName: creatorName,
        interactionType,
        profileType,
        reason,
      });

      if (ok) {
        saved++;
        allExisting.add(cleanUrl); // prevent dupes within same run
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      totalReactions: reactions.length,
      totalComments: comments.length,
      totalPeople: allPeople.length,
      filtered,
      duplicates,
      candidatesSaved: saved,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
