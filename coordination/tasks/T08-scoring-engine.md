---
id: T08
title: Motor de scoring + POST /api/score
lane: API
priority: P0
status: todo
owner: ""
depends_on: [T02]
files: [backend/app/scoring.py, backend/app/routers/score.py, backend/tests/test_scoring.py]
---
## Objetivo
Corazón del producto. Función pura `score(areas, campus, weights, filters) -> results` según CONTRACTS §4.6.
## Criterios de aceptación
- [ ] Normalización min-max por indicador, invertida si `higher_is_better=false`; `null` → mediana.
- [ ] `distance_km` haversine centroide→campus.
- [ ] Pesos renormalizados; filtros marcan `excluded`.
- [ ] `budget_eur_month` + `housing_type` → `est_rent_eur_month`, `affordable_m2`, `fits_budget`; filtro `only_within_budget`.
- [ ] `breakdown` con `value`, `normalized`, `weight`, `contribution`.
- [ ] ≥ 5 tests: pesos que suman ≠1, indicador invertido, nulls, filtros, orden del ranking.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
