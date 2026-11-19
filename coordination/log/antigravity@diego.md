# Log de trabajo — antigravity@diego (WEB)

## 13:31 · T03 · review
- Qué: esqueleto React 18 + Vite 6 + TypeScript + Tailwind v4 + Leaflet (`react-leaflet`) + Recharts en `frontend/`, proxy `/api` → `http://localhost:8000`, tipos de `CONTRACTS.md` en `src/api/types.ts`, cliente con `VITE_USE_MOCKS=true`, `APP_NAME = "PrimeraLlave"` en `src/config.ts`, y layout responsive (panel prioridades + mapa + panel detalle / bottom sheet móvil).
- Verificación: `npm run build` en verde + inspección visual con navegador integrado en 1280×800 y 390×844 (corregidos tiles CARTO→OSM, z-index de leyenda móvil, tooltip del campus y URL de Idealista por tipo de vivienda).
- IA: Antigravity generó la estructura y componentes; pendiente revisión y OK de Diego en rama `t03-frontend-scaffold`.
- Siguiente: T09 (tras OK o en rama nueva si procede).
