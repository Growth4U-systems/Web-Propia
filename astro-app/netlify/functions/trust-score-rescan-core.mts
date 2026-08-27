/** Durable two-hook Trust Score re-scan flow for day 60/day 120. */
import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export type RescanPhase = "60" | "120";
type JobStatus = "pending" | "processing" | "completed" | "failed";

interface JobInput {
  email: string;
  nombre: string;
  web: string;
  competitors: string[];
  baselineScore: number | null;
}

interface RescanResult {
  email: string;
  web: string;
  fase: RescanPhase;
  trust_score_link: string;
  trust_score_60_dias?: number;
  trust_score_120_dias?: number;
  pilar_debil: string;
  landing_pilar_debil: string;
  source: string;
  delta: number | null;
  explicacion_cambio: string;
}

interface RescanJob {
  jobId: string;
  phase: RescanPhase;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  input: JobInput;
  result?: RescanResult;
  errorCode?: string;
}

export interface JobStore {
  create(job: RescanJob): Promise<boolean>;
  get(jobId: string): Promise<RescanJob | null>;
  transition(job: RescanJob, expectedStatus: JobStatus, expectedUpdatedAt: string): Promise<boolean>;
  claim(jobId: string): Promise<RescanJob | null>;
  delete(jobId: string): Promise<void>;
}

interface HandlerDeps {
  store?: JobStore;
  secret?: string;
  now?: () => number;
  ttlMs?: number;
  invokeWorker?: (jobId: string, req: Request) => Promise<unknown>;
}

const DEFAULT_TRUST_API = "https://trust.growth4u.io/herramientas/api";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS = 15 * 60 * 1000;
const STORE_NAME = "trust-score-rescan-jobs";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-trust-score-secret",
  "Cache-Control": "no-store",
};

const PILAR: Record<string, { label: string; landing: string }> = {
  confianza_prestada: {
    label: "Lo que otros dicen de ti",
    landing: "https://growth4u.io/trust-score/lo-que-otros-dicen",
  },
  seo: {
    label: "Tu visibilidad en Google",
    landing: "https://growth4u.io/trust-score/visibilidad-en-google",
  },
  geo: {
    label: "Tu visibilidad en las IAs",
    landing: "https://growth4u.io/trust-score/visibilidad-en-ias",
  },
  resenas: {
    label: "Reseñas y prueba social",
    landing: "https://growth4u.io/trust-score/resenas-y-prueba-social",
  },
  nicho: {
    label: "Conversaciones de nicho",
    landing: "https://growth4u.io/trust-score/conversaciones-de-nicho",
  },
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

function configuredSecret(explicit?: string): string {
  return explicit ?? String(process.env.TRUST_SCORE_RESCAN_SECRET || "").trim();
}

function authorized(req: Request, secret: string): boolean {
  if (secret.length < 20) return false;
  const supplied = req.headers.get("x-trust-score-secret") || "";
  const actual = Buffer.from(secret);
  const candidate = Buffer.from(supplied);
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function preflight(req: Request, secret: string): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!authorized(req, secret)) return json({ error: "unauthorized" }, 401);
  return null;
}

function normalizedWeb(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2048) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!parsed.hostname.includes(".") || !["http:", "https:"].includes(parsed.protocol)) return "";
    return raw;
  } catch {
    return "";
  }
}

function validEmail(value: unknown): string {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function parseScore(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

function parseInput(body: Record<string, unknown>): { input?: JobInput; idempotencyKey?: string; error?: string } {
  const email = validEmail(body.email);
  const web = normalizedWeb(body.web);
  const idempotencyKey = String(body.idempotency_key || body.contact_id || "").trim();
  if (!email || !web) return { error: "invalid_email_or_web" };
  if (!idempotencyKey || idempotencyKey.length > 200) return { error: "invalid_idempotency_key" };
  const raw = Array.isArray(body.competidores)
    ? body.competidores
    : String(body.competidores || "").split(",");
  const competitors = raw.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4);
  return {
    idempotencyKey,
    input: {
      email,
      nombre: String(body.nombre || body.name || body.nombre_completo || web).trim().slice(0, 160),
      web,
      competitors,
      baselineScore: parseScore(body.baseline_score),
    },
  };
}

async function deterministicJobId(phase: RescanPhase, key: string, secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}\0${phase}\0${key}`);
  const digest = Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex").slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20)}`;
}

