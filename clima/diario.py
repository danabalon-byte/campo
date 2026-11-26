#!/usr/bin/env python3
"""Guarda cada día la temperatura y demás variables diarias de Liceo Agrícola Chincolco (DMC) en clima/chincolco-diario.csv.
Fuente: agrometeorologia.cl, json/<tmp>/items-resumen.json (TA-MIN, TA-MAX, HR-AVG, PP-SUM, RD-AVG, VV-AVG, VV-MAX, DV-AVG)
y json/<tmp>/items-ta.json (TA-AVG). Solo agrega o corrige días ya cerrados; nunca borra filas ni pisa con vacío.
Uso: python3 clima/diario.py [--destino ruta.csv] [--mostrar]"""
import csv, datetime, json, pathlib, re, sys, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent
ESTACION, SIGLA = "Liceo Agrícola Chincolco", "DMC"
UA = {"User-Agent": "Mozilla/5.0 (compatible; campo-clima/1.0; uso agricola propio, 1 consulta diaria)"}
COLS = ["fecha", "ta_media", "ta_min", "ta_max", "hr_media", "hr_min", "hr_max", "pp_mm", "rad_mj", "vv_kmh", "rafaga_kmh", "dir_grados", "presion_mbar"]
MAPA = {"ta_media": ("ta", "TA-AVG"), "ta_min": ("res", "TA-MIN"), "ta_max": ("res", "TA-MAX"), "hr_media": ("res", "HR-AVG"),
        "pp_mm": ("res", "PP-SUM"), "rad_mj": ("res", "RD-AVG"), "vv_kmh": ("res", "VV-AVG"), "rafaga_kmh": ("res", "VV-MAX"), "dir_grados": ("res", "DV-AVG")}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read().decode("utf-8")

def estacion(lista):
    est = [s for s in lista if s.get("nombre") == ESTACION and s.get("institucion_sigla") == SIGLA]
    if len(est) != 1:
        sys.exit(f"Estación no encontrada o ambigua ({len(est)})")
    return est[0].get("STACK-DAY", {})

def num(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return ""
    return ("%g" % round(x, 2)) if abs(x) < 5000 else ""   # descarta valores absurdos (la fuente trae ceros mal escalados en algunos campos)

def main():
    destino = pathlib.Path(sys.argv[sys.argv.index("--destino") + 1]) if "--destino" in sys.argv else RAIZ / "chincolco-diario.csv"
    html = get("https://agrometeorologia.cl/evapotranspiracion/")
    m = re.search(r'data-ts-map-tmp=["\']?(tmp_\d+)', html)
    if not m:
        sys.exit(f"No se encontró data-ts-map-tmp (largo {len(html)})")
    base = f"https://agrometeorologia.cl/json/{m.group(1)}/"
    res = estacion(json.loads(get(base + "items-resumen.json")))
    try:
        ta = estacion(json.loads(get(base + "items-ta.json")))
    except Exception as e:
        print("Aviso: sin TA-AVG (", e, ")"); ta = {}
    if "--mostrar" in sys.argv:
        print("RESUMEN", json.dumps(dict(sorted(res.items())[-14:]), ensure_ascii=False))
        print("TA", json.dumps(dict(sorted(ta.items())[-14:]), ensure_ascii=False))
    # Fecha de Chile (UTC-4). La estación publica con retraso: «ayer» a veces llega con pocas horas (el 25-nov venía con 29 %),
    # así que solo se guardan días con al menos 2 días de antigüedad; los 7 días de la ventana se vuelven a leer y corregir cada día.
    corte = ((datetime.datetime.utcnow() - datetime.timedelta(hours=4)).date() - datetime.timedelta(days=1)).isoformat()
    filas = {}
    if destino.exists():
        for r in csv.DictReader(open(destino, encoding="utf-8")):
            filas[r["fecha"]] = {c: r.get(c, "") or "" for c in COLS}
    nuevos = corregidos = 0
    for dia in sorted(set(res) | set(ta)):
        if not re.fullmatch(r"\d{4}-\d\d-\d\d", dia) or dia >= corte:
            continue                      # no escribe hoy ni ayer (pueden llegar incompletos)
        fuentes = {"res": res.get(dia, {}), "ta": ta.get(dia, {})}
        nueva = {"fecha": dia}
        for col, (src, clave) in MAPA.items():
            nueva[col] = num(fuentes[src].get(clave))
        if nueva["ta_min"] == "" or nueva["ta_max"] == "":
            continue                      # sin temperatura no vale la fila
        ant = filas.get(dia)
        fila = {c: "" for c in COLS}
        if ant:
            fila.update(ant)
        for c in COLS:
            if nueva.get(c, "") != "":
                fila[c] = nueva[c]
        if ant is None:
            nuevos += 1
        elif fila != ant:
            corregidos += 1
        filas[dia] = fila
    with open(destino, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS, lineterminator="\n")
        w.writeheader()
        for k in sorted(filas):
            w.writerow(filas[k])
    print(f"OK: {nuevos} día(s) nuevos, {corregidos} corregidos; último día {max(filas)}; total {len(filas)}")

main()
