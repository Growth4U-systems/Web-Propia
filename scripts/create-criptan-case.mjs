/**
 * One-time script to create the CRIPTAN case study in Firebase.
 * Usage: node scripts/create-criptan-case.mjs
 */

const BASE = 'https://firestore.googleapis.com/v1/projects/landing-growth4u/databases/(default)/documents';
const COLLECTION = `${BASE}/artifacts/growth4u-public-app/public/data/case_studies`;
const NETLIFY_BUILD_HOOK = 'https://api.netlify.com/build_hooks/69a9ce0e98ff45fea8db5696';

const content = `## El punto de partida

Cuando empezamos a trabajar con Criptan, la situación era la siguiente:

- **Presupuesto infrautilizado:** Tenían 75.000\u20ac al trimestre para marketing, pero nunca llegaban a gastarlo porque no estaban seguros de qué funcionaba y qué no.
- **Paid sin visibilidad real:** Estaban haciendo campañas de pago que traían nuevos clientes, pero no podían estar seguros de la atribución. Todo el tráfico iba a móvil y ahí no tenían ningún tipo de control ni trazabilidad.
- **Influencers sin sistema:** Habían trabajado con influencers en el pasado y creían que les funcionaba, pero no tenían una forma clara de medirlo.
- **El gran reto — la barrera de confianza:** Su producto ofrecía rentabilidades muy altas sobre los ahorros de los usuarios, generadas de forma segura. Pero cuando le dices a alguien "vas a ganar un 10% sobre tus ahorros", lo primero que piensa es que es un timo. El problema central era: **¿cómo superar esa barrera de desconfianza?**

## Resultados clave

| Métrica | Antes | Después | Cambio |
|---------|-------|---------|--------|
| Volumen de depósitos | Baseline | +160% | **+160%** |
| Depósito medio por usuario | 3.396\u20ac | 5.269\u20ac | **+55%** |
| Tasa de activación | Baseline | +51% | **+51%** |
| Payback Period | 3-5 meses | 1-2 meses | **Reducido 60%** |
| Reviews en Trustpilot | 70 (nota 3) | +300 (nota 4+) | **+324 reseñas** |
| Registros | Baseline | +11% | **+11%** |
| Primeros Depósitos | Baseline | +68% | **+68%** |

## Qué hicimos — El Trust Engine aplicado paso a paso

### Fase 0 — Encontrar el Hueco

Antes de tocar una sola campaña, necesitábamos entender **quién era realmente el cliente**. Y lo que descubrimos cambió toda la estrategia.

**El "cripto bro" no era nuestro cliente.** El perfil típico de cripto —el que busca pelotazos rápidos— no invertía aquí. Esta plataforma solo ofrecía Bitcoin, Ethereum, USDC y EuroC. Demasiado "aburrido" para ese perfil.

**Nuestro cliente real era conservador.** Gente que nunca había invertido en cripto. Personas que ya tenían su dinero en depósitos en euros o fondos monetarios, y que simplemente querían **sacar mayor rentabilidad a sus ahorros**.

**Análisis Push vs. Pull:**

| Fuerza | Descripción |
|--------|-------------|
| **Push** (a favor) | Rentabilidad mucho más atractiva que la de los bancos tradicionales |
| **Pull** (en contra) | Desconfianza total — plataforma nueva, desconocida, y encima habla de "cripto" |

El **push** era potente, pero el **pull** de la desconfianza lo anulaba. Sin resolver eso, ningún canal iba a funcionar.

### Fase 1 — La Fortaleza de Confianza

Con el hueco identificado, el objetivo era claro: **controlar lo que el usuario encontraba cuando nos investigaba.**

#### 1. Transparencia del modelo de negocio

Lo primero fue **ponerle cara y ojos a la empresa.** Creamos contenido que explicaba de forma clara:

- Cómo era el modelo de negocio
- Qué hacían exactamente con los fondos de los clientes
- Cómo se invertían esos fondos y cómo se materializaba la rentabilidad
- Cuáles eran los estándares de riesgo aplicados

El objetivo era que **quien iba a hablar de la empresa sí se lo leyera** — y le diera la confianza de que no estaban recomendando un scam.

#### 2. Reviews — de 70 reseñas (nota 3) a +300 reseñas (nota 4+)

La situación de partida era preocupante: unas 70 reviews en Trustpilot con una nota media de 3.

**Lo que hicimos:**

- Identificamos a los miles de clientes que estaban **encantados** con el producto
- Les pedimos de forma sistemática que pusieran reviews, tanto en Trustpilot como en la App Store
- Resultado: pasamos de **70 a más de 300 reviews** y de una nota de **3 a por encima de 4**

#### 3. Posicionamiento del CEO y los inversores

Posicionamos a **Jorge, CEO fundador y principal accionista**, como la cara visible de la empresa. También comunicamos quiénes eran los otros accionistas e inversores que habían confiado en la compañía.

### Fase 2 — Demanda Cualificada: Creadores y Afiliados

Con la fortaleza de confianza armada, era el momento de generar atención — **tráfico que ya viniera con confianza prestada.**

#### Selección de canales: inversión tradicional, no cripto

En vez de ir a youtubers de cripto (el canal "obvio"), **nos fuimos a medios de inversión tradicional**: canales que hablaban de depósitos, fondos, ahorro, rentabilidad. Ahí estaba nuestra audiencia real.

#### El formato ganador: podcasts

El formato que mejor funcionó fue el **podcast**. Creadores de contenido entrevistaban a Jorge, que contaba la historia de la empresa, cómo funcionaba el modelo y por qué era seguro.

Todo el tráfico se dirigía a una **oferta con un 20% extra de rentabilidad** — válida si activaban en los **primeros 7 días**, generando urgencia real.

### Fase 3 — El Flywheel en acción

Con todas las piezas conectadas, el sistema empezó a alimentarse solo:

1. **Podcasts y creadores** generaban awareness entre la audiencia correcta
2. **El usuario investigaba** y encontraba reviews positivas, contenido de transparencia y a Jorge como cara visible
3. **La oferta con incentivo** activaba la conversión en los primeros 7 días
4. **Medíamos todo** y reinvertíamos en lo que funcionaba

Cada vuelta del flywheel era más eficiente que la anterior.

> **La clave no fue un canal mágico. Fue un sistema donde cada pieza reforzaba a las demás.**`;

