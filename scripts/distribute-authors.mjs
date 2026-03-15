/**
 * Distribute blog posts among 3 authors.
 *
 * Distribution: ~50% Alfonso, ~33% Martín, ~17% Philippe
 *
 * Strategy: deterministic assignment based on post index (sorted by createdAt).
 * Every 6 posts: 3 → Alfonso, 2 → Martín, 1 → Philippe.
 *
 * Usage:
 *   node scripts/distribute-authors.mjs              # dry-run (preview)
 *   node scripts/distribute-authors.mjs --apply      # update posts.json
 *   node scripts/distribute-authors.mjs --firebase   # update posts.json + Firebase
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_PATH = join(__dirname, '..', 'astro-app', 'src', 'data', 'posts.json');

const AUTHORS = [
  'Alfonso Sainz de Baranda',
  'Alfonso Sainz de Baranda',
  'Alfonso Sainz de Baranda',
  'Martín Fila',
  'Martín Fila',
  'Philippe Sainthubert',
];

const FIREBASE_PROJECT = 'landing-growth4u';
const COLLECTION_PATH = 'artifacts/growth4u-public-app/public/data/blog_posts';

function assignAuthor(index) {
  return AUTHORS[index % AUTHORS.length];
}

async function updateFirebase(postId, author) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${COLLECTION_PATH}/${postId}?updateMask.fieldPaths=author`;
  const body = {
    fields: {
      author: { stringValue: author },
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firebase update failed for ${postId}: ${res.status} ${text}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply') || args.includes('--firebase');
  const firebase = args.includes('--firebase');

  const posts = JSON.parse(readFileSync(POSTS_PATH, 'utf-8'));

  // Sort by createdAt (oldest first) for stable assignment
  const sorted = [...posts].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });

  // Build assignment map: id → author
  const assignments = new Map();
  sorted.forEach((post, i) => {
    assignments.set(post.id, assignAuthor(i));
  });

  // Stats
  const stats = {};
  for (const author of assignments.values()) {
    stats[author] = (stats[author] || 0) + 1;
  }

  console.log(`\n📊 Distribution (${posts.length} posts):`);
  for (const [author, count] of Object.entries(stats)) {
    const pct = ((count / posts.length) * 100).toFixed(1);
    console.log(`   ${author}: ${count} posts (${pct}%)`);
  }

  if (!apply) {
    console.log('\n🔍 Dry run — no changes made. Use --apply to update posts.json or --firebase to also update Firestore.\n');
    // Show first 10 assignments
    console.log('First 10 assignments:');
    sorted.slice(0, 10).forEach((post, i) => {
      console.log(`   [${i}] "${post.title.slice(0, 60)}..." → ${assignments.get(post.id)}`);
    });
    return;
  }

  // Apply to posts array (preserving original order)
  const updated = posts.map((post) => ({
    ...post,
    author: assignments.get(post.id) || post.author,
  }));

  // Write updated posts.json
  writeFileSync(POSTS_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ Updated ${POSTS_PATH}`);

  // Optionally update Firebase
  if (firebase) {
    console.log('\n🔥 Updating Firebase...');
    let success = 0;
    let errors = 0;
    for (const post of updated) {
      try {
        await updateFirebase(post.id, post.author);
        success++;
        if (success % 20 === 0) console.log(`   ${success}/${updated.length} updated...`);
      } catch (err) {
        errors++;
        console.error(`   ❌ ${post.id}: ${err.message}`);
      }
    }
    console.log(`\n🔥 Firebase: ${success} updated, ${errors} errors`);
  }

  console.log('\nDone! Run a Netlify build to regenerate the site with author bylines.\n');
}

main().catch(console.error);
