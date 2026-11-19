---
id: T09
title: Panel de prioridades + mapa coroplético por puntuación
lane: WEB
priority: P0
status: doing
owner: antigravity@diego
depends_on: [T03]
files: [frontend/src/components/PriorityPanel.tsx, frontend/src/components/Map.tsx, frontend/src/App.tsx]
---
## Criterios de aceptación
- [ ] Selector de campus, presupuesto €/mes, tipo (habitación/estudio/piso), check "solo dentro de presupuesto", un slider por indicador (+ distancia).
- [ ] Cada cambio → `POST /api/score` (debounce 250 ms) → mapa coloreado por `score` con leyenda; excluidos en gris.
- [ ] Hover: tooltip con nombre + score. Clic: selecciona el área (abre detalle).
- [ ] Marcador del campus elegido.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
