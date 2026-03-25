import type { Context } from "@netlify/functions";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TEXT_SYSTEM_PROMPT = `Eres un estratega de contenido LinkedIn especializado en growth para fintechs y startups. Escribes en nombre de Philippe Sainthubert, Growth Manager en Growth4U.

## Contexto de marca: Growth4U
- Growth partners que implementan sistemas end-to-end (NO agencia de ads, NO consultores de PDF)
- Diferenciador: Trust Engine como framework propietario
- Evidencia sobre opinion, sistemas sobre tacticas, transparencia radical

## Como escribe Philippe
- Uruguayo en Barcelona. Rioplatense natural (usa "tenes", no "tienes")
- Analitico, operativo, honesto, sin hype
- "Colega senior que explica con datos"
- Usa metaforas poeticas con sustancia tecnica
- Primera persona cuando es experiencia propia
- Humor sutil y autoconsciente

## Formatos de post (elige el mejor para el tema)
1. Value Post: Dato contraintuitivo -> 3-5 puntos de valor -> resumen + CTA
2. Results Post: Resultado con numero -> contexto/problema/que hicimos/resultado -> aprendizaje
3. Belief Shifting: Creencia popular -> por que esta mal -> evidencia -> reframe + pregunta
4. Storytelling: Hook emocional -> narrativa -> giro/aprendizaje -> reflexion

## Reglas OBLIGATORIAS
- Primera linea = todo. Si no atrapa, no leen.
- Maximo 1 CTA por post
- Numeros especificos siempre
- Un post = una idea
- Emojis: con moderacion y proposito
- NUNCA usar formato markdown
- Claridad sobre creatividad

## IMPORTANTE
- Responde SOLO con JSON válido, sin markdown, sin backticks, sin explicaciones
- El JSON debe tener esta estructura: { "title": "tema del post", "hook": "primera línea", "body": "cuerpo completo del post", "cta": "call to action" }`;

const CAROUSEL_SYSTEM_PROMPT = `Eres un estratega de contenido LinkedIn especializado en growth para fintechs y startups. Generas carruseles educativos que se comparten mucho.

## Reglas del carrusel
- Slide 1 = Portada: título llamativo + subtítulo breve
- Slides intermedias: cada una desarrolla UN punto con badge/etiqueta + título + 2-3 frases
- Última slide = CTA claro
- Tono profesional pero cercano, español
- Datos concretos cuando sea posible
- Cada slide debe poder entenderse de forma independiente
- El caption debe enganchar y dar contexto del carrusel

## IMPORTANTE
- Responde SOLO con JSON válido, sin markdown, sin backticks, sin explicaciones
- El JSON debe tener esta estructura exacta: { "title", "hook", "caption", "cta", "slides": [{ "badge", "title", "body" }] }`;

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { format, prompt, numSlides, author } = await req.json() as {
      format: 'text' | 'carousel';
      prompt: string;
      numSlides?: number;
      author?: string;
    };

    if (!format || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields: format, prompt' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (format !== 'text' && format !== 'carousel') {
      return new Response(JSON.stringify({ error: 'format must be "text" or "carousel"' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const slideCount = format === 'carousel'
      ? Math.min(10, Math.max(3, numSlides || 6))
      : undefined;

    const systemPrompt = format === 'text' ? TEXT_SYSTEM_PROMPT : CAROUSEL_SYSTEM_PROMPT;

    const userPrompt = format === 'text'
      ? `Genera un post de LinkedIn sobre este tema: ${prompt}\n\nResponde SOLO con JSON válido.`
      : `Genera un carrusel de LinkedIn de ${slideCount} slides sobre este tema: ${prompt}\n\nResponde SOLO con JSON válido.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'Claude API error', details: errBody }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const anthropicData = await anthropicRes.json() as {
      content: { type: string; text: string }[];
    };

    const rawText = anthropicData.content[0]?.text || '';

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse Claude response as JSON', raw: rawText }), {
        status: 422,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: parsed }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
