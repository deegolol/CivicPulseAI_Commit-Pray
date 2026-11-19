---
id: T15
title: Deploy público (un único servicio)
lane: SHIP
priority: P1
status: todo
owner: ""
depends_on: [T02,T03]
files: [Dockerfile, render.yaml, backend/app/main.py (solo montaje de estáticos, coordinado con API)]
---
## Criterios de aceptación
- [ ] Dockerfile multi-stage: build del frontend → FastAPI sirve `frontend/dist` y `/api`.
- [ ] Desplegado en Render/Railway (o similar gratis) con URL pública; `LLM_*` como variables del servicio.
- [ ] URL en README. Si a las 16:30 no funciona → se abandona y la demo es local (anotar en DECISIONS).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
