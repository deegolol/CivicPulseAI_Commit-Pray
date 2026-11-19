"""GET /api/health and GET /api/meta: service status and everything the UI needs to build its controls."""
from fastapi import APIRouter

from ..data import DEFAULT_WEIGHTS, get_dataset
from ..models import Defaults, Health, Meta

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=Health)
def health() -> Health:
    return Health(status="ok", data=get_dataset().source_dir)


@router.get("/meta", response_model=Meta)
def meta() -> Meta:
    ds = get_dataset()
    available = {i.key for i in ds.indicators} | {"distance_km"}
    weights = {k: v for k, v in DEFAULT_WEIGHTS.items() if k in available}
    return Meta(
        level=ds.level,
        generated_at=ds.generated_at,
        indicators=ds.indicators,
        sources=ds.sources,
        campuses=ds.campuses,
        defaults=Defaults(campus_id=ds.campuses[0].id if ds.campuses else "", weights=weights),
        is_mock=ds.source_dir == "mock",
    )
