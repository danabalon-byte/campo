#!/usr/bin/env python3
"""Registro semanal de la evapotranspiración (ET0) de Chincolco: lo medido, la proyección inicial (la del lunes,
congelada) y la proyección actual (medido + pronóstico corregido de los días que faltan), con su historial por emisión.
Entradas: et0/chincolco.json, clima/chincolco-diario.csv, pronostico/openmeteo.csv
Salida:   pronostico/semanas.json   (la app lo lee para el tarjetero de evapotranspiración del Panel)
Proyección por día = promedio de ICON y GFS menos el sesgo de cada modelo (pronóstico − medido, plazo de 0 a 2 días,
solo con datos ya medidos). Sin sesgo suficiente (menos de 3 pares) se usa el pronóstico sin corregir y se marca.
Uso: python3 pronostico/semanas.py [--hoy AAAA-MM-DD]"""
import csv, datetime, json, pathlib, sys, zoneinfo

RAIZ = pathlib.Path(__file__).resolve().parent
MEDIDA = RAIZ.parent / "et0" / "chincolco.json"
CLIMA = RAIZ.parent / "clima" / "chincolco-diario.csv"
OPENM = RAIZ / "openmeteo.csv"
SALIDA = RAIZ / "semanas.json"
MODELOS = ["icon_seamless", "gfs_seamless"]
SEMANAS = 8

def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

def d(s):
    return datetime.date.fromisoformat(s)

def mas(s, n):
    return (d(s) + datetime.timedelta(days=n)).isoformat()

def lunes(s):
    return mas(s, -d(s).weekday())

def cargar():
    med = {k: float(v) for k, v in json.load(open(MEDIDA, encoding="utf-8")).get("dias", {}).items() if v is not None}
    clima = {}
    if CLIMA.exists():
        for r in csv.DictReader(open(CLIMA, encoding="utf-8")):
            clima[r["fecha"]] = {"tmin": f(r.get("ta_min")), "tmax": f(r.get("ta_max"))}
    pron = {}      # (emision, objetivo, modelo) -> dict
    if OPENM.exists():
        for r in csv.DictReader(open(OPENM, encoding="utf-8")):
            if r["modelo"] in MODELOS and f(r["et0_mm"]) is not None:
                pron[(r["emision"], r["objetivo"], r["modelo"])] = {"et0": f(r["et0_mm"]), "tmax": f(r["tmax_c"]), "lluvia": f(r["lluvia_mm"]), "plazo": int(r["plazo_dias"])}
    return med, clima, pron

def sesgos(med, pron, antes_de=None):
    """Sesgo por modelo = promedio (pronóstico − medido) con plazo 0 a 2; si antes_de, solo días objetivo anteriores a esa fecha."""
    acum = {m: [] for m in MODELOS}
    for (em, ob, m), v in pron.items():
        if ob in med and v["plazo"] <= 2 and (antes_de is None or ob < antes_de):
            acum[m].append(v["et0"] - med[ob])
    out, ok = {}, True
    for m in MODELOS:
        if len(acum[m]) >= 3:
            out[m] = sum(acum[m]) / len(acum[m])
        else:
            out[m] = 0.0; ok = False
    return out, ok

def proy_dia(pron, emision, ob, ses):
    vals = [pron[(emision, ob, m)]["et0"] - ses[m] for m in MODELOS if (emision, ob, m) in pron]
    return sum(vals) / len(vals) if vals else None

def ultima_emision(pron, ob):
    ems = [k[0] for k in pron if k[1] == ob]
    return max(ems) if ems else None

