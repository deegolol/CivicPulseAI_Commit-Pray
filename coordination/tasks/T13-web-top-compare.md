---
id: T13
title: Top 3 en tarjetas + comparador
lane: WEB
priority: P1
status: done
owner: antigravity@diego
depends_on: [T09,T10]
files: [frontend/src/components/TopCards.tsx, frontend/src/components/Compare.tsx]
---
## Criterios de aceptación
- [x] Tarjetas del top 3 (encaje cualitativo, alquiler estimado en Fraunces, distancia en km, 1 punto fuerte) que al clic centran el mapa (`flyTo`) y abren detalle.
- [x] Comparar 2–3 barrios: radar superpuesto (Recharts) + tabla de valores en unidades reales con el mejor valor destacado y enlaces directos a pisos.

## Notas / progreso
- Implementado en `frontend/src/components/TopZonesRail.tsx` y `frontend/src/components/CompareModal.tsx`, con selección de 2–3 barrios tanto desde las tarjetas Top 3 como desde el panel de detalle (`AreaDetailPanel.tsx`). `npm run build` en verde.
