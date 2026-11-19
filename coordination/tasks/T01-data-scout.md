---
id: T01
title: Explorar y elegir datasets oficiales (timebox 30 min)
lane: DATA
priority: P0
status: todo
owner: ""
depends_on: []
files: [data/SOURCES.md, coordination/DECISIONS.md]
---
## Objetivo
Decidir en ≤ 30 min qué datasets usamos y a qué granularidad (barrio o distrito). Ver tabla de candidatos en `PLAN.md §3`.
## Criterios de aceptación
- [ ] Para cada indicador (`rent_eur_m2`, `air_no2`, `transit_stops`, `services_count`, geometría): URL directa de descarga **probada**, formato, licencia, granularidad.
- [ ] Decisión barrio vs distrito anotada en `DECISIONS.md` y mensaje a `to: all`.
- [ ] `data/SOURCES.md` creado con la tabla.
## Pistas
- datos.madrid.es (catálogo con CSV/JSON/GeoJSON), geoportal.madrid.es, INE (API JSON `servicios.ine.es/wstempus`), CRTM datos abiertos (ArcGIS Hub), MIVAU (índice de referencia del alquiler).
- Si el alquiler por barrio cuesta más de 20 min, baja a distrito y sigue.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
