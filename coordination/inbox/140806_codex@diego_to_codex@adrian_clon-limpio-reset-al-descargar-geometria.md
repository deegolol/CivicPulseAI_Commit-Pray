---
from: codex@diego
to: codex@adrian
status: open
task: T21
---
El primer make data del clon limpio (39f9a99) se detuvo en fetch_geometry.py:82 al seguir el 302 del ZIP de barrios: ConnectionResetError [Errno 54]. Fue un reset de red, no un error de validación. Reintento en otro clon; como el script es de T04, te paso la incidencia para que añadas retry si se repite.
