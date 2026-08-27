# Trust Score re-scan en GHL: dos hooks por fase

## Arquitectura desplegable (sin Inbound Webhook)

Cada fase usa dos Custom Webhooks independientes:

1. **Kickoff síncrono**: valida, crea un job idempotente en Netlify Blobs y dispara el diagnóstico en una Netlify Background Function. Devuelve inmediatamente `202 application/json` con `job_id` y `status: "pending"`.
2. **Consulta síncrona**: tras un Wait de GHL, recibe `job_id`. Devuelve `202 pending`, `200 completed` con el resultado final, `502 failed` o `410 expired`.

No existe callback a GHL. El worker guarda el resultado en el store durable `trust-score-rescan-jobs`, con expiración lógica de 24 horas. Las rutas están bloqueadas por fase y nunca devuelven ni actualizan el campo baseline `contact.trust_score`.

## Prerrequisito de seguridad

Configurar en Netlify estas variables secretas de producción:

```text
TRUST_SCORE_RESCAN_SECRET=<valor aleatorio de al menos 20 caracteres>
TRUST_SCORE_ADMIN_PASSWORD=<password de servicio de trust.growth4u.io>
```

Usar exactamente el mismo valor en los cuatro Custom Webhooks de GHL mediante el header:

```text
X-Trust-Score-Secret: <secreto>
```

Sin `TRUST_SCORE_RESCAN_SECRET` las funciones fallan de forma cerrada con `401`; no se debe publicar el secreto en el body, la URL, este repositorio ni logs. `TRUST_SCORE_ADMIN_PASSWORD` solo viaja server-to-server como `x-admin-password` al analizador y nunca aparece en respuestas ni logs.

## Workflow día 60

### Hook 1 — kickoff

- Acción: **Custom Webhook**
- Método: `POST`
- URL: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-60`
- Headers:
  - `Content-Type: application/json`
  - `X-Trust-Score-Secret: <secreto compartido>`
- Activar **Save response from this Webhook** y guardar `job_id`, `status`, `fase` y `expires_at` para las acciones posteriores.
- Body:

```json
{
  "email": "{{contact.email}}",
  "nombre": "{{contact.first_name}} {{contact.last_name}}",
  "web": "{{contact.web}}",
  "contact_id": "{{contact.id}}",
  "idempotency_key": "{{contact.id}}-60",
  "baseline_score": "{{contact.trust_score}}",
  "competidores": "{{contact.competidores}}"
}
```

`baseline_score` se usa únicamente para calcular `delta`; el backend no escribe ni devuelve `trust_score`.

### Hook 2 — consulta

- Añadir **Wait: 5 minutos**.
- Acción: **Custom Webhook**
- Método: `POST`
- URL: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-60-result`
- Mismos headers de seguridad.
- Activar **Save response from this Webhook**.
- Body (usar el `job_id` guardado por el kickoff):

```json
{
  "job_id": "{{webhook_response.job_id}}"
}
```

Cuando la respuesta sea `200` / `status = completed`, mapear:

- `trust_score_60_dias`
- `trust_score_link`
- `pilar_debil`
- `landing_pilar_debil`
- `delta`
- `explicacion_cambio`

No mapear `trust_score`.

## Workflow día 120

Es el mismo flujo con estas tres diferencias:

1. Kickoff: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-120`
2. `idempotency_key`: `{{contact.id}}-120`
3. Consulta: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-120-result`

Cuando finalice, mapear `trust_score_120_dias` y los campos comunes. No mapear `trust_score`.

## Polling acotado en GHL

Para ambas fases:

1. Kickoff.
2. Wait 5 minutos.
3. Consulta #1.
4. Si HTTP `202` o `status = pending|processing`: Wait 2 minutos y Consulta #2.
5. Si sigue pendiente: Wait 2 minutos y Consulta #3.
6. Si la tercera consulta sigue pendiente, termina por una rama de timeout observable; no crear un bucle infinito.
7. HTTP `200 completed`: actualizar los campos de la fase.
8. HTTP `502 failed`, `404` o `410 expired`: terminar por rama de error y registrar `job_id`/`error` para reintento manual.

El máximo recomendado es **3 consultas durante 9 minutos**. El job sigue disponible durante 24 horas para diagnóstico o reintento controlado.

## Contratos HTTP

### Kickoff / replay idempotente — `202`

```json
{
  "job_id": "8b6…",
  "status": "pending",
  "fase": "60",
  "expires_at": "2026-08-28T12:00:00.000Z"
}
```

Repetir el kickoff con la misma `idempotency_key` dentro de 24 horas devuelve el mismo `job_id` y añade `idempotent_replay: true`; no lanza otro scan.

### Consulta pendiente — `202`

```json
{
  "job_id": "8b6…",
  "status": "processing",
  "fase": "60",
  "expires_at": "2026-08-28T12:00:00.000Z"
}
```

### Resultado día 60 — `200`

```json
{
  "job_id": "8b6…",
  "status": "completed",
  "fase": "60",
  "expires_at": "2026-08-28T12:00:00.000Z",
  "email": "contacto@empresa.com",
  "web": "empresa.com",
  "trust_score_link": "https://trust.growth4u.io/herramientas/d/…",
  "trust_score_60_dias": 73,
  "pilar_debil": "Tu visibilidad en las IAs",
  "landing_pilar_debil": "https://growth4u.io/trust-score/visibilidad-en-ias",
  "source": "trust-rescan-60",
  "delta": 8,
  "explicacion_cambio": "El Trust Score ha mejorado 8 puntos frente al inicial. El pilar más débil actual es Tu visibilidad en las IAs."
}
```

Día 120 usa `fase: "120"`, `source: "trust-rescan-120"` y `trust_score_120_dias`.

## Rutas internas y compatibilidad

Estas rutas son workers internos y **no deben configurarse en GHL**:

- `/.netlify/functions/trust-score-rescan-60-background`
- `/.netlify/functions/trust-score-rescan-120-background`
- `/.netlify/functions/trust-score-bridge-background` (alias legacy del worker día 60)

Todas requieren autenticación y un `job_id`; ya no llaman al Inbound Webhook anterior.

## Verificación local segura

Los tests usan emails y webs reservados de QA, un servidor HTTP local para simular `/diagnostico`/informe, store en memoria y un adaptador HTTP real. No tocan contactos GHL ni el upstream productivo.

```bash
cd astro-app
npm run test:trust-score
npm run build
```

Cobertura: `pending → completed` para 60/120, contrato JSON, delta, bloqueo por fase, ausencia de `trust_score`, autenticación, validación, idempotencia, expiración y prueba HTTP local.
