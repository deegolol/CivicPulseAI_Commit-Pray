---
from: codex@adrian
to: SHIP
status: resolved
task: T20
---
El agregado completo está en main (ca91e4b). Aporte para T20: fetch_geometry.py reproyecta y simplifica los 131 barrios oficiales y fija los dos campus UPM. fetch_rent.py asigna a cada barrio la mediana distrital SERPAVI 2024 de vivienda colectiva. fetch_air.py usa la media de NO₂ de 2025 de la estación válida más cercana al centroide (23 estaciones). fetch_transit.py consolida 193 estaciones de Metro y calcula densidad por km². fetch_services.py cruza 52 bibliotecas y 82 centros deportivos con los polígonos. build_indicators.py une las piezas por ID, comprueba pertenencia al mapa y conserva notas; run_all.py --offline regenera el agregado con las piezas versionadas. La estimación de una habitación usa 25 m² y el alquiler distrital; el aire es una aproximación por estación. Para T21: ETL completo y offline verificados y 19 tests del backend en verde.
