"""Pydantic schemas that mirror coordination/CONTRACTS.md §3–4. Field names here ARE the contract."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Source(BaseModel):
    id: str
    name: str
    publisher: str = ""
    url: str = ""
    license: str = ""
    retrieved: str = ""
    granularity: str = ""


class Indicator(BaseModel):
    key: str
    label: str
    unit: str
    higher_is_better: bool
    source: str


class Campus(BaseModel):
    id: str
    name: str
    coords: tuple[float, float]  # [lon, lat]


class Area(BaseModel):
    id: str
    name: str
    district: str
    centroid: tuple[float, float]  # [lon, lat]
    values: dict[str, float | None]
    notes: dict[str, str] = Field(default_factory=dict)


class AreaDetail(Area):
    district_avg: dict[str, float | None]
    city_median: dict[str, float | None]


class Defaults(BaseModel):
    campus_id: str
    weights: dict[str, float]


class Meta(BaseModel):
    level: str
    generated_at: str
    indicators: list[Indicator]
    sources: list[Source]
    campuses: list[Campus]
    defaults: Defaults
    is_mock: bool = False  # true while data/processed/ is not built yet


class AreasResponse(BaseModel):
    areas: list[Area]


class Health(BaseModel):
    status: str
    data: str  # "processed" | "mock"
