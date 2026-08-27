# Trust Score re-scan: decisión técnica para GHL (día 60 y 120)

## Estado: respuesta directa bloqueada con la arquitectura actual

La intención funcional confirmada por Ramiro es esta:

1. el workflow de día 60 o 120 llama a un **Custom Webhook**;
2. esa misma petición espera a que termine el diagnóstico;
3. la respuesta HTTP del propio Custom Webhook contiene el score y el enlace;
4. GHL mapea esa respuesta, sin routing ni callback a un Inbound Webhook.

**No se deben conectar a GHL las funciones actuales con sufijo `-background` esperando ese body.** En Netlify, el sufijo convierte la función en background: el cliente recibe inmediatamente una respuesta vacía `202 Accepted`, mientras el trabajo continúa aparte. Netlify indica expresamente que estas funciones no devuelven resultados al cliente original.

Tampoco basta con crear una copia síncrona sin sufijo. El diagnóstico real consume el SSE de `/diagnostico` y tarda normalmente **2–5 minutos**, mientras que Netlify limita las funciones síncronas a **60 segundos, sin posibilidad de configurarlo**. Por tanto, una función síncrona de Netlify no puede sostener de forma fiable la petición hasta obtener el JSON final.

### Evidencia oficial

- Netlify, límites de funciones: **“Synchronous execution limit: 60 seconds — Configurable? No”**.
  https://docs.netlify.com/build/functions/configuration/#default-values
- Netlify, background functions: se ejecutan hasta 15 minutos, pero la invocación devuelve primero un `202`; el cliente recibe una respuesta vacía inmediatamente y el resultado se envía normalmente a otro destino. También aclara que no devuelven respuestas ni soportan streaming de respuesta.
  https://docs.netlify.com/build/functions/background-functions/#how-background-functions-work
- HighLevel, Custom Webhook: la documentación oficial confirma que es una petición HTTP outbound y que existe la opción **Save response from this Webhook** en las cuentas que la tengan disponible. La página oficial consultada **no publica un timeout numérico** ni garantiza que una petición pueda permanecer abierta 2–5 minutos; por eso no se atribuye a GHL un límite inventado.
  https://help.gohighlevel.com/support/solutions/articles/155000003305-workflow-action-custom-webhook

El límite no configurable de Netlify ya es suficiente para bloquear la variante directa actual, independientemente de cuál sea el timeout interno de GHL o del plan de Netlify. El `netlify.toml` del repositorio no define una excepción de timeout, y la documentación indica que esa excepción no existe. No se pudo consultar el plan del proyecto desde la CLI porque este entorno no tiene sesión de Netlify; el plan no cambia el límite síncrono documentado.

## Contrato JSON deseado

Si en el futuro el diagnóstico termina por debajo del timeout de punta a punta, o se mueve a una infraestructura síncrona que soporte más de 5 minutos, los endpoints separados deben devolver `200 application/json` con uno de estos contratos:

### Día 60

```json
{
  "email": "contacto@empresa.com",
  "web": "empresa.com",
  "fase": "60",
  "trust_score_link": "https://trust.growth4u.io/herramientas/d/…",
  "trust_score_60_dias": 73,
  "pilar_debil": "Tu visibilidad en las IAs",
  "landing_pilar_debil": "https://growth4u.io/trust-score/visibilidad-en-ias",
  "source": "trust-rescan-60"
}
```

### Día 120

```json
{
  "email": "contacto@empresa.com",
  "web": "empresa.com",
  "fase": "120",
  "trust_score_link": "https://trust.growth4u.io/herramientas/d/…",
  "trust_score_120_dias": 73,
  "pilar_debil": "Tu visibilidad en las IAs",
  "landing_pilar_debil": "https://growth4u.io/trust-score/visibilidad-en-ias",
  "source": "trust-rescan-120"
}
```

Las rutas deben estar bloqueadas por fase y **nunca** devolver ni actualizar el campo baseline `trust_score`.

## Estado de las rutas desplegadas

Las rutas existentes son asíncronas y no cumplen el contrato de respuesta directa:

- `/.netlify/functions/trust-score-rescan-60-background`
- `/.netlify/functions/trust-score-rescan-120-background`
- `/.netlify/functions/trust-score-bridge-background` (alias legacy de día 60)

Internamente esperan el SSE, construyen el payload correcto y llaman al Inbound Webhook existente. Esa implementación puede conservarse temporalmente por compatibilidad, pero **no debe configurarse como solución aprobada por Ramiro** ni presentarse como respuesta directa. No se crea una ruta síncrona engañosa que vaya a expirar a los 60 segundos.

## Alternativa mínima sin Inbound Webhook: kickoff + wait + fetch

Para respetar la intención de “sin callback inbound”, el mínimo cambio fiable requiere desacoplar inicio y lectura del resultado mediante almacenamiento durable:

1. **Custom Webhook — kickoff** a una ruta síncrona y rápida, bloqueada por fase. Valida, genera una clave determinista (`contact_id + fase`), encola el re-scan y responde en pocos segundos con `202` y `status: "pending"`.
2. **Wait** de GHL durante 5 minutos. HighLevel documenta oficialmente que el Wait action puede pausar un contacto durante un periodo fijo:
   https://help.gohighlevel.com/support/solutions/articles/155000002470-workflow-action-wait
3. **Custom Webhook — fetch result** a una ruta síncrona, usando de nuevo `contact_id` y la fase. Lee el resultado durable y devuelve en esa misma respuesta el JSON final del contrato anterior.
4. Si todavía está `pending`, repetir `Wait + fetch` con un máximo definido; si falla, terminar por una rama de error observable.

Esto evita el Inbound Webhook y hace que **el último Custom Webhook** sí reciba el score directamente. Requiere, antes de implementarlo:

- una cola o invocación background para el diagnóstico;
- almacenamiento durable por `contact_id + fase`, con TTL, estados `pending/completed/failed` e idempotencia;
- autenticación de kickoff/fetch para que los resultados no queden públicos;
- confirmar en la cuenta concreta de GHL que la respuesta guardada del Custom Webhook se puede mapear a acciones posteriores. La documentación pública consultada confirma la captura de respuesta, pero no documenta de forma suficiente ese mapeo como garantía universal.

Sin ese almacenamiento no existe nada que el segundo webhook pueda consultar; un `Wait` por sí solo no recupera el valor retornado por una background function.

## Pruebas y seguridad

Los tests actuales usan servidores HTTP locales para simular `/diagnostico`, el informe y el callback; comprueban el bloqueo por fase y que nunca aparece el baseline `trust_score`:

```bash
cd astro-app
npm run test:trust-score
```

No ejecutar pruebas de producción con emails, webs o contactos reales. Una futura implementación `kickoff + fetch` debe probarse en Deploy Preview con upstream y almacenamiento de QA, verificando al menos:

- `pending → completed` para día 60 y día 120;
- JSON exacto y `Content-Type: application/json`;
- aislamiento por contacto/fase y autenticación;
- idempotencia y expiración;
- ausencia de callback Inbound;
- ausencia total del campo baseline `trust_score`.