function isExpired(job: RescanJob, now: number): boolean {
  return Date.parse(job.expiresAt) <= now;
}

export function createMemoryJobStore(): JobStore {
  const jobs = new Map<string, RescanJob>();
  return {
    async create(job) {
      if (jobs.has(job.jobId)) return false;
      jobs.set(job.jobId, structuredClone(job));
      return true;
    },
    async get(id) { return jobs.has(id) ? structuredClone(jobs.get(id)!) : null; },
    async transition(job, expectedStatus, expectedUpdatedAt) {
      const current = jobs.get(job.jobId);
      if (!current || current.status !== expectedStatus || current.updatedAt !== expectedUpdatedAt) return false;
      jobs.set(job.jobId, structuredClone(job));
      return true;
    },
    async claim(id) {
      const job = jobs.get(id);
      if (!job || job.status !== "pending") return null;
      const claimed = { ...job, status: "processing" as const, updatedAt: new Date().toISOString() };
      jobs.set(id, structuredClone(claimed));
      return structuredClone(claimed);
    },
    async delete(id) { jobs.delete(id); },
  };
}

function createBlobJobStore(): JobStore {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const key = (id: string) => `jobs/${id}.json`;
  return {
    async create(job) {
      const result = await store.setJSON(key(job.jobId), job, { onlyIfNew: true });
      return result.modified;
    },
    async get(id) { return await store.get(key(id), { type: "json", consistency: "strong" }) as RescanJob | null; },
    async transition(job, expectedStatus, expectedUpdatedAt) {
      const current = await store.getWithMetadata(key(job.jobId), { type: "json", consistency: "strong" });
      if (!current || !current.etag) return false;
      const data = current.data as RescanJob;
      if (data.status !== expectedStatus || data.updatedAt !== expectedUpdatedAt) return false;
      return (await store.setJSON(key(job.jobId), job, { onlyIfMatch: current.etag })).modified;
    },
    async claim(id) {
      const current = await store.getWithMetadata(key(id), { type: "json", consistency: "strong" });
      if (!current || (current.data as RescanJob).status !== "pending" || !current.etag) return null;
      const job = current.data as RescanJob;
      job.status = "processing";
      job.updatedAt = new Date().toISOString();
      const result = await store.setJSON(key(id), job, { onlyIfMatch: current.etag });
      return result.modified ? job : null;
    },
    async delete(id) { await store.delete(key(id)); },
  };
}

function jobStore(explicit?: JobStore): JobStore {
  return explicit ?? createBlobJobStore();
}

export const weakestFromReport = (html: string): string => {
  let best = "";
  let bestRank = 99;
  for (const key of Object.keys(PILAR)) {
    const i = html.indexOf(`id="p-${key}"`);
    if (i < 0) continue;
    const match = html.slice(i, i + 400).match(/class="rk">(\d+)/);
    const rank = match ? parseInt(match[1], 10) : 99;
    if (rank < bestRank) { bestRank = rank; best = key; }
  }
  return best;
};

async function streamEvents(resp: Response, onEvent: (event: any) => void) {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      try { onEvent(JSON.parse(line.slice(5).trim())); } catch { /* malformed SSE event */ }
    }
  }
}

const bareDomain = (value: string) => value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
const looksLikeDomain = (value: string) => /\./.test(value) && !/\s/.test(value);

