// RFC 9727 / RFC 9264 — API catalog served at /.well-known/api-catalog
// with application/linkset+json content type.

import type { Context } from '@netlify/functions';

const CATALOG = {
  linkset: [
    {
      anchor: 'https://growth4u.io/',
      'service-doc': [
        {
          href: 'https://growth4u.io/llms.txt',
          type: 'text/plain',
          title: 'Growth4U overview for LLMs (llms.txt)',
        },
      ],
      describedby: [
        {
          href: 'https://growth4u.io/sitemap-index.xml',
          type: 'application/xml',
          title: 'Site map index',
        },
      ],
    },
    {
      anchor: 'https://growth4u.io/api/lead-magnet-gate',
      'service-doc': [
        {
          href: 'https://growth4u.io/recursos/',
          type: 'text/html',
          title: 'Lead magnet resources (human-facing)',
        },
      ],
    },
  ],
};

export default async (_req: Request, _ctx: Context) => {
  return new Response(JSON.stringify(CATALOG, null, 2) + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

export const config = { path: '/.well-known/api-catalog' };
