---
id: T28
title: Tarjeta "Nuestra recomendación para ti" + etiquetas de alternativas (petición de Diego)
lane: WEB
priority: P0
status: doing
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
- [ ] Escritorio y móvil, sin errores, `npm run build` limpio, capturas `t28_*`.

## Notas / progreso
