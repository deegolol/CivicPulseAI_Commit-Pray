"""Calcula la densidad de estaciones de Metro de cada barrio de Madrid."""

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from shapely import STRtree, transform
from shapely.geometry import Point, shape

from fetch_air import GEOMETRY, RAW_DIR, TO_UTM, write_atomic

PARTS_DIR = GEOMETRY.parent / "parts"
OUTPUT = PARTS_DIR / "transit.json"
METRO_LAYER = "https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0"
METRO_URL = f"{METRO_LAYER}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"


def load_source(filename, url, parse):
    """Valida la descarga antes de guardarla en la caché local."""
    path = RAW_DIR / filename
    if path.is_file():
        data = parse(path.read_bytes())
    else:
        for attempt in range(3):
            try:
                with urlopen(url, timeout=20) as response:
                    content = response.read()
                break
            except OSError:
                if attempt == 2:
                    raise
        data = parse(content)
        write_atomic(path, content)
    downloaded = datetime.fromtimestamp(path.stat().st_mtime, ZoneInfo("Europe/Madrid"))
    return data, downloaded.date().isoformat()


def load_areas():
    features = json.loads(GEOMETRY.read_text(encoding="utf-8"))["features"]
    return {feature["properties"]["id"]: shape(feature["geometry"]) for feature in features}


def count_by_area(areas, points):
    """Asigna cada punto cubierto a un solo barrio, también sobre un límite."""
    area_ids = sorted(areas)
    tree = STRtree([areas[area_id] for area_id in area_ids])
    counts = Counter()
    for point in points:
        matches = tree.query(point, predicate="covered_by")
        if len(matches):
            counts[area_ids[min(matches)]] += 1
    return counts


def save_part(path, source, indicator, values, notes):
    part = {"source": source, "indicator": indicator, "values": values, "notes": notes}
    content = json.dumps(part, ensure_ascii=False, allow_nan=False, indent=2) + "\n"
    write_atomic(path, content.encode("utf-8"))


def keep_snapshot(path, areas, error):
    if not path.is_file():
        return False
    saved = json.loads(path.read_text(encoding="utf-8"))
    if saved["values"].keys() != areas.keys():
        return False
    print(f"Descarga no disponible ({error}). Se conserva {path.name}.")
    return True


def metro_points(content):
    """Consolida las paradas por código de estación de la red y denominación."""
    data = json.loads(content)
    if data.get("type") != "FeatureCollection" or data.get("exceededTransferLimit"):
        raise ValueError("El CRTM no devolvió una colección completa de estaciones.")

    representatives = {}
    updates = set()
    for feature in data["features"]:
        properties = feature["properties"]
        name = properties["DENOMINACION"]
        if properties["CODIGOMUNICIPIO"] != "079" or not name or not properties["LINEAS"]:
            continue
        geometry = feature["geometry"]
        if not geometry or geometry["type"] != "Point":
            continue
        code = properties["CODIGOESTACION"]
        network_code = properties["CODIGOCTMESTACIONREDMETRO"] or code
        group = (network_code, name.strip().casefold())
        priority = (code != network_code, code)
        if group not in representatives or priority < representatives[group][0]:
            representatives[group] = (priority, Point(geometry["coordinates"]))
        if properties["FECHAACTUAL"]:
            updated = datetime.strptime(properties["FECHAACTUAL"], "%Y%m%d").date()
            updates.add(updated.isoformat())
    if not representatives:
        raise ValueError("El CRTM no devolvió estaciones identificables en Madrid.")
    return [point for _, point in representatives.values()], sorted(updates)


def main():
    areas = load_areas()
    try:
        (points, updates), retrieved = load_source("metro.geojson", METRO_URL, metro_points)
    except OSError as error:
        if keep_snapshot(OUTPUT, areas, error):
            return
        raise

    counts = count_by_area(areas, points)
    values = {}
    notes = {}
    for area_id, geometry in areas.items():
        km2 = transform(geometry, TO_UTM.transform, interleaved=False).area / 1_000_000
        count = counts[area_id]
        values[area_id] = round(count / km2, 2)
        notes[area_id] = f"Estaciones de Metro del CRTM en el barrio: {count}."
    name = "Powered by CRTM · Estaciones de Metro (datos transformados)"
    if updates:
        name += f" · Actualización de origen {', '.join(updates)}"
    source = {
        "id": "crtm",
        "name": name,
        "publisher": "Consorcio Regional de Transportes de Madrid (CRTM)",
        "url": "https://www.crtm.es/",
        "license": "Licencia de datos estáticos del CRTM",
        "retrieved": retrieved,
        "granularity": "estación",
    }
    indicator = {
        "key": "transit_stops",
        "label": "Transporte",
        "unit": "paradas/km²",
        "higher_is_better": True,
        "source": "crtm",
    }
    save_part(OUTPUT, source, indicator, values, notes)
    print(f"{len(areas)} barrios con densidad de Metro. {sum(counts.values())} estaciones asignadas.")


if __name__ == "__main__":
    main()
