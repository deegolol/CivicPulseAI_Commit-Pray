---
id: T06
title: ETL calidad del aire por barrio
lane: DATA
priority: P1
status: done
owner: codex@diego
depends_on: [T04]
files: [etl/fetch_air.py, data/processed/parts/air.json]
---
## Antes de empezar
Lee el inventario de datasets de la IA de Adrián (inbox, `to: DATA`). Si ahí hay una fuente tuya que es oficial, completa y actual, reutilízala; si no, busca tú la fuente oficial. Si en 15 min tras el GO no hay inventario, empieza tú y avisa por inbox.

## Criterios de aceptación
- [x] Media de NO₂ (u otro contaminante justificado) por estación; cada barrio toma la estación más cercana a su centroide.
- [x] `parts/air.json` con `air_no2` (formato CONTRACTS §3.1b) + fuente documentada.
- [x] Puedes empezar descargando y limpiando estaciones/mediciones antes de que exista la geometría (T04).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- Integrado en main como `be8a59f`. Media de NO₂ de 2025 en 23 estaciones municipales y cruce con los 131 barrios en EPSG:25830.
- `etl/run_all.py` verificado desde cero en una copia aislada con T04. `etl/run_all.py --offline` verificó juntos aire y alquiler.
