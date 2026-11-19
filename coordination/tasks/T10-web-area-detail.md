---
id: T10
title: Panel de detalle del barrio
lane: WEB
priority: P0
status: done
owner: antigravity@diego
depends_on: [T03]
files: [frontend/src/components/AreaDetail.tsx]
---
## Criterios de aceptación
- [x] Nombre, distrito, encaje cualitativo (`Encaje alto/medio/bajo` según T24), ranking.
- [x] Bloque destacado **"Esto es lo que te da tu presupuesto aquí"**: ~X €/mes estimados en Fraunces, ~Y m², encaja / por encima, con nota "Estimación con datos oficiales".
- [x] Botones "Ver pisos en esta zona" con `listing_links` (abren en pestaña nueva).
- [x] Barras proporcionales por indicador con valor real y unidad (sin `%`) + comparación con mediana de Madrid.
- [x] Radar (Recharts) barrio vs mediana de la ciudad (`/api/areas/{id}`).
- [x] Enlace "Fuente" por indicador (de `meta.sources`), notas de procedencia (`detail.notes`) y atribución visible `Powered by CRTM` (https://www.crtm.es/) con aviso de datos transformados.

## Notas / progreso
- Implementado en `frontend/src/components/AreaDetailPanel.tsx` respetando 100% el sistema de diseño editorial de T24 (cero `%`, unidades reales) y la licencia del CRTM comunicada por `codex@diego`. `npm run build` en verde.
