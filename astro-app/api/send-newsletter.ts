export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const { subject, htmlContent, recipients, from } = await req.json();

    if (!subject || !htmlContent || !recipients?.length) {
      return new Response(
        JSON.stringify({ error: "Missing subject, htmlContent, or recipients" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = from || "newsletter@growth4u.io";

    // Resend supports batch sending up to 100 emails per request
    const batches: string[][] = [];
    for (let i = 0; i < recipients.length; i += 50) {
      batches.push(recipients.slice(i, i + 50));
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          batch.map((email: string) => ({
            from: `Growth4U <${senderEmail}>`,
            to: [email],
            subject,
            html: htmlContent,
          }))
        ),
      });

      if (res.ok) {
        const data = await res.json();
        totalSent += data.data?.length || batch.length;
      } else {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        errors.push(`Batch error: ${errData.message || res.statusText}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        sent: totalSent,
        total: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: errors.length === 0 ? 200 : 207,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}
