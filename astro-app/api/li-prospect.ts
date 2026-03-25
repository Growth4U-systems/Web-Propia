export const config = { runtime: 'edge' };

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const FIREBASE_PROJECT = 'landing-growth4u';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/artifacts/growth4u-public-app/public/data`;

const REACTIONS_ACTOR = 'harvestapi~linkedin-post-reactions';
const COMMENTS_ACTOR = 'harvestapi~linkedin-post-comments';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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

function isCLevel(headline: string): boolean {
  return CLEVEL_PATTERNS.some((p) => p.test(headline));
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

// Extract person from Apify harvestapi actor output (profileScraperMode: "main")
// Returns: { actor: { name, position, linkedinUrl, location: { countryCode, linkedinText, parsed: { city, country } }, publicIdentifier } }
function extractPerson(item: any, _type: 'reaction' | 'comment'): {
  name: string; title: string; company: string; linkedinUrl: string;
  country: string; location: string;
} | null {
  const actor = item.actor || item.author || item;
  const name = actor.name || `${actor.firstName || ''} ${actor.lastName || ''}`.trim();
  const title = actor.position || actor.headline || actor.title || '';
  // Prefer public profile URL over internal ID URL
  const publicId = actor.publicIdentifier;
  const linkedinUrl = publicId
    ? `https://www.linkedin.com/in/${publicId}/`
    : actor.linkedinUrl || actor.profileUrl || '';
  if (!name || !title) return null;
  const atMatch = title.match(/(?:at|en|@)\s+(.+?)(?:\s*[|,]|$)/i);
  const company = atMatch ? atMatch[1].trim() : '';
  // Location from "main" profile mode
  const loc = actor.location || {};
  const country = loc.countryCode || '';
  const location = loc.linkedinText || loc.parsed?.text || '';
  return { name, title, company, linkedinUrl, country, location };
}

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

async function saveCandidate(candidate: {
  name: string; title: string; company: string; linkedinUrl: string;
  country: string; location: string;
  sourcePostUrl: string; sourceCreatorName: string; sourceCommentDraft: string;
  interactionType: string; profileType: string; reason: string;
}): Promise<boolean> {
  // Ensure all values are strings (Firebase REST API requires stringValue to be a string)
  const safe = (v: any) => String(v ?? '');
  const res = await fetch(`${FIREBASE_BASE}/li_candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: { stringValue: safe(candidate.name) },
        title: { stringValue: safe(candidate.title) },
        company: { stringValue: safe(candidate.company) },
        linkedinUrl: { stringValue: safe(candidate.linkedinUrl) },
        country: { stringValue: safe(candidate.country) },
        location: { stringValue: safe(candidate.location) },
        sourcePostUrl: { stringValue: safe(candidate.sourcePostUrl) },
        sourceCreatorName: { stringValue: safe(candidate.sourceCreatorName) },
        sourceCommentDraft: { stringValue: safe(candidate.sourceCommentDraft) },
        interactionType: { stringValue: safe(candidate.interactionType) },
        profileType: { stringValue: safe(candidate.profileType) },
        reason: { stringValue: safe(candidate.reason) },
        status: { stringValue: 'pending' },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Firebase save failed (${res.status}): ${errBody.slice(0, 200)}`);
  }
  return true;
}

async function getExistingUrls(): Promise<Set<string>> {
  const [candRes, prospRes] = await Promise.all([
    fetch(`${FIREBASE_BASE}/li_candidates?pageSize=500`),
    fetch(`${FIREBASE_BASE}/li_prospects?pageSize=500`),
  ]);
  const [candData, prospData] = await Promise.all([candRes.json(), prospRes.json()]);
  const urls = new Set<string>();
  for (const doc of [...(candData?.documents || []), ...(prospData?.documents || [])]) {
    const url = doc?.fields?.linkedinUrl?.stringValue;
    if (url) urls.add(url.replace(/\/$/, '').toLowerCase());
  }
  return urls;
}

// =====================================================
// ASYNC ARCHITECTURE — 3 actions via query param
// =====================================================
// POST ?action=start   → launches Apify actors for reactions+comments, returns run IDs
// GET  ?action=status   → checks if both Apify runs finished
// POST ?action=process  → fetches results, filters C-levels, generates reasons, saves to Firebase
// =====================================================

