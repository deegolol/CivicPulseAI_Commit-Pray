---
id: T06
title: ETL calidad del aire por barrio
lane: DATA
priority: P1
status: todo
owner: ""
depends_on: [T04]
files: [etl/fetch_air.py, data/processed/indicators.json]
---
## Criterios de aceptación
- [ ] Media de NO₂ (u otro contaminante justificado) por estación; cada barrio toma la estación más cercana a su centroide.
- [ ] `air_no2` en `indicators.json` + fuente documentada.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
