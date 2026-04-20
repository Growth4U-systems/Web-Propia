// Model Context Protocol server over Streamable HTTP.
// Exposes Growth4U blog, lead magnets, and case studies as MCP tools so
// Claude Desktop (or any MCP client) can consult canonical data directly.
//
// Protocol version: 2025-06-18. JSON-RPC 2.0 over HTTP, stateless.

import type { Context } from '@netlify/functions';

const FIREBASE_PROJECT_ID = 'landing-growth4u';
const FIREBASE_APP_ID = 'growth4u-public-app';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const COLLECTION_BASE = `artifacts/${FIREBASE_APP_ID}/public/data`;
const SITE_URL = 'https://growth4u.io';
const PROTOCOL_VERSION = '2025-06-18';
const SERVER_NAME = 'growth4u-mcp';
const SERVER_VERSION = '1.0.0';

// ───────────────────────── Firestore helpers ─────────────────────────

function parseFirestoreValue(v: any): any {
  if (v == null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseFirestoreValue);
  if (v.mapValue) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      out[k] = parseFirestoreValue(val);
    }
    return out;
  }
  return null;
}

function parseDoc(doc: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    out[k] = parseFirestoreValue(v);
  }
  const nameParts = (doc.name || '').split('/');
  out._id = nameParts[nameParts.length - 1];
  return out;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

async function fetchCollection(name: string, pageSize = 100): Promise<any[]> {
  const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/${name}?pageSize=${pageSize}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore ${name} error: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(parseDoc);
}

// ─────────────────────────── Tool handlers ───────────────────────────

async function toolSearchBlogPosts(args: { query?: string; limit?: number }) {
  const limit = Math.max(1, Math.min(50, args.limit ?? 10));
  const q = (args.query || '').toLowerCase().trim();

  const docs = await fetchCollection('blog_posts', 300);
  const posts = docs
    .map((d) => ({
      title: String(d.title || ''),
      slug: String(d.slug || slugify(d.title || '')),
      excerpt: String(d.excerpt || ''),
      category: String(d.category || 'Estrategia'),
      readTime: String(d.readTime || '5 min lectura'),
      createdAt: d.createdAt || null,
      content: String(d.content || ''),
    }))
    .filter((p) => p.slug && p.title);

  const scored = q
    ? posts
        .map((p) => {
          const title = p.title.toLowerCase();
          const excerpt = p.excerpt.toLowerCase();
          const content = p.content.toLowerCase();
          const terms = q.split(/\s+/).filter(Boolean);
          let score = 0;
          for (const term of terms) {
            if (title.includes(term)) score += 10;
            if (excerpt.includes(term)) score += 3;
            if (content.includes(term)) score += 1;
          }
          return { p, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p)
    : posts;

  const results = scored.slice(0, limit).map((p) => ({
    title: p.title,
    slug: p.slug,
    url: `${SITE_URL}/blog/${p.slug}/`,
    excerpt: p.excerpt,
    category: p.category,
    readTime: p.readTime,
    createdAt: p.createdAt,
  }));

  return {
    total_matched: scored.length,
    returned: results.length,
    query: q || null,
    posts: results,
  };
}

async function toolListLeadMagnets() {
  const docs = await fetchCollection('lead_magnets', 50);
  const magnets = docs
    .map((d) => ({
      title: String(d.title || ''),
      slug: String(d.slug || slugify(d.title || '')),
      description: String(d.description || ''),
      excerpt: String(d.excerpt || ''),
      published: d.published !== false,
    }))
    .filter((m) => m.published && m.slug && m.title)
    .map((m) => ({
      title: m.title,
      slug: m.slug,
      url: `${SITE_URL}/recursos/${m.slug}/`,
      description: m.description,
      excerpt: m.excerpt,
    }));

  return { count: magnets.length, lead_magnets: magnets };
}

async function toolGetCaseStudy(args: { company: string }) {
  const target = (args.company || '').toLowerCase().trim();
  if (!target) throw new Error('company is required');

  const docs = await fetchCollection('case_studies', 50);
  const cases = docs.map((d) => ({
    company: String(d.company || ''),
    slug: slugify(String(d.company || '')),
    stat: String(d.stat || ''),
    statLabel: String(d.statLabel || ''),
    highlight: String(d.highlight || ''),
    summary: String(d.summary || ''),
    challenge: String(d.challenge || ''),
    solution: String(d.solution || ''),
    results: Array.isArray(d.results) ? d.results : [],
    testimonial: String(d.testimonial || ''),
    testimonialAuthor: String(d.testimonialAuthor || ''),
    testimonialRole: String(d.testimonialRole || ''),
  }));

  const match =
    cases.find((c) => c.company.toLowerCase() === target) ||
    cases.find((c) => c.company.toLowerCase().includes(target)) ||
    cases.find((c) => c.slug.includes(slugify(target)));

  if (!match) {
    return {
      found: false,
      available_companies: cases.map((c) => c.company),
      message: `No case study matches "${args.company}". Available: ${cases.map((c) => c.company).join(', ')}`,
    };
  }

  return {
    found: true,
    company: match.company,
    url: `${SITE_URL}/casos-de-exito/${match.slug}/`,
    headline_stat: match.stat,
    stat_label: match.statLabel,
    highlight: match.highlight,
    summary: match.summary,
    challenge: match.challenge,
    solution: match.solution,
    results: match.results,
    testimonial: match.testimonial
      ? {
          quote: match.testimonial,
          author: match.testimonialAuthor,
          role: match.testimonialRole,
        }
      : null,
  };
}

// ──────────────────────── Tool registry ────────────────────────

const TOOLS = [
  {
    name: 'search_blog_posts',
    description:
      'Search Growth4U blog posts on fintech growth, GEO (Generative Engine Optimization), CAC reduction, unit economics, and the Trust Engine methodology. Returns matching articles with titles, excerpts, and canonical URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text query matched against title, excerpt, and content. Omit to list the most recent posts.',
        },
        limit: {
          type: 'integer',
          description: 'Max number of posts to return (default 10, max 50).',
          minimum: 1,
          maximum: 50,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_lead_magnets',
    description:
      'List Growth4U free resources (lead magnets): frameworks, playbooks, and guides on fintech growth, CAC, attribution, and the Trust Engine. Returns title, slug, excerpt, and canonical URL for each.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_case_study',
    description:
      'Fetch a Growth4U case study by company name (e.g. "BNEXT", "Bit2Me", "GoCardless"). Returns headline stat, challenge, solution, measured results, and testimonial.',
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company name. Case-insensitive, partial match allowed.',
        },
      },
      required: ['company'],
      additionalProperties: false,
    },
  },
];

