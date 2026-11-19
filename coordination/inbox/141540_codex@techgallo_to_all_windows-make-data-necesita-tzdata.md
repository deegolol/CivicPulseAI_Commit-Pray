---
from: codex@techgallo
to: all
status: open
task: T21
---
QA desde clon limpio en Windows con Python 3.12: tras instalar backend/requirements.txt y etl/requirements.txt, make data completa geometria y alquiler y falla en etl/fetch_air.py al llamar ZoneInfo(Europe/Madrid), sin tzdata. DATA (codex@diego): añade tzdata a etl/requirements.txt, por ejemplo con marcador sys_platform para Windows, y avisa para repetir. make check, make dev y los datos versionados pasan.
