# Trust Score re-scan en GHL: dos hooks por fase

## Arquitectura activa

El re-scan vive en el proyecto Vercel separado `rescan-vercel`. Web-Propia no ejecuta ni almacena jobs de re-scan.

Cada fase conserva el flujo de dos Custom Webhooks:

1. **Kickoff síncrono**: valida la petición, crea un job idempotente y devuelve `202 application/json` con `job_id` y `status: "pending"`.
2. **Consulta síncrona**: después de un Wait de GHL, recibe el `job_id` y devuelve el estado o el resultado final.

No existe callback a GHL. Las rutas están bloqueadas por fase y nunca devuelven ni actualizan el campo baseline `contact.trust_score`.

## Prerrequisito de seguridad

Configurar el secreto en el proyecto `rescan-vercel` y usar exactamente el mismo valor en los cuatro Custom Webhooks de GHL mediante el header:

```text
x-trust-score-secret: <secreto compartido>
```

No publicar el secreto en el body, la URL, este repositorio ni logs.

## Workflow día 60

### Hook 1 — kickoff

- Acción: **Custom Webhook**
- Método: `POST`
- URL: `https://rescan-vercel.vercel.app/api/rescan-60`
- Headers:
  - `Content-Type: application/json`
  - `x-trust-score-secret: <secreto compartido>`
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

### Wait y Hook 2 — consulta

- Añadir **Wait: 6 minutos**.
- Acción: **Custom Webhook**
- Método: `POST`
- URL: `https://rescan-vercel.vercel.app/api/rescan-60-result`
- Usar los mismos headers de seguridad.
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

1. Kickoff: `https://rescan-vercel.vercel.app/api/rescan-120`
2. `idempotency_key`: `{{contact.id}}-120`
3. Consulta: `https://rescan-vercel.vercel.app/api/rescan-120-result`

Cuando finalice, mapear `trust_score_120_dias` y los campos comunes. No mapear `trust_score`.

## Polling acotado en GHL

Para ambas fases:

1. Kickoff.
2. Wait 6 minutos.
3. Consulta #1 con el `job_id` recibido.
4. Si HTTP `202` o `status = pending|processing`: Wait 2 minutos y Consulta #2.
5. Si sigue pendiente: Wait 2 minutos y Consulta #3.
6. Si la tercera consulta sigue pendiente, terminar por una rama de timeout observable; no crear un bucle infinito.
7. HTTP `200 completed`: actualizar los campos de la fase.
8. HTTP `502 failed`, `404` o `410 expired`: terminar por rama de error y registrar `job_id`/`error` para reintento manual.

El máximo recomendado es **3 consultas durante 10 minutos**. El `job_id` del kickoff debe reutilizarse en todas las consultas; no lanzar otro kickoff mientras el job siga pendiente.

## Contratos HTTP esperados

### Kickoff — `202`

```json
{
  "job_id": "8b6…",
  "status": "pending",
  "fase": "60",
  "expires_at": "2026-08-28T12:00:00.000Z"
}
```

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
  "explicacion_cambio": "El Trust Score ha mejorado 8 puntos frente al inicial."
}
```

Día 120 usa `fase: "120"`, `source: "trust-rescan-120"` y `trust_score_120_dias`.

## Verificación operativa

Antes de activar el workflow con contactos reales:

1. Ejecutar cada kickoff con un contacto de QA y comprobar `202` + `job_id`.
2. Esperar 6 minutos y consultar el endpoint `-result` de la misma fase con ese `job_id`.
3. Confirmar que el resultado no contiene `trust_score` y sí contiene el campo de fase (`trust_score_60_dias` o `trust_score_120_dias`).
4. Confirmar que GHL guarda la respuesta y mapea solo los campos definidos arriba.
