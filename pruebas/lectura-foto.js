/* Prueba de la lectura de las agujas desde la foto (bloque LECTURA-FOTO de index.html).
   Necesita jpeg-js:  npm i jpeg-js   (solo para probar; la app no lo usa). Uso:  node pruebas/lectura-foto.js */
var fs = require("fs"), path = require("path"), vm = require("vm");
var jpeg; try { jpeg = require("jpeg-js"); } catch (e){ console.log("Falta jpeg-js (npm i jpeg-js). Prueba omitida."); process.exit(0); }
var src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
function bloque(n){ var m = src.match(new RegExp("/\\* " + n + ":INICIO[\\s\\S]*?/\\* " + n + ":FIN \\*/")); if (!m) throw new Error("No encuentro el bloque " + n); return m[0]; }
var ctx = {}; vm.createContext(ctx); vm.runInContext(bloque("LECTURA-AGUA") + "\n" + bloque("LECTURA-FOTO") + "\nthis.lecturaAgua = lecturaAgua; this.fotoRelojes = fotoRelojes; this.fotoTira = fotoTira; this.fotoFechaExif = fotoFechaExif;", ctx);
/* [archivo, tambor, lectura esperada de la tabla (con relojes)]. Las lecturas a ojo de Diego o las estimadas de las fotos. */
var casos = [
  ["27292", 27292, 27292.46], ["178363", 178363, 178363.04], ["179321", 179321, 179321.44], ["41822", 41822, 41822.11], ["41689", 41689, 41689.04],
  ["31054", 31054, 31054.06], ["31762", 31762, 31762.63], ["16008", 16008, null], ["18845", 18845, 18845.44]
];
var fallas = 0;
casos.forEach(function(c){
  var im = jpeg.decode(fs.readFileSync(path.join(__dirname, "fotos", c[0] + ".jpg")), { useTArray: true });
  var r = ctx.fotoRelojes(im), ok = r.ok && !r.dudosa, v = null;
  if (r.ok){ var x = ctx.lecturaAgua(c[1], r.s, r.b, 0); v = x.valor; ok = ok && !x.dudosa && (c[2] == null || Math.abs(x.valor - c[2]) <= 0.06); }
  var t = ctx.fotoTira(im, r, 640, 200); ok = ok && t.data.length === 640 * 200 * 4;
  if (!ok) fallas++;
  console.log((ok ? "OK  " : "MAL ") + c[0] + "  s=" + (r.s || 0).toFixed(2) + " b=" + (r.b || 0).toFixed(2) + " → " + v + (c[2] ? " (esperado " + c[2] + ")" : "") + (r.aviso ? "  [" + r.aviso + "]" : ""));
});
/* Foto recortada: se simula cortando la parte de arriba (no se ve el tambor). */
var im0 = jpeg.decode(fs.readFileSync(path.join(__dirname, "fotos", "179321.jpg")), { useTArray: true }), cut = 330, w = im0.width, h = im0.height - cut;
var rec = { width: w, height: h, data: im0.data.slice(cut * w * 4) }, rr = ctx.fotoRelojes(rec);
var okRec = rr.ok && rr.recortada; if (!okRec) fallas++; console.log((okRec ? "OK  " : "MAL ") + "foto recortada → pide otra: " + (rr.aviso || ""));
/* Sin agujas (foto de algo gris) */
var gris = { width: 300, height: 300, data: new Uint8ClampedArray(300 * 300 * 4).fill(128) }, rg = ctx.fotoRelojes(gris);
var okG = !rg.ok; if (!okG) fallas++; console.log((okG ? "OK  " : "MAL ") + "sin agujas → " + rg.aviso);
/* Fecha de la foto (EXIF) */
var fe = ctx.fotoFechaExif(new Uint8Array(fs.readFileSync(path.join(__dirname, "fotos", "con-fecha.jpg")))), fs0 = ctx.fotoFechaExif(new Uint8Array(fs.readFileSync(path.join(__dirname, "fotos", "sin-fecha.jpg"))));
var okF = fe === "2026-11-06" && fs0 === null; if (!okF) fallas++; console.log((okF ? "OK  " : "MAL ") + "fecha EXIF: " + fe + " / sin datos: " + fs0);
console.log(fallas ? "\nFALLAS: " + fallas : "\nTodo bien");
process.exit(fallas ? 1 : 0);
