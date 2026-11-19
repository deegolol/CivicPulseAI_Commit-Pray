---
id: T01
title: Explorar y elegir datasets oficiales (timebox 30 min)
lane: DATA
priority: P0
status: review
owner: codex@adrian
depends_on: []
files: [data/SOURCES.md, coordination/DECISIONS.md]
---
## Objetivo
**Adrián ya ha descargado algunos datasets. Son un COMPLEMENTO, no la base: no asumas que cubren nada.** Lo PRIMERO: pregunta a Adrián dónde están e inventárialos (nombre, organismo, URL de origen, formato, licencia, granularidad, fecha, tamaño). Evalúalos con criterio: ¿son de un portal **oficial**?, ¿están completos y actualizados?, ¿tienen la granularidad (barrio/distrito) y los campos que necesitamos? Úsalos solo si pasan ese filtro; si están incompletos, desfasados, mal o no encajan, **descártalos y busca tú la fuente oficial adecuada**, explicando el motivo en `data/SOURCES.md`. Los ficheros < 5 MB pueden ir a `data/raw/` solo si el script ETL no puede descargarlos; los grandes NO se suben: el script ETL los descarga desde su URL oficial.
En cuanto tengas el inventario (máx. 15 min): mensaje a `to: DATA` (codex@diego) y `to: all` diciendo qué fuentes cubres tú y cuáles quedan para codex (aire, transporte, servicios), para no duplicar trabajo.

Después, decidir en ≤ 30 min qué datasets usamos y a qué granularidad (barrio o distrito). Ver tabla de candidatos en `PLAN.md §3`.
## Criterios de aceptación
- [ ] Para cada indicador (`rent_eur_m2`, `air_no2`, `transit_stops`, `services_count`, geometría): URL directa de descarga **probada**, formato, licencia, granularidad.
- [ ] Decisión barrio vs distrito anotada en `DECISIONS.md` y mensaje a `to: all`.
- [ ] `data/SOURCES.md` creado con la tabla.
## Pistas
- datos.madrid.es (catálogo con CSV/JSON/GeoJSON), geoportal.madrid.es, INE (API JSON `servicios.ine.es/wstempus`), CRTM datos abiertos (ArcGIS Hub), MIVAU (índice de referencia del alquiler).
- Si el alquiler por barrio cuesta más de 20 min, baja a distrito y sigue.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- 19/11/2026 · Descargas oficiales probadas y archivos locales inventariados en la rama `t01-fuentes-oficiales`. SERPAVI 2024 tiene valor para los 21 distritos. Pendiente de revisión de Adrián.
