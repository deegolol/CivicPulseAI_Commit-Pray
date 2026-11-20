"""Official rent per BARRIO (not just per district) from SERPAVI 2024 census sections + INE section boundaries.

SERPAVI publishes, for each of Madrid's ~2,440 census sections, the median monthly rent of flats (€/month), the
median €/m² and the number of contracts. We place every section in its barrio (INE 2024 boundaries → centroid →
point in the municipal barrio polygon) and summarise each barrio with the contract-weighted median of its sections.
Nothing is estimated: every input number is published by the Ministry; we only group sections by barrio.

Output: data/processed/rent_barrio.json {"source", "year", "areas": {area_id: {"median", "p25", "p75", "eur_m2", "contracts", "sections"}}}
Requires: data/raw/serpavi-2024.xlsx (fetch_rent.py) and data/raw/ine/seccionado_2024.zip
(https://www.ine.es/prodyser/cartografia/seccionado_2024.zip, downloaded automatically).
"""
from __future__ import annotations

import io
import json
import math
import urllib.request
import zipfile
from pathlib import Path

import shapefile  # pyshp
from openpyxl import load_workbook
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SERPAVI = ROOT / "data" / "raw" / "serpavi-2024.xlsx"
INE_ZIP = ROOT / "data" / "raw" / "ine" / "seccionado_2024.zip"
INE_URL = "https://www.ine.es/prodyser/cartografia/seccionado_2024.zip"
BARRIOS = ROOT / "data" / "processed" / "barrios.geojson"
OUTPUT = ROOT / "data" / "processed" / "rent_barrio.json"
COLS = {"median": "ALQTBID12_M_VC_24", "p25": "ALQTBID12_25_VC_24", "p75": "ALQTBID12_75_VC_24",
        "eur_m2": "ALQM2_LV_M_VC_24", "contracts": "BI_ALVHEPCO_TVC_24"}


def number(v):
    return float(v) if type(v) in (int, float) and math.isfinite(v) and v > 0 else None


def serpavi_sections() -> dict[str, dict]:
    wb = load_workbook(SERPAVI, read_only=True, data_only=True)
    try:
        rows = wb["Secciones censales"].iter_rows(values_only=True)
        head = next(rows)
        idx = {k: head.index(c) for k, c in COLS.items()}
        code = head.index("CUSEC")
        return {str(r[code]).strip(): {k: number(r[i]) for k, i in idx.items()}
                for r in rows if str(r[code]).startswith("28079")}
    finally:
        wb.close()


def section_points() -> dict[str, tuple[float, float]]:
    """CUSEC → (lat, lon) of the section's centroid (area-weighted ring centroid of its largest part)."""
    if not INE_ZIP.exists():
        INE_ZIP.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(INE_URL, timeout=300) as r:
            INE_ZIP.write_bytes(r.read())
    zf = zipfile.ZipFile(INE_ZIP)
    name = next(n[:-4] for n in zf.namelist() if n.endswith(".shp"))
    reader = shapefile.Reader(shp=io.BytesIO(zf.read(name + ".shp")), dbf=io.BytesIO(zf.read(name + ".dbf")),
                              shx=io.BytesIO(zf.read(name + ".shx")), encoding="latin-1")
    prj = zf.read(name + ".prj").decode()
    to_wgs = Transformer.from_crs("EPSG:25830" if "30N" in prj or "25830" in prj else "EPSG:25830", "EPSG:4326", always_xy=True)
    fields = [f[0] for f in reader.fields[1:]]
    out = {}
    for rec, shp in zip(reader.iterRecords(), reader.iterShapes()):
        row = dict(zip(fields, rec))
        cusec = str(row.get("CUSEC", ""))
        if not cusec.startswith("28079"):
            continue
        parts = list(shp.parts) + [len(shp.points)]
        best, cx, cy = 0.0, None, None
        for a, b in zip(parts, parts[1:]):
            ring = shp.points[a:b]
            area = sx = sy = 0.0
            for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
                f = x1 * y2 - x2 * y1
                area += f
                sx += (x1 + x2) * f
                sy += (y1 + y2) * f
            if abs(area) > best:
                best, cx, cy = abs(area), sx / (3 * area), sy / (3 * area)
        if cx is not None:
            lon, lat = to_wgs.transform(cx, cy)
            out[cusec] = (lat, lon)
    return out


def inside(lat, lon, rings) -> bool:
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def weighted_median(pairs: list[tuple[float, float]]) -> float:
    pairs = sorted(pairs)
    total, acc = sum(w for _, w in pairs), 0.0
    for value, w in pairs:
        acc += w
        if acc >= total / 2:
            return value
    return pairs[-1][0]


def main() -> None:
    rents, points = serpavi_sections(), section_points()
    barrios = json.loads(BARRIOS.read_text(encoding="utf-8"))["features"]
    by_area: dict[str, list[dict]] = {}
    for cusec, (lat, lon) in points.items():
        rent = rents.get(cusec)
        if not rent or not rent["median"]:
            continue
        for f in barrios:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            if any(inside(lat, lon, rings) for rings in polys):
                by_area.setdefault(f["properties"]["id"], []).append(rent)
                break
    areas = {}
    for area_id, secs in by_area.items():
        w = [(s["contracts"] or 1.0) for s in secs]
        pick = lambda key: round(weighted_median([(s[key], wi) for s, wi in zip(secs, w) if s[key]])) if any(s[key] for s in secs) else None
        areas[area_id] = {"median": pick("median"), "p25": pick("p25"), "p75": pick("p75"),
                          "eur_m2": (lambda v: round(v, 2) if v else None)(weighted_median([(s["eur_m2"], wi) for s, wi in zip(secs, w) if s["eur_m2"]]) if any(s["eur_m2"] for s in secs) else None),
                          "contracts": int(sum(s["contracts"] or 0 for s in secs)), "sections": len(secs)}
    OUTPUT.write_text(json.dumps({
        "source": "SERPAVI 2024 (MIVAU) por sección censal + secciones censales INE 2024; mediana ponderada por nº de contratos",
        "year": 2024, "areas": areas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"escrito {OUTPUT}: {len(areas)} barrios con dato, {sum(len(v) for v in by_area.values())} secciones")


if __name__ == "__main__":
    main()
