export const config = { runtime: 'edge' };

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h1>Error</h1><p>${error}: ${url.searchParams.get("error_description")}</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  if (!code) {
    return new Response("<html><body><h1>Missing code</h1></body></html>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/api/linkedin-callback`,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    return new Response(
      `<html><body><h1>Token error</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  // Show the token so the user can copy it to env vars
  // In production you'd store this in a database
  return new Response(
    `<html>
<head><title>LinkedIn Connected</title></head>
<body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px">
  <h1 style="color:#0077B5">LinkedIn conectado</h1>
  <p>Copia este token y agrégalo como variable de entorno <code>LINKEDIN_ACCESS_TOKEN</code>:</p>
  <textarea style="width:100%;height:100px;font-family:monospace;font-size:12px" readonly onclick="this.select()">${tokenData.access_token}</textarea>
  <p style="color:#666;font-size:14px">Expira en: ${tokenData.expires_in} segundos (~${Math.round(tokenData.expires_in / 86400)} días)</p>
  <p><a href="/admin/linkedin/">Volver al admin</a></p>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
