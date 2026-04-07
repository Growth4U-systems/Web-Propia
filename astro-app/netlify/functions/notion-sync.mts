/**
 * notion-sync.mts
 * ─────────────────────────────────────────────────────────────────
 * Netlify Scheduled Function — se ejecuta cada 15 minutos.
 * Lee posts con Status=Ready del Content Calendar de Notion,
 * genera un blog GEO con Claude, publica en Firebase y marca
 * el post como Published en Notion.
 *
 * Variables de entorno necesarias en Netlify:
 *   NOTION_TOKEN
 *   NOTION_DB_ID
 *   ANTHROPIC_API_KEY
 */

import type { Config } from '@netlify/functions';

const NOTION_TOKEN   = process.env.NOTION_TOKEN ?? '';
const NOTION_DB_ID   = process.env.NOTION_DB_ID ?? '2c75dacf4f1481da8426d2e4411aa286';
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY ?? '';
const NETLIFY_HOOK   = 'https://api.netlify.com/build_hooks/69738cc3fc679a8f858929cd';

const FIREBASE_BASE  = 'https://firestore.googleapis.com/v1/projects/landing-growth4u/databases/(default)/documents';
const COLLECTION     = 'artifacts/growth4u-public-app/public/data/blog_posts';

const NOTION_HEADERS = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

const TYPE_TO_CATEGORY: Record<string, string> = {
  '💡 Aha':       'Estrategia',
  '⚔️ Conflicto': 'Marketing',
  '⚙️ Sistema':   'Growth',
  '🔥 Opinión':   'Estrategia',
  '🏆 Victoria':  'Growth',
};

const GEO_SYSTEM = `Eres experto en Growth Marketing para empresas tech B2B y B2C.
Convierte el borrador de LinkedIn en un artículo de blog completo en formato GEO en ESPAÑOL (800-1200 palabras).

Estructura OBLIGATORIA:
## Respuesta directa
[2-3 frases directas]
## [Sección 1]
## [Sección 2 con ### subsecciones]
| tabla | si | aplica |
## Preguntas frecuentes
**¿Pregunta?** Respuesta concisa.

Devuelve SOLO el Markdown del artículo.`;

// ── Slug ────────────────────────────────────────────────────────────────

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// ── Notion helpers ───────────────────────────────────────────────────────

function getPropText(props: any, key: string): string {
  const prop = props[key];
  if (!prop) return '';
  const items = prop[prop.type] ?? [];
  return items.map((t: any) => t.plain_text ?? '').join('');
}

function getPropSelect(props: any, key: string): string {
  const prop = props[key];
  if (!prop) return '';
  return prop[prop.type]?.name ?? '';
}

/**
 * Busca las 100 páginas más recientes del workspace y filtra por
 * database_id + Status=Ready (select). La DB es multi-source y no
 * acepta query directa.
 */
async function fetchReadyPages() {
  const targetDb = NOTION_DB_ID.replace(/-/g, '');
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: NOTION_HEADERS,
    body: JSON.stringify({
      filter: { value: 'page', property: 'object' },
      page_size: 100,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    }),
  });
  const data = await res.json();
  return (data.results ?? [] as any[]).filter((page: any) => {
    const pageDb = (page.parent?.database_id ?? '').replace(/-/g, '');
    if (pageDb !== targetDb) return false;
    const status = page.properties?.Status?.select?.name;
    return status === 'Ready';
  });
}

async function fetchPageContent(pageId: string): Promise<string> {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: NOTION_HEADERS,
  });
  const data = await res.json();
  const lines: string[] = [];

  for (const block of data.results ?? []) {
    const btype = block.type;
    const rich = block[btype]?.rich_text ?? [];
    const text = rich.map((t: any) => t.plain_text ?? '').join('');

    if (btype === 'heading_1') lines.push(`\n# ${text}`);
    else if (btype === 'heading_2') lines.push(`\n## ${text}`);
    else if (btype === 'heading_3') lines.push(`\n### ${text}`);
    else if (btype === 'bulleted_list_item') lines.push(`- ${text}`);
    else if (btype === 'numbered_list_item') lines.push(`1. ${text}`);
    else if (btype === 'paragraph' && text) lines.push(text);
    else if (btype === 'divider') lines.push('\n---\n');
  }

  return lines.join('\n').trim();
}

async function markPublished(pageId: string) {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: NOTION_HEADERS,
    body: JSON.stringify({ properties: { Status: { select: { name: 'Published' } } } }),
  });
}

// ── Claude GEO ───────────────────────────────────────────────────────────