const fields = {
  company: { stringValue: 'CRIPTAN' },
  slug: { stringValue: 'criptan' },
  stat: { stringValue: '+160%' },
  statLabel: { stringValue: 'volumen de depósitos en 12 meses' },
  highlight: { stringValue: 'Resolver la confianza para desbloquear el crecimiento' },
  summary: { stringValue: 'De 75K\u20ac/trimestre infrautilizados a +160% en depósitos, +55% en depósito medio y payback de 1-2 meses aplicando el Trust Engine.' },
  challenge: { stringValue: 'Producto con alta rentabilidad percibido como "demasiado bueno para ser verdad". Barrera de desconfianza total, paid sin atribución, influencers sin sistema de medición.' },
  solution: { stringValue: 'Trust Engine: transparencia del modelo de negocio, reviews sistemáticas (de 70 a +300 en Trustpilot), CEO como cara visible, y creadores de inversión tradicional (no cripto) como canal principal.' },
  results: {
    arrayValue: {
      values: [
        { stringValue: '+160% en volumen de depósitos' },
        { stringValue: '+55% en depósito medio por usuario (de 3.396\u20ac a 5.269\u20ac)' },
        { stringValue: '+51% en tasa de activación' },
        { stringValue: 'Payback Period reducido de 3-5 meses a 1-2 meses' },
        { stringValue: '+324 nuevas reseñas en Trustpilot (de nota 3 a nota 4+)' },
        { stringValue: '+68% en Primeros Depósitos' },
      ],
    },
  },
  testimonial: { stringValue: 'La clave no fue un canal mágico. Fue un sistema donde cada pieza reforzaba a las demás.' },
  testimonialAuthor: { stringValue: 'Growth4U' },
  testimonialRole: { stringValue: 'Trust Engine' },
  content: { stringValue: content },
  image: { stringValue: '' },
  videoUrl: { stringValue: '' },
  mediaUrl: { stringValue: '' },
  order: { integerValue: '4' },
};

async function run() {
  console.log('Creating CRIPTAN case study in Firebase...');

  const res = await fetch(COLLECTION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to create document:', res.status, text);
    process.exit(1);
  }

  const doc = await res.json();
  console.log('Created document:', doc.name);

  // Trigger Netlify deploy
  console.log('Triggering Netlify deploy...');
  const deployRes = await fetch(NETLIFY_BUILD_HOOK, { method: 'POST' });
  console.log('Deploy triggered:', deployRes.status);

  console.log('\nDone! The case study will be live after the deploy completes.');
  console.log('URL: https://growth4u.io/casos-de-exito/criptan/');
}

run().catch(console.error);
