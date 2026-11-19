"""Map layers for students (T30): supermarkets, gyms, shopping centres, parks and main roads from OpenStreetMap,
plus Metro stations from CRTM. Run once; the web app only reads the resulting static files (no runtime API calls).

Output: frontend/public/layers/<layer>.json
  points: {"layer": "...", "source": "...", "items": [[lat, lon, "name"], ...]}
  roads:  {"layer": "roads", "source": "...", "lines": [[[lat, lon], ...], ...]}

OpenStreetMap data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
Query area: Madrid municipality (OSM admin_level 8).
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "layers"
OVERPASS = "https://overpass-api.de/api/interpreter"
AREA = 'area["name"="Madrid"]["admin_level"="8"]["boundary"="administrative"]->.m;'
OSM_SOURCE = "© OpenStreetMap contributors (ODbL 1.0)"

POINT_LAYERS = {
    "supermarkets": 'nwr["shop"="supermarket"](area.m);',
    "gyms": 'nwr["leisure"="fitness_centre"](area.m);',
    "malls": 'nwr["shop"="mall"](area.m);',
    "parks": 'nwr["leisure"="park"]["name"](area.m);',
}
ROADS = 'way["highway"~"^(motorway|trunk|primary)$"](area.m);'


def overpass(query: str) -> dict:
    body = urllib.parse.urlencode({"data": f"[out:json][timeout:120];{AREA}{query}"}).encode()
    req = urllib.request.Request(OVERPASS, data=body, headers={"User-Agent": "PrimeraLlave-ETL/1.0 (hackathon open-data project)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                return json.load(response)
        except Exception as exc:  # noqa: BLE001 - retry politely on transient errors
            print(f"  overpass error ({exc}); retrying…", file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise SystemExit("Overpass no responde; vuelve a intentarlo más tarde.")


def write(name: str, payload: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {path.stat().st_size / 1024:.0f} KB")


def points(name: str, query: str) -> None:
    data = overpass(query + "out center tags;")
    seen, items = set(), []
    for el in data["elements"]:
        lat = el.get("lat", el.get("center", {}).get("lat"))
        lon = el.get("lon", el.get("center", {}).get("lon"))
        if lat is None or lon is None:
            continue
        label = el.get("tags", {}).get("name") or el.get("tags", {}).get("brand") or ""
        key = (round(lat, 4), round(lon, 4), label)
        if key in seen:
            continue
        seen.add(key)
        items.append([round(lat, 5), round(lon, 5), label])
    write(name, {"layer": name, "source": OSM_SOURCE, "items": items})
    time.sleep(2)  # be gentle with the public Overpass server


def simplify(line: list[list[float]], tolerance: float = 0.00012) -> list[list[float]]:
    """Douglas-Peucker in degrees (~10 m) to keep the roads file small."""
    if len(line) < 3:
        return line
    (y1, x1), (y2, x2) = line[0], line[-1]
    best, index = 0.0, 0
    for i, (y, x) in enumerate(line[1:-1], start=1):
        num = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
        den = ((y2 - y1) ** 2 + (x2 - x1) ** 2) ** 0.5 or 1e-12
        if num / den > best:
            best, index = num / den, i
    if best <= tolerance:
        return [line[0], line[-1]]
    return simplify(line[: index + 1], tolerance)[:-1] + simplify(line[index:], tolerance)


def roads() -> None:
    data = overpass(ROADS + "out geom;")
    lines = []
    for el in data["elements"]:
        geom = [[round(p["lat"], 5), round(p["lon"], 5)] for p in el.get("geometry", [])]
        if len(geom) >= 2:
            lines.append(simplify(geom))
    write("roads", {"layer": "roads", "source": OSM_SOURCE, "lines": lines})


def metro() -> None:
    """Official CRTM Metro stations (already used for the transit indicator)."""
    candidates = [ROOT / "data" / "raw" / "metro.geojson", ROOT.parent / "cp-codex" / "data" / "raw" / "metro.geojson"]
    src = next((p for p in candidates if p.exists()), None)
    if not src:
        print("metro: falta data/raw/metro.geojson (ejecuta etl/fetch_transit.py)", file=sys.stderr)
        return
    geo = json.loads(src.read_text(encoding="utf-8"))
    seen, items = set(), []
    for f in geo["features"]:
        props, geom = f.get("properties", {}), f.get("geometry") or {}
        if geom.get("type") != "Point":
            continue
        if str(props.get("MUNICIPIO") or props.get("municipio") or "Madrid").upper().find("MADRID") < 0:
            continue
        lon, lat = geom["coordinates"][:2]
        label = props.get("DENOMINACION") or props.get("NOMBRE") or props.get("name") or ""
        key = label or (round(lat, 4), round(lon, 4))
        if key in seen:
            continue
        seen.add(key)
        items.append([round(lat, 5), round(lon, 5), str(label).title()])
    write("metro", {"layer": "metro", "source": "Powered by CRTM · Estaciones de Metro (datos transformados)", "items": items})


if __name__ == "__main__":
    for layer, query in POINT_LAYERS.items():
        points(layer, query)
    roads()
    metro()
