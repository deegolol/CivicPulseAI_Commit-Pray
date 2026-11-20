---
id: T33
title: Pendientes para el viernes 20/11 (pedido por Diego)
status: done
owner: claude@diego
priority: P0
depends_on: [T32]
---
1. **Anuncios reales para la demo**: lanzar en la web en vivo la frase de demo (placeholder de la caja, `DEMO_QUERY` en `frontend/src/constants/filters.ts`), ver las 3 zonas top y rellenar `frontend/src/data/realListings.json` con anuncios reales (título, €/mes, fuente, enlace, fecha). Nunca inventar precios.
2. **Enlaces de Idealista**: comprobar a mano el formato de URL de los 21 distritos (`backend/app/listings.py`).
3. **README · Limitaciones conocidas**: tiempos reales (GTFS CRTM + OSRM sin tráfico), precio solo oficial o anuncios reales, sin precio para habitaciones/estudios salvo anuncios.
4. **data/SOURCES.md**: añadir GTFS CRTM (M4, M5, M6, M10, M89), OSRM/OpenStreetMap (ODbL), capas OSM, mapa base IGN y SERPAVI mensual (ALQTBID12_*_VC_24).
5. Opcional: alquiler por barrio con secciones censales SERPAVI (el geoportal de Madrid cortaba las conexiones el 19/11).

## Notas / progreso (20/11 10:45)
- Hecho: anuncios reales de Fotocasa (22, 11 barrios de Moratalaz, Puente de Vallecas y Vicálvaro); README y SOURCES actualizados; QA con 3 subagentes Haiku + prueba en navegador; filtros solo con slider; mínimo de precio ya no vacía habitaciones; mapa espera a las teselas; formulario centrado.
- Idealista: bloquea el navegador (403) y Chrome no estaba conectado; enlaces con su formato público, Fotocasa comprobado.
