import Anthropic from "@anthropic-ai/sdk";

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface SuggestRequest {
  niche: string;
  existingPartners: string[];
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  try {
    const body = (await req.json()) as SuggestRequest;
    const { niche, existingPartners } = body;

    if (!niche) {
      return Response.json(
        { error: "niche is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const excludeContext =
      existingPartners && existingPartners.length > 0
        ? `\n\nPartners que ya tenemos (NO incluir en sugerencias):\n${existingPartners.join(", ")}`
        : "";

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `Eres un estratega de partnerships y business development para Growth4U, una empresa de growth marketing especializada en fintechs y startups B2B/B2C en España y Latinoamérica.

Tu trabajo es sugerir partners potenciales para un nicho específico. Los partners pueden ser:
- Influencers: creadores de contenido relevantes en el nicho
- Media: medios, blogs, podcasts, newsletters del sector
- Referral: profesionales o empresas que pueden derivar clientes
- Agency: agencias complementarias (no competidoras)
- Community: comunidades, eventos, asociaciones del sector

Responde SOLO con un JSON array válido. Cada elemento:
{
  "name": string,
  "type": "influencer" | "media" | "referral" | "agency" | "community",
  "platform": "LinkedIn" | "Instagram" | "YouTube" | "Twitter/X" | "Blog" | "Podcast" | "Other",
  "reason": string (por qué es buen partner, 1-2 frases),
  "audienceEstimate": string (ej: "10K-50K", "50K-100K"),
  "contactUrl": string (URL del perfil o sitio web, si lo conoces, sino string vacío)
}

Genera entre 8 y 12 sugerencias. Prioriza partners reales y específicos del mercado hispano cuando sea posible. Si no conoces partners reales, sugiere perfiles tipo (ej: "Newsletter líder de fintech en España") con URLs vacías.`,
      messages: [
        {
          role: "user",
          content: `Sugiere partners potenciales para este nicho:\n\n${niche}${excludeContext}\n\nDevuelve SOLO el JSON array.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";

    let suggestions;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      suggestions = [];
    }

    return Response.json({ suggestions }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
