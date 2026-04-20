// OAuth 2.0 / OIDC discovery documents served at extensionless paths with
// the correct application/json content type. Netlify's static-file server
// cannot reliably set Content-Type on files without an extension.

import type { Context } from '@netlify/functions';

const ISSUER = 'https://growth4u.io';
const SCOPES = ['read:blog_full', 'read:leads_raw'];

const OAUTH_AUTHZ_SERVER = {
  issuer: ISSUER,
  token_endpoint: `${ISSUER}/oauth/token`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  grant_types_supported: ['client_credentials'],
  response_types_supported: ['token'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  scopes_supported: SCOPES,
  service_documentation: `${ISSUER}/llms.txt`,
  op_policy_uri: `${ISSUER}/privacidad/`,
  op_tos_uri: `${ISSUER}/cookies/`,
};

const OIDC_CONFIG = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/oauth/authorize-not-supported`,
  token_endpoint: `${ISSUER}/oauth/token`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  grant_types_supported: ['client_credentials'],
  response_types_supported: ['token'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  scopes_supported: SCOPES,
  service_documentation: `${ISSUER}/llms.txt`,
  op_policy_uri: `${ISSUER}/privacidad/`,
  op_tos_uri: `${ISSUER}/cookies/`,
};

const PROTECTED_RESOURCE = {
  resource: `${ISSUER}/mcp`,
  authorization_servers: [ISSUER],
  bearer_methods_supported: ['header'],
  scopes_supported: SCOPES,
  resource_documentation: `${ISSUER}/.well-known/mcp/server-card.json`,
  resource_policy_uri: `${ISSUER}/privacidad/`,
  resource_tos_uri: `${ISSUER}/cookies/`,
};

function jsonResponse(obj: unknown) {
  return new Response(JSON.stringify(obj, null, 2) + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default async (req: Request, _ctx: Context) => {
  const url = new URL(req.url);
  switch (url.pathname) {
    case '/.well-known/oauth-authorization-server':
      return jsonResponse(OAUTH_AUTHZ_SERVER);
    case '/.well-known/openid-configuration':
      return jsonResponse(OIDC_CONFIG);
    case '/.well-known/oauth-protected-resource':
      return jsonResponse(PROTECTED_RESOURCE);
    default:
      return new Response('Not Found', { status: 404 });
  }
};

export const config = {
  path: [
    '/.well-known/oauth-authorization-server',
    '/.well-known/openid-configuration',
    '/.well-known/oauth-protected-resource',
  ],
};
