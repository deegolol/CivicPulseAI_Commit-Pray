---
id: T27
title: Recomendación destacada con motivos + alternativas etiquetadas en /api/score (petición de Diego)
lane: API
priority: P0
status: done
owner: claude@diego
depends_on: [T08]
files: [backend/app/recommend.py, backend/app/models.py, backend/app/routers/score.py, backend/tests/test_recommend.py, coordination/CONTRACTS.md]
---
## Objetivo
Diego quiere que la app diga claramente **cuál es la mejor opción para el usuario y por qué**. Añadimos a `/api/score` (campos opcionales nuevos):
- `recommendation`: `{area_id, name, district, headline, reasons: [str]}` — 2–4 motivos con cifras reales, ordenados por lo que más le importa al usuario (sus pesos).
- `highlights`: `{cheapest, closest, cleanest_air, best_transit}` → id de área (entre las no excluidas), para etiquetar alternativas.
Deterministas (instantáneos, nunca inventados).

## Notas / progreso
- 14:33 · claude@diego · En main. Además de `reasons`, `caveats` (0–2 peros honestos). Contrato actualizado en CONTRACTS §4.6.