async function resolveDomain(raw: string): Promise<string> {
  const cleaned = bareDomain(raw);
  if (looksLikeDomain(cleaned)) return cleaned;
  try {
    const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(raw)}`);
    const candidates = await response.json();
    const domain = Array.isArray(candidates) && candidates[0]?.domain ? String(candidates[0].domain) : "";
    return looksLikeDomain(domain) ? domain : "";
  } catch { return ""; }
}

function explanation(delta: number | null, weakPillar: string): string {
  if (delta === null) return `No hay score inicial comparable. El pilar más débil actual es ${weakPillar || "no identificado"}.`;
  if (delta > 0) return `El Trust Score ha mejorado ${delta} puntos frente al inicial. El pilar más débil actual es ${weakPillar || "no identificado"}.`;
  if (delta < 0) return `El Trust Score ha bajado ${Math.abs(delta)} puntos frente al inicial. El pilar más débil actual es ${weakPillar || "no identificado"}.`;
  return `El Trust Score no ha cambiado frente al inicial. El pilar más débil actual es ${weakPillar || "no identificado"}.`;
}

async function runDiagnostic(phase: RescanPhase, input: JobInput): Promise<RescanResult> {
  const trustApi = String(process.env.TRUST_SCORE_API_BASE || DEFAULT_TRUST_API).trim().replace(/\/$/, "");
  const adminPassword = String(
    process.env.TRUST_SCORE_ADMIN_PASSWORD || process.env.G4U_TRUST_ADMIN_PASSWORD || "",
  ).trim();
  if (!adminPassword) throw new Error("upstream_secret_not_configured");
  const competitors = (await Promise.all(input.competitors.map(async (name) => ({ url: await resolveDomain(name) })))).filter((item) => item.url);
  const diagnostic = await fetch(`${trustApi}/diagnostico`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": adminPassword },
    body: JSON.stringify({
      url: input.web,
      lead: { name: input.nombre },
      lang: "es",
      engine: "v3",
      business: "Mixed",
      fill: true,
      competitors,
    }),
  });
  if (!diagnostic.ok) throw new Error(`diagnostico_${diagnostic.status}`);
  let reportId = "";
  let link = "";
  let score: number | null = null;
  await streamEvents(diagnostic, (event) => {
    if (event?.type !== "result") return;
    const result = event.data?.data ?? event.data ?? event;
    reportId = result?.id || result?.reportId || reportId;
    if (result?.url) link = String(result.url);
    if (typeof result?.trust_score === "number") score = result.trust_score;
  });
  if (!link && reportId) link = `https://trust.growth4u.io/herramientas/d/${reportId}`;
  if (!link || score === null) throw new Error("diagnostico_incomplete");
  let weakKey = "";
  try {
    const report = await fetch(link, { redirect: "follow" });
    if (report.ok) weakKey = weakestFromReport(await report.text());
  } catch { /* result remains usable without pillar parsing */ }
  const weak = weakKey ? PILAR[weakKey] : null;
  const delta = input.baselineScore === null ? null : score - input.baselineScore;
  return {
    email: input.email,
    web: input.web,
    fase: phase,
    trust_score_link: link,
    [`trust_score_${phase}_dias`]: score,
    pilar_debil: weak?.label ?? "",
    landing_pilar_debil: weak?.landing ?? "",
    source: `trust-rescan-${phase}`,
    delta,
    explicacion_cambio: explanation(delta, weak?.label ?? ""),
  };
}

function publicState(job: RescanJob) {
  return { job_id: job.jobId, status: job.status, fase: job.phase, expires_at: job.expiresAt };
}

export function createKickoffHandler(phase: RescanPhase, deps: HandlerDeps = {}) {
  return async (req: Request) => {
    const secret = configuredSecret(deps.secret);
    const early = preflight(req, secret);
    if (early) return early;
    const body = await parseBody(req);
    const parsed = parseInput(body);
    if (!parsed.input || !parsed.idempotencyKey) return json({ error: parsed.error }, 400);
    const now = (deps.now ?? Date.now)();
    const store = jobStore(deps.store);
    const jobId = await deterministicJobId(phase, parsed.idempotencyKey, secret);
    const existing = await store.get(jobId);
    if (existing && !isExpired(existing, now)) {
      const processingIsStale = existing.status === "processing"
        && now - Date.parse(existing.updatedAt) >= STALE_PROCESSING_MS;
      if (existing.status !== "failed" && !processingIsStale) {
        const statusCode = existing.status === "completed" ? 200 : 202;
        return json({ ...publicState(existing), idempotent_replay: true }, statusCode);
      }
      const reset: RescanJob = {
        ...existing,
        status: "pending",
        updatedAt: new Date(now).toISOString(),
        errorCode: undefined,
        result: undefined,
      };
      const resetApplied = await store.transition(reset, existing.status, existing.updatedAt);
      if (!resetApplied) {
        const latest = await store.get(jobId);
        if (!latest || latest.phase !== phase) return json({ error: "job_creation_conflict" }, 409);
        return json(
          { ...publicState(latest), idempotent_replay: true },
          latest.status === "completed" ? 200 : 202,
        );
      }
      try {
        if (deps.invokeWorker) {
          await deps.invokeWorker(jobId, req);
        } else {
          const workerUrl = new URL(`trust-score-rescan-${phase}-background`, req.url).toString();
          const response = await fetch(workerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-trust-score-secret": secret },
            body: JSON.stringify({ job_id: jobId }),
          });
          if (!response.ok) throw new Error(`worker_dispatch_${response.status}`);
        }
      } catch (error) {
        await store.transition(
          { ...reset, status: "failed", errorCode: "worker_dispatch_failed", updatedAt: new Date().toISOString() },
          "pending",
          reset.updatedAt,
        );
        console.error("[trust-rescan] worker retry dispatch failed", { phase, jobId, error });
        return json({ error: "worker_dispatch_failed", job_id: jobId, fase: phase }, 502);
      }
      return json({ ...publicState(reset), idempotent_replay: true }, 202);
    }
    if (existing) await store.delete(jobId);
    const timestamp = new Date(now).toISOString();
    const job: RescanJob = {
      jobId,
      phase,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(now + (deps.ttlMs ?? DEFAULT_TTL_MS)).toISOString(),
      input: parsed.input,
    };
    const created = await store.create(job);
    if (!created) {
      const raced = await store.get(jobId);
      if (raced) return json({ ...publicState(raced), idempotent_replay: true }, 202);
      return json({ error: "job_creation_conflict" }, 409);
    }
    try {
      if (deps.invokeWorker) {
        await deps.invokeWorker(jobId, req);
      } else {
        const workerUrl = new URL(`trust-score-rescan-${phase}-background`, req.url).toString();
        const response = await fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-trust-score-secret": secret },
          body: JSON.stringify({ job_id: jobId }),
        });
        if (!response.ok) throw new Error(`worker_dispatch_${response.status}`);
      }
    } catch (error) {
      await store.transition(
        { ...job, status: "failed", errorCode: "worker_dispatch_failed", updatedAt: new Date().toISOString() },
        "pending",
        job.updatedAt,
      );
      console.error("[trust-rescan] worker dispatch failed", { phase, jobId, error });
      return json({ error: "worker_dispatch_failed", job_id: jobId, fase: phase }, 502);
    }
    return json(publicState(job), 202);
  };
}

