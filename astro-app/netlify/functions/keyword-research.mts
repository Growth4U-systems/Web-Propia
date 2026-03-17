import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req: Request, _context: Context) => {
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
    const { topic } = (await req.json()) as { topic: string };

    if (!topic) {
      return Response.json(
        { error: "topic is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `Eres un experto en SEO y keyword research para el mercado hispano. Tu trabajo es sugerir keywords relevantes para crear contenido de blog optimizado para buscadores y para GEO (Generative Engine Optimization — ser citado por ChatGPT, Perplexity, etc.).

Contexto: Growth4U es una empresa de growth marketing especializada en fintechs y startups B2B/B2C en España y Latinoamérica.

Responde SOLO con un JSON array válido, sin texto adicional ni markdown. Cada elemento debe tener exactamente estos campos:
- keyword (string): la keyword en español
- intent (string): "informational", "commercial", "transactional" o "navigational"
- difficulty (string): "low", "medium" o "high"
- relevance (number): 1-10, qué tan relevante es para el tema dado

Genera entre 12 y 20 keywords. Mezcla keywords de cola larga y corta. Prioriza keywords con alto intent de búsqueda y baja competencia cuando sea posible.`,
      messages: [
        {
          role: "user",
          content: `Investiga keywords para este tema/nicho:\n\n${topic}\n\nDevuelve SOLO el JSON array.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";

    // Parse the JSON from the response, handling potential markdown wrapping
    let keywords;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      keywords = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      keywords = [];
    }

    return Response.json({ keywords }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
