---
id: T23
title: ETL residencias universitarias / colegios mayores (opcional)
lane: DATA
priority: P2
status: done
owner: codex@diego
depends_on: [T04]
files: [etl/fetch_residences.py, data/processed/residences.json]
---
## Objetivo
Si existe un dataset oficial con ubicaciones de residencias universitarias / colegios mayores en Madrid, generarlo como puntos para pintarlos en el mapa.
## Criterios de aceptación
- [x] Timebox 20 min para encontrar la fuente; si no hay, `status: done` con nota "sin dataset oficial" y mensaje a `to: SHIP`.
- [ ] `residences.json`: `[{ "id", "name", "type", "coords": [lon, lat], "area_id", "url" }]`. Avisar a `API` para exponerlo.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- Exploración cerrada sin dataset abierto apto verificado. El [CSV y JSON municipales](https://datos.madrid.es/dataset/203166-0-universidades-educacion/downloads) tienen 22 registros sin residencias ni colegios mayores.
- La [capa NOMECALLES](https://services1.arcgis.com/nCKYwcSONQTkPA4K/arcgis/rest/services/Centros_educativos_de_la_Comunidad_de_Madrid_WFL1/FeatureServer/1) sí tiene 117 puntos en Madrid. Las [condiciones publicadas](https://www.arcgis.com/home/item.html?id=f2ab5f8e45de42b6bc01ec4de6691908) limitan la redistribución a contenido sin alterar. Se omite esta capa opcional y se avisa a SHIP.