async function generateGeo(title: string, draft: string, category: string): Promise<string> {
  if (!ANTHROPIC_KEY) return draft;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: GEO_SYSTEM,
      messages: [{ role: 'user', content: `Título: ${title}\nCategoría: ${category}\n\nBorrador:\n${draft}` }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? draft;
}

// ── Firebase ─────────────────────────────────────────────────────────────

async function postExistsInFirebase(title: string): Promise<boolean> {
  const res = await fetch(`${FIREBASE_BASE}/${COLLECTION}`);
  const data = await res.json();
  return (data.documents ?? []).some(
    (doc: any) =>
      doc.fields?.title?.stringValue?.toLowerCase().trim() === title.toLowerCase().trim()
  );
}

async function publishToFirebase(
  title: string, category: string, excerpt: string, content: string
): Promise<string> {
  const now = new Date().toISOString();
  const body = {
    fields: {
      title:     { stringValue: title },
      category:  { stringValue: category },
      excerpt:   { stringValue: excerpt },
      content:   { stringValue: content },
      image:     { stringValue: '' },
      readTime:  { stringValue: '6 min lectura' },
      author:    { stringValue: 'Equipo Growth4U' },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    },
  };
  const res = await fetch(`${FIREBASE_BASE}/${COLLECTION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.name.split('/').pop();
}

// ── Handler ──────────────────────────────────────────────────────────────

export default async function handler() {
  console.log('[notion-sync] Iniciando sincronización...');

  if (!NOTION_TOKEN) {
    console.error('[notion-sync] NOTION_TOKEN no configurado');
    return;
  }

  const pages = await fetchReadyPages();
  console.log(`[notion-sync] Posts Ready: ${pages.length}`);

  let published = 0;

  for (const page of pages) {
    const props    = page.properties;
    const pageId   = page.id;
    const title    = getPropText(props, 'Title');
    const ltype    = getPropSelect(props, 'Type');
    const category = TYPE_TO_CATEGORY[ltype] ?? 'Estrategia';

    console.log(`[notion-sync] Procesando: ${title.substring(0, 50)}`);

    // Evitar duplicados
    if (await postExistsInFirebase(title)) {
      console.log('[notion-sync] Ya existe — marcando Published en Notion');
      await markPublished(pageId);
      continue;
    }

    const draft = await fetchPageContent(pageId);
    if (!draft) { console.log('[notion-sync] Sin contenido — saltando'); continue; }

    const geoContent = await generateGeo(title, draft, category);
    const lines      = geoContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const excerpt    = lines[0]?.substring(0, 200) ?? title;

    try {
      const docId = await publishToFirebase(title, category, excerpt, geoContent);
      console.log(`[notion-sync] Firebase OK: ${docId} → /blog/${createSlug(title)}/`);
    } catch (e) {
      console.error('[notion-sync] Error Firebase:', e);
      continue;
    }

    await markPublished(pageId);
    published++;

    await new Promise(r => setTimeout(r, 1000));
  }

  if (published > 0) {
    // Sync all posts to Netlify Blobs cache before triggering build
    try {
      const allPostsUrl = `${FIREBASE_BASE}/${COLLECTION}?pageSize=300`;
      const allRes = await fetch(allPostsUrl);
      if (allRes.ok) {
        const allData = await allRes.json();
        const docs = allData.documents || [];
        const posts = docs.map((doc: any) => {
          const fields = doc.fields || {};
          const val = (f: string) => fields[f]?.stringValue || '';
          const id = (doc.name || '').split('/').pop();
          return {
            id, title: val('title'), slug: val('slug') || createSlug(val('title')),
            category: val('category') || 'Estrategia', excerpt: val('excerpt'),
            content: val('content'), image: val('image'),
            readTime: val('readTime') || '5 min lectura',
            author: val('author') || 'Equipo Growth4U',
            createdAt: fields.createdAt?.timestampValue || null,
            updatedAt: fields.updatedAt?.timestampValue || null,
          };
        }).filter((p: any) => p.title && p.slug);

        const { getStore } = await import('@netlify/blobs');
        const store = getStore('build-cache');
        await store.set('posts', JSON.stringify(posts));
        console.log(`[notion-sync] ${posts.length} posts guardados en Blobs cache`);
      }
    } catch (e) {
      console.warn('[notion-sync] No se pudo actualizar Blobs cache:', e);
    }

    await fetch(NETLIFY_HOOK, { method: 'POST' });
    console.log(`[notion-sync] Deploy disparado. ${published} post(s) publicado(s).`);
  } else {
    console.log('[notion-sync] Nada nuevo.');
  }
}

export const config: Config = {
  schedule: '*/15 * * * *',   // Cada 15 minutos
};
