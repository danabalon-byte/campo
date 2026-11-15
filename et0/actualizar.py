#!/usr/bin/env python3
"""Actualiza et0/chincolco.json con la ET0 diaria de Liceo Agrícola Chincolco (DMC)
desde agrometeorologia.cl y regenera et0/chincolco-resumen.json.
Uso: python3 et0/actualizar.py            (descarga del sitio)
     python3 et0/actualizar.py --archivo items-ET.json   (prueba sin red)"""
import datetime, json, re, sys, urllib.request, collections, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent
URL = "https://agrometeorologia.cl/evapotranspiracion/"
ESTACION = "Liceo Agrícola Chincolco"
UA = {"User-Agent": "Mozilla/5.0 (compatible; campo-et0/1.0; uso agricola propio, 1 consulta diaria)"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode("utf-8")

def cargar_items():
    if "--archivo" in sys.argv:
        return json.load(open(sys.argv[sys.argv.index("--archivo") + 1], encoding="utf-8"))
    html = get(URL)
    m = re.search(r'data-ts-map-tmp="(tmp_\d+)"', html)
    if not m:
        sys.exit("No se encontró la ruta de datos (data-ts-map-tmp) en la página")
    return json.loads(get(f"https://agrometeorologia.cl/json/{m.group(1)}/items-ET.json"))

def promedio(xs):
    xs = [x for x in xs if x is not None]
    return (round(sum(xs) / len(xs), 2), len(xs)) if xs else (None, 0)

def resumen(dias):
    sem, mes = collections.OrderedDict(), collections.OrderedDict()
    for k, v in sorted(dias.items()):
        d = datetime.date.fromisoformat(k)
        sem.setdefault((d - datetime.timedelta(days=d.weekday())).isoformat(), []).append(v)
        mes.setdefault(k[:7], []).append(v)
    semanas = [{"lunes": l, "promedio": promedio(xs)[0], "dias": promedio(xs)[1]} for l, xs in sem.items() if len(xs) == 7]
    meses = [{"mes": m, "promedio": promedio(xs)[0], "dias": promedio(xs)[1],
              "total_mm": round(sum(x for x in xs if x is not None), 1)} for m, xs in mes.items()]
    return {"semanas": semanas, "meses": meses}

def main():
    items = cargar_items()
    est = [s for s in items if s.get("nombre") == ESTACION and s.get("institucion_sigla") == "DMC"]
    if len(est) != 1:
        sys.exit(f"Estación no encontrada o ambigua ({len(est)} coincidencias)")
    nuevos = {k: float(v["ET-SUM"]) for k, v in est[0].get("STACK-DAY", {}).items() if v.get("ET-SUM") not in (None, "")}
    if not nuevos:
        sys.exit("La estación no trae datos de ET0")
    ruta = RAIZ / "chincolco.json"
    datos = json.load(open(ruta, encoding="utf-8"))
    dias = datos["dias"]
    cambios = 0
    for k, v in nuevos.items():           # sobrescribe los últimos 7 días (la fuente puede corregirlos)
        if dias.get(k) != v:
            dias[k] = v; cambios += 1
    # rellena con null los días intermedios que falten, para mantener la serie continua
    d0, d1 = datetime.date.fromisoformat(min(dias)), datetime.date.fromisoformat(max(dias))
    d = d0
    while d <= d1:
        dias.setdefault(d.isoformat(), None); d += datetime.timedelta(days=1)
    datos["dias"] = dict(sorted(dias.items()))
    datos["hasta"] = max(dias)
    json.dump(datos, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(resumen(datos["dias"]), open(RAIZ / "chincolco-resumen.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"OK: {cambios} día(s) nuevos o corregidos; serie hasta {datos['hasta']}")

main()
