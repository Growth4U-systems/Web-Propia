#!/usr/bin/env node
// GSC Index Audit — inspecciona cada URL del sitemap via Search Console URL Inspection API
// y genera un CSV con las páginas no indexadas y el motivo.
//
// Uso:
//   node scripts/gsc-index-audit.mjs              # todas las URLs
//   node scripts/gsc-index-audit.mjs --limit 5    # primeras 5 (prueba)
//
// Requiere en .env:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json
//   GSC_PROPERTY=sc-domain:growth4u.io

import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';

const SITEMAP_URL = process.env.SITEMAP_URL || 'https://growth4u.io/sitemap-0.xml';
const PROPERTY = process.env.GSC_PROPERTY;
const CRED_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const OUT_DIR = path.resolve('scripts/gsc-output');
const REQUEST_TIMEOUT_MS = 15000;
const DELAY_MS = 150;

const argv = process.argv.slice(2);
const limitArg = argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? parseInt(argv[limitArg + 1], 10) : null;

if (!PROPERTY) throw new Error('Falta GSC_PROPERTY en .env');
if (!CRED_PATH) throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS en .env');

async function getUrlsFromSitemap(sitemapUrl) {
  const res = await fetch(sitemapUrl);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function inspectUrlWithTimeout(searchconsole, inspectionUrl) {
  return await Promise.race([
    searchconsole.urlInspection.index
      .inspect({
        requestBody: { inspectionUrl, siteUrl: PROPERTY, languageCode: 'es-ES' },
      })
      .then((res) => res.data.inspectionResult?.indexStatusResult || {}),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS),
    ),
  ]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeCsv(results, csvPath) {
  const header = [
    'url',
    'indexada',
    'verdict',
    'coverageState',
    'robotsTxtState',
    'indexingState',
    'pageFetchState',
    'googleCanonical',
    'userCanonical',
    'lastCrawlTime',
    'sitemap',
    'error',
  ];
  const rows = results.map((r) => [
    r.url,
    r.verdict === 'PASS' ? 'sí' : 'no',
    r.verdict || '',
    r.coverageState || '',
    r.robotsTxtState || '',
    r.indexingState || '',
    r.pageFetchState || '',
    r.googleCanonical || '',
    r.userCanonical || '',
    r.lastCrawlTime || '',
    (r.sitemap && r.sitemap.join('|')) || '',
    r.error || '',
  ]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  fs.writeFileSync(csvPath, csv);
}

async function main() {
  await fsp.mkdir(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(OUT_DIR, `gsc-audit-${stamp}.csv`);
  const jsonPath = path.join(OUT_DIR, `gsc-audit-${stamp}.json`);
  const logPath = path.join(OUT_DIR, `gsc-audit-${stamp}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const log = (line) => {
    const stamped = `[${new Date().toISOString()}] ${line}`;
    console.log(stamped);
    logStream.write(stamped + '\n');
  };

  log(`Propiedad: ${PROPERTY}`);
  log(`Credenciales: ${CRED_PATH}`);
  log(`Sitemap: ${SITEMAP_URL}`);

  let urls = await getUrlsFromSitemap(SITEMAP_URL);
  if (LIMIT) urls = urls.slice(0, LIMIT);
  log(`${urls.length} URLs a inspeccionar${LIMIT ? ` (limit=${LIMIT})` : ''}`);

  const auth = new google.auth.GoogleAuth({
    keyFile: CRED_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const results = [];
  let i = 0;
  for (const url of urls) {
    i++;
    const t0 = Date.now();
    try {
      const r = await inspectUrlWithTimeout(searchconsole, url);
      const ms = Date.now() - t0;
      results.push({ url, ...r });
      const ok = r.verdict === 'PASS' ? 'OK ' : 'NO ';
      log(`[${i}/${urls.length}] ${ok} ${ms}ms — ${r.coverageState || r.verdict || '?'} — ${url}`);
    } catch (err) {
      const ms = Date.now() - t0;
      const msg = err?.errors?.[0]?.message || err.message;
      results.push({ url, error: msg });
      log(`[${i}/${urls.length}] ERR ${ms}ms — ${msg} — ${url}`);
    }

    if (i % 10 === 0 || i === urls.length) {
      writeCsv(results, csvPath);
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    }
    await sleep(DELAY_MS);
  }

  writeCsv(results, csvPath);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const indexed = results.filter((r) => r.verdict === 'PASS').length;
  const notIndexed = results.filter((r) => r.verdict && r.verdict !== 'PASS');
  const errored = results.filter((r) => r.error);

  log('');
  log('━━━ RESUMEN ━━━');
  log(`Indexadas:     ${indexed}`);
  log(`No indexadas:  ${notIndexed.length}`);
  log(`Errores:       ${errored.length}`);
  log(`CSV:  ${csvPath}`);
  log(`JSON: ${jsonPath}`);

  if (notIndexed.length > 0) {
    log('');
    log('━━━ PÁGINAS NO INDEXADAS (agrupadas) ━━━');
    const byState = {};
    for (const r of notIndexed) {
      const key = r.coverageState || r.verdict;
      (byState[key] ||= []).push(r.url);
    }
    for (const [state, list] of Object.entries(byState)) {
      log('');
      log(`[${state}] (${list.length})`);
      list.slice(0, 20).forEach((u) => log(`  • ${u}`));
      if (list.length > 20) log(`  … y ${list.length - 20} más (ver CSV)`);
    }
  }

  logStream.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
