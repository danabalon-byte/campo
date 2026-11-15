/* Modo demostración: ?demo (elige perfil) o ?demo=owner|manager|member.
   Todo es local y ficticio: no se conecta a Firebase ni toca datos reales. Se reinicia al recargar. */
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.has("demo")) return;
  var PERFILES = {
    owner:   { uid: "u_demo_dueno",  nombre: "Dueño demo",        titulo: "Dueño", email: "dueno@demo.invalid",        desc: "Ve y edita todo: alertas, permisos, horarios del equipo, valores y ajustes.", lvl: 3 },
    manager: { uid: "u_demo_enc",    nombre: "Encargada demo",    titulo: "Encargada", email: "encargada@demo.invalid",    desc: "Agenda y registra el trabajo, los riegos y las aplicaciones. No ve lo reservado al dueño.", lvl: 2 },
    member:  { uid: "u_demo_colab",  nombre: "Colaboradora demo", titulo: "Colaboradora", email: "colaboradora@demo.invalid", desc: "Registra su llegada y salida, ve la agenda y marca tareas hechas.", lvl: 1 }
  };
  var elegido = PERFILES[q.get("demo")] ? q.get("demo") : null;
  var SK = "demo_store_v2";
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; }
  var nombreProbador = (ss("demo_nombre") || "").slice(0, 30);
  var resolver, listo = new Promise(function (r) { resolver = r; });
  window.__DEMO = true;
  document.title = "Demostración · Agrícola Borderío";

  /* ---------- datos ficticios, relativos a hoy ---------- */
  var TZ = "America/Santiago", MS = 86400000;
  function dia(n) { return new Date(Date.now() + n * MS).toLocaleDateString("en-CA", { timeZone: TZ }); }
  function iso(n, h) { var d = new Date(Date.now() + n * MS); d.setUTCHours(h, 0, 0, 0); return d.toISOString(); }
  function semilla() {
    var s = {}, now = Date.now(), ago = function (h) { return new Date(now - h * 3600000).toISOString(); };
    s["cuarteles/s1"] = { nombre: "Sector 1 nogal", especie: "Nogal", variedad: "Chandler", anio: 2018, ha: 0.65, arboles: 210, orden: 1 };
    s["cuarteles/s2"] = { nombre: "Sector 2 nogal", especie: "Nogal", variedad: "Chandler", anio: 2018, ha: 0.53, arboles: 170, orden: 2 };
    s["cuarteles/s3"] = { nombre: "Sector 3 nogal", especie: "Nogal", variedad: "Chandler", anio: 2019, ha: 0.53, arboles: 170, orden: 3 };
    s["cuarteles/s4"] = { nombre: "Sector limones", especie: "Limón", variedad: "", anio: 2023, ha: 0.9, arboles: 250, orden: 4 };
    s["productos/glifo"] = { nombre: "Herbicida de ejemplo", tipo: "Herbicida", unidad: "L", stockInicial: 20, orden: 1, carencias: { "Nogal": 3, "Limón": 1 }, reingresoH: 24, alertaJovenes: true, ficha: [] };
    s["productos/urea"] = { nombre: "Urea", tipo: "Fertilizante", unidad: "kg", stockInicial: 40, orden: 2, carencias: {}, reingresoH: null, alertaJovenes: false, ficha: [] };
    s["productos/foliar"] = { nombre: "Foliar de ejemplo", tipo: "Fertilizante", unidad: "L", stockInicial: 10, orden: 3, carencias: {}, reingresoH: null, alertaJovenes: false, ficha: [] };
    s["aplicaciones/a_demo1"] = { fecha: dia(0), ts: ago(2), sectorId: "s1", sector: "Sector 1 nogal", productoId: "glifo", producto: "Herbicida de ejemplo", cantidad: 1.5, unidad: "L", por: "Encargada demo", reingresoHasta: new Date(now + 18 * 3600000).toISOString(), cosechaDesde: dia(3) };
    s["aplicaciones/a_demo2"] = { fecha: dia(-12), ts: iso(-12, 15), sectorId: "s2", sector: "Sector 2 nogal", productoId: "foliar", producto: "Foliar de ejemplo", cantidad: 9, unidad: "L", por: "Encargada demo" };
    s["plan/p_demo1"] = { fecha: dia(-2), estado: "pendiente", producto: "Urea", productoId: "urea", sector: "Sector 3 nogal", sectorId: "s3", cantidad: 3, unidad: "kg", modo: "", ts: ago(80), por: "Dueño demo", equipo: "Bomba de espalda" };
    s["plan/p_demo2"] = { fecha: dia(4), estado: "pendiente", producto: "Urea", productoId: "urea", sector: "Sector limones", sectorId: "s4", cantidad: 2, unidad: "kg", modo: "", ts: ago(10), por: "Dueño demo" };
    s["tareas/t_demo1"] = { fecha: dia(-1), titulo: "Regar", tipo: "riego", horas: 3, sectorId: "s2", sector: "Sector 2 nogal", momento: "man", quien: "Encargada demo", estado: "pendiente", ts: ago(50), por: "Encargada demo" };
    s["tareas/t_demo2"] = { fecha: dia(0), titulo: "Regar", tipo: "riego", horas: 2.5, sectorId: "s4", sector: "Sector limones", momento: "tar", quien: "Colaboradora demo", estado: "pendiente", ts: ago(20), por: "Encargada demo" };
    s["tareas/t_demo3"] = { fecha: dia(1), titulo: "Poda de formación", tipo: "trabajo", horas: 4, sectorId: "s1", sector: "Sector 1 nogal", momento: "man", quien: "Colaboradora demo", estado: "pendiente", ts: ago(20), por: "Encargada demo" };
    s["riegos/r_demo1"] = { fecha: dia(-3), ts: iso(-3, 14), sectorId: "s1", sector: "Sector 1 nogal", horas: 3, m3: 42, por: "Encargada demo" };
    s["riegos/r_demo2"] = { fecha: dia(-5), ts: iso(-5, 14), sectorId: "s3", sector: "Sector 3 nogal", horas: 2.5, m3: 31, por: "Colaboradora demo" };
    s["ideas/i_demo1"] = { texto: "Revisar el goteo de la hilera 4 del sector 2", tag: "Riego", estado: "abierta", ts: ago(30), uid: PERFILES.manager.uid, por: "Encargada demo" };
    s["consultas/c_demo1"] = { tipo: "Una idea", texto: "¿Podemos agregar el calendario de poda?", por: "Colaboradora demo", ts: ago(26), resuelta: false, pantalla: "inicio", rol: "colaboradora" };
    s["terceros/t_demo1"] = { nombre: "Colaboradora externa (demo)", rol: "Colaborador", aCargo: "Yolanda", activo: true, uid: PERFILES.manager.uid, por: "Encargada demo", ts: ago(120) };
    s["terceros/t_demo2"] = { nombre: "Practicante (demo)", rol: "Practicante", aCargo: "Agrícola", activo: true, uid: PERFILES.owner.uid, por: "Dueño demo", ts: ago(120) };
    s["tarifas/t_demo1"] = { tid: "t_demo1", hist: [{ desde: "2000-01-01", j: 30000, m: 15000 }], honorarios: false, monto: 0, forma: "dia", por: "Dueño demo", ts: ago(120) };
    s["tarifas/t_demo2"] = { tid: "t_demo2", hist: [], honorarios: true, monto: 300000, forma: "mes", por: "Dueño demo", ts: ago(120) };
    s["jornadasTerc/j_demo1"] = { tid: "t_demo1", nombre: "Colaboradora externa (demo)", fecha: dia(2), tipo: "jornada", min: 504, dia: 504, labor: "Poda en el sector 3", aCargo: "Yolanda", por: "Encargada demo", uid: PERFILES.manager.uid, ts: ago(50) };
    s["jornadasTerc/j_demo2"] = { tid: "t_demo1", nombre: "Colaboradora externa (demo)", fecha: dia(1), tipo: "media", min: 252, dia: 504, labor: "Riego", aCargo: "Yolanda", por: "Encargada demo", uid: PERFILES.manager.uid, ts: ago(26) };
    s["jornadasTerc/j_demo3"] = { tid: "t_demo2", nombre: "Practicante (demo)", fecha: dia(1), tipo: "horas", min: 270, dia: 504, hi: "09:00", hs: "13:30", labor: "Registro de árboles", aCargo: "Agrícola", por: "Dueño demo", uid: PERFILES.owner.uid, ts: ago(26) };
    s["jornadasTerc/j_demo4"] = { tid: "t_demo1", nombre: "Colaboradora externa (demo)", fecha: dia(0), tipo: "jornada", min: 504, dia: 504, labor: "Poda en el sector 2", aCargo: "Yolanda", estado: "acordada", por: "Encargada demo", uid: PERFILES.manager.uid, ts: ago(30) };
    s["abonos/b_demo1"] = { tid: "t_demo1", nombre: "Colaboradora externa (demo)", monto: 20000, fecha: dia(1), nota: "efectivo", por: "Dueño demo", uid: PERFILES.owner.uid, ts: ago(24) };
    Object.keys(PERFILES).forEach(function (k) { s["equipo/" + PERFILES[k].uid] = { nombre: PERFILES[k].nombre, email: PERFILES[k].email, creado: ago(500) }; });
    [[-1, 8, 17], [-2, 8, 16], [-3, 9, 14]].forEach(function (x) {
      s["asistencia/" + PERFILES.manager.uid + "/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Encargada demo" }] };
    });
    [[-1, 9, 14], [-4, 9, 15]].forEach(function (x) {
      s["asistencia/" + PERFILES.member.uid + "/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Colaboradora demo" }] };
    });
    var N = [
      ["p_demo_dueno", "Dueño demo", "Supervisión", "Completa", ""],
      ["p_demo_enc", "Encargada demo", "Supervisión", "Horario fijo (contrato)", "1985-" + dia(3).slice(5)],
      ["p_demo_colab", "Colaboradora demo", "Riego", "Horario fijo (contrato)", ""],
      ["p_demo_luis", "Luis Parra", "Riego", "Completa", ""],
      ["p_demo_rosa", "Rosa Muñoz", "Poda", "Por pedido (a trato)", ""],
      ["p_demo_tomas", "Tomás Vera", "Maquinaria", "Por día (temporero)", "1992-" + dia(12).slice(5)],
      ["p_demo_lucia", "Lucía Fuentes", "Cosecha", "Por tarea", ""],
      ["p_demo_andres", "Andrés Silva", "Aplicaciones", "Media jornada", ""],
      ["p_demo_elena", "Elena Castro", "Mantención", "Completa", ""],
      ["p_demo_javier", "Javier Díaz", "Otra", "Por pedido (a trato)", ""]
    ];
    N.forEach(function (x) { s["personal/" + x[0]] = { nombre: x[1], funcion: x[2], jornada: x[3], nac: x[4], tel: "", mostrarEdad: false }; });
    s["config/semillaPersonal"] = { ts: ago(900), por: "demo" };
    s["equipo/u_demo_luis"] = { nombre: "Luis Parra", email: "luis@demo.invalid", creado: ago(400) };
    s["config/roles"] = { admins: ["encargada@demo.invalid"], members: ["colaboradora@demo.invalid", "luis@demo.invalid", "rosa@demo.invalid"] };
    s["equipo/u_demo_rosa"] = { nombre: "Rosa Muñoz", email: "rosa@demo.invalid", creado: ago(400) };
    s["asistencia/u_demo_luis/dias/" + dia(0)] = { fecha: dia(0), tramos: [{ entrada: ago(2), por: "Luis Parra" }] };
    [[-1, 8, 16], [-2, 8, 17]].forEach(function (x) {
      s["asistencia/u_demo_luis/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Luis Parra" }] };
    });
    [[-1, 9, 13]].forEach(function (x) {
      s["asistencia/u_demo_rosa/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Rosa Muñoz" }] };
    });
    s["config/asesor"] = { estim: [{ k: 2027, kg: 3300, fecha: dia(-2), nota: "Estimación de ejemplo" }], preg: [{ t: "¿Cada cuánto conviene regar en enero?", fecha: dia(-3), hecha: false }, { t: "¿Cuándo hacer la próxima poda de formación?", fecha: dia(-5), hecha: true }], val: {}, facSeco: 0.4 };
    return s;
  }

  /* ---------- base de datos en memoria (misma interfaz que Firestore usa la app) ---------- */
  function cargarStore() { try { var j = ss(SK); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
  function guardarStore() { try { ss(SK, JSON.stringify(store)); } catch (e) {} }
  var store = cargarStore() || semilla(), subs = [];
  if (elegido && nombreProbador && store["equipo/" + PERFILES[elegido].uid]) store["equipo/" + PERFILES[elegido].uid].nombre = nombreProbador;
  function parts(p) { return p.split("/"); }
  function colOf(path) { var a = parts(path); a.pop(); return a.join("/"); }
  function docsIn(col) { var out = []; Object.keys(store).forEach(function (k) { if (colOf(k) === col) out.push({ id: k.split("/").pop(), data: store[k] }); }); return out; }
  function snapDoc(path) { var d = store[path]; return { id: path.split("/").pop(), exists: d !== undefined, data: function () { return d === undefined ? undefined : JSON.parse(JSON.stringify(d)); } }; }
  function notify() { guardarStore(); subs.slice().forEach(function (s) { s(); }); }
  function mkDoc(path) {
    return {
      id: path.split("/").pop(), path: path,
      get: async function () { return snapDoc(path); },
      set: async function (d) { store[path] = JSON.parse(JSON.stringify(d)); setTimeout(notify, 0); },
      update: async function (d) { if (store[path] === undefined) { var e = new Error("no existe"); e.code = "invalid_argument"; throw e; } Object.assign(store[path], JSON.parse(JSON.stringify(d))); setTimeout(notify, 0); },
      delete: async function () { delete store[path]; setTimeout(notify, 0); },
      onSnapshot: function (next) { var f = function () { next(snapDoc(path)); }; subs.push(f); setTimeout(f, 0); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      collection: function (c) { return mkCol(path + "/" + c); }
    };
  }
  function mkQuery(col, o) {
    o = o || {};
    var api = {
      orderBy: function (f, d) { return mkQuery(col, Object.assign({}, o, { ob: f, dir: d || "asc" })); },
      limit: function (n) { return mkQuery(col, Object.assign({}, o, { lim: n })); },
      where: function () { return api; },
      get: async function () { return snapQ(); },
      onSnapshot: function (next) { var f = function () { next(snapQ()); }; subs.push(f); setTimeout(f, 0); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
    };
    function snapQ() {
      var ds = docsIn(col);
      if (o.ob) { ds.sort(function (a, b) { var x = a.data[o.ob], y = b.data[o.ob]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; var c = x < y ? -1 : x > y ? 1 : 0; return o.dir === "desc" ? -c : c; }); }
      else ds.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      if (o.lim) ds = ds.slice(0, o.lim);
      var docs = ds.map(function (d) { return { id: d.id, exists: true, data: function () { return JSON.parse(JSON.stringify(d.data)); } }; });
      return { docs: docs, size: docs.length, empty: !docs.length };
    }
    return api;
  }
  function mkCol(col) {
    var api = mkQuery(col); api.path = col;
    api.doc = function (id) { id = id || ("a" + Math.random().toString(36).slice(2, 12)); return mkDoc(col + "/" + id); };
    api.add = async function (d) { var r = api.doc(); await r.set(d); return r; };
    return api;
  }
  var db = { collection: mkCol, doc: mkDoc };
  var user = {
    id: async function () { return PERFILES[elegido].uid; },
    me: async function () { return { id: PERFILES[elegido].uid, name: nombreProbador || PERFILES[elegido].nombre, email: PERFILES[elegido].email }; },
    isOwner: async function () { return PERFILES[elegido].lvl >= 3; },
    canEdit: async function () { return PERFILES[elegido].lvl >= 2; },
    can: function () { return null; }
  };
  window.claude = { use: async function (n) { if (n !== "db" && n !== "user") return null; await listo; return n === "db" ? db : user; } };
  window.__salir = function () { location.href = location.pathname + "?demo"; };

  /* ---------- interfaz: selector de perfil y barra de aviso ---------- */
  function css() {
    var st = document.createElement("style");
    st.textContent = "#demoSel{position:fixed;inset:0;z-index:9999;background:#F2EFE6;color:#1B2A1F;overflow:auto;padding:max(24px,env(safe-area-inset-top)) 16px 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
      "#demoSel .w{max-width:520px;margin:0 auto;display:grid;gap:14px}#demoSel h1{font-size:26px;margin:8px 0 0}#demoSel p{margin:0;font-size:16px;line-height:1.4;color:#44503F}" +
      "#demoSel button{font:inherit;text-align:left;min-height:72px;padding:14px 16px;border-radius:18px;border:1.5px solid #CFC8B2;background:#FAF8F2;color:inherit;cursor:pointer}#demoSel button b{display:block;font-size:19px}#demoSel button span{display:block;font-size:15px;margin-top:3px;color:#44503F}" +
      "#demoBar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 14px;background:#E4B91C;color:#1B1500;font:600 13px/1.3 system-ui,sans-serif}" +
      "#demoSw{position:sticky;top:0;z-index:2000;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 14px 8px;background:#E4B91C;color:#1B1500;border-top:1px solid rgba(27,21,0,.25);border-bottom:1px solid rgba(27,21,0,.25);font:600 13px/1.3 system-ui,sans-serif}" +
      "#demoBar button,#demoSw button{font:inherit;font-weight:700;min-height:40px;padding:0 12px;border-radius:12px;border:2px solid #1B1500;background:transparent;color:#1B1500;cursor:pointer}" +
      "#demoBar button:active,#demoSw button:active,#demoSw .dm-ch[aria-pressed=true]{box-shadow:inset 3px 4px 8px rgba(0,0,0,.35),inset -2px -3px 5px rgba(255,255,255,.3);transform:translateY(1px)}" +
      "#demoSw .dm-sw{display:inline-flex;align-items:center;gap:8px;padding:0 12px 0 6px}#demoSw .dm-sw i{position:relative;width:42px;height:24px;border-radius:12px;border:2px solid #1B1500;box-sizing:border-box;flex:none}#demoSw .dm-sw i::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#1B1500;transition:transform .15s}#demoSw .dm-sw[aria-checked=true] i{background:#1B1500}#demoSw .dm-sw[aria-checked=true] i::after{background:#E4B91C;transform:translateX(18px)}" +
      "#demoBar .dm-rs{min-height:32px;font-weight:600;border-style:dashed;padding:0 10px}" +
      "@media (prefers-color-scheme:dark){#demoSel{background:#0F1711;color:#EAF0E4}#demoSel p,#demoSel button span{color:#B9C7B5}#demoSel button{background:#18241B;border-color:#2F4533}}";
    document.head.appendChild(st);
  }
  function barra() {
    var b = document.createElement("div"); b.id = "demoBar"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Modo demostración");
    var t = document.createElement("span"); t.textContent = "Demostración · datos ficticios"; b.appendChild(t);
    var r = document.createElement("button"); r.type = "button"; r.className = "dm-rs"; r.textContent = "Restablecer";
    r.onclick = function () { if (!r.dataset.ok) { r.dataset.ok = "1"; r.textContent = "¿Seguro?"; setTimeout(function () { r.dataset.ok = ""; r.textContent = "Restablecer"; }, 4000); return; } ss(SK, null); location.href = "?demo=" + elegido; };
    b.appendChild(r);
    var f = document.createElement("div"); f.id = "demoSw"; f.setAttribute("role", "group"); f.setAttribute("aria-label", "Ver la app como");
    var esAdm = elegido === "owner", ultimo = ss("demo_user") || "manager";
    var sw = document.createElement("button"); sw.type = "button"; sw.className = "dm-sw"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-checked", esAdm ? "true" : "false");
    sw.innerHTML = '<i></i><span>Administrador</span>';
    sw.onclick = function () { location.href = "?demo=" + (esAdm ? ultimo : "owner"); };
    f.appendChild(sw);
    if (!esAdm) {
      [["manager", "Encargada"], ["member", "Colaboradora"]].forEach(function (x) {
        var c = document.createElement("button"); c.type = "button"; c.className = "dm-ch"; c.textContent = x[1]; c.setAttribute("aria-pressed", elegido === x[0] ? "true" : "false");
        c.onclick = function () { ss("demo_user", x[0]); location.href = "?demo=" + x[0]; };
        f.appendChild(c);
      });
    }
    document.body.insertBefore(f, document.body.firstChild);
    document.body.insertBefore(b, document.body.firstChild);
  }
  function selector() {
    var o = document.createElement("div"); o.id = "demoSel";
    var w = document.createElement("div"); w.className = "w"; o.appendChild(w);
    var h = document.createElement("h1"); h.textContent = "Agrícola Borderío · demostración"; w.appendChild(h);
    var p = document.createElement("p"); p.textContent = "Prueba la app con datos ficticios. Nada de lo que hagas aquí afecta datos reales, y tus cambios se conservan hasta que cierres la pestaña. Puedes cambiar de perfil cuando quieras desde la barra amarilla."; w.appendChild(p);
    var nl = document.createElement("label"); nl.textContent = "Tu nombre (opcional)"; nl.style.cssText = "font-weight:700;font-size:15px";
    var ni = document.createElement("input"); ni.type = "text"; ni.maxLength = 30; ni.placeholder = "Ej: Ana"; ni.value = nombreProbador; ni.autocomplete = "off";
    ni.style.cssText = "display:block;width:100%;box-sizing:border-box;margin-top:6px;min-height:48px;padding:8px 12px;font:inherit;border-radius:14px;border:1.5px solid #CFC8B2;background:#FAF8F2;color:inherit";
    nl.appendChild(ni); w.appendChild(nl);
    Object.keys(PERFILES).forEach(function (k) {
      var bt = document.createElement("button"); bt.type = "button";
      var b = document.createElement("b"); b.textContent = k === "owner" ? "Administrador (dueño)" : PERFILES[k].titulo; var sp = document.createElement("span"); sp.textContent = PERFILES[k].desc;
      bt.appendChild(b); bt.appendChild(sp); bt.onclick = function () { ss("demo_nombre", ni.value.trim() || null); if (k !== "owner") ss("demo_user", k); location.href = "?demo=" + k; };
      w.appendChild(bt);
    });
    document.body.appendChild(o);
  }
  /* Nombres y datos reales que aparecen en textos fijos de la app se cambian por ficticios solo en la pantalla */
  var MAPA = [[/Yolanda/g, "Marta"], [/Yoli/g, "Marta"], [/Corina/g, "Carmen"], [/Diego Anabal[oó]n/g, "Pedro Alvarado"], [/Diego/g, "Pedro"], [/Ang[eé]lica/g, "la contadora"], [/Comercializadora-X/g, "Ejemplo"], [/[\w.]+@gmail\.com/g, "demo@ejemplo.invalid"]];
  var PISTA = /Yolanda|Yoli|Corina|Diego|Ang[eé]lica|Comercializadora-X|@gmail/;
  function limpia(t) { MAPA.forEach(function (m) { t = t.replace(m[0], m[1]); }); return t; }
  function recorre(n) {
    if (n.nodeType === 3) { var v = n.nodeValue; if (PISTA.test(v)) { var w = limpia(v); if (w !== v) n.nodeValue = w; } return; }
    if (n.nodeType !== 1 || n.tagName === "SCRIPT" || n.tagName === "STYLE") return;
    if (n.placeholder && PISTA.test(n.placeholder)) n.placeholder = limpia(n.placeholder);
    for (var c = n.firstChild; c; c = c.nextSibling) recorre(c);
  }
  function saneador() {
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === "characterData") recorre(m.target); else m.addedNodes.forEach(recorre); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    recorre(document.body);
  }
  function iniciar() {
    var lk = document.querySelector('link[rel="manifest"]'); if (lk) lk.href = "manifest-demo.webmanifest";
    saneador();
    css();
    if (elegido) { barra(); resolver(); } else selector();
  }
  if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar);
})();
