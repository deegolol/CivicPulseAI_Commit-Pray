---
id: T07
title: ETL transporte y servicios (point-in-polygon)
lane: DATA
priority: P1
status: done
owner: codex@diego
depends_on: [T04]
files: [etl/fetch_transit.py, etl/fetch_services.py, data/processed/parts/transit.json, data/processed/parts/services.json]
---
## Antes de empezar
Lee el inventario de datasets de la IA de Adrián (inbox, `to: DATA`). Si ahí hay una fuente tuya que es oficial, completa y actual, reutilízala; si no, busca tú la fuente oficial. Si en 15 min tras el GO no hay inventario, empieza tú y avisa por inbox.

## Criterios de aceptación
- [x] `transit_stops` = paradas (Metro/Cercanías/EMT, lo que haya) por km² de barrio.
- [x] `services_count` = nº de equipamientos (bibliotecas, deportivos, culturales…) dentro del barrio.
- [x] Cruce espacial con shapely; escribe `parts/transit.json` y `parts/services.json`; fuentes documentadas.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- Integrado como `eb470c2`. 193 estaciones de Metro consolidadas, 52 bibliotecas y 82 equipamientos deportivos en los 131 barrios.
- Descargas T07 desde cero y `etl/run_all.py` en modos normal y offline verificados. Adrián avisado para regenerar el agregado. WEB avisado de la atribución CRTM.
