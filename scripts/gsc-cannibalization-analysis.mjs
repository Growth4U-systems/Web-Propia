#!/usr/bin/env node
// Analiza canibalización / duplicación entre posts del blog.
// Cruza posts.json con el resultado del GSC audit para identificar
// clusters de posts que compiten por las mismas keywords, señalando
// cuál está indexado y cuáles candidatos a consolidar/eliminar.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_PATH = path.join(ROOT, 'astro-app/src/data/posts.json');
const AUDIT_PATH = path.join(ROOT, 'scripts/gsc-output/gsc-audit-2026-04-20.json');
const OUT_PATH = path.join(ROOT, 'scripts/gsc-output/CANIBALIZACION.md');

const STOPWORDS = new Set([
  'de','la','el','y','en','que','los','las','un','una','para','con','por','o','del','al','es','se',
  'a','como','sin','sobre','entre','mas','tu','te','me','su','lo','e','no','si','ya','mi','ser',
  'esta','este','pero','cuando','todo','puede','hay','son','hacer','the','to','and','of','in',
]);

function tokenize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));

  const indexStatus = new Map();
  for (const r of audit) {
    const m = r.url.match(/\/blog\/([^/]+)\//);
    if (!m) continue;
    indexStatus.set(m[1], r.verdict === 'PASS' ? 'OK' : r.coverageState || r.verdict || 'NO');
  }

  // Cluster posts by title keyword similarity (threshold 0.35)
  const blogPosts = posts.filter((p) => p.slug && p.title);
  const tokens = new Map(blogPosts.map((p) => [p.slug, tokenize(p.title)]));

  const SIMILARITY_THRESHOLD = 0.35;
  const visited = new Set();
  const clusters = [];

  for (const a of blogPosts) {
    if (visited.has(a.slug)) continue;
    const cluster = [a];
    visited.add(a.slug);
    for (const b of blogPosts) {
      if (visited.has(b.slug)) continue;
      if (jaccard(tokens.get(a.slug), tokens.get(b.slug)) >= SIMILARITY_THRESHOLD) {
        cluster.push(b);
        visited.add(b.slug);
      }
    }
    if (cluster.length >= 2) clusters.push(cluster);
  }

  clusters.sort((a, b) => b.length - a.length);

  let md = '# Análisis de canibalización de contenido\n\n';
  md += `Fecha: 2026-04-20 · ${blogPosts.length} posts analizados\n\n`;
  md += `Umbral de similitud: Jaccard ≥ ${SIMILARITY_THRESHOLD} sobre tokens del título (sin stopwords).\n\n`;
  md += `**${clusters.length} clusters** de posts que compiten por las mismas keywords.\n\n`;
  md += '---\n\n';
  md += '## Leyenda\n\n';
  md += '- ✅ **OK** — indexada\n';
  md += '- 🟡 **Descubierta / Rastreada sin indexar** — Google la ve pero no la indexa\n';
  md += '- ⚫ **No reconoce** — Google no la ha descubierto\n';
  md += '- 🔴 Candidata a eliminar / consolidar\n\n';
  md += '---\n\n';

  const icon = (status) => {
    if (status === 'OK') return '✅';
    if (status && status.includes('Rastreada')) return '🟡';
    if (status && status.includes('Descubierta')) return '🟡';
    if (status && status.includes('Google no reconoce')) return '⚫';
    if (status && status.includes('redirección')) return '↩️';
    return '❓';
  };

  let idx = 1;
  for (const cluster of clusters) {
    // Sort: indexed first, then by title
    cluster.sort((a, b) => {
      const sa = indexStatus.get(a.slug) === 'OK' ? 0 : 1;
      const sb = indexStatus.get(b.slug) === 'OK' ? 0 : 1;
      return sa - sb || a.title.localeCompare(b.title);
    });

    const hasIndexed = cluster.some((p) => indexStatus.get(p.slug) === 'OK');
    md += `### Cluster ${idx++} (${cluster.length} posts)${hasIndexed ? '' : ' — ⚠️ ninguno indexado'}\n\n`;
    for (const p of cluster) {
      const status = indexStatus.get(p.slug) || 'sin datos';
      md += `- ${icon(status)} **${p.title}**\n`;
      md += `  - slug: \`${p.slug}\` · status: ${status}\n`;
    }
    md += '\n**Recomendación:** ';
    if (hasIndexed) {
      const indexed = cluster.find((p) => indexStatus.get(p.slug) === 'OK');
      md += `mantener \`${indexed.slug}\` como canónico, consolidar los demás en él (redirect 301 + contenido mergeado) o aplicar \`noindex\`.\n\n`;
    } else {
      md += `ninguno indexa. Elegir el mejor escrito, mejorar su contenido en profundidad, y hacer redirect 301 de los demás al elegido.\n\n`;
    }
    md += '---\n\n';
  }

  // Orphans: not in any cluster
  const inCluster = new Set(clusters.flat().map((p) => p.slug));
  const orphans = blogPosts.filter((p) => !inCluster.has(p.slug));
  md += `## Posts únicos (sin canibalización detectada): ${orphans.length}\n\n`;
  md += 'Estos no compiten con otros posts en el blog. Se mantienen como están.\n\n';

  fs.writeFileSync(OUT_PATH, md);

  console.log(`✓ ${clusters.length} clusters detectados`);
  console.log(`✓ ${clusters.flat().length} posts en clusters`);
  console.log(`✓ ${orphans.length} posts únicos`);
  console.log(`→ ${OUT_PATH}`);

  // Top summary in stdout
  console.log('\nTOP 5 CLUSTERS:');
  for (const c of clusters.slice(0, 5)) {
    const indexed = c.filter((p) => indexStatus.get(p.slug) === 'OK').length;
    console.log(`  ${c.length} posts (${indexed} indexados) — ${c[0].title.slice(0, 60)}`);
  }
}

main();
