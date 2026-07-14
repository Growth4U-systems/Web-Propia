/* Growth4U — Quiz diagnóstico (assessment funnel FAINT / estilo Valley)
 * RUNTIME COMPARTIDO. Una sola copia sirve a todas las páginas (diagnóstico, lead magnets,
 * artículos, blog). Cada página lo personaliza con un bloque de config, NUNCA copiando el JS.
 * El markup (#g4uq) y el CSS viven en el bloque rawHtml de Alarife.
 *
 * ── Cómo personalizarlo por página ──────────────────────────────────────────────
 * Mete esto en el rawHtml, junto al #g4uq. Todo es opcional: lo que no pongas cae al
 * default, así que una página sin config se comporta exactamente igual que siempre.
 *
 *   <script type="application/json" id="g4uq-config">
 *   {
 *     "source":  "lm-cac-sostenible",   // <- lo que llega a GHL. UNO por contenido.
 *     "mode":    "gate",                // "full" = 7 preguntas · "gate" = solo captura
 *     "gauge":   false,                 // el medidor solo tiene sentido en el diagnóstico
 *     "intro":   { "eyebrow": "…", "title": "…", "sub": "…", "cta": "…", "hint": "…" },
 *     "capture": { "title": "…", "sub": "…", "recibir": ["…","…","…"], "cta": "…" },
 *     "done":    { "title": "…", "sub": "…" },
 *     "waMsg":   "Quiero el sistema CAC Sostenible."
 *   }
 *   </script>
 *
 * Español de España (tú). Datos al final. Rama con-web y sin-web comparten las preguntas. */
