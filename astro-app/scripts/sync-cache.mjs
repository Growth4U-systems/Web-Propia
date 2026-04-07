/**
 * Pre-build cache sync: fetches all posts and lead magnets from Firebase
 * and writes them to local JSON cache files. Runs before `astro build`
 * so the build never depends on Firebase availability at page-generation time.
 *
 * If Firebase is unreachable, the existing cache is preserved (build still works).
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');

const PROJECT_ID = 'landing-growth4u';
const APP_ID = 'growth4u-public-app';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COLLECTION_BASE = `artifacts/${APP_ID}/public/data`;

// ── Helpers ──────────────────────────────────────────────

function parseFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if (value.mapValue) {
    const result = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return null;
}

function parseDocument(doc) {
  const fields = doc.fields || {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  const nameParts = (doc.name || '').split('/');
  result._id = nameParts[nameParts.length - 1];
  return result;
}

function createSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

async function fetchWithRetry(url, retries = 3, delayMs = 3000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status !== 429 || attempt === retries) return response;
      console.warn(`  ⚠ Firebase 429, retry ${attempt + 1}/${retries} in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Network error, retry ${attempt + 1}/${retries}...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return fetch(url);
}

function readExistingCache(filename) {
  try {
    const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Sync functions ───────────────────────────────────────

async function syncPosts() {
  const cacheFile = 'posts.json';
  const existing = readExistingCache(cacheFile);
  console.log(`📦 Cache actual: ${existing.length} posts`);

  const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/blog_posts?pageSize=300`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    console.warn(`  ⚠ Firebase respondió ${response.status}, manteniendo cache existente`);
    return existing.length;
  }

  const data = await response.json();
  const documents = data.documents || [];

  const posts = documents
    .map((doc) => {
      const d = parseDocument(doc);
      return {
        id: d._id,
        title: d.title || '',
        slug: d.slug || createSlug(d.title || ''),
        category: d.category || 'Estrategia',
        excerpt: d.excerpt || '',
        content: d.content || '',
        image: d.image || '',
        readTime: d.readTime || '5 min lectura',
        author: d.author || 'Equipo Growth4U',
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      };
    })
    .filter((p) => p.slug && p.title);

  if (posts.length === 0) {
    console.warn('  ⚠ Firebase devolvió 0 posts, manteniendo cache existente');
    return existing.length;
  }

  // Merge: Firebase wins for duplicates, keep cache-only posts
  const slugMap = new Map();
  for (const p of existing) slugMap.set(p.slug, p);
  for (const p of posts) slugMap.set(p.slug, p);
  const merged = Array.from(slugMap.values());

  writeFileSync(join(DATA_DIR, cacheFile), JSON.stringify(merged, null, 2));
  console.log(`  ✅ ${posts.length} de Firebase + ${existing.length} en cache → ${merged.length} posts sincronizados`);
  return merged.length;
}

async function syncLeadMagnets() {
  const cacheFile = 'lead_magnets.json';
  const existing = readExistingCache(cacheFile);
  console.log(`📦 Cache actual: ${existing.length} lead magnets`);

  const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/lead_magnets?pageSize=100`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    console.warn(`  ⚠ Firebase respondió ${response.status}, manteniendo cache existente`);
    return existing.length;
  }

  const data = await response.json();
  const documents = data.documents || [];

  const magnets = documents
    .map((doc) => {
      const d = parseDocument(doc);
      return {
        id: d._id,
        title: d.title || '',
        slug: d.slug || createSlug(d.title || ''),
        description: d.description || '',
        image: d.image || '',
        excerpt: d.excerpt || '',
        contentUrl: d.contentUrl || '',
        published: d.published !== false,
      };
    })
    .filter((m) => m.published && m.slug && m.title);

  if (magnets.length === 0) {
    console.warn('  ⚠ Firebase devolvió 0 lead magnets, manteniendo cache existente');
    return existing.length;
  }

  const slugMap = new Map();
  for (const m of existing) slugMap.set(m.slug, m);
  for (const m of magnets) slugMap.set(m.slug, m);
  const merged = Array.from(slugMap.values());

  writeFileSync(join(DATA_DIR, cacheFile), JSON.stringify(merged, null, 2));
  console.log(`  ✅ ${magnets.length} de Firebase + ${existing.length} en cache → ${merged.length} lead magnets sincronizados`);
  return merged.length;
}

// ── Main ─────────────────────────────────────────────────

console.log('\n🔄 Sincronizando cache desde Firebase...\n');

try {
  const [posts, magnets] = await Promise.all([syncPosts(), syncLeadMagnets()]);
  console.log(`\n✅ Cache sincronizado: ${posts} posts, ${magnets} lead magnets\n`);
} catch (err) {
  console.error('\n⚠ Error sincronizando cache (el build usará cache existente):', err.message, '\n');
  // Don't exit with error — build should proceed with existing cache
}
