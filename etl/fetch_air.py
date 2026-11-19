"""Asigna a cada barrio el NO₂ medio de la estación municipal más cercana."""

import csv
from collections import defaultdict
from math import cos, isfinite, radians, sin
from typing import Iterable, TextIO

from shapely.geometry import shape

NO2_MAGNITUDE = 8
HOURS = tuple(f"{hour:02d}" for hour in range(1, 25))


def mean_no2(files: Iterable[TextIO]) -> dict[int, float]:
    """Agrega las observaciones horarias validadas de cada estación municipal."""
    totals: dict[int, float] = defaultdict(float)
    counts: dict[int, int] = defaultdict(int)
    for file in files:
        for row in csv.DictReader(file, delimiter=";"):
            if int(row["MAGNITUD"]) != NO2_MAGNITUDE:
                continue
            station = int(row["ESTACION"])
            for hour in HOURS:
                if row[f"V{hour}"] != "V":
                    continue
                concentration = float(row[f"H{hour}"].replace(",", "."))
                if isfinite(concentration) and concentration >= 0:
                    totals[station] += concentration
                    counts[station] += 1
    return {station: totals[station] / count for station, count in counts.items()}


def distance_key(lon: float, lat: float, other_lon: float, other_lat: float) -> float:
    """Devuelve el término de Haversine que basta para ordenar por distancia."""
    return (
        sin(radians(other_lat - lat) / 2) ** 2
        + cos(radians(lat)) * cos(radians(other_lat))
        * sin(radians(other_lon - lon) / 2) ** 2
    )


def build_part(
    features: list[dict],
    means: dict[int, float],
    stations: dict[int, tuple[str, float, float]],
    source: dict,
    year: int,
) -> dict:
    """Construye la pieza del contrato con un valor y una nota por barrio."""
    available = sorted(means.keys() & stations.keys())
    if not available:
        raise ValueError("No hay estaciones con coordenadas y mediciones válidas de NO₂.")

    values = {}
    notes = {}
    for feature in features:
        area_id = feature["properties"]["id"]
        centroid = shape(feature["geometry"]).centroid
        station = min(
            available,
            key=lambda station_id: distance_key(
                centroid.x, centroid.y, *stations[station_id][1:]
            ),
        )
        values[area_id] = round(means[station], 1)
        name = stations[station][0]
        notes[area_id] = f"Media de {year} en la estación más cercana al centroide: {name}."

    return {
        "source": source,
        "indicator": {
            "key": "air_no2",
            "label": "Calidad del aire",
            "unit": "µg/m³ NO₂",
            "higher_is_better": False,
            "source": source["id"],
        },
        "values": values,
        "notes": notes,
    }