def semana(lun, hoy, med, clima, pron, previa):
    dias = [mas(lun, i) for i in range(7)]
    ems = sorted({k[0] for k in pron if k[0] in dias or (lun <= k[0] <= mas(lun, 6))})
    ses_act, ok_act = sesgos(med, pron)
    out = {"lunes": lun, "domingo": mas(lun, 6), "dias": {}, "inicial": None, "actual": None, "historial": []}
    # días: medido + temperatura + pronóstico actual
    for dia in dias:
        e = ultima_emision(pron, dia)
        p = proy_dia(pron, e, dia, ses_act) if e else None
        reg = {"et0": med.get(dia), "tmin": clima.get(dia, {}).get("tmin"), "tmax": clima.get(dia, {}).get("tmax"),
               "pron": None if p is None else round(p, 2), "emision": e}
        if e:
            tm = [pron[(e, dia, m)]["tmax"] for m in MODELOS if (e, dia, m) in pron and pron[(e, dia, m)]["tmax"] is not None]
            ll = [pron[(e, dia, m)]["lluvia"] for m in MODELOS if (e, dia, m) in pron and pron[(e, dia, m)]["lluvia"] is not None]
            reg["tmax_pron"] = round(sum(tm) / len(tm), 1) if tm else None
            reg["lluvia_pron"] = round(sum(ll) / len(ll), 1) if ll else None
        out["dias"][dia] = reg
    # actual: medido (días con dato) + pronóstico (el resto)
    med_n = [x for x in dias if med.get(x) is not None]
    pro_n = [x for x in dias if med.get(x) is None and out["dias"][x]["pron"] is not None]
    sin = [x for x in dias if x not in med_n and x not in pro_n]
    total = sum(med[x] for x in med_n) + sum(out["dias"][x]["pron"] for x in pro_n)
    out["actual"] = {"medidos_n": len(med_n), "medidos_mm": round(sum(med[x] for x in med_n), 2),
                     "proyectados_n": len(pro_n), "proyectados_mm": round(sum(out["dias"][x]["pron"] for x in pro_n), 2),
                     "sin_dato": sin, "total_mm": round(total, 2) if not sin else None, "sesgo_corregido": ok_act,
                     "completa": not sin and not pro_n}
    # inicial: se congela la primera vez; si ya estaba guardada, se conserva tal cual
    if previa and previa.get("inicial"):
        out["inicial"] = previa["inicial"]
    elif ems:
        e0 = ems[0]
        ses0, ok0 = sesgos(med, pron, antes_de=e0)
        tot0, sd, dd = 0.0, [], {}
        for dia in dias:
            if dia < e0:
                if med.get(dia) is None: sd.append(dia); continue
                tot0 += med[dia]; dd[dia] = round(med[dia], 2); continue
            p = proy_dia(pron, e0, dia, ses0)
            if p is None: sd.append(dia); continue
            tot0 += p; dd[dia] = round(p, 2)
        out["inicial"] = {"emision": e0, "tardia": e0 != lun, "total_mm": round(tot0, 2) if not sd else None, "dias": dd, "sin_dato": sd, "sesgo_corregido": ok0, "reconstruida": previa is None}
    # historial: total proyectado según cada emisión (medido si el día es anterior a la emisión)
    for e in ems:
        ses_e, ok_e = sesgos(med, pron, antes_de=e)
        tot, sd = 0.0, 0
        for dia in dias:
            if dia < e and med.get(dia) is not None: tot += med[dia]; continue
            p = proy_dia(pron, e, dia, ses_e)
            if p is None: sd += 1; continue
            tot += p
        out["historial"].append({"emision": e, "total_mm": round(tot, 2) if not sd else None, "sin_dato": sd})
    out["cerrada"] = mas(lun, 6) < hoy and not sin
    return out

def main():
    hoy = sys.argv[sys.argv.index("--hoy") + 1] if "--hoy" in sys.argv else datetime.datetime.now(zoneinfo.ZoneInfo("America/Santiago")).date().isoformat()
    med, clima, pron = cargar()
    previo = json.load(open(SALIDA, encoding="utf-8")).get("semanas", {}) if SALIDA.exists() else {}
    sem = {}
    for i in range(SEMANAS):
        lun = mas(lunes(hoy), -7 * i)
        sem[lun] = semana(lun, hoy, med, clima, pron, previo.get(lun))
    ses, ok = sesgos(med, pron)
    res = {"actualizado": hoy, "nota": "ET0 en mm. Proyección = promedio de ICON y GFS menos su sesgo reciente (pronóstico − medido). La inicial es la del lunes y no se vuelve a calcular.",
           "modelos": MODELOS, "sesgo_mm": {m: round(v, 2) for m, v in ses.items()}, "sesgo_corregido": ok, "semanas": dict(sorted(sem.items()))}
    json.dump(res, open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    s = sem[lunes(hoy)]
    print("Semana", s["lunes"], "inicial", (s["inicial"] or {}).get("total_mm"), "actual", s["actual"]["total_mm"], "medidos", s["actual"]["medidos_n"], "proyectados", s["actual"]["proyectados_n"], "sin dato", s["actual"]["sin_dato"])

main()