export default async function handler(req: Request) {
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
    if (action === 'start') {
      const body = await req.json().catch(() => ({}));
      const posts: { postUrl: string; creatorName: string }[] = (body as any)?.posts || [];
      const maxReactions = (body as any)?.maxReactions || 50;
      const maxComments = (body as any)?.maxComments || 30;

      if (posts.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No posts provided. Send { posts: [{ postUrl, creatorName }] }' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const postUrlList = posts.map((p) => p.postUrl);

      // Launch both actors in parallel
      // Apify actors expect: { posts: string[], maxItems: number, profileScraperMode: "main" }
      // "main" mode returns location/country data ($0.002/profile)
      const [reactionsRun, commentsRun] = await Promise.all([
        fetch(`https://api.apify.com/v2/acts/${REACTIONS_ACTOR}/runs?token=${APIFY_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: postUrlList, maxItems: maxReactions, profileScraperMode: 'main' }),
        }).then((r) => r.json()),
        fetch(`https://api.apify.com/v2/acts/${COMMENTS_ACTOR}/runs?token=${APIFY_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: postUrlList, maxItems: maxComments, profileScraperMode: 'main' }),
        }).then((r) => r.json()),
      ]);

      const reactionsRunId = reactionsRun?.data?.id;
      const reactionsDatasetId = reactionsRun?.data?.defaultDatasetId;
      const commentsRunId = commentsRun?.data?.id;
      const commentsDatasetId = commentsRun?.data?.defaultDatasetId;

      if (!reactionsRunId || !commentsRunId) {
        return new Response(JSON.stringify({
          error: 'Failed to start Apify actors',
          details: { reactionsRun: reactionsRun?.data, commentsRun: commentsRun?.data },
        }), { status: 500, headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'started',
        reactionsRunId,
        reactionsDatasetId,
        commentsRunId,
        commentsDatasetId,
        posts: posts.length,
        // Pass along posts info for the process step
        postsData: posts,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: STATUS ----
    if (action === 'status') {
      const reactionsRunId = url.searchParams.get('reactionsRunId');
      const commentsRunId = url.searchParams.get('commentsRunId');

      if (!reactionsRunId || !commentsRunId) {
        return new Response(JSON.stringify({ error: 'Missing reactionsRunId or commentsRunId' }), { status: 400, headers: CORS_HEADERS });
      }

      const [reactionsStatus, commentsStatus] = await Promise.all([
        fetch(`https://api.apify.com/v2/acts/${REACTIONS_ACTOR}/runs/${reactionsRunId}?token=${APIFY_TOKEN}`).then((r) => r.json()),
        fetch(`https://api.apify.com/v2/acts/${COMMENTS_ACTOR}/runs/${commentsRunId}?token=${APIFY_TOKEN}`).then((r) => r.json()),
      ]);

      const rStatus = reactionsStatus?.data?.status;
      const cStatus = commentsStatus?.data?.status;
      const isDone = (s: string) => s === 'SUCCEEDED' || s === 'FAILED' || s === 'ABORTED';

      return new Response(JSON.stringify({
        ok: true,
        reactionsStatus: rStatus,
        commentsStatus: cStatus,
        finished: isDone(rStatus) && isDone(cStatus),
        reactionsDatasetId: reactionsStatus?.data?.defaultDatasetId,
        commentsDatasetId: commentsStatus?.data?.defaultDatasetId,
      }), { status: 200, headers: CORS_HEADERS });
    }

    // ---- ACTION: PROCESS ----
    if (action === 'process') {
      const body = await req.json().catch(() => ({}));
      const reactionsDatasetId = (body as any)?.reactionsDatasetId;
      const commentsDatasetId = (body as any)?.commentsDatasetId;
      const postsData: { postUrl: string; creatorName: string; postSnippet?: string; commentDraft?: string }[] = (body as any)?.postsData || [];
      const offset = (body as any)?.offset || 0;
      const batchSize = 10;

      if (!reactionsDatasetId && !commentsDatasetId) {
        return new Response(JSON.stringify({ error: 'Missing dataset IDs' }), { status: 400, headers: CORS_HEADERS });
      }

      // Normalize URLs for matching (remove trailing slashes, lowercase)
      const normalizeUrl = (u: string) => u.replace(/\/+$/, '').toLowerCase();
      const creatorMap = new Map(postsData.map((p) => [normalizeUrl(p.postUrl), p.creatorName]));
      // Map post URL → post content snippet (prefer postSnippet, fallback to commentDraft for backwards compat)
      const snippetMap = new Map(postsData.filter((p) => p.postSnippet || p.commentDraft).map((p) => [normalizeUrl(p.postUrl), (p.postSnippet || p.commentDraft)!]));
      const postUrls = postsData.map((p) => p.postUrl);

      // Fuzzy lookup: try exact match, then check if either URL contains the other
      const findInMap = (postUrl: string, map: Map<string, string>, fallback: string): string => {
        const norm = normalizeUrl(postUrl);
        if (map.has(norm)) return map.get(norm)!;
        for (const [key, val] of map) {
          if (norm.includes(key) || key.includes(norm)) return val;
        }
        return fallback;
      };
      const findCreator = (postUrl: string) => findInMap(postUrl, creatorMap, 'Unknown');
      const findSnippet = (postUrl: string) => findInMap(postUrl, snippetMap, '');

      // Fetch all reactions + comments from Apify datasets
      const [reactionsItems, commentsItems] = await Promise.all([
        reactionsDatasetId
          ? fetch(`https://api.apify.com/v2/datasets/${reactionsDatasetId}/items?token=${APIFY_TOKEN}`).then((r) => r.json()).catch(() => [])
          : [],
        commentsDatasetId
          ? fetch(`https://api.apify.com/v2/datasets/${commentsDatasetId}/items?token=${APIFY_TOKEN}`).then((r) => r.json()).catch(() => [])
          : [],
      ]);

      // Combine all people
      const allPeople: {
        person: { name: string; title: string; company: string; linkedinUrl: string; country: string; location: string };
        interactionType: 'like' | 'comment';
        postUrl: string;
      }[] = [];

      // Helper: Apify query can be { post: "url" } object or a plain string
      const extractPostUrl = (item: any): string => {
        if (item.postUrl) return item.postUrl;
        if (typeof item.query === 'string') return item.query;
        if (item.query?.post) return item.query.post;
        return postUrls[0] || '';
      };

      for (const r of (reactionsItems || [])) {
        const person = extractPerson(r, 'reaction');
        if (!person) continue;
        allPeople.push({ person, interactionType: 'like', postUrl: extractPostUrl(r) });
      }

      for (const c of (commentsItems || [])) {
        const person = extractPerson(c, 'comment');
        if (!person) continue;
        allPeople.push({ person, interactionType: 'comment', postUrl: extractPostUrl(c) });
      }

      // Apply offset + batch for processing (Claude reason generation is slow)
      const batch = allPeople.slice(offset, offset + batchSize);
      if (batch.length === 0) {
        return new Response(JSON.stringify({
          ok: true,
          phase: 'done',
          totalPeople: allPeople.length,
          message: 'All interactions processed',
        }), { status: 200, headers: CORS_HEADERS });
      }

      // Fetch existing to dedup
      const allExisting = await getExistingUrls();

      let saved = 0;
      let filtered = 0;
      let duplicates = 0;
      const errorDetails: string[] = [];

      for (const { person, interactionType, postUrl } of batch) {
        try {
          if (!isCLevel(person.title)) {
            filtered++;
            continue;
          }

          const cleanUrl = person.linkedinUrl.replace(/\/$/, '').toLowerCase();
          if (cleanUrl && allExisting.has(cleanUrl)) {
            duplicates++;
            continue;
          }

          const reason = await generateReason(person);
          const profileType = detectProfileType(person.title);
          const creatorName = findCreator(postUrl);

          const ok = await saveCandidate({
            name: person.name,
            title: person.title,
            company: person.company,
            linkedinUrl: person.linkedinUrl,
            country: person.country,
            location: person.location,
            sourcePostUrl: postUrl,
            sourceCreatorName: creatorName,
            sourceCommentDraft: findSnippet(postUrl),
            interactionType,
            profileType,
            reason,
          });

          saved++;
          allExisting.add(cleanUrl);
        } catch (e: any) {
          errorDetails.push(e.message || 'Unknown error');
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        phase: 'process',
        totalPeople: allPeople.length,
        processed: batch.length,
        nextOffset: offset + batch.length,
        hasMore: offset + batch.length < allPeople.length,
        saved,
        filtered,
        duplicates,
        errorDetails: errorDetails.slice(0, 5),
      }), { status: 200, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
