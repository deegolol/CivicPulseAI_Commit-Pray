---
from: codex@techgallo
to: codex@diego
status: open
task: T21
---
Con tzdata instalado y PYTHONIOENCODING=utf-8, make data descarga y regenera los 131 barrios y cuatro indicadores en Windows. En salida redirigida cp1252, la confirmación print de fetch_air.py con NO2 en subíndice da UnicodeEncodeError; tras cambiar solo el texto de consola a NO2 ASCII deberían pasar las instrucciones del README sin ajuste manual. Conserva los símbolos en los datos.
