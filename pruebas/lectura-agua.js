// Prueba de la regla de lectura del caudalímetro (lecturaAgua en index.html).
// Uso: node pruebas/lectura-agua.js   (desde la carpeta del repositorio)
// Casos: lecturas a ojo de Diego (12 nov 2026) y estimados de las fotos de la app.
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/\/\* LECTURA-AGUA:INICIO[\s\S]*?\*\/([\s\S]*?)\/\* LECTURA-AGUA:FIN \*\//);
if (!m) { console.error("No se encontró el bloque LECTURA-AGUA en index.html"); process.exit(1); }
const lecturaAgua = new Function(m[1] + "; return lecturaAgua;")();

// [descripción, tambor, reloj chico, reloj grande, lectura esperada, ¿dudosa? (null = no se comprueba)]
const casos = [
  ["Foto 1 (Diego)", 41822, 1, 1.2, 41822.11, false],
  ["Foto 2 (Claude)", 41689, 0.5, 4.4, 41689.04, null],
  ["Foto 3 (Diego)", 31762, 6, 3.2, 31762.63, false],
  ["Foto 4 (Claude)", 31054, 0.5, 6.0, 31054.06, null],
  ["Foto 5 (Diego)", 27292, 4.25, 5.5, 27292.46, false],
  ["Foto 6 (Diego)", 18845, 4, 4.2, 18845.44, false],
  ["Foto 9 / 6 nov (Diego)", 179321, 4, 3.6, 179321.44, false],
  ["25 oct", 178363, 0.4, 3.7, 178363.04, null],
  ["26 oct / foto 8 (la aguja chica queda entre el 0 y el 1)", 178363, 0.5, 3.65, 178363.04, null],
  ["30 oct", 178600, 7.6, 7.0, 178600.77, null],
  ["3 nov", 178612, 3.6, 8.0, 178612.38, null],
  // Casos límite
  ["Acarreo: chico en 9,9 y grande recién pasado el 0", 100, 9.9, 0.5, 100.01, true],
  ["Agujas que no calzan (décima entre dos valores)", 500, 7.2, 0, 500.8, true],
  ["Reloj grande en 10 equivale a 0", 700, 3.0, 10, 700.3, false],
];
let fallas = 0;
for (const [d, tam, s, b, esp, dud] of casos) {
  const r = lecturaAgua(tam, s, b);
  const ok = r && Math.abs(r.valor - esp) < 0.005 && (dud === null || r.dudosa === dud);
  if (!ok) { fallas++; console.log("FALLA", d, JSON.stringify(r), "esperado", esp, dud); }
  else console.log("ok   ", d, r.valor.toFixed(2), r.dudosa ? "(dudosa)" : "");
}
// Entradas inválidas
for (const [tam, s, b] of [[NaN, 1, 1], [100, -1, 1], [100, 1, 11], [100, "x", 1]]) {
  if (lecturaAgua(tam, s, b) !== null) { fallas++; console.log("FALLA entrada inválida", tam, s, b); }
}
console.log(fallas ? `\n${fallas} falla(s)` : "\nTodas las pruebas pasan");
process.exit(fallas ? 1 : 0);
