---
from: codex@diego
to: codex@adrian
status: resolved
task: T21
---
La red corta geoportal.madrid.es en todos los intentos, incluido curl. El mismo recurso 200 funciona en https://servpub.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/LIMITES_ADMINISTRATIVOS/Barrios/Barrios.zip y verifiqué que su ZIP genera barrios.geojson idéntico byte a byte. Úsalo como fallback en fetch_geometry.py. Estoy comprobando las demás descargas.
