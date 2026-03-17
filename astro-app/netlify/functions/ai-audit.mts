import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface AuditRequest {
  prompts: string[];
  domain: string;
  brandName: string;
}

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
    const body = (await req.json()) as AuditRequest;
    const { prompts, domain, brandName } = body;

    if (!prompts?.length || !domain || !brandName) {
      return Response.json(
        { error: "prompts, domain and brandName are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const client = new Anthropic({ apiKey });

    const results = [];

    for (const prompt of prompts) {
      // Simulate what different AI platforms would respond
      const platformResults = [];

      for (const platform of ["ChatGPT", "Perplexity", "Gemini", "Claude"]) {
        try {
          const message = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: `Eres un analista de GEO (Generative Engine Optimization). Tu trabajo es simular cómo respondería ${platform} a una consulta de usuario y analizar si mencionaría la marca "${brandName}" (dominio: ${domain}).

Responde SOLO con un JSON object válido:
{
  "mentioned": boolean,
  "sentiment": "positive" | "neutral" | "negative",
  "citedUrls": string[],
  "responseSnippet": string (extracto de 100-200 caracteres de cómo respondería ${platform}),
  "reasoning": string (por qué sí o no mencionaría esta marca)
}

Basa tu análisis en:
1. La autoridad del dominio y su presencia online
2. La relevancia del contenido de ${domain} para la consulta
3. El comportamiento típico de ${platform} al recomendar marcas
4. Si la marca tiene contenido optimizado para este tipo de consulta`,
            messages: [
              {
                role: "user",
                content: `¿Cómo respondería ${platform} a esta consulta?\n\n"${prompt}"\n\n¿Mencionaría a ${brandName} (${domain})?`,
              },
            ],
          });

          const text =
            message.content[0].type === "text"
              ? message.content[0].text
              : "{}";
          let parsed;
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch {
            parsed = {
              mentioned: false,
              sentiment: "neutral",
              citedUrls: [],
              responseSnippet: "Error parsing response",
            };
          }

          platformResults.push({
            platform,
            prompt,
            mentioned: parsed.mentioned || false,
            sentiment: parsed.sentiment || "neutral",
            citedUrls: parsed.citedUrls || [],
            responseSnippet: parsed.responseSnippet || "",
            testedAt: new Date().toISOString(),
          });
        } catch {
          platformResults.push({
            platform,
            prompt,
            mentioned: false,
            sentiment: "neutral" as const,
            citedUrls: [],
            responseSnippet: `Error testing ${platform}`,
            testedAt: new Date().toISOString(),
          });
        }
      }

      results.push(...platformResults);
    }

    // Compute GEO score
    const mentionRate =
      results.filter((r) => r.mentioned).length / results.length;
    const positiveRate =
      results.filter((r) => r.sentiment === "positive").length / results.length;
    const citationRate =
      results.filter((r) => r.citedUrls.length > 0).length / results.length;
    const geoScore = Math.round(
      mentionRate * 50 + positiveRate * 30 + citationRate * 20,
    );

    // Detect gaps
    const gaps: string[] = [];
    const platforms = [...new Set(results.map((r) => r.platform))];
    for (const platform of platforms) {
      const platformResults2 = results.filter((r) => r.platform === platform);
      const platformMentionRate =
        platformResults2.filter((r) => r.mentioned).length /
        platformResults2.length;
      if (platformMentionRate === 0) {
        gaps.push(`No mencionado en ${platform}`);
      } else if (platformMentionRate < 0.5) {
        gaps.push(
          `Baja visibilidad en ${platform} (${Math.round(platformMentionRate * 100)}%)`,
        );
      }
    }
    const negatives = results.filter((r) => r.sentiment === "negative");
    if (negatives.length > 0) {
      gaps.push(
        `${negatives.length} respuesta(s) con sentimiento negativo`,
      );
    }

    return Response.json(
      { results, geoScore, gaps },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: errMessage },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
