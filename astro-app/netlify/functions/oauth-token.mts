// OAuth 2.0 token endpoint — Client Credentials Grant (RFC 6749 §4.4).
// Accepts client_id + client_secret via form POST or Basic auth, validates
// against Firestore oauth_clients, and returns a short-lived RS256 JWT.

import type { Context } from '@netlify/functions';
import {
  OAUTH_SUPPORTED_SCOPES,
  findClient,
  issueAccessToken,
  sha256Hex,
  constantTimeEqual,
} from '../../src/lib/oauth';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function errorResponse(error: string, description: string, status = 400) {
  return new Response(JSON.stringify({ error, error_description: description }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(),
    },
  });
}

function parseBasicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { id: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') {
    return errorResponse('invalid_request', 'Only POST is supported', 405);
  }

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return errorResponse(
      'invalid_request',
      'Content-Type must be application/x-www-form-urlencoded',
    );
  }

  const form = new URLSearchParams(await req.text());
  const grantType = form.get('grant_type');
  if (grantType !== 'client_credentials') {
    return errorResponse(
      'unsupported_grant_type',
      `grant_type must be client_credentials; got ${grantType || '(missing)'}`,
    );
  }

  // Client auth: either in the body or via HTTP Basic per RFC 6749 §2.3.1
  const basic = parseBasicAuth(req.headers.get('authorization'));
  const clientId = basic?.id || form.get('client_id') || '';
  const clientSecret = basic?.secret || form.get('client_secret') || '';
  if (!clientId || !clientSecret) {
    return errorResponse('invalid_client', 'client_id and client_secret are required', 401);
  }

  let client;
  try {
    client = await findClient(clientId);
  } catch (err: any) {
    return errorResponse('server_error', `client lookup failed: ${err?.message || err}`, 500);
  }
  if (!client || !client.enabled) {
    return errorResponse('invalid_client', 'Unknown or disabled client', 401);
  }

  const presentedHash = await sha256Hex(clientSecret);
  if (!constantTimeEqual(presentedHash, client.clientSecretHash)) {
    return errorResponse('invalid_client', 'client_secret does not match', 401);
  }

  // Scope negotiation: intersect requested with allowed. Empty requested → all allowed.
  const requested = (form.get('scope') || '').split(/\s+/).filter(Boolean);
  const allowed = new Set(client.scopes.filter((s) => OAUTH_SUPPORTED_SCOPES.includes(s)));
  const granted = requested.length
    ? requested.filter((s) => allowed.has(s))
    : Array.from(allowed);
  if (requested.length && granted.length === 0) {
    return errorResponse('invalid_scope', 'None of the requested scopes are allowed', 400);
  }

  const token = await issueAccessToken({ clientId: client.clientId, scopes: granted });

  return new Response(JSON.stringify(token), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...corsHeaders(),
    },
  });
};

export const config = { path: '/oauth/token' };
