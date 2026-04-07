/**
 * update-posts-cache.mts
 * ─────────────────────────────────────────────────────────────────
 * Netlify Function — called by the admin panel after saving/deleting a post.
 * Receives the full posts array, stores it in Netlify Blobs, then triggers
 * a build. The pre-build script (sync-cache.mjs) reads from Blobs first,
 * so the build NEVER depends on Firebase availability.
 */

import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

const NETLIFY_BUILD_HOOK = 'https://api.netlify.com/build_hooks/69a9ce0e98ff45fea8db5696';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  try {
    const body = await req.json();
    const { posts, leadMagnets, triggerBuild = true } = body;

    const store = getStore('build-cache');

    // Store posts if provided
    if (Array.isArray(posts) && posts.length > 0) {
      await store.set('posts', JSON.stringify(posts));
      console.log(`Stored ${posts.length} posts in Netlify Blobs`);
    }

    // Store lead magnets if provided
    if (Array.isArray(leadMagnets) && leadMagnets.length > 0) {
      await store.set('lead_magnets', JSON.stringify(leadMagnets));
      console.log(`Stored ${leadMagnets.length} lead magnets in Netlify Blobs`);
    }

    // Trigger Netlify build
    if (triggerBuild) {
      await fetch(NETLIFY_BUILD_HOOK, { method: 'POST' });
      console.log('Build triggered');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        posts: Array.isArray(posts) ? posts.length : 0,
        leadMagnets: Array.isArray(leadMagnets) ? leadMagnets.length : 0,
        buildTriggered: triggerBuild,
      }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error updating cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config: Config = {
  path: '/.netlify/functions/update-posts-cache',
};
