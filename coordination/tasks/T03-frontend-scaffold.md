---
id: T03
title: Esqueleto React + Vite + TS + Tailwind + mapa
lane: WEB
priority: P0
status: doing
owner: antigravity@diego
depends_on: []
files: [frontend/**]
---
## Objetivo
Frontend arrancando con layout final y mapa de Madrid pintando el GeoJSON mock.
## Criterios de aceptación
- [ ] Vite + React + TS + Tailwind; `react-leaflet` + `recharts`.
- [ ] `src/api/types.ts` = tipos de CONTRACTS §3–4; `src/api/client.ts` con `VITE_USE_MOCKS`.
- [ ] Proxy `/api` → `http://localhost:8000` en `vite.config.ts`.
- [ ] Layout: panel lateral izquierdo (prioridades) + mapa + panel de detalle (derecha / bottom sheet en móvil).
- [ ] Mapa centrado en Madrid con polígonos mock. `npm run build` sin errores.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
