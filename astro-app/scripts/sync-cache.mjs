/**
 * Pre-build cache sync — runs before `astro build`.
 *
 * Priority chain (first success wins):
 *   1. Netlify Blobs  — written by admin panel via update-posts-cache function
 *   2. Firebase REST   — direct fetch with retry/backoff
 *   3. Local JSON cache — committed in the repo (always available)
 *
 * The build NEVER fails due to external service issues.
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

const IS_NETLIFY = !!process.env.NETLIFY;

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

function readLocalCache(filename) {
  try {
    const raw = readFileSync(join(DATA_DIR, filename), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Netlify Blobs reader ─────────────────────────────────

async function readFromBlobs(key) {
  if (!IS_NETLIFY) return null;

  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('build-cache');
    const raw = await store.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      console.log(`  ☁️  Netlify Blobs: ${data.length} ${key} encontrados`);
      return data;
    }
    return null;
  } catch (err) {
    console.warn(`  ⚠ Error leyendo Blobs (${key}):`, err.message);
    return null;
  }
}

// ── Firebase reader ──────────────────────────────────────

async function fetchPostsFromFirebase() {
  const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/blog_posts?pageSize=300`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return null;

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

  return posts.length > 0 ? posts : null;
}

async function fetchLeadMagnetsFromFirebase() {
  const url = `${FIRESTORE_BASE}/${COLLECTION_BASE}/lead_magnets?pageSize=100`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return null;

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

  return magnets.length > 0 ? magnets : null;
}

// ── Merge + write ────────────────────────────────────────

function mergeAndWrite(fresh, local, filename) {
  const slugMap = new Map();
  for (const item of local) slugMap.set(item.slug, item);
  for (const item of fresh) slugMap.set(item.slug, item);
  const merged = Array.from(slugMap.values());
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(merged, null, 2));
  return merged.length;
}

// ── Sync with priority chain ─────────────────────────────

async function syncPosts() {
  const local = readLocalCache('posts.json');
  console.log(`📦 Cache local: ${local.length} posts`);

  // 1. Try Netlify Blobs (fastest, most reliable in build)
  const fromBlobs = await readFromBlobs('posts');
  if (fromBlobs) {
    const total = mergeAndWrite(fromBlobs, local, 'posts.json');
    console.log(`  ✅ Blobs + local → ${total} posts`);
    return total;
  }

  // 2. Try Firebase REST
  try {
    const fromFirebase = await fetchPostsFromFirebase();
    if (fromFirebase) {
      const total = mergeAndWrite(fromFirebase, local, 'posts.json');
      console.log(`  ✅ Firebase (${fromFirebase.length}) + local → ${total} posts`);
      return total;
    }
  } catch (err) {
    console.warn('  ⚠ Firebase error:', err.message);
  }

  // 3. Fallback: local cache (always works)
  console.log('  📄 Usando cache local existente');
  return local.length;
}

async function syncLeadMagnets() {
  const local = readLocalCache('lead_magnets.json');
  console.log(`📦 Cache local: ${local.length} lead magnets`);

  // 1. Try Netlify Blobs
  const fromBlobs = await readFromBlobs('lead_magnets');
  if (fromBlobs) {
    const total = mergeAndWrite(fromBlobs, local, 'lead_magnets.json');
    console.log(`  ✅ Blobs + local → ${total} lead magnets`);
    return total;
  }

  // 2. Try Firebase REST
  try {
    const fromFirebase = await fetchLeadMagnetsFromFirebase();
    if (fromFirebase) {
      const total = mergeAndWrite(fromFirebase, local, 'lead_magnets.json');
      console.log(`  ✅ Firebase (${fromFirebase.length}) + local → ${total} lead magnets`);
      return total;
    }
  } catch (err) {
    console.warn('  ⚠ Firebase error:', err.message);
  }

  // 3. Fallback: local cache
  console.log('  📄 Usando cache local existente');
  return local.length;
}

// ── Main ─────────────────────────────────────────────────

console.log('\n🔄 Sincronizando cache...');
console.log(`   Entorno: ${IS_NETLIFY ? 'Netlify Build' : 'Local'}\n`);

try {
  const [posts, magnets] = await Promise.all([syncPosts(), syncLeadMagnets()]);
  console.log(`\n✅ Cache listo: ${posts} posts, ${magnets} lead magnets\n`);
} catch (err) {
  console.error('\n⚠ Error sincronizando (el build usará cache existente):', err.message, '\n');
}
