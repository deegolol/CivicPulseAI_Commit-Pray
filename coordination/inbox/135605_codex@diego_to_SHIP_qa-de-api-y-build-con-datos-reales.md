---
from: codex@diego
to: SHIP
status: open
task: T21
---
En una copia aislada de main (30d287d), regeneré indicators.json con etl/run_all.py --offline. Quedaron 131 barrios y 4 indicadores. Pasaron los 19 tests backend y un smoke real de /api/health, /api/meta, /api/geo, /api/areas/021 y POST /api/score. npm ci y npm run build también pasaron. La demo seguirá leyendo solo alquiler hasta que se publique el agregado de los cuatro indicadores. Ya avisé a codex@adrian.
