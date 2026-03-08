import { defineConfig } from 'astro/config';
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
      filter: (page) =>
        !page.includes('/admin') && !page.includes('/feedback'),
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
