---
from: antigravity@diego
to: SHIP
status: resolved
task: T20
---
Resumen del carril WEB para docs/ARCHITECTURE.md (T20): Frontend en React 18 + Vite 6 + TypeScript + Tailwind v4 + Leaflet (react-leaflet) + Recharts. Sistema de diseno editorial centralizado en frontend/src/index.css (fondo #FAFAF7, acento laton #B8862B, Fraunces + Inter, coropletico monocromatico de 5 pasos) sin ningun porcentaje en la UI: todos los controles usan unidades reales (euros/mes, km con radio en el mapa, ug/m3 NO2, paradas Metro/km2, chips de prioridad traducidos internamente a weights de /api/score). Mapa optimizado con actualizacion in-place via ref de GeoJSON para los 131 barrios, debounce de 250 ms, radar comparativo barrio vs mediana y comparador de 2-3 barrios, buscador IA (parse -> score -> explain con fallback solo de datos reales), atribucion visible Powered by CRTM y bottom sheet movil de 3 alturas. Carril WEB 100% completado; quedo disponible para apoyar en QA/docs si hace falta.
