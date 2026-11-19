"""GET /api/areas, /api/areas/{id} and /api/geo: the areas (barrios) with their indicator values and shapes."""
from fastapi import APIRouter, HTTPException, Response

from ..data import get_dataset
from ..models import AreaDetail, AreasResponse

router = APIRouter(tags=["areas"])


@router.get("/areas", response_model=AreasResponse)
def list_areas() -> AreasResponse:
    return AreasResponse(areas=get_dataset().areas)


@router.get("/areas/{area_id}", response_model=AreaDetail)
def area_detail(area_id: str) -> AreaDetail:
    ds = get_dataset()
    area = ds.area(area_id)
    if area is None:
        raise HTTPException(status_code=404, detail=f"Área '{area_id}' no encontrada")
    return AreaDetail(**area.model_dump(), district_avg=ds.district_avg(area.district), city_median=ds.city_median())


@router.get("/geo")
def geo(response: Response) -> dict:
    response.headers["Cache-Control"] = "public, max-age=3600"  # shapes only change with a new deploy
    return get_dataset().geojson
