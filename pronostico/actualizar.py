#!/usr/bin/env python3
"""Guarda cada día el pronóstico de ET0 de Open-Meteo (ECMWF, GFS, ICON) para Chincolco y lo
compara con la ET0 medida (et0/chincolco.json). Open-Meteo es gratuita y no usa clave.
Salidas: pronostico/openmeteo.csv (una fila por emisión, día objetivo y modelo)
         pronostico/resumen.json (sesgo y error por modelo y plazo, solo con días ya medidos)
Uso: python3 pronostico/actualizar.py            (descarga y guarda)
     python3 pronostico/actualizar.py --archivo respuesta.json   (prueba sin red)"""
import csv, datetime, json, math, pathlib, sys, urllib.request, zoneinfo

RAIZ = pathlib.Path(__file__).resolve().parent
CSV = RAIZ / "openmeteo.csv"
RESUMEN = RAIZ / "resumen.json"
MEDIDA = RAIZ.parent / "et0" / "chincolco.json"
MODELOS = ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"]
LAT, LON = -32.2225, -70.83167   # coordenadas de la estación Liceo Agrícola Chincolco (665 m)
URL = ("https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&models=%s"
       "&daily=et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,precipitation_sum"
       "&timezone=America%%2FSantiago&forecast_days=8" % (LAT, LON, ",".join(MODELOS)))
COLS = ["emision", "objetivo", "plazo_dias", "modelo", "et0_mm", "tmax_c", "tmin_c", "lluvia_mm"]
UA = {"User-Agent": "campo-et0/1.0 (uso agricola propio, 1 consulta diaria)"}

def descargar():
    if "--archivo" in sys.argv:
        return json.load(open(sys.argv[sys.argv.index("--archivo") + 1], encoding="utf-8"))
    with urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

def filas(resp, emision):
    d = resp["daily"]
    out = []
    for m in MODELOS:
        et0 = d.get("et0_fao_evapotranspiration_" + m)
        if et0 is None:
            continue
        tx, tn, pp = (d.get(k + "_" + m, [None] * len(d["time"])) for k in
                      ("temperature_2m_max", "temperature_2m_min", "precipitation_sum"))
        for i, dia in enumerate(d["time"]):
            if et0[i] is None:
                continue
            plazo = (datetime.date.fromisoformat(dia) - datetime.date.fromisoformat(emision)).days
            out.append([emision, dia, plazo, m] + [None if v is None else round(v, 2) for v in (et0[i], tx[i], tn[i], pp[i])])
    return out

def leer_csv():
    if not CSV.exists():
        return []
    with open(CSV, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def resumen(rows):
    medida = json.load(open(MEDIDA, encoding="utf-8")).get("dias", {})
    acum = {}
    for r in rows:
        real = medida.get(r["objetivo"])
        if real is None or r["et0_mm"] in ("", None):
            continue
        acum.setdefault((r["modelo"], int(r["plazo_dias"])), []).append(float(r["et0_mm"]) - real)
    out = {}
    for (m, p), e in sorted(acum.items()):
        out.setdefault(m, {})[str(p)] = {"n": len(e), "sesgo_mm": round(sum(e) / len(e), 2),
                                         "rmse_mm": round(math.sqrt(sum(x * x for x in e) / len(e)), 2)}
    return {"actualizado": datetime.date.today().isoformat(),
            "nota": "sesgo = pronóstico − medido (mm/día); plazo 0 = mismo día de la emisión", "modelos": out}

def main():
    emision = datetime.datetime.now(zoneinfo.ZoneInfo("America/Santiago")).date().isoformat()
    rows = leer_csv()
    if not any(r["emision"] == emision for r in rows):
        nuevas = filas(descargar(), emision)
        if not nuevas:
            sys.exit("Open-Meteo no devolvió ET0 para ningún modelo")
        nuevo = not CSV.exists()
        with open(CSV, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if nuevo:
                w.writerow(COLS)
            w.writerows(nuevas)
        rows = leer_csv()
        print(f"Guardadas {len(nuevas)} filas de la emisión {emision}")
    else:
        print(f"La emisión {emision} ya estaba guardada")
    json.dump(resumen(rows), open(RESUMEN, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
