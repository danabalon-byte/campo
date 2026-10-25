/* Modo demostración: ?demo (elige perfil) o ?demo=owner|manager|member.
   Todo es local y ficticio: no se conecta a Firebase ni toca datos reales. Se reinicia al recargar. */
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.has("demo")) return;
  var PERFILES = {
    owner:   { uid: "u_demo_dueno",  nombre: "Dueño demo",        titulo: "Dueño",        desc: "Ve y edita todo: alertas, permisos, horarios del equipo, valores y ajustes.", lvl: 3 },
    manager: { uid: "u_demo_enc",    nombre: "Encargada demo",    titulo: "Encargada",    desc: "Agenda y registra el trabajo, los riegos y las aplicaciones. No ve lo reservado al dueño.", lvl: 2 },
    member:  { uid: "u_demo_colab",  nombre: "Colaboradora demo", titulo: "Colaboradora", desc: "Registra su llegada y salida, ve la agenda y marca tareas hechas.", lvl: 1 }
  };
  var elegido = PERFILES[q.get("demo")] ? q.get("demo") : null;
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
    s["abonos/b_demo1"] = { tid: "t_demo1", nombre: "Colaboradora externa (demo)", monto: 20000, fecha: dia(1), nota: "efectivo", por: "Dueño demo", uid: PERFILES.owner.uid, ts: ago(24) };
    Object.keys(PERFILES).forEach(function (k) { s["equipo/" + PERFILES[k].uid] = { nombre: PERFILES[k].nombre, creado: ago(500) }; });
    [[-1, 8, 17], [-2, 8, 16], [-3, 9, 14]].forEach(function (x) {
      s["asistencia/" + PERFILES.manager.uid + "/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Encargada demo" }] };
    });
    [[-1, 9, 14], [-4, 9, 15]].forEach(function (x) {
      s["asistencia/" + PERFILES.member.uid + "/dias/" + dia(x[0])] = { fecha: dia(x[0]), tramos: [{ entrada: iso(x[0], x[1] + 3), salida: iso(x[0], x[2] + 3), por: "Colaboradora demo" }] };
    });
    return s;
  }

  /* ---------- base de datos en memoria (misma interfaz que Firestore usa la app) ---------- */
  var store = semilla(), subs = [];
  function parts(p) { return p.split("/"); }
  function colOf(path) { var a = parts(path); a.pop(); return a.join("/"); }
  function docsIn(col) { var out = []; Object.keys(store).forEach(function (k) { if (colOf(k) === col) out.push({ id: k.split("/").pop(), data: store[k] }); }); return out; }
  function snapDoc(path) { var d = store[path]; return { id: path.split("/").pop(), exists: d !== undefined, data: function () { return d === undefined ? undefined : JSON.parse(JSON.stringify(d)); } }; }
  function notify() { subs.slice().forEach(function (s) { s(); }); }
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
    me: async function () { return { id: PERFILES[elegido].uid, name: PERFILES[elegido].nombre, email: "demo@ejemplo.invalid" }; },
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
      "#demoBar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;padding:8px 16px;background:#E4B91C;color:#1B1500;font:600 14px/1.3 system-ui,sans-serif}#demoBar a{color:inherit;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center}" +
      "@media (prefers-color-scheme:dark){#demoSel{background:#0F1711;color:#EAF0E4}#demoSel p,#demoSel button span{color:#B9C7B5}#demoSel button{background:#18241B;border-color:#2F4533}}";
    document.head.appendChild(st);
  }
  function barra() {
    var b = document.createElement("div"); b.id = "demoBar"; b.setAttribute("role", "status");
    var t = document.createElement("span"); t.textContent = "Modo demostración · datos ficticios · perfil: " + PERFILES[elegido].titulo; b.appendChild(t);
    var w = document.createElement("span"); w.style.display = "inline-flex"; w.style.gap = "16px";
    var a1 = document.createElement("a"); a1.href = "?demo"; a1.textContent = "Cambiar perfil";
    var a2 = document.createElement("a"); a2.href = "?demo=" + elegido; a2.textContent = "Reiniciar demo";
    w.appendChild(a1); w.appendChild(a2); b.appendChild(w);
    document.body.insertBefore(b, document.body.firstChild);
  }
  function selector() {
    var o = document.createElement("div"); o.id = "demoSel";
    var w = document.createElement("div"); w.className = "w"; o.appendChild(w);
    var h = document.createElement("h1"); h.textContent = "Agrícola Borderío · demostración"; w.appendChild(h);
    var p = document.createElement("p"); p.textContent = "Prueba la app con datos ficticios. Nada de lo que hagas aquí se guarda ni afecta datos reales. Elige un perfil:"; w.appendChild(p);
    Object.keys(PERFILES).forEach(function (k) {
      var bt = document.createElement("button"); bt.type = "button";
      var b = document.createElement("b"); b.textContent = PERFILES[k].titulo; var sp = document.createElement("span"); sp.textContent = PERFILES[k].desc;
      bt.appendChild(b); bt.appendChild(sp); bt.onclick = function () { location.href = "?demo=" + k; };
      w.appendChild(bt);
    });
    document.body.appendChild(o);
  }
  function iniciar() {
    css();
    if (elegido) { barra(); resolver(); } else selector();
  }
  if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar);
})();
