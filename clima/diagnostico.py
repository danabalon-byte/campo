#!/usr/bin/env python3
"""Diagnóstico (fase 2) de una sola vez: contexto de 'historicos' en map-leaflet.js y sondeo de esas rutas. Solo lee."""
import json, re, urllib.request, urllib.parse, pathlib
UA = {"User-Agent": "Mozilla/5.0 (compatible; campo-clima/1.0; diagnostico unico)"}
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode("utf-8", "replace")
B = "https://agrometeorologia.cl"
h = get(B + "/")
tmp = re.search(r'tmp_\d+', h).group(0)
src = [s for s in re.findall(r'<script[^>]+src=["\']([^"\']+)', h) if "map-leaflet" in s][0]
js = get(urllib.parse.urljoin(B + "/", src))
p("TMP", tmp, "JS", src, len(js))
for pat in ["historicos", "items-resumen", "assets/db/items-", "/items-", "descargar"]:
    for m in list(re.finditer(re.escape(pat), js))[:4]:
        a = max(0, m.start() - 350); b = min(len(js), m.end() + 450)
        p("\n=== CONTEXTO", pat, "@", m.start()); p(js[a:b].replace("\n", " "))
cands = [f"/historicos/ta/days.json", f"/historicos/ta/hours.json", f"/assets/db/items-resumen.json", f"/json/{tmp}/historicos/ta/days.json",
         f"/json/{tmp}/items-resumen.json", f"/assets/db/items-TS00.json", f"/assets/db/items-ta.json"]
for c in cands:
    try:
        d = get(B + c); p("\nOK", c, len(d), d[:500].replace("\n", " "))
    except Exception as e:
        p("\nFALLA", c, e)
pathlib.Path(__file__).with_name("diagnostico.txt").write_text("\n".join(OUT), encoding="utf-8")
