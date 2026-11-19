---
id: T07
title: ETL transporte y servicios (point-in-polygon)
lane: DATA
priority: P1
status: todo
owner: ""
depends_on: [T04]
files: [etl/fetch_transit.py, etl/fetch_services.py, data/processed/parts/transit.json, data/processed/parts/services.json]
---
## Criterios de aceptación
- [ ] `transit_stops` = paradas (Metro/Cercanías/EMT, lo que haya) por km² de barrio.
- [ ] `services_count` = nº de equipamientos (bibliotecas, deportivos, culturales…) dentro del barrio.
- [ ] Cruce espacial con shapely; escribe `parts/transit.json` y `parts/services.json`; fuentes documentadas.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
