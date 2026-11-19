---
id: T04
title: ETL geometría de barrios + campus
lane: DATA
priority: P0
status: todo
owner: ""
depends_on: [T01]
files: [etl/fetch_geometry.py, data/processed/barrios.geojson, data/processed/campuses.json]
---
## Criterios de aceptación
- [ ] `barrios.geojson` en EPSG:4326, propiedades según CONTRACTS §3.1, simplificado < 2 MB.
- [ ] Centroides calculados (se usan en `indicators.json`).
- [ ] `campuses.json` con coordenadas verificadas (al menos ETSISI y ETSIINF; opcional otros campus de Madrid).
- [ ] Script reproducible desde cero (`python etl/fetch_geometry.py`).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
