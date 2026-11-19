---
id: T04
title: ETL geometría de barrios + campus
lane: DATA
priority: P0
status: review
owner: codex@adrian
depends_on: [T01]
files: [etl/fetch_geometry.py, etl/build_indicators.py, etl/run_all.py, data/processed/barrios.geojson, data/processed/campuses.json]
---
## Criterios de aceptación
- [ ] `barrios.geojson` en EPSG:4326, propiedades según CONTRACTS §3.1, simplificado < 2 MB.
- [ ] Centroides calculados (se usan en `indicators.json`).
- [ ] `campuses.json` con coordenadas verificadas (al menos ETSISI y ETSIINF; opcional otros campus de Madrid).
- [ ] Script reproducible desde cero (`python etl/fetch_geometry.py`).
- [ ] `etl/build_indicators.py`: fusiona `data/processed/parts/*.json` (CONTRACTS §3.1b) en `indicators.json` y valida que todos los ids existen en el GeoJSON. `etl/run_all.py` ejecuta todo en orden.
- [ ] Mensaje a `to: DATA` en cuanto `barrios.geojson` esté en `main` (codex lo necesita para T06/T07).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- 19/11/2026 · 131 multipolígonos válidos, dos campus UPM y fusión verificada con una pieza de prueba. Rama `t04-geometria-campus`, pendiente de OK de Adrián.
