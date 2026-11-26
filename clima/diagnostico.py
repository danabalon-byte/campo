#!/usr/bin/env python3
"""Diagnóstico de una sola vez: qué archivos JSON y variables expone agrometeorologia.cl para Chincolco.
Solo lee e imprime en clima/diagnostico.txt. No toca datos."""
import json, re, urllib.request, urllib.parse, pathlib, sys
UA = {"User-Agent": "Mozilla/5.0 (compatible; campo-clima/1.0; diagnostico unico)"}
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode("utf-8", "replace")
BASE = "https://agrometeorologia.cl"
tmp = {}
for pag in ["/", "/evapotranspiracion/", "/grados_dia/GD_5_AYER", "/TS00", "/HR", "/RD"]:
    try:
        h = get(BASE + pag)
        ids = set(re.findall(r'tmp_\d+', h))
        tmp[pag] = ids
        p("PAGINA", pag, "largo", len(h), "tmp", sorted(ids))
        for m in sorted(set(re.findall(r'["\'(]([^"\'()\s]*(?:json|api|ajax|consulta|datos)[^"\'()\s]*)["\')]', h, re.I)))[:40]:
            p("  ref:", m)
        for s in sorted(set(re.findall(r'<script[^>]+src=["\']([^"\']+)', h)))[:30]:
            p("  script:", s)
    except Exception as e:
        p("PAGINA", pag, "ERROR", e)
# patrones en los scripts propios del sitio
for pag, ids in tmp.items():
    pass
try:
    h = get(BASE + "/")
    for s in set(re.findall(r'<script[^>]+src=["\']([^"\']+)', h)):
        if "agrometeorologia.cl" in s or s.startswith("/"):
            u = urllib.parse.urljoin(BASE + "/", s)
            try:
                js = get(u)
            except Exception as e:
                p("JS", u, "ERROR", e); continue
            hits = sorted(set(re.findall(r'[\w/\.\-\$\{\}\+\'"]*(?:items-|/json/|\.json|consulta|descargar|csv|excel)[\w/\.\-\$\{\}\+\'"]*', js, re.I)))[:60]
            p("JS", u, "largo", len(js)); [p("   ", x) for x in hits]
except Exception as e:
    p("JS ERROR", e)
# sondeo de items-*.json con el tmp_id de la página de ET0 y de la portada
ids = sorted(set().union(*tmp.values())) if tmp else []
nombres = ["ET","GD","HELADAS","TS00","TS10","HR","RD","PS","PP","VV","TA","T","TMIN","TMAX","HRMIN","HRMAX","DV","RV","TSMIN","TSMAX","TS","TA_DAY","DAY","HOY","AYER","TEMP","INDEX","ESTACIONES","estaciones"]
for t in ids:
    for n in nombres:
        u = f"{BASE}/json/{t}/items-{n}.json"
        try:
            d = get(u)
            j = json.loads(d)
            est = [s for s in j if isinstance(s, dict) and s.get("nombre") == "Liceo Agrícola Chincolco" and s.get("institucion_sigla") == "DMC"] if isinstance(j, list) else []
            p("OK", u, "largo", len(d), "chincolco" if est else "sin-chincolco")
            if est:
                e = est[0]
                p("   claves:", list(e.keys()))
                for k, v in e.items():
                    if isinstance(v, dict):
                        ks = list(v.keys())
                        p("   ", k, "n=", len(ks), "ultimas:", ks[-4:])
                        for kk in ks[-3:]:
                            p("      ", kk, json.dumps(v[kk], ensure_ascii=False)[:300])
        except Exception as e:
            pass
pathlib.Path(__file__).with_name("diagnostico.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\n".join(OUT)[:6000])