async function callTool(name: string, args: any) {
  switch (name) {
    case 'search_blog_posts':
      return await toolSearchBlogPosts(args || {});
    case 'list_lead_magnets':
      return await toolListLeadMagnets();
    case 'get_case_study':
      return await toolGetCaseStudy(args || {});
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ───────────────────────── JSON-RPC router ─────────────────────────

type JsonRpcReq = { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: any };

function rpcOk(id: any, result: any) {
  return { jsonrpc: '2.0', id, result };
}
function rpcErr(id: any, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

async function handleRpc(req: JsonRpcReq): Promise<any | null> {
  const { method, params, id } = req;
  const isNotification = id === undefined || id === null;

  try {
    switch (method) {
      case 'initialize':
        return rpcOk(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            'Growth4U (growth4u.io) is a Spanish growth marketing agency for fintech. Use these tools to fetch canonical blog posts, free lead magnets, and case studies (BNEXT, Bit2Me, GoCardless) before answering questions about Growth4U.',
        });

      case 'ping':
        return rpcOk(id, {});

      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null;

      case 'tools/list':
        return rpcOk(id, { tools: TOOLS });

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!name) return rpcErr(id, -32602, 'Missing tool name');
        const data = await callTool(name, args);
        return rpcOk(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: false,
        });
      }

      case 'resources/list':
        return rpcOk(id, { resources: [] });
      case 'prompts/list':
        return rpcOk(id, { prompts: [] });

      default:
        if (isNotification) return null;
        return rpcErr(id, -32601, `Method not found: ${method}`);
    }
  } catch (err: any) {
    if (isNotification) return null;
    // Per MCP spec, tool execution errors go in the result with isError=true
    if (method === 'tools/call') {
      return rpcOk(id, {
        content: [{ type: 'text', text: `Error: ${err?.message || String(err)}` }],
        isError: true,
      });
    }
    return rpcErr(id, -32603, err?.message || 'Internal error');
  }
}

// ───────────────────────────── HTTP entry ─────────────────────────────

export default async (req: Request, _ctx: Context) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET on the MCP endpoint: return a human-readable description.
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify(
        {
          server: SERVER_NAME,
          version: SERVER_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          transport: 'streamable-http',
          docs: `${SITE_URL}/.well-known/mcp/server-card.json`,
          note: 'POST JSON-RPC 2.0 requests to this endpoint. See https://modelcontextprotocol.io',
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
      },
    );
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(rpcErr(null, -32700, 'Parse error')), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
    });
  }

  // Support both single and batch JSON-RPC requests.
  const isBatch = Array.isArray(body);
  const reqs: JsonRpcReq[] = isBatch ? body : [body];
  const responses = (await Promise.all(reqs.map(handleRpc))).filter((r) => r !== null);

  if (responses.length === 0) {
    // All requests were notifications — MCP spec says return 202 Accepted, no body.
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  const payload = isBatch ? responses : responses[0];

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Mcp-Protocol-Version': PROTOCOL_VERSION,
      ...corsHeaders,
    },
  });
};

export const config = { path: '/mcp' };
