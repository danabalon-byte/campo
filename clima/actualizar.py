#!/usr/bin/env python3
"""Actualiza grados día y heladas oficiales de Liceo Agrícola Chincolco (DMC) desde agrometeorologia.cl.
Archivos: clima/chincolco-gd.json (GD5/GD10/GD125 por día) y clima/chincolco-heladas.json (eventos de helada por día).
Uso: python3 clima/actualizar.py
     python3 clima/actualizar.py --semilla     (crea chincolco-gd.json calculado desde chincolco-diario.csv)"""
import csv, datetime, json, pathlib, re, sys, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent
ESTACION = "Liceo Agrícola Chincolco"
UA = {"User-Agent": "Mozilla/5.0 (compatible; campo-clima/1.0; uso agricola propio, 1 consulta diaria)"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode("utf-8")

def estacion(items):
    est = [s for s in items if s.get("nombre") == ESTACION and s.get("institucion_sigla") == "DMC"]
    if len(est) != 1:
        sys.exit(f"Estación no encontrada o ambigua ({len(est)})")
    return est[0]

def guardar(ruta, obj):
    json.dump(obj, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

def cargar(ruta, base):
    return json.load(open(ruta, encoding="utf-8")) if ruta.exists() else base

def semilla():
    gd = {}
    for r in csv.DictReader(open(RAIZ / "chincolco-diario.csv", encoding="utf-8")):
        if r["ta_min"] and r["ta_max"]:
            m = (float(r["ta_min"]) + float(r["ta_max"])) / 2
            gd[r["fecha"]] = {"GD5": round(max(0, m - 5), 1), "GD10": round(max(0, m - 10), 1), "GD125": round(max(0, m - 12.5), 1), "fuente": "calculo"}
    guardar(RAIZ / "chincolco-gd.json", {"estacion": ESTACION, "nota": "fuente=calculo: media de Tmax y Tmin menos la base; los días recientes se reemplazan por el valor oficial", "dias": gd})
    print(f"Semilla: {len(gd)} días")

def main():
    if "--semilla" in sys.argv:
        return semilla()
    html = get("https://agrometeorologia.cl/evapotranspiracion/")
    m = re.search(r'data-ts-map-tmp=["\']?(tmp_\d+)', html)
    if not m:
        sys.exit(f"No se encontró data-ts-map-tmp (largo {len(html)})")
    base = f"https://agrometeorologia.cl/json/{m.group(1)}/"
    # grados día
    gd_est = estacion(json.loads(get(base + "items-GD.json")))
    ruta = RAIZ / "chincolco-gd.json"
    gd = cargar(ruta, {"estacion": ESTACION, "dias": {}})
    n_gd = 0
    for k, v in gd_est.get("STACK-DAY", {}).items():
        if not re.fullmatch(r"\d{4}-\d\d-\d\d", k) or v.get("GD5") in (None, ""):
            continue          # omite las claves «ayer» y «hoy»
        nuevo = {"GD5": float(v["GD5"]), "GD10": float(v["GD10"]), "GD125": float(v["GD125"]), "fuente": "oficial"}
        if gd["dias"].get(k) != nuevo:
            gd["dias"][k] = nuevo; n_gd += 1
    gd["dias"] = dict(sorted(gd["dias"].items()))
    guardar(ruta, gd)
    # heladas
    h_est = estacion(json.loads(get(base + "items-HELADAS.json")))
    ruta = RAIZ / "chincolco-heladas.json"
    hel = cargar(ruta, {"estacion": ESTACION, "nota": "Eventos oficiales de INIA: hora UTC-4, mínima y media en °C", "dias": {}})
    n_h = 0
    for k, v in h_est.get("STACK-DAY", {}).items():
        if not re.fullmatch(r"\d{4}-\d\d-\d\d", k):
            continue
        ev = {"desde": v.get("desde"), "hasta": v.get("hasta"), "horas": v.get("horas"), "min": v.get("min"), "avg": v.get("avg")}
        if hel["dias"].get(k) != ev:
            hel["dias"][k] = ev; n_h += 1
    hel["dias"] = dict(sorted(hel["dias"].items()))
    hel["actualizado"] = datetime.date.today().isoformat()
    guardar(ruta, hel)
    print(f"OK: GD {n_gd} día(s); heladas {n_h} día(s) nuevos o corregidos")

main()
