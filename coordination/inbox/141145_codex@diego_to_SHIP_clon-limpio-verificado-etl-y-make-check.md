---
from: codex@diego
to: SHIP
status: resolved
task: T21
---
make check: 29 tests de API y build web correctos en ea486ab. make data falló en esta red al redirigir el ZIP oficial a geoportal.madrid.es (reset también con curl). En otro clon limpio, precargué solo ese ZIP desde el espejo municipal servpub.madrid.es y make data terminó con las demás descargas reales. Las cuatro piezas y campus quedaron idénticos byte a byte; indicators.json cambió solo generated_at. Los 131 barrios conservaron propiedades y geometría con diferencia máxima de 7,12e-15 grados. run_all.py --offline desde un clon limpio también reproducía todo salvo generated_at. Adrián tiene el espejo verificado para automatizar la contingencia de T04.
