/* Growth4U — Quiz diagnóstico (assessment funnel FAINT / estilo Valley)
 * Canónico. Se carga en Alarife /diagnostico vía <script src>. Editá acá + redeploy growth4u.io.
 * El markup (#g4uq) y el CSS viven inline en el bloque rawHtml de Alarife (estables).
 * Config: GHL = Inbound Webhook · WA = bot WhatsApp · CAL = calendario llamada estratégica. */
(function () {
  var C = {
    GHL: "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b",
    WA: "34614766892",
    CAL: "https://now.growth4u.io/widget/bookings/llamada-estrategica-alfonso-w",
    REDIR: ""
  };
  var S = {};
  // opts: [valor, label, peso]. Escalas SIEMPRE de mayor a menor.
  var steps = [
    { id: "intro", type: "intro" },
    { id: "segmento", q: "¿Qué tipo de empresa tenés?", sub: "Para afinar tu diagnóstico a tu caso.", type: "single",
      opts: [["saas", "SaaS / producto tech B2B", 10], ["ecommerce", "E-commerce / DTC", 6], ["servicios", "Servicios B2B / consultoría", 8], ["marketplace", "Marketplace / plataforma", 9], ["otro", "Otro", 3]] },
    { id: "facturacion", q: "¿Facturación anual aproximada?", sub: "Un rango está bien.", type: "single",
      opts: [["gt10m", "Más de 10M €", 25], ["2a10m", "2M – 10M €", 18], ["500k2m", "500K – 2M €", 8], ["lt500k", "Menos de 500K €", 0]] },
    { id: "canales", q: "¿De dónde sale tu crecimiento hoy?", sub: "Elegí todo lo que aplique.", type: "multi",
      opts: [["seo", "SEO / contenido", 2], ["paid", "Paid (Meta/Google)", 2], ["outbound", "Outbound", 2], ["afiliados", "Afiliados / partners", 2], ["referido", "Boca-oreja", 1], ["nada", "Nada estructurado", 0]] },
    { id: "capture1", type: "capture1" },
    { id: "dolor", q: "¿Qué es lo que más te frena?", sub: "Sé honesto, sin filtro.", type: "multi",
      opts: [["noconv", "Genero tráfico pero no convierte", 4], ["uncanal", "Dependo de un solo canal", 4], ["saturado", "El equipo va apagando fuegos", 3], ["agencias", "Agencias que solo entregan tareas sueltas", 4], ["nomido", "No sé qué funciona porque no lo mido", 3], ["cac", "El CAC se me dispara", 4]] },
    { id: "inversion", q: "¿Cuánto invertís en marketing al mes?", sub: "Equipo + agencias + herramientas.", type: "single",
      opts: [["gt30k", "Más de 30K €", 25], ["10a30k", "10K – 30K €", 20], ["3a10k", "3K – 10K €", 10], ["lt3k", "Menos de 3K €", 0]] },
    { id: "equipo", q: "¿Cómo es tu equipo de marketing?", sub: "", type: "single",
      opts: [["cmo", "Equipo + CMO", 10], ["sindir", "Equipo, pero sin dirección senior", 7], ["gen", "1 generalista", 4], ["sin", "No tengo equipo dedicado", 2]] },
    { id: "timing", q: "¿Cuándo querés resolverlo?", sub: "", type: "single",
      opts: [["ya", "Ya, es urgente", 20], ["3m", "En los próximos 3 meses", 14], ["6m", "En 3 – 6 meses", 7], ["expl", "Solo estoy mirando", 0]] },
    { id: "capture2", type: "capture2" },
    { id: "submitting", type: "submitting" }
  ];
  var idx = 0;
  var stage = document.getElementById("g4uq-stage");
  var prog = document.getElementById("g4uq-progress");
  var back = document.getElementById("g4uq-back");
  if (!stage) return;

  function setProg() { prog.style.width = Math.round(idx / (steps.length - 1) * 100) + "%"; }
  function go(n) { idx = Math.max(0, Math.min(steps.length - 1, n)); render(); }
  back.onclick = function () { if (idx > 0) go(idx - 1); };

  function optRow(o, multi, sid) {
    var sel = multi ? (S[sid] && S[sid].indexOf(o[0]) > -1) : (S[sid] === o[0]);
    return '<button class="g4uq-opt' + (sel ? ' sel' : '') + '" data-v="' + o[0] + '"><span class="g4uq-tick">' + (sel ? '✓' : '') + '</span>' + o[1] + '</button>';
  }
  function qNum(i) { var n = 0; for (var k = 1; k <= i; k++) { if (steps[k].type === "single" || steps[k].type === "multi") n++; } return n; }
  function normWeb(u) { return /^https?:\/\//i.test(u) ? u : "https://" + u; }

  function render() {
    setProg();
    back.style.visibility = (idx > 0 && idx < steps.length - 1) ? "visible" : "hidden";
    var s = steps[idx];

    if (s.type === "intro") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Diagnóstico · Trust Score</span>' +
        '<h2>¿Te recomienda la IA, o recomienda a tu competencia?</h2>' +
        '<p class="g4uq-sub">Google y las IAs ya deciden a quién ven tus clientes. Te hacemos 6 preguntas para entender tu negocio, analizamos tu web y te damos tu Trust Score en 2 minutos: dónde estás, qué te frena y el movimiento de mayor impacto. La verdad, cierres o no con nosotros.</p>' +
        '<button class="g4uq-cta" id="g4uq-start">Quiero mi Trust Score →</button>' +
        '<p class="g4uq-hint">Gratis · 2 min · sin llamadas. Te lo enviamos por WhatsApp.</p>';
      document.getElementById("g4uq-start").onclick = function () { go(idx + 1); };
      return;
    }
    if (s.type === "capture1") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Ya casi</span><h2>¿A nombre de quién va el diagnóstico?</h2>' +
        '<p class="g4uq-sub">Tu web es lo que analizamos para tu Trust Score.</p>' +
        '<div class="g4uq-field"><label>Nombre</label><input id="f-nombre" type="text" placeholder="Nombre" value="' + (S.nombre || '') + '"></div>' +
        '<div class="g4uq-field"><label>Apellido</label><input id="f-apellido" type="text" placeholder="Apellido" value="' + (S.apellido || '') + '"></div>' +
        '<div class="g4uq-field"><label>Web de tu empresa</label><input id="f-web" type="url" placeholder="https://tuempresa.com" value="' + (S.web || '') + '"></div>' +
        '<button class="g4uq-cta" id="g4uq-next" disabled>Continuar →</button>';
      var n = document.getElementById("f-nombre"), ap = document.getElementById("f-apellido"), w = document.getElementById("f-web"), b = document.getElementById("g4uq-next");
      function chk() { b.disabled = !(n.value.trim() && ap.value.trim() && w.value.trim().length > 3); }
      n.oninput = ap.oninput = w.oninput = chk; chk();
      b.onclick = function () { S.nombre = n.value.trim(); S.apellido = ap.value.trim(); S.web = normWeb(w.value.trim()); go(idx + 1); };
      return;
    }
    if (s.type === "capture2") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Último paso</span><h2>¿A dónde te mando tu Trust Score?</h2>' +
        '<p class="g4uq-sub">Te llega por WhatsApp en cuanto el análisis termine.</p>' +
        '<div class="g4uq-field"><label>Email de trabajo</label><input id="f-email" type="email" placeholder="tu@empresa.com" value="' + (S.email || '') + '"></div>' +
        '<div class="g4uq-field"><label>Teléfono (WhatsApp)</label><input id="f-tel" type="tel" placeholder="+34 600 000 000" value="' + (S.telefono || '') + '"></div>' +
        '<button class="g4uq-cta wa" id="g4uq-finish" disabled>Generar mi Trust Score →</button>' +
        '<p class="g4uq-hint">Elegís cómo seguir en el siguiente paso.</p>';
      var e = document.getElementById("f-email"), tel = document.getElementById("f-tel"), b2 = document.getElementById("g4uq-finish");
      function chk2() { b2.disabled = !(/.+@.+\..+/.test(e.value) && tel.value.trim().length >= 6); }
      e.oninput = tel.oninput = chk2; chk2();
      b2.onclick = function () { S.email = e.value.trim(); S.telefono = tel.value.trim(); go(idx + 1); submit(); };
      return;
    }
    if (s.type === "submitting") {
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">¡Listo!</span><h2>Estamos generando tu Trust Score.</h2>' +
        '<p class="g4uq-sub">¿Cómo preferís seguir?</p>' +
        '<a class="g4uq-cta wa" id="g4uq-wa" href="#" target="_blank" rel="noopener">Quiero analizar mis resultados →</a>' +
        '<a class="g4uq-cta g4uq-cta2" id="g4uq-cal" href="#" target="_blank" rel="noopener">Agendar una llamada →</a></div>';
      return;
    }

    var multi = s.type === "multi";
    var h = '<span class="g4uq-eyebrow">Pregunta ' + qNum(idx) + ' / 6</span><h2>' + s.q + '</h2>' + (s.sub ? '<p class="g4uq-sub">' + s.sub + '</p>' : '') + '<div class="g4uq-opts">';
    s.opts.forEach(function (o) { h += optRow(o, multi, s.id); });
    h += '</div>';
    if (multi) h += '<button class="g4uq-cta" id="g4uq-next">Continuar →</button>';
    stage.innerHTML = h;
    Array.prototype.forEach.call(stage.querySelectorAll(".g4uq-opt"), function (btn) {
      btn.onclick = function () {
        var v = btn.getAttribute("data-v");
        if (multi) { S[s.id] = S[s.id] || []; var i = S[s.id].indexOf(v); i > -1 ? S[s.id].splice(i, 1) : S[s.id].push(v); render(); }
        else { S[s.id] = v; setTimeout(function () { go(idx + 1); }, 180); }
      };
    });
    if (multi) document.getElementById("g4uq-next").onclick = function () { go(idx + 1); };
  }

  function score() {
    function val(id) {
      var s = steps.find(function (x) { return x.id === id; }); if (!s || !s.opts) return 0;
      if (s.type === "multi") { var t = 0; (S[id] || []).forEach(function (v) { var o = s.opts.find(function (x) { return x[0] === v; }); if (o) t += o[2]; }); return t; }
      var o = s.opts.find(function (x) { return x[0] === S[id]; }); return o ? o[2] : 0;
    }
    var F = Math.min(50, val("facturacion") + val("inversion")), A = Math.min(20, val("segmento") + val("equipo")), I = Math.min(9, val("canales")), N = Math.min(22, val("dolor")), T = val("timing");
    var total = Math.round((F / 50) * 30 + (A / 20) * 15 + (I / 9) * 15 + (N / 22) * 20 + (T / 20) * 20);
    return { total: total, tier: total >= 65 ? "caliente" : (total >= 40 ? "tibio" : "frio") };
  }

  function submit() {
    var sc = score();
    var qs; try { qs = new URLSearchParams(window.location.search); } catch (e) { qs = { get: function () { return ""; } }; }
    var p = {
      nombre: S.nombre, apellido: S.apellido, email: S.email, phone: S.telefono, web: S.web,
      segmento: S.segmento, facturacion: S.facturacion, canales: (S.canales || []).join(","),
      dolor: (S.dolor || []).join(","), inversion: S.inversion, equipo: S.equipo, timing: S.timing,
      faint_score: sc.total, tier: sc.tier, source: "quiz-alarife",
      origen: qs.get("origen") || qs.get("from") || "",
      utm_source: qs.get("utm_source") || "", utm_medium: qs.get("utm_medium") || "", utm_campaign: qs.get("utm_campaign") || "",
      referrer: document.referrer || "", landing: window.location.href,
      ts: new Date().toISOString()
    };
    if (C.GHL) { try { fetch(C.GHL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), keepalive: true }); } catch (e) {} }
    var msg = "Hola, soy " + S.nombre + " " + S.apellido + " de " + S.web + ". Acabo de completar el diagnóstico Growth4U y quiero analizar mi Trust Score.";
    var a = document.getElementById("g4uq-wa"); if (a) a.href = "https://wa.me/" + C.WA + "?text=" + encodeURIComponent(msg);
    var cl = document.getElementById("g4uq-cal"); if (cl) cl.href = C.CAL;
  }

  render();
})();
