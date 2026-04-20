// OAuth 2.0 server helpers: JWT signing, token verification, client lookup.
// Used by /oauth/token (token issuance) and /mcp (token validation).

import { SignJWT, jwtVerify, importPKCS8, importJWK } from 'jose';

export const OAUTH_ISSUER = 'https://growth4u.io';
export const OAUTH_TOKEN_ENDPOINT = `${OAUTH_ISSUER}/oauth/token`;
export const OAUTH_JWKS_URI = `${OAUTH_ISSUER}/.well-known/jwks.json`;
export const OAUTH_AUDIENCE = `${OAUTH_ISSUER}/mcp`;
export const OAUTH_SUPPORTED_SCOPES = ['read:blog_full', 'read:leads_raw'];
export const OAUTH_TOKEN_TTL_SECONDS = 3600;
export const OAUTH_KID = 'growth4u-2026-01';
export const OAUTH_ALG = 'RS256';

// Public key published at /.well-known/jwks.json. Safe to embed — it's public.
export const OAUTH_PUBLIC_JWK = {
  kty: 'RSA',
  n: 'wOHn8PRKtE6NihC76FTXx7KeGQl4LC_dQVC5lTSctlN4iQw_5RdKmLh5p3DntZJpjEG-L4z4oGCXl9I2BCupBE0J5dJr8B84YNrOm8fKMVQIm4MB8vY9V-YdvWQZcy4aIICsIFSPNoZklI_9AiQwbbX3JvPFQOT1Vow-MKb-e8GPhatn0lhsmd1HQ8LOpyBsZuup_dzZ7b8jfpNb7X1BFNFMfRy8TVJxRM5LS489ZCBVsZf2B6y6g-33yl37sUKwm7cj0Az7GpL1v_0JfZDpxAbXpIvH8O5AXVbkBTAjNNHLHRXLLnsI0btebJSC7QdoQagNJDg-wm_e10XEJxbYDw',
  e: 'AQAB',
  kid: OAUTH_KID,
  use: 'sig',
  alg: OAUTH_ALG,
} as const;

// ───────────────────────── Private key loader ─────────────────────────

let _privateKeyPromise: Promise<CryptoKey> | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (!_privateKeyPromise) {
    const b64 = process.env.OAUTH_PRIVATE_KEY;
    if (!b64) throw new Error('OAUTH_PRIVATE_KEY env var is not set');
    const pem = Buffer.from(b64, 'base64').toString('utf8');
    _privateKeyPromise = importPKCS8(pem, OAUTH_ALG);
  }
  return _privateKeyPromise;
}

// ───────────────────────── Token issuance ─────────────────────────

export interface IssuedToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export async function issueAccessToken(opts: {
  clientId: string;
  scopes: string[];
}): Promise<IssuedToken> {
  const key = await getPrivateKey();
  const token = await new SignJWT({
    scope: opts.scopes.join(' '),
    client_id: opts.clientId,
  })
    .setProtectedHeader({ alg: OAUTH_ALG, typ: 'JWT', kid: OAUTH_KID })
    .setIssuer(OAUTH_ISSUER)
    .setAudience(OAUTH_AUDIENCE)
    .setSubject(opts.clientId)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_TOKEN_TTL_SECONDS}s`)
    .setJti(crypto.randomUUID())
    .sign(key);

  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: OAUTH_TOKEN_TTL_SECONDS,
    scope: opts.scopes.join(' '),
  };
}

// ───────────────────────── Token verification ─────────────────────────

let _publicKeyPromise: Promise<CryptoKey> | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (!_publicKeyPromise) {
    _publicKeyPromise = importJWK(OAUTH_PUBLIC_JWK, OAUTH_ALG) as Promise<CryptoKey>;
  }
  return _publicKeyPromise;
}

export interface VerifiedToken {
  clientId: string;
  scopes: string[];
  jti: string;
  expiresAt: number;
}

export async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: OAUTH_ISSUER,
    audience: OAUTH_AUDIENCE,
    algorithms: [OAUTH_ALG],
  });
  const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [];
  return {
    clientId: String(payload.sub || ''),
    scopes,
    jti: String(payload.jti || ''),
    expiresAt: Number(payload.exp || 0),
  };
}

// ───────────────────────── Client lookup ─────────────────────────
//
// Stored in Firestore: artifacts/growth4u-public-app/public/data/oauth_clients
// Document ID = client_id. Fields:
//   client_secret_hash: SHA-256 hex of the secret
//   scopes: array of allowed scopes
//   name: human-readable label
//   enabled: boolean

const FIRESTORE_BASE =
  'https://firestore.googleapis.com/v1/projects/landing-growth4u/databases/(default)/documents';
const CLIENTS_PATH = 'artifacts/growth4u-public-app/public/data/oauth_clients';

export interface OAuthClient {
  clientId: string;
  clientSecretHash: string;
  scopes: string[];
  enabled: boolean;
  name: string;
}

export async function findClient(clientId: string): Promise<OAuthClient | null> {
  // Escape any slashes in client_id for the URL (shouldn't contain any, but defensive)
  const safeId = encodeURIComponent(clientId);
  const url = `${FIRESTORE_BASE}/${CLIENTS_PATH}/${safeId}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore error ${res.status}`);
  const doc = await res.json();
  const f = doc.fields || {};
  return {
    clientId,
    clientSecretHash: f.client_secret_hash?.stringValue || '',
    scopes: (f.scopes?.arrayValue?.values || []).map((v: any) => v.stringValue || ''),
    enabled: f.enabled?.booleanValue !== false,
    name: f.name?.stringValue || '',
  };
}

// Constant-time comparison of hex strings to avoid timing attacks.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
