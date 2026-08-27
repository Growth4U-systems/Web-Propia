# Trust Score re-scan: configuración GHL (día 60 y 120)

## Arquitectura (importante)

Los Custom Webhooks de GHL **solo inician** el re-scan. Netlify responde `202 Accepted` inmediatamente y el análisis continúa en background. Entre 2 y 5 minutos después, el backend envía el resultado al inbound webhook GHL existente (`9bfa1bd9…`).

Por eso, el Custom Webhook de inicio **no recibe ni debe mapear** `trust_score_link`, `trust_score_60_dias` ni `trust_score_120_dias`. Esos valores llegan después por el inbound webhook.

## Workflow día 60

1. Trigger: el que corresponda al día 60.
2. Acción **Custom Webhook**, método `POST`:
   - URL recomendada: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-60-background`
   - La URL anterior `https://growth4u.netlify.app/.netlify/functions/trust-score-bridge-background` sigue operativa como alias de día 60.
   - Header: `Content-Type: application/json`
   - Body:

```json
{
  "email": "{{contact.email}}",
  "web": "{{contact.web}}",
  "competidores": "{{contact.competidores}}"
}
```

3. No añadir acciones de actualización del score inmediatamente después: el `202` confirma recepción, no que el análisis haya terminado.

## Workflow día 120

1. Trigger: el que corresponda al día 120.
2. Acción **Custom Webhook**, método `POST`:
   - URL: `https://growth4u.netlify.app/.netlify/functions/trust-score-rescan-120-background`
   - Header y body: iguales al workflow de día 60.

Las URLs están bloqueadas por fase: aunque alguien mande `fase` incorrecta en el body, la ruta de día 60 solo puede enviar `trust_score_60_dias` y la de día 120 solo `trust_score_120_dias`.

## Inbound webhook de resultados (ya existente)

No crear campos nuevos: se reutilizan los 7 existentes. El backend enviará uno de estos payloads:

```json
{
  "email": "contacto@empresa.com",
  "web": "empresa.com",
  "fase": "60",
  "trust_score_60_dias": 73,
  "trust_score_link": "https://trust.growth4u.io/herramientas/d/…",
  "pilar_debil": "Tu visibilidad en las IAs",
  "landing_pilar_debil": "https://growth4u.io/trust-score/visibilidad-en-ias",
  "source": "trust-rescan-60"
}
```

```json
{
  "email": "contacto@empresa.com",
  "web": "empresa.com",
  "fase": "120",
  "trust_score_120_dias": 73,
  "trust_score_link": "https://trust.growth4u.io/herramientas/d/…",
  "pilar_debil": "Tu visibilidad en las IAs",
  "landing_pilar_debil": "https://growth4u.io/trust-score/visibilidad-en-ias",
  "source": "trust-rescan-120"
}
```

En la automatización que parte del inbound:

- localizar el contacto por `email`;
- si `fase = 60`, actualizar `trust_score_60_dias` + link + pilar + landing;
- si `fase = 120`, actualizar `trust_score_120_dias` + link + pilar + landing;
- **nunca actualizar `trust_score` inicial** desde estos callbacks.

## Prueba segura sin contactos reales

La implementación acepta dos overrides **solo por variables de entorno del deploy**, nunca desde el body público:

- `TRUST_SCORE_API_BASE`
- `TRUST_SCORE_CALLBACK_URL`

Para una prueba aislada, crear un Deploy Preview/entorno de test y configurar `TRUST_SCORE_CALLBACK_URL` con un RequestBin/webhook de QA. No configurar ese override en producción, porque desviaría callbacks reales. Ejecutar:

```bash
npm run test:trust-score
```

El test levanta servidores HTTP locales reales para API, informe y callback, ejecuta las tres rutas (alias 60, ruta 60 y ruta 120) y comprueba que nunca aparece el campo `trust_score` inicial.
