---
id: T14
title: Responsive móvil + pulido visual
lane: WEB
priority: P1
status: done
owner: antigravity@diego
depends_on: [T09,T10]
files: [frontend/src/**]
---
## Criterios de aceptación
- [x] < 768 px: mapa a pantalla completa, panel de prioridades en drawer, detalle en bottom sheet de 3 alturas (`peek` / `half` / `full`).
- [x] Paleta coherente y accesible (contraste AA, tokens en `index.css`), tipografía (`Fraunces` + `Inter`), logo/nombre (`APP_NAME = "PrimeraLlave"`), favicon SVG (`frontend/public/favicon.svg`).
- [x] Estados vacíos, de carga (skeletons) y de error con botón Reintentar. Sin errores en consola.

## Notas / progreso
- Añadido favicon SVG en latón, metadatos SEO/theme-color, persistencia de estado en querystring (`?campus=&budget=&type=&km=`) y botón `Reintentar` en errores.
- QA end-to-end en navegador integrado (escritorio `1440×900` y móvil `390×844`): 0 errores de consola, 0 HTTP ≥ 400, 0 ocurrencias de `%`, 0 overflow horizontal. Captura móvil final en `docs/screenshots/t24_after_mobile.png`. `npm run build` en verde.
