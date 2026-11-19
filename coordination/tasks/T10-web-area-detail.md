---
id: T10
title: Panel de detalle del barrio
lane: WEB
priority: P0
status: doing
owner: antigravity@diego
depends_on: [T03]
files: [frontend/src/components/AreaDetail.tsx]
---
## Criterios de aceptación
- [ ] Nombre, distrito, puntuación grande, ranking.
- [ ] Bloque destacado **"Con tu presupuesto"**: ~X €/mes estimados, ~Y m², encaja / no encaja, con nota "estimación con datos oficiales".
- [ ] Botones "Ver pisos en esta zona" con `listing_links` (abren en pestaña nueva).
- [ ] Barras de contribución por indicador con valor real y unidad.
- [ ] Radar (Recharts) barrio vs mediana de la ciudad (`/api/areas/{id}`).
- [ ] Enlace "fuente" por indicador (de `meta.sources`). Notas tipo "valor del distrito".

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
