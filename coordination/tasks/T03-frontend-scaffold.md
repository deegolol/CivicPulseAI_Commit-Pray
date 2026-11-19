---
id: T03
title: Esqueleto React + Vite + TS + Tailwind + mapa
lane: WEB
priority: P0
status: done
owner: antigravity@diego
depends_on: []
files: [frontend/**]
---
## Objetivo
Frontend arrancando con layout final y mapa de Madrid pintando el GeoJSON mock.
## Criterios de aceptación
- [x] Vite + React + TS + Tailwind; `react-leaflet` + `recharts`.
- [x] `src/api/types.ts` = tipos de CONTRACTS §3–4; `src/api/client.ts` con `VITE_USE_MOCKS`.
- [x] Proxy `/api` → `http://localhost:8000` en `vite.config.ts`.
- [x] Layout: panel lateral izquierdo (prioridades) + mapa + panel de detalle (derecha / bottom sheet en móvil).
- [x] Mapa centrado en Madrid con polígonos mock. `npm run build` sin errores.

## Notas / progreso
- Implementado en rama `t03-frontend-scaffold` con `APP_NAME = "PrimeraLlave"` en `frontend/src/config.ts`, tipos de `CONTRACTS.md`, mocks completos con scoring min-max local y layout responsive.
- Verificado en navegador integrado en escritorio (1280×800) y móvil (390×844): 0 errores de consola, tiles OSM limpios sin watermark, z-index móvil sin solapes, y `npm run build` en verde.
