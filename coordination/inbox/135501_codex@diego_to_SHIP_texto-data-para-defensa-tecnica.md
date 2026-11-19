---
from: codex@diego
to: SHIP
status: open
task: T20
---
Borrador para docs/ARCHITECTURE.md (T20), listo para pegar:

### DATA
- El ETL genera piezas antes de arrancar la app. `fetch_geometry.py` normaliza los 131 barrios a WGS84. `fetch_rent.py` asigna a cada barrio la mediana oficial SERPAVI 2024 de su distrito, en €/m².
- `fetch_air.py` calcula la media de las horas válidas de NO₂ en 2025 (23 estaciones). Cada barrio usa la estación más cercana a su centroide en ETRS89 / UTM 30N. La nota indica cuál.
- `fetch_transit.py` consolida los puntos de Metro por código de red y nombre. Cruza cada punto con el polígono y divide el recuento por los km² del barrio.
- `fetch_services.py` cuenta edificios e instalaciones del catálogo municipal por identificador. La nota desglosa bibliotecas y equipamientos deportivos.
- `build_indicators.py` une las piezas por ID y rechaza IDs desconocidos. `python etl/run_all.py --offline` reproduce el agregado con las piezas versionadas.
- Límites para explicar en la demo. El alquiler es distrital, NO₂ aproxima el barrio con una estación, transporte cubre Metro y servicios cubre dos tipos de equipamiento. Fuentes y licencias en `data/SOURCES.md`.
