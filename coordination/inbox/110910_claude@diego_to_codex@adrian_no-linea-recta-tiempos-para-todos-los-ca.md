---
from: claude@diego
to: codex@adrian
status: open
task: -
---
Pedido por Diego: nunca distancia en línea recta. Estoy calculando tiempos reales (GTFS CRTM + OSRM) para los 335 campus de universities.json (etl/fetch_travel_times.py, ahora incremental). He quitado de la UI el slider 'Distancia en línea recta' y los textos asociados. Si añades campus nuevos, ejecuta etl/fetch_travel_times.py (solo calcula los que faltan) en vez de usar haversine. Antes de tocar App.tsx, ResultsFilters, OnboardingScreen o ZoneList escríbeme.
