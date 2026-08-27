import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import handler60Alias from "../netlify/functions/trust-score-bridge-background.mts";
import handler60 from "../netlify/functions/trust-score-rescan-60-background.mts";
import handler120 from "../netlify/functions/trust-score-rescan-120-background.mts";

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function withStubServices(run) {
  const callbacks = [];
  const diagnostics = [];
  const server = createServer(async (req, res) => {
    if (req.url === "/api/diagnostico" && req.method === "POST") {
      diagnostics.push(await readJson(req));
      const origin = `http://127.0.0.1:${server.address().port}`;
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`data: ${JSON.stringify({
        type: "result",
        data: { data: { id: "report-test", url: `${origin}/report`, trust_score: 73 } },
      })}\n\n`);
      return;
    }
    if (req.url === "/report" && req.method === "GET") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end([
        '<section id="p-seo"><span class="rk">03</span></section>',
        '<section id="p-geo"><span class="rk">01</span></section>',
      ].join(""));
      return;
    }
    if (req.url === "/callback" && req.method === "POST") {
      callbacks.push(await readJson(req));
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  process.env.TRUST_SCORE_API_BASE = `${origin}/api`;
  process.env.TRUST_SCORE_CALLBACK_URL = `${origin}/callback`;
  try {
    await run({ callbacks, diagnostics });
  } finally {
    delete process.env.TRUST_SCORE_API_BASE;
    delete process.env.TRUST_SCORE_CALLBACK_URL;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function request(body) {
  return new Request("https://growth4u.example/.netlify/functions/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function assertPhase(handler, phase, expectedField) {
  await withStubServices(async ({ callbacks, diagnostics }) => {
    const response = await handler(request({
      email: "qa-trust-rescan@example.com",
      web: "https://example.com/path",
      fase: phase === "60" ? "120" : "60", // must not override route lock
      callback_url: "https://attacker.invalid/relay", // deliberately ignored
      competidores: ["competitor.example"],
    }));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(diagnostics.length, 1);
    assert.deepEqual(diagnostics[0], {
      url: "https://example.com/path",
      engine: "v3",
      business: "Mixed",
      fill: true,
      competitors: [{ url: "competitor.example" }],
    });
    assert.equal(callbacks.length, 1);
    const payload = callbacks[0];
    assert.equal(payload.fase, phase);
    assert.equal(payload.source, `trust-rescan-${phase}`);
    assert.equal(payload[expectedField], 73);
    assert.equal(payload.trust_score, undefined, "initial Trust Score must never be touched");
    assert.equal(payload.trust_score_60_dias, phase === "60" ? 73 : undefined);
    assert.equal(payload.trust_score_120_dias, phase === "120" ? 73 : undefined);
    assert.match(payload.trust_score_link, /\/report$/);
    assert.equal(payload.pilar_debil, "Tu visibilidad en las IAs");
    assert.equal(payload.landing_pilar_debil, "https://growth4u.io/trust-score/visibilidad-en-ias");
  });
}

test("legacy bridge URL is phase-locked to day 60", async () => {
  await assertPhase(handler60Alias, "60", "trust_score_60_dias");
});

test("explicit day-60 URL routes only to trust_score_60_dias", async () => {
  await assertPhase(handler60, "60", "trust_score_60_dias");
});

test("day-120 URL routes only to trust_score_120_dias", async () => {
  await assertPhase(handler120, "120", "trust_score_120_dias");
});

test("validation rejects missing identifiers before any callback", async () => {
  const response = await handler120(request({ email: "qa@example.com" }));
  assert.equal(response.status, 400);
  assert.equal(await response.text(), "missing web/email");
});

test("non-POST methods are rejected", async () => {
  const response = await handler60(new Request("https://growth4u.example/test", { method: "GET" }));
  assert.equal(response.status, 405);
});
