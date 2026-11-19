---
id: T23
title: ETL residencias universitarias / colegios mayores (opcional)
lane: DATA
priority: P2
status: todo
owner: ""
depends_on: [T04]
files: [etl/fetch_residences.py, data/processed/residences.json]
---
## Objetivo
Si existe un dataset oficial con ubicaciones de residencias universitarias / colegios mayores en Madrid, generarlo como puntos para pintarlos en el mapa.
## Criterios de aceptación
- [ ] Timebox 20 min para encontrar la fuente; si no hay, `status: done` con nota "sin dataset oficial" y mensaje a `to: SHIP`.
- [ ] `residences.json`: `[{ "id", "name", "type", "coords": [lon, lat], "area_id", "url" }]`. Avisar a `API` para exponerlo.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
