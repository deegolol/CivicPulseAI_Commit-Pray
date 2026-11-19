---
id: T09
title: Panel de prioridades + mapa coroplético por puntuación
lane: WEB
priority: P0
status: done
owner: antigravity@diego
depends_on: [T03]
files: [frontend/src/components/PriorityPanel.tsx, frontend/src/components/Map.tsx, frontend/src/App.tsx]
---
## Criterios de aceptación
- [x] Selector de campus, presupuesto €/mes, tipo (habitación/estudio/piso), check "solo dentro de presupuesto", controles en unidades reales por indicador (+ distancia en km con radio en el mapa, sin porcentajes según T24).
- [x] Cada cambio → `POST /api/score` (debounce 250 ms) → mapa coloreado por `score` con leyenda monocromática; excluidos en gris.
- [x] Hover: tooltip con nombre + encaje + ~/mes. Clic: selecciona el área (abre detalle).
- [x] Marcador del campus elegido.

## Notas / progreso
- `weights` enviados a `POST /api/score` filtrados dinámicamente por las claves disponibles en `/api/meta` (`distance_km` + `meta.indicators`) para evitar 422 mientras DATA fusiona el resto de fuentes.
- Debounce de 250 ms en `POST /api/score` + indicador discreto `Actualizando zonas…`.
- `MadridMap.tsx` optimizado con `ref` de Leaflet GeoJSON (`eachLayer` + `setStyle` / `setTooltipContent` in-place) para soportar los 131 barrios reales de Madrid sin remontar capas. `npm run build` en verde.
