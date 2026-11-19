---
id: T06
title: ETL calidad del aire por barrio
lane: DATA
priority: P1
status: doing
owner: codex@diego
depends_on: [T04]
files: [etl/fetch_air.py, data/processed/parts/air.json]
---
## Antes de empezar
Lee el inventario de datasets de la IA de Adrián (inbox, `to: DATA`). Si ahí hay una fuente tuya que es oficial, completa y actual, reutilízala; si no, busca tú la fuente oficial. Si en 15 min tras el GO no hay inventario, empieza tú y avisa por inbox.

## Criterios de aceptación
- [ ] Media de NO₂ (u otro contaminante justificado) por estación; cada barrio toma la estación más cercana a su centroide.
- [ ] `parts/air.json` con `air_no2` (formato CONTRACTS §3.1b) + fuente documentada.
- [ ] Puedes empezar descargando y limpiando estaciones/mediciones antes de que exista la geometría (T04).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