(function () {
  var C = {
    GHL: "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b",
    WA: "34614766892",
    CAL: "https://now.growth4u.io/widget/booking/pWyNHUVPawhN9o0uU63W",
    BRIDGE: "https://growth4u.io/.netlify/functions/trust-score-bridge-background",
    REDIR: ""
  };

  // Config de la página. Sin <script id="g4uq-config">, todo cae a estos defaults y el
  // quiz se comporta como el diagnóstico de siempre (retrocompatible con /diagnostico-test).
  var CFG = (function () {
    var d = {
      source: "quiz-alarife",
      mode: "full",
      gauge: true,
      waMsg: "Acabo de completar el diagnóstico Growth4U y quiero analizar mi Trust Score.",
      intro: {
        eyebrow: "Diagnóstico Trust Score · Gratis",
        title: "Descubre tu<br>Trust Score",
        sub: "Tus clientes deciden si confían en ti <b>antes</b> de hablar contigo. El <b>Trust Score</b> mide cómo te perciben Google, las IAs y tus compradores en ese primer momento. Es uno de los mejores predictores de que acaben comprándote.",
        cta: "Quiero mi Trust Score →",
        hint: "Gratis · 2 min · sin llamadas. Te lo enviamos por WhatsApp."
      },
      capture: {
        title: "Déjanos tus datos para tu diagnóstico",
        sub: "Te preparamos tu Trust Score personalizado para ti y te lo enviamos.",
        recibir: ["Tu Trust Score <b>(0–100)</b>", "Dónde te gana tu competencia", "Tu primer movimiento de mayor impacto"],
        cta: "Quiero mis resultados"
      },
      done: {
        title: "Estamos generando tu Trust Score.",
        sub: "Te llega por WhatsApp en ~5 minutos."
      }
    };
    var el = document.getElementById("g4uq-config");
    if (!el) return d;
    try {
      var o = JSON.parse(el.textContent);
      for (var k in o) {
        if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) && d[k] && typeof d[k] === "object") {
          for (var j in o[k]) d[k][j] = o[k][j];
        } else { d[k] = o[k]; }
      }
    } catch (e) {
      // Config rota: seguimos con los defaults en vez de dejar la página sin quiz.
      if (window.console) console.warn("[g4uq] config inválida, usando defaults:", e.message);
    }
    return d;
  })();
  var GATE = CFG.mode === "gate"; // lead magnet: sin las 7 preguntas, solo captura
  var WA_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style="flex:0 0 auto;fill:#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  var S = {};
  var MAX_COMP = 5; // competidores máximos que puede añadir el usuario
  // opts: [valor, label, peso].
  // Las preguntas de CANTIDAD (facturación, inversión, tamaño de equipo) van SIEMPRE de menor a mayor.
  // Las de intensidad/encaje (segmento, timing) van de mayor a menor.
  var steps = [
    { id: "intro", type: "intro" },
    { id: "tieneweb", type: "tieneweb" },
    { id: "webinput", type: "webinput" },
    { id: "segmento", q: "¿Qué tipo de empresa tienes?", sub: "Para afinar tu diagnóstico a tu caso.", type: "single",
      opts: [["saas", "SaaS / producto tech", 10], ["fintech", "Fintech", 10], ["marketplace", "Marketplace / plataforma", 9], ["serviciosb2b", "Servicios B2B / consultoría", 8], ["b2c", "B2C / consumo / e-commerce", 7], ["otro", "Otro", 3]] },
    { id: "facturacion", q: "¿Facturación anual aproximada?", sub: "Un rango está bien.", type: "single",
      opts: [["lt500k", "Menos de 500K €", 0], ["500k2m", "500K – 2M €", 8], ["2a10m", "2M – 10M €", 18], ["gt10m", "Más de 10M €", 25]] },
    { id: "canales", q: "¿De dónde vienen tus clientes hoy?", sub: "Elige todo lo que aplique.", type: "multi",
      opts: [["seo", "SEO / contenido", 2], ["paid", "Paid (Meta/Google)", 2], ["outbound", "Outbound", 2], ["afiliados", "Afiliados / partners", 2], ["boca", "Boca a boca", 1], ["nada", "Nada estructurado", 0]] },
    { id: "dolor", q: "¿Qué es lo que más te frena?", sub: "Sé sincero, sin filtro.", type: "multi",
      opts: [["noconv", "Genero tráfico pero no convierte", 4], ["uncanal", "Dependo de un solo canal", 4], ["saturado", "El equipo va apagando fuegos", 3], ["agencias", "Agencias que solo entregan tareas sueltas", 4], ["nomido", "No sé qué funciona porque no lo mido", 3], ["cac", "El CAC se me dispara", 4], ["otro", "Otro", 0]] },
    { id: "inversion", q: "¿Cuánto inviertes en marketing al mes?", sub: "Equipo + agencias + herramientas.", type: "single",
      opts: [["lt3k", "Menos de 3K €", 0], ["3a10k", "3K – 10K €", 10], ["10a30k", "10K – 30K €", 20], ["gt30k", "Más de 30K €", 25]] },
    { id: "equipo", q: "¿Cuántas personas hay en tu equipo de marketing?", sub: "", type: "single",
      opts: [["nadie", "Nadie dedicado a marketing", 2], ["1", "1 persona", 4], ["2a5", "2-5 personas", 7], ["gt5", "Más de 5 personas", 10]] },
    { id: "timing", q: "¿Cuándo quieres resolverlo?", sub: "", type: "single",
      opts: [["ya", "Ya, es urgente", 20], ["3m", "En los próximos 3 meses", 14], ["6m", "En 3 – 6 meses", 7], ["expl", "Solo estoy mirando", 0]] },
    { id: "capture", type: "capture" },
    { id: "done", type: "done" },
    // --- Rama SIN web ---
    { id: "webhelp", type: "webhelp" },
    { id: "noconvert", type: "noconvert" }
  ];
  var idx = 0, hist = [];
  var stage = document.getElementById("g4uq-stage");
  var prog = document.getElementById("g4uq-progress");
  var back = document.getElementById("g4uq-back");
  var mini = document.querySelector("#g4uq .g4uq-mini");
  var root = document.getElementById("g4uq");
  if (!stage) return;

  function idOf(id) { for (var i = 0; i < steps.length; i++) if (steps[i].id === id) return i; return 0; }

  function analyzing(web) {
    if (!mini) return;
    var dom = (web || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
    mini.innerHTML = '<span style="display:inline-block;width:11px;height:11px;border:2px solid #DFD3BE;border-top-color:#2356E6;border-radius:50%;animation:g4uqspin .8s linear infinite;vertical-align:-1px;margin-right:7px"></span>Trust Score: analizando ' + dom + '…';
  }
  function webDom() { return (S.web || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, ""); }
  function bannerHtml() {
    if (!S.web) return "";
    return '<div style="display:flex;align-items:center;gap:11px;background:rgba(35,86,230,.07);border:1.5px solid rgba(35,86,230,.22);border-radius:9px;padding:12px 15px;margin-bottom:22px">' +
      '<span style="display:inline-block;width:16px;height:16px;border:2.5px solid #C8D6FB;border-top-color:#2356E6;border-radius:50%;animation:g4uqspin .8s linear infinite;flex:0 0 auto"></span>' +
      '<div style="line-height:1.3"><div style="font-family:var(--qfm,monospace);font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2356E6">Trust Score · analizando ' + webDom() + '</div>' +
      '<div style="font-size:13px;color:#6E6258;margin-top:2px">Mientras tanto, te seguimos conociendo 👇</div></div></div>';
  }

  /* Hero de la intro (2 columnas + gauge). El CSS base del quiz vive en el rawHtml de
   * Alarife y es estable; esto es aditivo y se inyecta desde aquí para que el hero viaje
   * junto a su markup en un solo archivo. Si se estabiliza, moverlo al bloque de Alarife. */
  function injectCss() {
    if (document.getElementById("g4uq-hero-css")) return;
    var st = document.createElement("style");
    st.id = "g4uq-hero-css";
    st.textContent =
      "#g4uq .g4uq-card{transition:max-width .35s var(--qe)}" +
      "#g4uq.g4uq-wide .g4uq-card{max-width:1000px}" +
      "#g4uq .g4uq-hero{display:grid;grid-template-columns:1.02fr .98fr;gap:40px;align-items:center}" +
      "#g4uq .g4uq-hero.g4uq-hero-solo{grid-template-columns:1fr}" + /* lead magnet: sin gauge */
      "#g4uq .g4uq-hero-copy{min-width:0}" +
      "#g4uq .g4uq-hero-copy h2{font-size:42px;line-height:1.04;margin-bottom:14px}" +
      "#g4uq .g4uq-hero .g4uq-cta{width:auto;padding:15px 26px}" +
      "#g4uq .g4uq-hero .g4uq-hint{text-align:left}" +
      "#g4uq .g4uq-hero-viz{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0}" +
      "#g4uq .g4uq-viz-note{font-family:var(--qfm);font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#B9AC9C;margin:6px 0 0;text-align:center}" +
      "#g4uq .g4uq-gauge{width:100%;max-width:340px;height:auto;display:block}" +
      "#g4uq .g4uq-gauge-arc{animation:g4uqfill 1.15s var(--qe) both}" +
      "@keyframes g4uqfill{from{stroke-dashoffset:377}}" +
      "@media(prefers-reduced-motion:reduce){#g4uq .g4uq-gauge-arc{animation:none}}" +
      "@media(max-width:860px){" +
        "#g4uq .g4uq-hero{grid-template-columns:1fr;gap:26px}" +
        "#g4uq .g4uq-hero-viz{order:-1}" +
        "#g4uq .g4uq-hero-copy h2{font-size:30px}" +
        "#g4uq .g4uq-hero .g4uq-cta{width:100%}" +
        "#g4uq .g4uq-hero .g4uq-hint{text-align:center}" +
        "#g4uq .g4uq-gauge{max-width:260px}" +
      "}" +

      /* Paso de la web: más compacto, porque con 5 competidores el formulario se hacía largo. */
      "#g4uq .g4uq-webstep .g4uq-sub{font-size:15px;margin-bottom:18px}" +
      "#g4uq .g4uq-webstep .g4uq-field{margin-bottom:9px}" +
      "#g4uq .g4uq-webstep .g4uq-field label{margin-bottom:5px}" +
      "#g4uq .g4uq-webstep .g4uq-field input{padding:11px 13px;font-size:15px}" +
      "#g4uq .g4uq-webstep .g4uq-cta{margin-top:16px;padding:13px}" +
      "#g4uq .g4uq-fieldhint{display:block;font-family:var(--qfb);font-size:12.5px;font-weight:400;color:#A89B8C;margin-top:3px;text-transform:none;letter-spacing:0}" +
      /* Fila de competidor con botón de quitar */
      "#g4uq .g4uq-comprow{position:relative}" +
      "#g4uq .g4uq-comprow input{padding-right:38px}" +
      "#g4uq .g4uq-delcomp{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:26px;height:26px;border:none;background:none;color:#A89B8C;font-size:19px;line-height:1;cursor:pointer;border-radius:6px;padding:0}" +
      "#g4uq .g4uq-delcomp:hover{background:rgba(36,28,22,.08);color:var(--qi)}" +
      "#g4uq .g4uq-addcomp{display:inline-block;background:none;border:none;cursor:pointer;font-family:var(--qfm);font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--qbl);padding:2px 0 0;margin:0 0 11px}" +
      "#g4uq .g4uq-addcomp:hover{text-decoration:underline}" +
      /* Checkbox \"no lo tengo claro\": era diminuto, ahora es una opción con el mismo peso visual que las demás. */
      "#g4uq .g4uq-check{display:flex;align-items:center;gap:12px;padding:13px 15px;border:1.5px solid var(--ql);border-radius:9px;background:var(--qw);box-shadow:3px 3px 0 rgba(36,28,22,.10);font-family:var(--qfb);font-size:15px;font-weight:600;color:var(--qi);cursor:pointer;margin:2px 0 4px;transition:transform .14s var(--qe),box-shadow .14s var(--qe),border-color .14s}" +
      "#g4uq .g4uq-check:hover{border-color:var(--qi);transform:translate(-2px,-2px);box-shadow:5px 5px 0 rgba(36,28,22,.14)}" +
      "#g4uq .g4uq-check input{position:absolute;opacity:0;width:0;height:0}" +
      "#g4uq .g4uq-check-box{width:21px;height:21px;border-radius:5px;border:1.5px solid var(--ql2);flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;transition:.14s var(--qe)}" +
      "#g4uq .g4uq-check input:checked+.g4uq-check-box{background:var(--qbl);border-color:var(--qbl)}" +
      "#g4uq .g4uq-check input:checked+.g4uq-check-box::after{content:'\\2713'}" +
      "#g4uq .g4uq-check:has(input:checked){border-color:var(--qbl);background:rgba(35,86,230,.06);box-shadow:4px 4px 0 rgba(35,86,230,.20)}" +
      "#g4uq .g4uq-check input:focus-visible+.g4uq-check-box{outline:2px solid var(--qbl);outline-offset:2px}" +

      /* Paso de datos: era el más largo de todos, lo apretamos. */
      "#g4uq .g4uq-capstep .g4uq-sub{font-size:15px;margin-bottom:16px}" +
      "#g4uq .g4uq-capstep .g4uq-field{margin-bottom:9px}" +
      "#g4uq .g4uq-capstep .g4uq-field label{margin-bottom:5px}" +
      "#g4uq .g4uq-capstep .g4uq-field input{padding:11px 13px;font-size:15px}" +
      "#g4uq .g4uq-capstep .g4uq-cta{margin-top:15px;padding:13px}" +
      "#g4uq .g4uq-capstep .g4uq-cta.g4uq-cta2{margin-top:9px}" +
      "#g4uq .g4uq-capstep .g4uq-hint{margin-top:10px}" +
      "#g4uq .g4uq-recibir{background:rgba(36,28,22,.03);border:1.5px solid rgba(36,28,22,.18);border-radius:9px;padding:11px 14px;margin-bottom:16px}" +
      "#g4uq .g4uq-recibir-t{font-family:var(--qfm);font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#A89B8C;margin-bottom:6px}" +
      "#g4uq .g4uq-recibir-l{font-size:13.5px;color:var(--qi);line-height:1.65}" +
      /* Último paso a 2 columnas: el contexto (qué recibes) a un lado, el formulario al otro. */
      "#g4uq .g4uq-capgrid{display:grid;grid-template-columns:1fr 1fr;gap:38px;align-items:start}" +
      "#g4uq .g4uq-capleft,#g4uq .g4uq-capright{min-width:0}" +
      "#g4uq .g4uq-capstep .g4uq-recibir{margin-bottom:0}" +
      "#g4uq .g4uq-capright .g4uq-cta{margin-top:16px}" +
      "@media(max-width:860px){" +
        "#g4uq .g4uq-capgrid{grid-template-columns:1fr;gap:20px}" +
        "#g4uq .g4uq-capstep .g4uq-recibir{margin-bottom:2px}" +
      "}";
    document.head.appendChild(st);
  }

  /* Gauge ilustrativo de la intro. El valor es un EJEMPLO: en la intro el usuario aún no
   * tiene score, por eso el caption lo marca como tal.
   *
   * IMPORTANTE — por qué todo va en `style` inline:
   * El bloque rawHtml de Alarife aplica `all: revert` a sus descendientes (.fp-xxxx *).
   * Eso borra TODOS los atributos de presentación SVG (d, fill, stroke, text-anchor,
   * stop-color…), porque cuentan como declaraciones de autor. Con el atributo `d`
   * revertido el path se queda sin geometría (getTotalLength() = 0) y no se pinta nada.
   * El style inline sí sobrevive, así que ahí van geometría y pintado.
   * El atributo `d` se mantiene además para Firefox, que no soporta la propiedad CSS `d`
   * (y por lo mismo tampoco se la revierte). */
  function gaugeSvg(v) {
    var R = 120, CX = 160, CY = 158;
    var LEN = Math.PI * R; // longitud del semicírculo ≈ 377
    var arc = "M " + (CX - R) + " " + CY + " A " + R + " " + R + " 0 0 1 " + (CX + R) + " " + CY;
    var base = "d:path('" + arc + "');fill:none;stroke-width:18;stroke-linecap:round;";
    var tick = "font-family:var(--qfm);font-size:12px;font-weight:600;fill:#A89B8C;text-anchor:middle";
    return '<svg class="g4uq-gauge" viewBox="0 0 320 200" role="img" aria-label="Ejemplo de Trust Score: ' + v + ' sobre 100">' +
      '<defs><linearGradient id="g4uqGrad" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" style="stop-color:#C0552B"/><stop offset="52%" style="stop-color:#B4903A"/><stop offset="100%" style="stop-color:#3E8E5A"/>' +
      '</linearGradient></defs>' +
      '<path d="' + arc + '" style="' + base + 'stroke:#E6DCC7"/>' +
      '<path class="g4uq-gauge-arc" d="' + arc + '" style="' + base + 'stroke:url(#g4uqGrad);' +
        'stroke-dasharray:' + LEN.toFixed(1) + ';stroke-dashoffset:' + (LEN * (1 - v / 100)).toFixed(1) + '"/>' +
      '<text x="' + (CX - R) + '" y="182" style="' + tick + '">0</text>' +
      '<text x="' + CX + '" y="22" style="' + tick + '">50</text>' +
      '<text x="' + (CX + R) + '" y="182" style="' + tick + '">100</text>' +
      '<text x="' + CX + '" y="146" style="font-family:var(--qfd);font-weight:800;font-size:54px;fill:var(--qi);letter-spacing:-.03em;text-anchor:middle">' + v +
        '<tspan dx="3" style="font-weight:700;font-size:20px;fill:#A89B8C;letter-spacing:0">/100</tspan></text>' +
      '<text x="' + CX + '" y="174" style="font-family:var(--qfm);font-size:10.5px;font-weight:700;letter-spacing:.09em;fill:#A89B8C;text-anchor:middle">TU TRUST SCORE</text>' +
    '</svg>';
  }

  function setProg() {
    var id = steps[idx].id, pct;
    // En modo gate el recorrido es intro -> captura -> listo, así que la barra no puede
    // usar los tramos del quiz completo.
    var pmap = GATE
      ? { intro: 0, capture: 55, done: 100 }
      : { intro: 0, tieneweb: 8, webinput: 16, capture: 92, done: 100, webhelp: 12, noconvert: 100 };
    if (pmap[id] != null) pct = pmap[id];
    else pct = 26 + Math.round(qNum(idx) / 7 * 62); // preguntas 1..7 -> 26..88%
    prog.style.width = pct + "%";
  }
  function go(n) { n = Math.max(0, Math.min(steps.length - 1, n)); if (n !== idx) hist.push(idx); idx = n; render(); }
  back.onclick = function () { if (hist.length) { idx = hist.pop(); render(); } };

  function optRow(o, multi, sid) {
    var sel = multi ? (S[sid] && S[sid].indexOf(o[0]) > -1) : (S[sid] === o[0]);
    return '<button class="g4uq-opt' + (sel ? ' sel' : '') + '" data-v="' + o[0] + '"><span class="g4uq-tick">' + (sel ? '✓' : '') + '</span>' + o[1] + '</button>';
  }
  function qNum(i) { var n = 0; for (var k = 1; k <= i; k++) { if (steps[k].type === "single" || steps[k].type === "multi") n++; } return n; }
  function normWeb(u) { return /^https?:\/\//i.test(u) ? u : "https://" + u; }
  function lbl(sid, v) { var s = steps.find(function (x) { return x.id === sid; }); if (!s || !s.opts) return v || ""; var o = s.opts.find(function (x) { return x[0] === v; }); return o ? o[1] : (v || ""); }
  function lbls(sid) { return (S[sid] || []).map(function (v) { return lbl(sid, v); }).join(", "); }

  function render() {
    setProg();
    var termId = steps[idx].id;
    var isTerm = termId === "done" || termId === "noconvert";
    back.style.visibility = (hist.length > 0 && !isTerm) ? "visible" : "hidden";
    var s = steps[idx];
    // Ancho: la intro y el último paso son pantallas de CONTENIDO (tienen algo que enseñar
    // al lado del CTA/formulario). Las 7 preguntas se quedan estrechas a propósito: una
    // decisión a la vez y sin nada que distraiga. El card transiciona el ancho para que el
    // cambio se lea como intencionado y no como un salto.
    // Sin gauge (lead magnet) la intro no tiene nada que enseñar al lado: se queda estrecha.
    if (root) root.classList.toggle("g4uq-wide", (s.type === "intro" && CFG.gauge) || s.type === "capture");

    if (s.type === "intro") {
      // El gauge solo tiene sentido en el diagnóstico. En un lead magnet se apaga con
      // "gauge": false y el hero pasa a una columna.
      var viz = CFG.gauge
        ? '<div class="g4uq-hero-viz">' + gaugeSvg(74) + '<p class="g4uq-viz-note">Ejemplo ilustrativo</p></div>'
        : '';
      stage.innerHTML = '<div class="g4uq-hero' + (CFG.gauge ? '' : ' g4uq-hero-solo') + '">' +
          '<div class="g4uq-hero-copy">' +
            '<span class="g4uq-eyebrow">' + CFG.intro.eyebrow + '</span>' +
            '<h2>' + CFG.intro.title + '</h2>' +
            '<p class="g4uq-sub">' + CFG.intro.sub + '</p>' +
            '<button class="g4uq-cta" id="g4uq-start">' + CFG.intro.cta + '</button>' +
            '<p class="g4uq-hint">' + CFG.intro.hint + '</p>' +
          '</div>' + viz +
        '</div>';
      document.getElementById("g4uq-start").onclick = function () { go(idOf(GATE ? "capture" : "tieneweb")); };
      return;
    }
    if (s.type === "tieneweb") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Empecemos</span><h2>¿Tienes web?</h2>' +
        '<p class="g4uq-sub">Tu web es lo que analizamos para darte tu Trust Score.</p>' +
        '<div class="g4uq-opts">' +
          '<button class="g4uq-opt" data-v="si"><span class="g4uq-tick"></span>Sí, tengo web</button>' +
          '<button class="g4uq-opt" data-v="no"><span class="g4uq-tick"></span>Todavía no</button>' +
        '</div>';
      Array.prototype.forEach.call(stage.querySelectorAll(".g4uq-opt"), function (btn) {
        btn.onclick = function () {
          S.tieneweb = btn.getAttribute("data-v");
          if (S.tieneweb === "si") { go(idOf("webinput")); }
          else { S.web = ""; if (mini) mini.textContent = "Diagnóstico gratuito · 60 seg"; go(idOf("webhelp")); }
        };
      });
      return;
    }
    if (s.type === "webinput") {
      // Competidores: solo el nombre (el bridge ya resuelve nombre -> dominio antes de comparar).
      var comps = (S.competidores && S.competidores.length ? S.competidores.slice(0, MAX_COMP) : ["", "", ""]);
      while (comps.length < 3) comps.push("");
      var nocomp = !!S.nocomp;
      stage.innerHTML = '<div class="g4uq-webstep">' +
        '<span class="g4uq-eyebrow">Tu web</span><h2>Deja tu web aquí</h2>' +
        '<p class="g4uq-sub">Para calcular bien tu Trust Score empezamos por tu web. Déjala aquí y la analizamos frente a tu competencia mientras seguimos con las preguntas.</p>' +
        '<div class="g4uq-field"><label>Web de tu empresa</label><input id="f-web" type="url" placeholder="https://tuempresa.com" value="' + (S.web || '') + '"></div>' +
        '<div class="g4uq-field" style="margin-bottom:7px"><label>Tus competidores directos</label>' +
          '<span class="g4uq-fieldhint">Solo el nombre. Puedes añadir hasta ' + MAX_COMP + '.</span></div>' +
        '<div id="comp-wrap"' + (nocomp ? ' style="display:none"' : '') + '>' +
          '<div id="comp-list"></div>' +
          '<button type="button" class="g4uq-addcomp" id="f-addcomp">+ Añadir competidor</button>' +
        '</div>' +
        '<label class="g4uq-check"><input type="checkbox" id="f-nocomp"' + (nocomp ? ' checked' : '') + '>' +
          '<span class="g4uq-check-box"></span>' +
          '<span>No lo tengo claro. <b>Detectadlos vosotros.</b></span></label>' +
        '<button class="g4uq-cta" id="g4uq-next" disabled>Analizar mi Trust Score →</button>' +
      '</div>';
      var w = document.getElementById("f-web"), b = document.getElementById("g4uq-next"),
          noc = document.getElementById("f-nocomp"), wrap = document.getElementById("comp-wrap"),
          list = document.getElementById("comp-list"), addBtn = document.getElementById("f-addcomp");

      function renderComps() {
        list.innerHTML = comps.map(function (v, i) {
          return '<div class="g4uq-field g4uq-comprow">' +
            '<input type="text" data-i="' + i + '" placeholder="Competidor ' + (i + 1) + '" value="' + String(v || '').replace(/"/g, '&quot;') + '">' +
            (comps.length > 1 ? '<button type="button" class="g4uq-delcomp" data-i="' + i + '" aria-label="Quitar competidor ' + (i + 1) + '">×</button>' : '') +
          '</div>';
        }).join('');
        // Solo se re-renderiza al añadir/quitar; en oninput únicamente se actualiza el array,
        // así el input no pierde el foco mientras se escribe.
        Array.prototype.forEach.call(list.querySelectorAll('input'), function (inp) {
          inp.oninput = function () { comps[+inp.getAttribute('data-i')] = inp.value; };
        });
        Array.prototype.forEach.call(list.querySelectorAll('.g4uq-delcomp'), function (btn) {
          btn.onclick = function () { comps.splice(+btn.getAttribute('data-i'), 1); renderComps(); };
        });
        addBtn.style.display = comps.length >= MAX_COMP ? 'none' : '';
      }
      renderComps();
      addBtn.onclick = function () { if (comps.length < MAX_COMP) { comps.push(''); renderComps(); } };

      function chkw() { b.disabled = !(w.value.trim().length > 3); }
      w.oninput = chkw; chkw();
      noc.onchange = function () { S.nocomp = noc.checked; wrap.style.display = noc.checked ? "none" : ""; };
      b.onclick = function () {
        S.web = normWeb(w.value.trim());
        S.competidores = noc.checked ? [] : comps.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
        analyzing(S.web); // Solo visual. El bridge (créditos) NO se llama hasta submit().
        go(idOf("segmento"));
      };
      return;
    }
    if (s.type === "capture") {
      var noweb = S.tieneweb === "no";
      // La copy del formulario la manda la página: tiene que hablar del contenido que se
      // está descargando, no del Trust Score genérico.
      var head = noweb ? "Déjanos tus datos" : CFG.capture.title;
      var sub = noweb ? "Te contactamos para ayudarte a crear tu web y tu presencia." : CFG.capture.sub;
      var preview = noweb
        ? '▸ Una orientación clara para tu caso<br>▸ Tu primer movimiento de mayor impacto<br>▸ Qué construir primero'
        : (CFG.capture.recibir || []).map(function (x) { return '▸ ' + x; }).join('<br>');
      // Solo el nombre: el apellido no se usa para nada y alargaba el formulario.
      stage.innerHTML = '<div class="g4uq-capstep">' + bannerHtml() +
        '<div class="g4uq-capgrid">' +
          '<div class="g4uq-capleft">' +
            '<span class="g4uq-eyebrow">Último paso</span><h2>' + head + '</h2>' +
            '<p class="g4uq-sub">' + sub + '</p>' +
            '<div class="g4uq-recibir"><div class="g4uq-recibir-t">Lo que vas a recibir</div>' +
              '<div class="g4uq-recibir-l">' + preview + '</div></div>' +
          '</div>' +
          '<div class="g4uq-capright">' +
            '<div class="g4uq-field"><label>Nombre</label><input id="f-nombre" type="text" placeholder="Nombre" value="' + (S.nombre || '') + '"></div>' +
            '<div class="g4uq-field"><label>Nombre de tu empresa</label><input id="f-empresa" type="text" placeholder="Tu empresa" value="' + (S.empresa || '') + '"></div>' +
            '<div class="g4uq-field"><label>Email de trabajo</label><input id="f-email" type="email" placeholder="tu@empresa.com" value="' + (S.email || '') + '"></div>' +
            '<div class="g4uq-field"><label>Teléfono (WhatsApp)</label><input id="f-tel" type="tel" placeholder="+34 600 000 000" value="' + (S.telefono || '') + '"></div>' +
            '<a class="g4uq-cta wa" id="g4uq-go" href="#" style="pointer-events:none;opacity:.4">' + WA_SVG + (noweb ? 'Quiero que me ayuden' : CFG.capture.cta) + '</a>' +
            (noweb ? '' : '<a class="g4uq-cta g4uq-cta2" id="g4uq-cal2" href="#" style="pointer-events:none;opacity:.5">Prefiero agendar una llamada →</a>') +
            '<p class="g4uq-hint">Gratis · te lo enviamos por WhatsApp.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
      var n = document.getElementById("f-nombre"), emp = document.getElementById("f-empresa"),
          e = document.getElementById("f-email"), tel = document.getElementById("f-tel"),
          go1 = document.getElementById("g4uq-go"), cal2 = document.getElementById("g4uq-cal2");
      function valid() { return n.value.trim() && emp.value.trim() && /.+@.+\..+/.test(e.value) && tel.value.trim().length >= 6; }
      function sync() {
        S.nombre = n.value.trim(); S.empresa = emp.value.trim(); S.email = e.value.trim(); S.telefono = tel.value.trim();
        var ok = valid();
        go1.style.pointerEvents = ok ? "auto" : "none"; go1.style.opacity = ok ? "1" : ".4";
        if (cal2) { cal2.style.pointerEvents = ok ? "auto" : "none"; cal2.style.opacity = ok ? "1" : ".5"; }
        if (ok) {
          if (noweb) { go1.href = C.CAL; go1.target = "_blank"; go1.rel = "noopener"; }
          else {
            var msg = waText();
            go1.href = "https://wa.me/" + C.WA + "?text=" + encodeURIComponent(msg);
            go1.target = "_blank"; go1.rel = "noopener";
            if (cal2) { cal2.href = C.CAL; cal2.target = "_blank"; cal2.rel = "noopener"; }
          }
        }
      }
      n.oninput = emp.oninput = e.oninput = tel.oninput = sync; sync();
      // Guardamos el canal elegido para no volver a ofrecer en el frame final el que descartaron.
      go1.onclick = function () { if (!valid()) return; S.via = noweb ? "cal" : "wa"; noweb ? submitNoWeb() : submit(); setTimeout(function () { go(idOf("done")); }, 60); };
      if (cal2) cal2.onclick = function () { if (!valid()) return; S.via = "cal"; submit(); setTimeout(function () { go(idOf("done")); }, 60); };
      return;
    }
    if (s.type === "done") {
      var noweb2 = S.tieneweb === "no";
      // El paso anterior ya les hizo elegir canal. Aquí NO repetimos el que descartaron:
      // solo dejamos el enlace de recuperación del que eligieron, por si no se abrió la pestaña.
      // (En la rama sin web el CTA ya llevaba al calendario, así que ese es su canal.)
      var viaCal = noweb2 || S.via === "cal";
      if (mini) mini.textContent = noweb2 ? "Gracias · te contactamos" : (GATE ? "En camino" : "Trust Score en camino");
      var recuperar = viaCal ? "Si no se abrió el calendario, entra aquí 👇" : "Si no se abrió WhatsApp, entra aquí 👇";
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">¡Listo!</span>' +
        (noweb2
          ? '<h2>¡Gracias! Vamos a ayudarte.</h2><p class="g4uq-sub">Te contactamos para ver cómo armamos tu web y tu presencia. ' + recuperar + '</p>'
          : '<h2>' + CFG.done.title + '</h2><p class="g4uq-sub">' +
            (viaCal ? 'Te lo enseñamos en la llamada. ' : CFG.done.sub + ' ') + recuperar + '</p>') +
        (viaCal
          ? '<a class="g4uq-cta g4uq-cta2" id="g4uq-cal" href="#" target="_blank" rel="noopener">Abrir el calendario →</a>'
          : '<a class="g4uq-cta wa" id="g4uq-wa" href="#" target="_blank" rel="noopener">' + WA_SVG + 'Abrir WhatsApp</a>') +
      '</div>';
      var msg2 = noweb2
        ? ("Hola, soy " + S.nombre + ". Completé el diagnóstico Growth4U (todavía sin web) y quiero que me orienten.")
        : waText();
      var a = document.getElementById("g4uq-wa"); if (a) a.href = "https://wa.me/" + C.WA + "?text=" + encodeURIComponent(msg2);
      var cl = document.getElementById("g4uq-cal"); if (cl) cl.href = C.CAL;
      return;
    }
    if (s.type === "webhelp") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Sin web, sin problema</span><h2>¿Quieres que te ayudemos a crearla?</h2>' +
        '<p class="g4uq-sub">Construimos tu web para que empieces a generar confianza en Google y en las IAs desde el día uno.</p>' +
        '<div class="g4uq-opts">' +
          '<button class="g4uq-opt" data-v="si"><span class="g4uq-tick"></span>Sí, quiero que me ayuden</button>' +
          '<button class="g4uq-opt" data-v="no"><span class="g4uq-tick"></span>No, gracias</button>' +
        '</div>';
      Array.prototype.forEach.call(stage.querySelectorAll(".g4uq-opt"), function (btn) {
        btn.onclick = function () {
          S.quiereweb = btn.getAttribute("data-v");
          go(idOf(S.quiereweb === "si" ? "segmento" : "noconvert"));
        };
      });
      return;
    }
    if (s.type === "noconvert") {
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">Sin problema</span><h2>¡Gracias por pasar!</h2>' +
        '<p class="g4uq-sub">El Trust Score se apoya en tu web. Cuando tengas una, vuelve y te damos tu diagnóstico completo. 👋</p></div>';
      return;
    }

    // Preguntas (single / multi). Al terminar timing -> capture (datos al final).
    var multi = s.type === "multi";
    var h = bannerHtml() + '<span class="g4uq-eyebrow">Pregunta ' + qNum(idx) + ' / 7</span><h2>' + s.q + '</h2>' + (s.sub ? '<p class="g4uq-sub">' + s.sub + '</p>' : '') + '<div class="g4uq-opts">';
    s.opts.forEach(function (o) { h += optRow(o, multi, s.id); });
    h += '</div>';
    if (multi) h += '<button class="g4uq-cta" id="g4uq-next">Continuar →</button>';
    stage.innerHTML = h;
    var lastQ = idOf("timing");
    Array.prototype.forEach.call(stage.querySelectorAll(".g4uq-opt"), function (btn) {
      btn.onclick = function () {
        var v = btn.getAttribute("data-v");
        if (multi) { S[s.id] = S[s.id] || []; var i = S[s.id].indexOf(v); i > -1 ? S[s.id].splice(i, 1) : S[s.id].push(v); render(); }
        else { S[s.id] = v; setTimeout(function () { go(idx === lastQ ? idOf("capture") : idx + 1); }, 180); }
      };
    });
    if (multi) document.getElementById("g4uq-next").onclick = function () { go(idx === lastQ ? idOf("capture") : idx + 1); };
  }

  function score() {
    function val(id) {
      var s = steps.find(function (x) { return x.id === id; }); if (!s || !s.opts) return 0;
      if (s.type === "multi") { var t = 0; (S[id] || []).forEach(function (v) { var o = s.opts.find(function (x) { return x[0] === v; }); if (o) t += o[2]; }); return t; }
      var o = s.opts.find(function (x) { return x[0] === S[id]; }); return o ? o[2] : 0;
    }
    // FAINT: F (fondos) facturación+inversión · A (autoridad) segmento+equipo · I (interés) canales · N (necesidad) dolor · T (timing).
    var F = Math.min(50, val("facturacion") + val("inversion")), A = Math.min(20, val("segmento") + val("equipo")), I = Math.min(9, val("canales")), N = Math.min(22, val("dolor")), T = val("timing");
    var total = Math.round((F / 50) * 30 + (A / 20) * 15 + (I / 9) * 15 + (N / 22) * 20 + (T / 20) * 20);
    return { total: total, tier: total >= 65 ? "caliente" : (total >= 40 ? "tibio" : "frio") };
  }

  function resumenRespuestas(sc) {
    return "Empresa: " + lbl("segmento", S.segmento) +
      " · Facturación: " + lbl("facturacion", S.facturacion) +
      " · Clientes: " + (lbls("canales") || "—") +
      " · Le frena: " + (lbls("dolor") || "—") +
      " · Inversión/mes: " + lbl("inversion", S.inversion) +
      " · Equipo: " + lbl("equipo", S.equipo) +
      " · Timing: " + lbl("timing", S.timing) +
      (S.competidores && S.competidores.filter(Boolean).length ? " · Competidores: " + S.competidores.filter(Boolean).join(", ") : "") +
      " · FAINT: " + sc.total + " (" + sc.tier + ")";
  }
  function utmObj() {
    var qs; try { qs = new URLSearchParams(window.location.search); } catch (e) { qs = { get: function () { return ""; } }; }
    return {
      origen: qs.get("origen") || qs.get("from") || "",
      utm_source: qs.get("utm_source") || "", utm_medium: qs.get("utm_medium") || "", utm_campaign: qs.get("utm_campaign") || "",
      referrer: document.referrer || "", landing: window.location.href, ts: new Date().toISOString()
    };
  }
  function postGHL(p) { if (C.GHL) { try { fetch(C.GHL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), keepalive: true }); } catch (e) {} } }

  // Mensaje de WhatsApp. El "quiero X" concreto lo pone cada página vía CFG.waMsg.
  function waText() {
    return "Hola, soy " + (S.nombre || "") + (S.web ? " de " + S.web : "") + ". " + CFG.waMsg;
  }

  function submit() {
    var comps = (S.competidores || []).filter(Boolean);
    var p = {
      nombre: S.nombre, apellido: "", empresa: S.empresa, email: S.email, phone: S.telefono,
      web: S.web || "", source: CFG.source, mode: CFG.mode
    };
    // En modo gate (lead magnet) no se hacen las 7 preguntas. Mandar un FAINT de 0 metería
    // leads falsamente "fríos" en GHL, así que el scoring solo viaja cuando existe de verdad.
    if (!GATE) {
      var sc = score();
      p.segmento = lbl("segmento", S.segmento); p.facturacion = lbl("facturacion", S.facturacion);
      p.canales = lbls("canales"); p.dolor = lbls("dolor"); p.inversion = lbl("inversion", S.inversion);
      p.equipo = lbl("equipo", S.equipo); p.timing = lbl("timing", S.timing);
      p.competidores = comps.join(", "); p.faint_score = sc.total; p.tier = sc.tier;
      p.tieneweb = "si"; p.respuestas = resumenRespuestas(sc);
    }
    postGHL(Object.assign(p, utmObj()));
    if (C.BRIDGE && S.web) { try { fetch(C.BRIDGE, { method: "POST", body: JSON.stringify({ email: S.email, web: S.web, nombre: S.nombre, apellido: "", phone: S.telefono, competidores: comps }), keepalive: true }); } catch (e) {} }
  }

  function submitNoWeb() {
    var sc = score();
    var p = Object.assign({
      nombre: S.nombre, apellido: "", empresa: S.empresa, email: S.email, phone: S.telefono, web: "",
      segmento: lbl("segmento", S.segmento), facturacion: lbl("facturacion", S.facturacion), canales: lbls("canales"),
      dolor: lbls("dolor"), inversion: lbl("inversion", S.inversion), equipo: lbl("equipo", S.equipo), timing: lbl("timing", S.timing),
      faint_score: sc.total, tier: sc.tier, tieneweb: "no", quiere_web: "si",
      respuestas: "Sin web · Quiere ayuda para crear su web · " + resumenRespuestas(sc),
      source: CFG.source, mode: CFG.mode
    }, utmObj());
    postGHL(p);
  }

  injectCss();
  render();
})();
