---
id: T22
title: Presupuesto → enlaces a anuncios filtrados (listings.py)
lane: API
priority: P0
status: doing
owner: claude@diego
depends_on: [T08]
files: [backend/app/listings.py, backend/tests/test_listings.py]
---
## Objetivo
El estudiante quiere **pisos**, no solo barrios. Para cada área generamos URLs de búsqueda ya filtradas (zona + precio máximo + tipo) en portales de anuncios (Idealista, Fotocasa, Badi…). **Solo enlaces: nada de scraping ni de llamadas a esos portales.**
## Criterios de aceptación
- [ ] `build_listing_links(area, budget, housing_type) -> [{label, url}]` según CONTRACTS §4.6.
- [ ] Formato de URL de cada portal comprobado a mano en el navegador (anotar ejemplos reales en el docstring).
- [ ] Slugs de barrio/distrito normalizados (tildes, ñ, espacios); si el barrio no existe en el portal → distrito → Madrid.
- [ ] Tests de slugs y de que siempre devuelve al menos un enlace válido.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
