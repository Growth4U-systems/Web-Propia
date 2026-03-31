import type { Context } from "@netlify/functions";

const ANTHROPIC_API_KEY = "sk-ant-api03-2iDJLWkYa2cSm-W7HJ1kfgt2V0E0sPTB8HafNsAPY6bYEbNwMdZoQyMSBTx_dU8S8w_SV4H25bSHoxPJKUjlzw-8SV6OQAA";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Scene {
  id: number;
  type: "hook" | "problem" | "lies" | "concept" | "case" | "question" | "cta";
  title: string;
  voiceover: string;
  visualNotes: string;
}

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { blogUrl } = await req.json() as { blogUrl: string };
    if (!blogUrl) {
      return Response.json({ error: "blogUrl is required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Fetch blog content
    const blogRes = await fetch(blogUrl);
    if (!blogRes.ok) throw new Error(`Failed to fetch blog: ${blogRes.status}`);
    const html = await blogRes.text();

    // Extract text content from HTML (simple approach)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    // Extract title from HTML
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title[^>]*>(.*?)<\/title>/i);
    const blogTitle = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : "Blog Post";

    // Call Claude to generate video scenes
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Genera un guion de video de 7 escenas (~45-50 segundos) a partir de este artículo de blog para Instagram Reels y LinkedIn.

TÍTULO: ${blogTitle}

CONTENIDO:
${textContent}

REGLAS:
- Idioma: Español
- Cada escena = 1-2 frases habladas, cortas y directas
- Usa números y datos concretos del artículo
- Pronunciación TTS: escribir "grouth for iu" en vez de "growth4u", "grouth jáking" en vez de "growth hacking"
- La escena 7 (CTA) siempre es: "Descubre más en grouth for iu punto io."

ESTRUCTURA OBLIGATORIA:
1. Hook — dato impactante o pregunta provocadora
2. Problema — dolor del cliente (2-3 puntos)
3. Desarrollo — punto principal (mentiras, errores, mitos)
4. Concepto clave — framework, método, o concepto del artículo
5. Prueba/Caso — datos, números concretos
6. Pregunta retórica — cierre emocional
7. CTA — "Descubre más en grouth for iu punto io."

Responde SOLO con un JSON array de 7 objetos, sin markdown ni explicaciones:
[
  {
    "id": 1,
    "type": "hook",
    "title": "Título visual corto para la escena",
    "voiceover": "Texto exacto que lee el TTS en español",
    "visualNotes": "Descripción visual: bullets, counters, cards, etc."
  },
  ...
]`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error (${claudeRes.status}): ${errText.slice(0, 300)}`);
    }

    const claudeData = await claudeRes.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    const responseText = claudeData.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = responseText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    let scenes: Scene[];
    try {
      scenes = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse Claude response: ${responseText.slice(0, 500)}`);
    }

    return Response.json(
      {
        blogTitle,
        blogUrl,
        scenes,
        generatedAt: new Date().toISOString(),
      },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
};
