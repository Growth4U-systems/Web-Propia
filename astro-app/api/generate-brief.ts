import Anthropic from "@anthropic-ai/sdk";

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface BriefRequest {
  primaryKeyword: string;
  secondaryKeywords: string[];
  topic: string;
  existingPosts: { title: string; slug: string }[];
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
    const body = (await req.json()) as BriefRequest;
    const { primaryKeyword, secondaryKeywords, topic, existingPosts } = body;

    if (!primaryKeyword || !topic) {
      return Response.json(
        { error: "primaryKeyword and topic are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const postsContext =
      existingPosts && existingPosts.length > 0
        ? `\n\nPosts existentes en el blog (para sugerir internal links):\n${existingPosts.map((p) => `- "${p.title}" → /blog/${p.slug}/`).join("\n")}`
        : "";

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `Eres un estratega de contenido SEO + GEO (Generative Engine Optimization) para Growth4U, especialistas en growth marketing para fintechs y startups B2B/B2C.

Tu trabajo es generar briefs de contenido que:
1. Estén optimizados para rankear en Google (SEO clásico)
2. Estén estructurados para ser citados por ChatGPT, Perplexity y otros LLMs (GEO)
3. Sigan el formato de blog GEO de Growth4U: empieza con "Respuesta directa", incluye tablas, FAQs

Responde SOLO con un JSON object válido, sin texto adicional ni markdown. Los campos:
- title (string): título SEO optimizado, 50-60 caracteres, en español
- metaDescription (string): meta description, 150-160 caracteres, en español
- outline (string[]): array de headings H2 para el artículo (mínimo 5 secciones). La primera SIEMPRE debe ser "Respuesta directa". Incluir una sección de "Preguntas frecuentes"
- targetWordCount (number): entre 800 y 1500
- targetAudience (string): descripción del público objetivo
- contentAngle (string): ángulo/enfoque diferencial del artículo
- internalLinks (string[]): array de paths de posts existentes que deberían enlazarse (formato "/blog/slug/")`,
      messages: [
        {
          role: "user",
          content: `Genera un brief de contenido para:

Tema: ${topic}
Keyword principal: ${primaryKeyword}
Keywords secundarias: ${secondaryKeywords.join(", ")}${postsContext}

Devuelve SOLO el JSON object.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    let brief;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      brief = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      brief = {};
    }

    return Response.json({ brief }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
