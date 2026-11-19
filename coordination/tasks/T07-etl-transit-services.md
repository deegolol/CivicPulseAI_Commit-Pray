---
id: T07
title: ETL transporte y servicios (point-in-polygon)
lane: DATA
priority: P1
status: todo
owner: ""
depends_on: [T04]
files: [etl/fetch_transit.py, etl/fetch_services.py, data/processed/indicators.json]
---
## Criterios de aceptación
- [ ] `transit_stops` = paradas (Metro/Cercanías/EMT, lo que haya) por km² de barrio.
- [ ] `services_count` = nº de equipamientos (bibliotecas, deportivos, culturales…) dentro del barrio.
- [ ] Cruce espacial con shapely; fuentes documentadas. `etl/run_all.py` ejecuta todo en orden.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
