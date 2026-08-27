import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  createKickoffHandler,
  createResultHandler,
  createWorkerHandler,
  createMemoryJobStore,
} from "../netlify/functions/trust-score-rescan-core.mts";

const SECRET = "test-secret-with-enough-entropy";
const UPSTREAM_SECRET = "test-upstream-admin-password";

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function withStubDiagnostic(run) {
  const diagnostics = [];
  const server = createServer(async (req, res) => {
    if (req.url === "/api/diagnostico" && req.method === "POST") {
      assert.equal(req.headers["x-admin-password"], UPSTREAM_SECRET);
      diagnostics.push(await readJson(req));
      const origin = `http://127.0.0.1:${server.address().port}`;
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`data: ${JSON.stringify({
        type: "result",
        data: { data: { id: "report-test", url: `${origin}/report`, trust_score: 73 } },
      })}\n\n`);
      return;
    }
    if (req.url === "/report") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end([
        '<section id="p-seo"><span class="rk">03</span></section>',
        '<section id="p-geo"><span class="rk">01</span></section>',
      ].join(""));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.TRUST_SCORE_API_BASE = `http://127.0.0.1:${server.address().port}/api`;
  process.env.TRUST_SCORE_ADMIN_PASSWORD = UPSTREAM_SECRET;
  try {
    await run({ diagnostics });
  } finally {
    delete process.env.TRUST_SCORE_API_BASE;
    delete process.env.TRUST_SCORE_ADMIN_PASSWORD;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function authedRequest(path, body, secret = SECRET) {
  return new Request(`https://growth4u.example/.netlify/functions/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-trust-score-secret": secret },
    body: JSON.stringify(body),
  });
}

function setup(phase) {
  const store = createMemoryJobStore();
  const worker = createWorkerHandler(phase, { store, secret: SECRET });
  const kickoff = createKickoffHandler(phase, {
    store,
    secret: SECRET,
    invokeWorker: async (jobId) => worker(authedRequest("worker", { job_id: jobId })),
  });
  const result = createResultHandler(phase, { store, secret: SECRET });
  return { store, kickoff, result, worker };
}

for (const phase of ["60", "120"]) {
  test(`phase ${phase}: kickoff -> pending -> completed result, no inbound callback`, async () => {
    await withStubDiagnostic(async ({ diagnostics }) => {
      const { kickoff, result } = setup(phase);
      let releaseWorker;
      const workerGate = new Promise((resolve) => { releaseWorker = resolve; });
      const store = createMemoryJobStore();
      const worker = createWorkerHandler(phase, { store, secret: SECRET });
      const gatedKickoff = createKickoffHandler(phase, {
        store,
        secret: SECRET,
        invokeWorker: async (jobId) => {
          void (async () => {
            await workerGate;
            await worker(authedRequest("worker", { job_id: jobId }));
          })();
        },
      });
      const gatedResult = createResultHandler(phase, { store, secret: SECRET });

      const kickoffResponse = await gatedKickoff(authedRequest("kickoff", {
        email: "qa-trust-rescan@example.com",
        nombre: "QA Trust Rescan",
        web: "https://example.com/path",
        contact_id: "qa-contact-123",
        idempotency_key: `qa-contact-123-${phase}`,
        baseline_score: 65,
        competidores: ["competitor.example"],
      }));
      assert.equal(kickoffResponse.status, 202);
      const kicked = await kickoffResponse.json();
      assert.equal(kicked.status, "pending");
      assert.equal(kicked.fase, phase);
      assert.match(kicked.job_id, /^[0-9a-f-]{36}$/);

      const pendingResponse = await gatedResult(authedRequest("result", { job_id: kicked.job_id }));
      assert.equal(pendingResponse.status, 202);
      assert.deepEqual(Object.keys(await pendingResponse.json()).sort(), ["expires_at", "fase", "job_id", "status"]);

      releaseWorker();
      for (let i = 0; i < 50; i += 1) {
        const response = await gatedResult(authedRequest("result", { job_id: kicked.job_id }));
        if (response.status === 200) {
          const payload = await response.json();
          assert.equal(payload.status, "completed");
          assert.equal(payload.fase, phase);
          assert.equal(payload.email, "qa-trust-rescan@example.com");
          assert.equal(payload.web, "https://example.com/path");
          assert.equal(payload[`trust_score_${phase}_dias`], 73);
          assert.equal(payload.trust_score, undefined, "baseline field must never be returned or updated");
          assert.equal(payload.trust_score_60_dias, phase === "60" ? 73 : undefined);
          assert.equal(payload.trust_score_120_dias, phase === "120" ? 73 : undefined);
          assert.equal(payload.delta, 8);
          assert.match(payload.explicacion_cambio, /8 puntos/);
          assert.equal(payload.pilar_debil, "Tu visibilidad en las IAs");
          assert.equal(payload.source, `trust-rescan-${phase}`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (i === 49) assert.fail("worker did not complete");
      }
      assert.equal(diagnostics.length, 1);
      assert.equal(diagnostics[0].lead.name, "QA Trust Rescan");
      assert.equal(diagnostics[0].lang, "es");
    });
  });
}

test("idempotency returns the same active job and invokes one worker", async () => {
  const store = createMemoryJobStore();
  let invocations = 0;
  const kickoff = createKickoffHandler("60", {
    store,
    secret: SECRET,
    invokeWorker: async () => { invocations += 1; },
  });
  const body = { email: "qa@example.com", web: "example.com", contact_id: "c-1", idempotency_key: "c-1-60" };
  const first = await (await kickoff(authedRequest("kickoff", body))).json();
  const second = await (await kickoff(authedRequest("kickoff", body))).json();
  assert.equal(second.job_id, first.job_id);
  assert.equal(second.idempotent_replay, true);
  assert.equal(invocations, 1);
});

test("authentication and validation fail closed", async () => {
  const { kickoff, result } = setup("120");
  assert.equal((await kickoff(authedRequest("kickoff", { email: "qa@example.com", web: "example.com" }, "wrong"))).status, 401);
  assert.equal((await result(authedRequest("result", { job_id: crypto.randomUUID() }, "wrong"))).status, 401);
  assert.equal((await kickoff(authedRequest("kickoff", { email: "invalid", web: "example.com", idempotency_key: "x" }))).status, 400);
  assert.equal((await result(authedRequest("result", { job_id: "not-a-uuid" }))).status, 400);
});

test("route phase cannot be overridden and cross-phase lookup is hidden", async () => {
  const store = createMemoryJobStore();
  const kickoff60 = createKickoffHandler("60", { store, secret: SECRET, invokeWorker: async () => {} });
  const result120 = createResultHandler("120", { store, secret: SECRET });
  const worker60 = createWorkerHandler("60", { store, secret: SECRET });
  const worker120 = createWorkerHandler("120", { store, secret: SECRET });
  const kicked = await (await kickoff60(authedRequest("kickoff", {
    email: "qa@example.com", web: "example.com", fase: "120", idempotency_key: "locked",
  }))).json();
  assert.equal(kicked.fase, "60");
  assert.equal((await result120(authedRequest("result", { job_id: kicked.job_id }))).status, 404);
  assert.equal((await worker120(authedRequest("worker", { job_id: kicked.job_id }))).status, 404);
  assert.notEqual(
    (await worker60(authedRequest("worker", { job_id: kicked.job_id }))).status,
    409,
    "wrong-phase worker must not claim the job",
  );
});

test("a failed idempotent job is re-queued instead of locked for 24 hours", async () => {
  delete process.env.TRUST_SCORE_ADMIN_PASSWORD;
  const store = createMemoryJobStore();
  const worker = createWorkerHandler("60", { store, secret: SECRET });
  let invocations = 0;
  const kickoff = createKickoffHandler("60", {
    store,
    secret: SECRET,
    invokeWorker: async (jobId) => {
      invocations += 1;
      await worker(authedRequest("worker", { job_id: jobId }));
    },
  });
  const body = { email: "retry@example.com", web: "example.com", idempotency_key: "retry-60" };
  const first = await (await kickoff(authedRequest("kickoff", body))).json();
  assert.equal((await store.get(first.job_id)).status, "failed");

  const retryResponse = await kickoff(authedRequest("kickoff", body));
  const retry = await retryResponse.json();
  assert.equal(retryResponse.status, 202);
  assert.equal(retry.status, "pending");
  assert.equal(retry.idempotent_replay, true);
  assert.equal(invocations, 2);
});

test("expired jobs return 410 and are not exposed", async () => {
  let now = Date.now();
  const store = createMemoryJobStore();
  const kickoff = createKickoffHandler("60", { store, secret: SECRET, now: () => now, ttlMs: 1000, invokeWorker: async () => {} });
  const result = createResultHandler("60", { store, secret: SECRET, now: () => now });
  const kicked = await (await kickoff(authedRequest("kickoff", { email: "qa@example.com", web: "example.com", idempotency_key: "expiry" }))).json();
  now += 1001;
  assert.equal((await result(authedRequest("result", { job_id: kicked.job_id }))).status, 410);
});

test("real local HTTP adapter returns JSON contract", async () => {
  const store = createMemoryJobStore();
  const kickoff = createKickoffHandler("60", { store, secret: SECRET, invokeWorker: async () => {} });
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const response = await kickoff(new Request("http://local/kickoff", {
      method: req.method,
      headers: req.headers,
      body: Buffer.concat(chunks),
      duplex: "half",
    }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-trust-score-secret": SECRET },
      body: JSON.stringify({ email: "qa@example.com", web: "example.com", idempotency_key: "http-local" }),
    });
    assert.equal(response.status, 202);
    assert.match(response.headers.get("content-type"), /^application\/json/);
    assert.equal((await response.json()).status, "pending");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
