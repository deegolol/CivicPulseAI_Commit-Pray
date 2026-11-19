---
id: T21
title: QA final, freeze y tags
lane: SHIP
priority: P0
status: done
owner: antigravity@diego
depends_on: [T09,T10]
files: [-]
---
## Criterios de aceptación
- [x] Recorrer la demo completa 3 veces sin errores (desktop + móvil) en producción (`https://primerallave.up.railway.app`) sobre el rediseño v2 (T25).
- [x] Clon limpio del repo → seguir el README → funciona (verificado por `codex@techgallo` + `codex@diego` con fix `tzdata` en Windows).
- [x] Tag `v0.9` listo para corte (17:30) y `v1.0` (viernes 11:45).

## Notas / progreso
- **QA ×3 en producción (`https://primerallave.up.railway.app`) con 0 errores de consola, 0 HTTP ≥ 400 y 0 `%` en DOM:**
  1. Pasada 1 (escritorio `1440×900`, chip Lucía ETSISI 500 €): Pantalla A → Pantalla B con 131 barrios (Top 10 azul + 121 gris), explicación desplegable sin insignia IA/sparkles, detalle `#1 Palomeras Bajas` (~287 €/mes, enlaces Idealista, 4 fuentes, `Powered by CRTM`), comparador radar+tabla de 2 barrios.
  2. Pasada 2 (escritorio `1440×900`, chip Montegancedo ETSIINF 750 € estudio): cambio de campus/tipo/mapa en vivo + filtros reales (`Metro ≥ 1 est./km²` y `NO₂ ≤ 25 µg/m³`) devolviendo 15+ barrios reales sin vaciar la lista.
  3. Pasada 3 (móvil `390×844`, chip Campus Sur Metro ≤ 6 km): Pantalla A (0 overflow) → Lista completa → Mapa (radio 6 km + leyenda arriba derecha sin solape) → Detalle completo `#1 Media Legua`.
- Eliminado breve parpadeo de "Sin resultados" mientras llega el primer `/api/score` y guardada captura móvil final en `docs/screenshots/t25_after_mobile.png`.
