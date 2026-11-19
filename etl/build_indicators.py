"""Join the source parts into one indicator record for each Madrid neighborhood."""

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely import transform

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def build_indicators(geo_path, parts_dir):
    features = read_json(geo_path)["features"]
    areas = {}
    for feature in features:
        properties = feature["properties"]
        area_id = properties["id"]
        if area_id in areas:
            raise ValueError(f"Duplicate GeoJSON area ID: {area_id}")
        polygon_utm = transform(shape(feature["geometry"]), TO_UTM.transform, interleaved=False)
        center = polygon_utm.centroid
        lon, lat = TO_WGS84.transform(center.x, center.y)
        areas[area_id] = {
            "id": area_id,
            "name": properties["name"],
            "district": properties["district"],
            "centroid": [round(lon, 6), round(lat, 6)],
            "values": {},
            "notes": {},
        }

    sources = {}
    indicators = {}
    for path in sorted(parts_dir.glob("*.json")):
        part = read_json(path)
        source = part["source"]
        indicator = part["indicator"]
        key = indicator["key"]
        values = part["values"]
        notes = part.get("notes", {})

        unknown = (values.keys() | notes.keys()) - areas.keys()
        if unknown:
            raise ValueError(f"{path.name}: unknown GeoJSON area IDs: {', '.join(sorted(unknown))}")
        if key in indicators:
            raise ValueError(f"{path.name}: duplicate indicator key {key}")
        if indicator["source"] != source["id"]:
            raise ValueError(f"{path.name}: inconsistent source ID")
        if source["id"] in sources and sources[source["id"]] != source:
            raise ValueError(f"{path.name}: conflicting metadata for source {source['id']}")

        sources[source["id"]] = source
        indicators[key] = indicator
        for area_id, area in areas.items():
            value = values.get(area_id)
            if value is not None and (type(value) not in (int, float) or not math.isfinite(value)):
                raise ValueError(f"{path.name}: invalid indicator value for area {area_id}")
            area["values"][key] = value
            if area_id in notes:
                area["notes"][key] = notes[area_id]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "level": "barrio",
        "sources": list(sources.values()),
        "indicators": list(indicators.values()),
        "areas": list(areas.values()),
    }


def main():
    result = build_indicators(PROCESSED / "barrios.geojson", PROCESSED / "parts")
    (PROCESSED / "indicators.json").write_text(
        json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(result['areas'])} areas with {len(result['indicators'])} indicators")


if __name__ == "__main__":
    main()