export function createWorkerHandler(phase: RescanPhase, deps: HandlerDeps = {}) {
  return async (req: Request) => {
    const secret = configuredSecret(deps.secret);
    const early = preflight(req, secret);
    if (early) return early;
    const body = await parseBody(req);
    const jobId = String(body.job_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/.test(jobId)) return json({ error: "invalid_job_id" }, 400);
    const store = jobStore(deps.store);
    const candidate = await store.get(jobId);
    if (!candidate || candidate.phase !== phase) return json({ error: "job_not_found" }, 404);
    if (isExpired(candidate, (deps.now ?? Date.now)())) {
      await store.delete(jobId);
      return json({ status: "expired" }, 410);
    }
    const job = await store.claim(jobId);
    if (!job) return json({ status: "ignored" });
    try {
      const result = await runDiagnostic(phase, job.input);
      const saved = await store.transition(
        { ...job, status: "completed", result, updatedAt: new Date().toISOString() },
        "processing",
        job.updatedAt,
      );
      if (!saved) return json({ status: "ignored" });
      console.log("[trust-rescan] completed", { phase, jobId });
      return json({ status: "completed" });
    } catch (error) {
      const code = error instanceof Error && /^diagnostico_[a-z0-9]+$/i.test(error.message) ? error.message : "scan_failed";
      const saved = await store.transition(
        { ...job, status: "failed", errorCode: code, updatedAt: new Date().toISOString() },
        "processing",
        job.updatedAt,
      );
      if (!saved) return json({ status: "ignored" });
      console.error("[trust-rescan] failed", { phase, jobId, error });
      return json({ status: "failed" }, 500);
    }
  };
}

export function createResultHandler(phase: RescanPhase, deps: HandlerDeps = {}) {
  return async (req: Request) => {
    const secret = configuredSecret(deps.secret);
    const early = preflight(req, secret);
    if (early) return early;
    const body = await parseBody(req);
    const jobId = String(body.job_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/.test(jobId)) return json({ error: "invalid_job_id" }, 400);
    const store = jobStore(deps.store);
    const job = await store.get(jobId);
    if (!job || job.phase !== phase) return json({ error: "job_not_found" }, 404);
    if (isExpired(job, (deps.now ?? Date.now)())) {
      await store.delete(jobId);
      return json({ error: "job_expired", job_id: jobId, fase: phase }, 410);
    }
    if (job.status === "completed" && job.result) return json({ ...publicState(job), ...job.result });
    if (job.status === "failed") return json({ ...publicState(job), error: job.errorCode || "scan_failed" }, 502);
    return json(publicState(job), 202);
  };
}
