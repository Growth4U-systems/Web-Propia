import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import postsCache from './src/data/posts.json' with { type: 'json' };

// Build a slug → lastmod map for sitemap
const postDateMap = new Map();
for (const p of postsCache) {
  const date = p.updatedAt || p.createdAt;
  if (date) postDateMap.set(p.slug, date);
}

// Parse redirected paths from netlify.toml so the sitemap doesn't list URLs
// that redirect elsewhere (Google flags them as "Página con redirección").
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const netlifyTomlPath = path.resolve(__dirname, '..', 'netlify.toml');
const redirectedPaths = new Set();
try {
  const toml = fs.readFileSync(netlifyTomlPath, 'utf8');
  for (const m of toml.matchAll(/from\s*=\s*"([^"]+)"/g)) {
    const from = m[1];
    // Skip patterns with wildcards (they're route-level redirects, not specific pages)
    if (from.includes('*') || from.includes(':')) continue;
    redirectedPaths.add(from.endsWith('/') ? from : from + '/');
  }
} catch (e) {
  console.warn('sitemap: could not parse netlify.toml redirects', e.message);
}

export default defineConfig({
  site: 'https://growth4u.io',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => {
        if (page.includes('/admin') || page.includes('/feedback')) return false;
        // Pages with noindex meta should not be in sitemap (conflicting signal).
        if (
          page.includes('/privacidad/') ||
          page.includes('/cookies/') ||
          page.includes('/dashboard-captacion')
        ) {
          return false;
        }
        // Exclude URLs that redirect (parsed from netlify.toml at build time).
        try {
          const urlPath = new URL(page).pathname;
          if (redirectedPaths.has(urlPath)) return false;
        } catch {}
        return true;
      },
      serialize(item) {
        // Add lastmod for blog posts from posts.json dates
        const blogMatch = item.url.match(/\/blog\/([^/]+)\/$/);
        if (blogMatch) {
          const slug = blogMatch[1];
          const date = postDateMap.get(slug);
          if (date) item.lastmod = date;
        }

        if (item.url === 'https://growth4u.io/' || item.url === 'https://growth4u.io/en/') {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        } else if (item.url.includes('/servicios/')) {
          item.changefreq = 'weekly';
          item.priority = 0.9;
        } else if (item.url === 'https://growth4u.io/blog/' || item.url === 'https://growth4u.io/en/blog/') {
          item.changefreq = 'daily';
          item.priority = 0.8;
        } else if (item.url === 'https://growth4u.io/casos-de-exito/') {
          item.changefreq = 'weekly';
          item.priority = 0.8;
        } else if (item.url.includes('/blog/')) {
          item.changefreq = 'monthly';
          item.priority = 0.7;
        } else if (item.url.includes('/casos-de-exito/')) {
          item.changefreq = 'monthly';
          item.priority = 0.7;
        } else if (item.url.includes('/privacidad/') || item.url.includes('/cookies/')) {
          item.changefreq = 'yearly';
          item.priority = 0.3;
        } else {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        }
        return item;
      },
    }),
  ],
});
