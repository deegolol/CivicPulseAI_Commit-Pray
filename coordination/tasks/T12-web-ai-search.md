---
id: T12
title: Buscador en lenguaje natural + explicación
lane: WEB
priority: P1
status: done
owner: antigravity@diego
depends_on: [T09,T11]
files: [frontend/src/components/AiSearch.tsx, frontend/src/components/AiExplanation.tsx]
---
## Criterios de aceptación
- [x] Caja de texto destacada arriba con 3 ejemplos clicables (incluyendo la frase de Lucía de la demo).
- [x] `parse` → aplica pesos/filtros a los controles (campus, presupuesto, tipo de vivienda, distancia máx. y chips de prioridad) → `score` → `explain` del top 3.
- [x] Muestra `interpretation`, texto explicado con cifras reales y etiqueta `"IA"` / `"Modo sin IA"` según `engine`.
- [x] Estados de carga (skeleton), error amable y fallback local si `/api/ai/*` no responde.

## Notas / progreso
- Implementado en `frontend/src/components/AiExplanation.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts` y `frontend/src/components/TopZonesRail.tsx`. `npm run build` en verde.
