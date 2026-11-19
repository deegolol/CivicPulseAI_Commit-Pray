"""Loads the ETL output (data/processed/*) once into memory, falling back to app/mock_data/ while it doesn't exist.

The backend never downloads or modifies data: the DATA lane produces the files, we only read them.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from statistics import mean, median

from .models import Area, Campus, Indicator, Source

REPO_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
MOCK_DIR = Path(__file__).resolve().parent / "mock_data"
REQUIRED_FILES = ("indicators.json", "barrios.geojson", "campuses.json")

# Default priorities shown when the user hasn't chosen any (CONTRACTS §4.2).
DEFAULT_WEIGHTS = {
    "rent_eur_m2": 0.4,
    "distance_km": 0.3,
    "air_no2": 0.1,
    "transit_stops": 0.1,
    "services_count": 0.1,
}


@dataclass(frozen=True)
class Dataset:
    source_dir: str  # "processed" | "mock"
    level: str
    generated_at: str
    sources: list[Source]
    indicators: list[Indicator]
    areas: list[Area]
    campuses: list[Campus]
    geojson: dict

    def area(self, area_id: str) -> Area | None:
        return next((a for a in self.areas if a.id == area_id), None)

    def city_median(self) -> dict[str, float | None]:
        return {i.key: _agg(median, [a.values.get(i.key) for a in self.areas]) for i in self.indicators}

    def district_avg(self, district: str) -> dict[str, float | None]:
        same = [a for a in self.areas if a.district == district]
        return {i.key: _agg(mean, [a.values.get(i.key) for a in same]) for i in self.indicators}


def _agg(fn, values: list[float | None]) -> float | None:
    clean = [v for v in values if v is not None]
    return round(fn(clean), 2) if clean else None


def _pick_dir() -> tuple[Path, str]:
    if all((PROCESSED_DIR / f).exists() for f in REQUIRED_FILES):
        return PROCESSED_DIR, "processed"
    return MOCK_DIR, "mock"


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    folder, kind = _pick_dir()
    ind = json.loads((folder / "indicators.json").read_text(encoding="utf-8"))
    return Dataset(
        source_dir=kind,
        level=ind.get("level", "barrio"),
        generated_at=ind.get("generated_at", ""),
        sources=[Source(**s) for s in ind.get("sources", [])],
        indicators=[Indicator(**i) for i in ind.get("indicators", [])],
        areas=[Area(**a) for a in ind.get("areas", [])],
        campuses=[Campus(**c) for c in json.loads((folder / "campuses.json").read_text(encoding="utf-8"))],
        geojson=json.loads((folder / "barrios.geojson").read_text(encoding="utf-8")),
    )
