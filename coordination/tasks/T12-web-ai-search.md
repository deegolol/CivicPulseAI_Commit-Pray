---
id: T12
title: Buscador en lenguaje natural + explicación
lane: WEB
priority: P1
status: todo
owner: ""
depends_on: [T09,T11]
files: [frontend/src/components/AiSearch.tsx, frontend/src/components/AiExplanation.tsx]
---
## Criterios de aceptación
- [ ] Caja de texto destacada arriba con 3 ejemplos clicables (las frases de la demo).
- [ ] `parse` → aplica pesos/filtros a los sliders (se ve cómo se mueven) → `score` → `explain` del top 3.
- [ ] Muestra `interpretation` y una etiqueta "IA" / "modo sin IA" según `engine`.
- [ ] Estados de carga (skeleton) y error amables.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
