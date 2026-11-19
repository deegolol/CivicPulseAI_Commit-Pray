---
id: T05
title: ETL indicador de alquiler (€/m²)
lane: DATA
priority: P0
status: done
owner: codex@adrian
depends_on: [T04]
files: [etl/fetch_rent.py, data/processed/parts/rent.json]
---
## Criterios de aceptación
- [ ] Escribe `parts/rent.json` (CONTRACTS §3.1b) con `rent_eur_m2` para todas las áreas posibles; `null` + nota si falta.
- [ ] Si el dato es de distrito, se replica a sus barrios con `notes.rent_eur_m2 = "valor del distrito"`.
- [ ] Fuente documentada en `data/SOURCES.md` y en `indicators.json.sources`.
- [ ] Mensaje a `to: API` cuando `indicators.json` real esté en `main`.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->

- 19/11/2026 · Integrado en main. 131/131 barrios con mediana distrital SERPAVI 2024. Agregado probado con la API y avisos enviados a DATA y API.
