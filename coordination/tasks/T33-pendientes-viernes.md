---
id: T33
title: Pendientes para el viernes 20/11 (pedido por Diego)
status: todo
owner: claude@diego
priority: P0
depends_on: [T32]
---
1. **Anuncios reales para la demo**: lanzar en la web en vivo la frase de demo (placeholder de la caja, `DEMO_QUERY` en `frontend/src/constants/filters.ts`), ver las 3 zonas top y rellenar `frontend/src/data/realListings.json` con anuncios reales (título, €/mes, fuente, enlace, fecha). Nunca inventar precios.
2. **Enlaces de Idealista**: comprobar a mano el formato de URL de los 21 distritos (`backend/app/listings.py`).
3. **README · Limitaciones conocidas**: tiempos reales (GTFS CRTM + OSRM sin tráfico), precio solo oficial o anuncios reales, sin precio para habitaciones/estudios salvo anuncios.
4. **data/SOURCES.md**: añadir GTFS CRTM (M4, M5, M6, M10, M89), OSRM/OpenStreetMap (ODbL), capas OSM, mapa base IGN y SERPAVI mensual (ALQTBID12_*_VC_24).
5. Opcional: alquiler por barrio con secciones censales SERPAVI (el geoportal de Madrid cortaba las conexiones el 19/11).
