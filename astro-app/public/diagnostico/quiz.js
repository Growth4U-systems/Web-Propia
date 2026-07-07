/* Growth4U — Quiz diagnóstico (assessment funnel FAINT / estilo Valley)
 * Canónico. Se carga en Alarife /diagnostico vía <script src>. Editá acá + redeploy growth4u.io.
 * El markup (#g4uq) y el CSS viven inline en el bloque rawHtml de Alarife (estables).
 * Config: GHL = Inbound Webhook · WA = bot WhatsApp · CAL = calendario llamada estratégica. */
(function () {
  var C = {
    GHL: "https://services.leadconnectorhq.com/hooks/BnXWP5dcLVMgUudLv10O/webhook-trigger/9bfa1bd9-7b61-4d4a-8151-28770109af5b",
    WA: "34614766892",
    CAL: "https://now.growth4u.io/widget/booking/9VRbPAQQnH5AF0jDOPNE",
    BRIDGE: "https://growth4u.io/.netlify/functions/trust-score-bridge-background",
    REDIR: ""
  };
  var WA_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style="flex:0 0 auto;fill:#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  var S = {};
  // opts: [valor, label, peso]. Escalas SIEMPRE de mayor a menor.
  var steps = [
    { id: "intro", type: "intro" },
    { id: "tieneweb", type: "tieneweb" },
    { id: "webinput", type: "webinput" },
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
    { id: "equipo", q: "¿Cómo es tu equipo de marketing hoy?", sub: "", type: "single",
      opts: [["cmo", "Equipo + CMO / dirección", 10], ["sindir", "Equipo, pero sin dirección senior", 7], ["gen", "1 generalista o freelance", 4], ["sin", "Nadie dedicado a marketing", 2]] },
    { id: "timing", q: "¿Cuándo querés resolverlo?", sub: "", type: "single",
      opts: [["ya", "Ya, es urgente", 20], ["3m", "En los próximos 3 meses", 14], ["6m", "En 3 – 6 meses", 7], ["expl", "Solo estoy mirando", 0]] },
    { id: "capture2", type: "capture2" },
    { id: "submitting", type: "submitting" },
    // --- Rama SIN web ---
    { id: "webhelp", type: "webhelp" },
    { id: "webhelpcap", type: "webhelpcap" },
    { id: "submitting2", type: "submitting2" },
    { id: "noconvert", type: "noconvert" }
  ];
  var idx = 0, hist = [];
  var stage = document.getElementById("g4uq-stage");
  var prog = document.getElementById("g4uq-progress");
  var back = document.getElementById("g4uq-back");
  var mini = document.querySelector("#g4uq .g4uq-mini");
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

  function setProg() {
    var id = steps[idx].id, pct;
    if (id === "submitting" || id === "submitting2" || id === "noconvert") pct = 100;
    else if (id === "webhelp") pct = 45;
    else if (id === "webhelpcap") pct = 80;
    else pct = Math.round(idx / 12 * 100);
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
  // Devuelve el label de una opción (para armar respuestas legibles en GHL).
  function lbl(sid, v) { var s = steps.find(function (x) { return x.id === sid; }); if (!s || !s.opts) return v || ""; var o = s.opts.find(function (x) { return x[0] === v; }); return o ? o[1] : (v || ""); }
  function lbls(sid) { return (S[sid] || []).map(function (v) { return lbl(sid, v); }).join(", "); }

  function render() {
    setProg();
    var termId = steps[idx].id;
    var isTerm = termId === "submitting" || termId === "submitting2" || termId === "noconvert";
    back.style.visibility = (hist.length > 0 && !isTerm) ? "visible" : "hidden";
    var s = steps[idx];

    if (s.type === "intro") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Diagnóstico · Trust Score</span>' +
        '<h2>¿Te recomienda la IA, o recomienda a tu competencia?</h2>' +
        '<p class="g4uq-sub">El <b>Trust Score</b> es tu nota de 0 a 100 de cuánta confianza genera tu marca en Google y en las IAs (ChatGPT, Perplexity…) frente a tu competencia. Te hacemos unas preguntas, analizamos tu web y te lo damos en 2 minutos: dónde estás, qué te frena y tu movimiento de mayor impacto. La verdad, cierres o no con nosotros.</p>' +
        '<button class="g4uq-cta" id="g4uq-start">Quiero mi Trust Score →</button>' +
        '<p class="g4uq-hint">Gratis · 2 min · sin llamadas. Te lo enviamos por WhatsApp.</p>';
      document.getElementById("g4uq-start").onclick = function () { go(idOf("tieneweb")); };
      return;
    }
    if (s.type === "tieneweb") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Empecemos</span><h2>¿Tenés web?</h2>' +
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
      stage.innerHTML = '<span class="g4uq-eyebrow">Tu web</span><h2>Dejá tu web aquí</h2>' +
        '<p class="g4uq-sub">Analizamos tu Trust Score mientras te seguimos conociendo un poco mejor.</p>' +
        '<div class="g4uq-field"><label>Web de tu empresa</label><input id="f-web" type="url" placeholder="https://tuempresa.com" value="' + (S.web || '') + '"></div>' +
        '<button class="g4uq-cta" id="g4uq-next" disabled>Analizar mi Trust Score →</button>';
      var w = document.getElementById("f-web"), b = document.getElementById("g4uq-next");
      function chkw() { b.disabled = !(w.value.trim().length > 3); }
      w.oninput = chkw; chkw();
      b.onclick = function () { S.web = normWeb(w.value.trim()); analyzing(S.web); go(idOf("segmento")); };
      return;
    }
    if (s.type === "capture1") {
      stage.innerHTML = bannerHtml() + '<span class="g4uq-eyebrow">Ya casi</span><h2>¿A nombre de quién va el diagnóstico?</h2>' +
        '<p class="g4uq-sub">Para personalizar tu resultado.</p>' +
        '<div style="display:flex;gap:12px">' +
          '<div class="g4uq-field" style="flex:1 1 0;min-width:0"><label>Nombre</label><input id="f-nombre" type="text" placeholder="Nombre" value="' + (S.nombre || '') + '"></div>' +
          '<div class="g4uq-field" style="flex:1 1 0;min-width:0"><label>Apellido</label><input id="f-apellido" type="text" placeholder="Apellido" value="' + (S.apellido || '') + '"></div>' +
        '</div>' +
        '<div class="g4uq-field"><label>Nombre de tu empresa</label><input id="f-empresa" type="text" placeholder="Tu empresa" value="' + (S.empresa || '') + '"></div>' +
        '<button class="g4uq-cta" id="g4uq-next" disabled>Continuar →</button>';
      var n = document.getElementById("f-nombre"), ap = document.getElementById("f-apellido"), emp = document.getElementById("f-empresa"), b = document.getElementById("g4uq-next");
      function chk() { b.disabled = !(n.value.trim() && ap.value.trim() && emp.value.trim()); }
      n.oninput = ap.oninput = emp.oninput = chk; chk();
      b.onclick = function () { S.nombre = n.value.trim(); S.apellido = ap.value.trim(); S.empresa = emp.value.trim(); go(idx + 1); };
      return;
    }
    if (s.type === "capture2") {
      stage.innerHTML = bannerHtml() + '<span class="g4uq-eyebrow">Último paso</span><h2>¿A dónde te mando tu Trust Score?</h2>' +
        '<p class="g4uq-sub">Te llega por WhatsApp en cuanto el análisis termine.</p>' +
        '<div style="background:rgba(36,28,22,.03);border:1.5px solid rgba(36,28,22,.18);border-radius:9px;padding:13px 16px;margin-bottom:22px">' +
          '<div style="font-family:var(--qfm,monospace);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#A89B8C;margin-bottom:8px">Lo que vas a recibir</div>' +
          '<div style="font-size:14px;color:#241C16;line-height:1.8">▸ Tu Trust Score <b>(0–100)</b><br>▸ Dónde te gana tu competencia<br>▸ Tu primer movimiento de mayor impacto</div>' +
        '</div>' +
        '<div class="g4uq-field"><label>Email de trabajo</label><input id="f-email" type="email" placeholder="tu@empresa.com" value="' + (S.email || '') + '"></div>' +
        '<div class="g4uq-field"><label>Teléfono (WhatsApp)</label><input id="f-tel" type="tel" placeholder="+34 600 000 000" value="' + (S.telefono || '') + '"></div>' +
        '<button class="g4uq-cta wa" id="g4uq-finish" disabled>' + WA_SVG + 'Ver mis resultados →</button>' +
        '<p class="g4uq-hint">Gratis · te lo enviamos por WhatsApp.</p>';
      var e = document.getElementById("f-email"), tel = document.getElementById("f-tel"), b2 = document.getElementById("g4uq-finish");
      function chk2() { b2.disabled = !(/.+@.+\..+/.test(e.value) && tel.value.trim().length >= 6); }
      e.oninput = tel.oninput = chk2; chk2();
      b2.onclick = function () { S.email = e.value.trim(); S.telefono = tel.value.trim(); go(idOf("submitting")); submit(); };
      return;
    }
    if (s.type === "submitting") {
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">¡Listo!</span><h2>Estamos generando tu Trust Score.</h2>' +
        '<p class="g4uq-sub">¿Cómo preferís seguir?</p>' +
        '<a class="g4uq-cta wa" id="g4uq-wa" href="#" target="_blank" rel="noopener">' + WA_SVG + 'Quiero conocer mis resultados</a>' +
        '<a class="g4uq-cta g4uq-cta2" id="g4uq-cal" href="#" target="_blank" rel="noopener">Agendar una llamada para ver mis resultados →</a></div>';
      return;
    }
    // --- Rama SIN web ---
    if (s.type === "webhelp") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Sin web, sin problema</span><h2>¿Querés que te ayudemos a crearla?</h2>' +
        '<p class="g4uq-sub">Construimos tu web para que empieces a generar confianza en Google y en las IAs desde el día uno.</p>' +
        '<div class="g4uq-opts">' +
          '<button class="g4uq-opt" data-v="si"><span class="g4uq-tick"></span>Sí, quiero que me ayuden</button>' +
          '<button class="g4uq-opt" data-v="no"><span class="g4uq-tick"></span>No, gracias</button>' +
        '</div>';
      Array.prototype.forEach.call(stage.querySelectorAll(".g4uq-opt"), function (btn) {
        btn.onclick = function () {
          S.quiereweb = btn.getAttribute("data-v");
          go(idOf(S.quiereweb === "si" ? "webhelpcap" : "noconvert"));
        };
      });
      return;
    }
    if (s.type === "webhelpcap") {
      stage.innerHTML = '<span class="g4uq-eyebrow">Perfecto</span><h2>Dejanos tus datos</h2>' +
        '<p class="g4uq-sub">Te contactamos para ver cómo armamos tu web y tu presencia.</p>' +
        '<div style="display:flex;gap:12px">' +
          '<div class="g4uq-field" style="flex:1 1 0;min-width:0"><label>Nombre</label><input id="f-nombre" type="text" placeholder="Nombre" value="' + (S.nombre || '') + '"></div>' +
          '<div class="g4uq-field" style="flex:1 1 0;min-width:0"><label>Apellido</label><input id="f-apellido" type="text" placeholder="Apellido" value="' + (S.apellido || '') + '"></div>' +
        '</div>' +
        '<div class="g4uq-field"><label>Email de trabajo</label><input id="f-email" type="email" placeholder="tu@empresa.com" value="' + (S.email || '') + '"></div>' +
        '<div class="g4uq-field"><label>Teléfono (WhatsApp)</label><input id="f-tel" type="tel" placeholder="+34 600 000 000" value="' + (S.telefono || '') + '"></div>' +
        '<button class="g4uq-cta" id="g4uq-finish2" disabled>Quiero que me ayuden →</button>';
      var n = document.getElementById("f-nombre"), ap = document.getElementById("f-apellido"), e = document.getElementById("f-email"), tel = document.getElementById("f-tel"), b3 = document.getElementById("g4uq-finish2");
      function chk3() { b3.disabled = !(n.value.trim() && ap.value.trim() && /.+@.+\..+/.test(e.value) && tel.value.trim().length >= 6); }
      n.oninput = ap.oninput = e.oninput = tel.oninput = chk3; chk3();
      b3.onclick = function () { S.nombre = n.value.trim(); S.apellido = ap.value.trim(); S.email = e.value.trim(); S.telefono = tel.value.trim(); go(idOf("submitting2")); submitNoWeb(); };
      return;
    }
    if (s.type === "submitting2") {
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">¡Gracias!</span><h2>Vamos a ayudarte con tu web.</h2>' +
        '<p class="g4uq-sub">Agendá una llamada y lo vemos contigo.</p>' +
        '<a class="g4uq-cta wa" id="g4uq-wa" href="#" target="_blank" rel="noopener">' + WA_SVG + 'Hablar por WhatsApp</a>' +
        '<a class="g4uq-cta g4uq-cta2" id="g4uq-cal" href="#" target="_blank" rel="noopener">Agendar una llamada →</a></div>';
      return;
    }
    if (s.type === "noconvert") {
      stage.innerHTML = '<div class="g4uq-center"><span class="g4uq-eyebrow">Sin problema</span><h2>¡Gracias por pasar!</h2>' +
        '<p class="g4uq-sub">El Trust Score se apoya en tu web. Cuando tengas una, volvé y te damos tu diagnóstico completo. 👋</p></div>';
      return;
    }

    var multi = s.type === "multi";
    var h = bannerHtml() + '<span class="g4uq-eyebrow">Pregunta ' + qNum(idx) + ' / 7</span><h2>' + s.q + '</h2>' + (s.sub ? '<p class="g4uq-sub">' + s.sub + '</p>' : '') + '<div class="g4uq-opts">';
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

  // Resumen legible de todas las respuestas -> un solo campo en GHL.
  function resumenRespuestas(sc) {
    return "Empresa: " + lbl("segmento", S.segmento) +
      " · Facturación: " + lbl("facturacion", S.facturacion) +
      " · Crecimiento: " + (lbls("canales") || "—") +
      " · Le frena: " + (lbls("dolor") || "—") +
      " · Inversión/mes: " + lbl("inversion", S.inversion) +
      " · Equipo: " + lbl("equipo", S.equipo) +
      " · Timing: " + lbl("timing", S.timing) +
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
  function setCTAs(msg) {
    var a = document.getElementById("g4uq-wa"); if (a) a.href = "https://wa.me/" + C.WA + "?text=" + encodeURIComponent(msg);
    var cl = document.getElementById("g4uq-cal"); if (cl) cl.href = C.CAL;
  }

  function submit() {
    var sc = score();
    var p = Object.assign({
      nombre: S.nombre, apellido: S.apellido, empresa: S.empresa, email: S.email, phone: S.telefono, web: S.web,
      segmento: lbl("segmento", S.segmento), facturacion: lbl("facturacion", S.facturacion), canales: lbls("canales"),
      dolor: lbls("dolor"), inversion: lbl("inversion", S.inversion), equipo: lbl("equipo", S.equipo), timing: lbl("timing", S.timing),
      faint_score: sc.total, tier: sc.tier, tieneweb: "si", respuestas: resumenRespuestas(sc), source: "quiz-alarife"
    }, utmObj());
    postGHL(p);
    // Trust Score bridge (discover→compare→link→GHL). Fire-and-forget, sin Content-Type.
    if (C.BRIDGE && S.web) { try { fetch(C.BRIDGE, { method: "POST", body: JSON.stringify({ email: S.email, web: S.web, nombre: S.nombre, apellido: S.apellido, phone: S.telefono }), keepalive: true }); } catch (e) {} }
    setCTAs("Hola, soy " + S.nombre + " " + S.apellido + " de " + S.web + ". Acabo de completar el diagnóstico Growth4U y quiero analizar mi Trust Score.");
  }

  function submitNoWeb() {
    var p = Object.assign({
      nombre: S.nombre, apellido: S.apellido, email: S.email, phone: S.telefono, web: "",
      tieneweb: "no", quiere_web: "si", tier: "sin-web", respuestas: "Sin web · Quiere que le ayudemos a crear su web.",
      source: "quiz-alarife-sin-web"
    }, utmObj());
    postGHL(p);
    setCTAs("Hola, soy " + S.nombre + " " + S.apellido + ". Todavía no tengo web y quiero que Growth4U me ayude a crearla.");
  }

  render();
})();
