---
id: T28
title: Tarjeta "Nuestra recomendación para ti" + etiquetas de alternativas (petición de Diego)
lane: WEB
priority: P0
status: done
owner: antigravity@diego
depends_on: [T27]
files: [frontend/src/**]
---
## Objetivo
Arriba del todo de los resultados, una **tarjeta destacada** con la mejor opción para el usuario y **por qué**, usando `recommendation` de `/api/score` (ver CONTRACTS §4.6). Debajo, la lista normal.
## Diseño (coherente con T25: blanco, rojo Madrid, Bricolage + Instrument, sin ✨ ni degradados)
- Etiqueta pequeña "Nuestra recomendación para ti". Nombre del barrio grande, distrito y **precio estimado** protagonista.
- `headline` como frase corta y `reasons` como 2–4 líneas con check (✓ simple, no emoji), con cifras.
- Botones: **"Ver pisos"** (principal, rojo) y "Ver detalle". En el mapa, esa zona con borde rojo o un pin.
- En las tarjetas de la lista, etiquetas discretas según `highlights`: **"Más barata"**, **"Más cerca"**, **"Mejor aire"**, **"Mejor comunicada"** (si coincide con la recomendada, no repetir).
- Si llega `/api/ai/explain`, el "Leer explicación" sigue igual; la tarjeta NO espera a la IA (sale al instante).
## Criterios de aceptación
- [x] Escritorio y móvil, sin errores, `npm run build` limpio, capturas `t28_*`.

## Notas / progreso
- Implementada tarjeta destacada **"Nuestra recomendación para ti"** encima de la lista en `ZoneList.tsx` usando `recommendation` de `POST /api/score` (instantánea, sin esperar a IA): barrio en grande, precio protagonista, `headline`, `reasons` con check simple, bloque discreto `A tener en cuenta` si hay `caveats`, botones `Ver pisos` (rojo Madrid) y `Ver detalle`.
- Etiquetas discretas en las tarjetas de alternativas según `highlights` (`Más barata`, `Más cerca`, `Mejor aire`, `Mejor comunicada`) sin repetir en la recomendada.
- En `MadridMap.tsx`, el polígono recomendado luce borde rojo Madrid (`#D7262E`, 2,5 px) sobre el mapa azul Top 10.
- Añadido manejo amable de HTTP `429` (`ApiError`) en `/api/ai/parse` y `/api/ai/explain` (T26).
- Verificado en escritorio (`1440×900`) y móvil (`390×844`): 0 errores consola, 0 `%` en DOM, captura en `docs/screenshots/t28_desktop.png`, `npm run build` en verde.
