"""Build the Madrid neighborhood GeoJSON and the UPM campus reference points."""

import io
import json
import ssl
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

import certifi
import shapefile
from pyproj import Transformer
from shapely.geometry import MultiPolygon, mapping, shape
from shapely.geometry.polygon import orient
from shapely import transform

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
CACHE = ROOT / "data" / "raw" / "barrios.zip"
BAR_LAYERS_URL = (
    "https://datos.madrid.es/dataset/300496-0-barrios-madrid/resource/"
    "300496-3-barrios-madrid/download/300496-3-barrios-madrid.zip"
)
TO_WGS84 = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)
SIMPLIFY_METERS = 1
MAX_BYTES = 2_000_000

# ETSISI publishes GPS 40°23′22.92″ N, 3°37′40.42″ W.
# https://www.etsisi.upm.es/ubicacion-como-llegar/
# ETSIINF uses the marker in the UPM center profile.
# https://www.upm.es/FuturosEstudiantes/Centros/CampusMontegancedo/ETSIngenierosInformaticos
CAMPUSES = [
    {"id": "etsisi", "name": "ETSISI · Campus Sur UPM", "coords": [-3.62789444, 40.3897]},
    {"id": "etsiinf", "name": "ETSIINF · Campus Montegancedo UPM", "coords": [-3.839679, 40.405474]},
]


def neighborhoods(archive_bytes):
    features = []
    with ZipFile(io.BytesIO(archive_bytes)) as archive:
        with shapefile.Reader(
            shp=io.BytesIO(archive.read("BARRIOS.shp")),
            shx=io.BytesIO(archive.read("BARRIOS.shx")),
            dbf=io.BytesIO(archive.read("BARRIOS.dbf")),
            encoding="utf-8",
        ) as reader:
            for entry in reader.iterShapeRecords():
                record = entry.record.as_dict()
                area_id = str(record["COD_BAR"]).strip().zfill(3)
                geometry = shape(entry.shape.__geo_interface__)
                geometry = geometry.simplify(SIMPLIFY_METERS, preserve_topology=True)
                geometry = transform(geometry, TO_WGS84.transform, interleaved=False)
                polygons = [geometry] if geometry.geom_type == "Polygon" else geometry.geoms
                geometry = MultiPolygon([orient(polygon, sign=1) for polygon in polygons])
                if geometry.is_empty or not geometry.is_valid:
                    raise ValueError(f"Invalid neighborhood geometry: {area_id}")
                features.append({
                    "type": "Feature",
                    "properties": {
                        "id": area_id,
                        "name": record["NOMBRE"].strip(),
                        "district_id": str(record["CODDIS"]).strip().zfill(2),
                        "district": record["NOMDIS"].strip(),
                    },
                    "geometry": mapping(geometry),
                })

    ids = {feature["properties"]["id"] for feature in features}
    districts = {feature["properties"]["district_id"] for feature in features}
    if len(ids) != len(features) or len(ids) != 131 or len(districts) != 21:
        raise ValueError("Expected 131 unique Madrid neighborhoods across 21 districts")
    features.sort(key=lambda feature: feature["properties"]["id"])
    return {"type": "FeatureCollection", "features": features}


def main():
    if CACHE.is_file():
        archive_bytes = CACHE.read_bytes()
    else:
        context = ssl.create_default_context()
        context.load_verify_locations(certifi.where())
        with urlopen(BAR_LAYERS_URL, timeout=30, context=context) as response:
            archive_bytes = response.read()

    geojson = json.dumps(neighborhoods(archive_bytes), ensure_ascii=False, separators=(",", ":"))
    payload = (geojson + "\n").encode("utf-8")
    if len(payload) >= MAX_BYTES:
        raise ValueError(f"Neighborhood GeoJSON is {len(payload)} bytes (limit: {MAX_BYTES})")

    CACHE.parent.mkdir(parents=True, exist_ok=True)
    if not CACHE.exists():
        CACHE.write_bytes(archive_bytes)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    (PROCESSED / "barrios.geojson").write_bytes(payload)
    (PROCESSED / "campuses.json").write_text(
        json.dumps(CAMPUSES, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built 131 neighborhoods ({len(payload):,} bytes) and {len(CAMPUSES)} campuses")


if __name__ == "__main__":
    main()
