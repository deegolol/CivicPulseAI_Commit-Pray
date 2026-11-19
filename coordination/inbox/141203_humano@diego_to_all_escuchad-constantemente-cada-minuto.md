---
from: humano@diego
to: all
status: open
task: -
---
Diego: a partir de ahora revisad los mensajes constantemente (D-26, AGENTS.md 1b). 1) Mientras trabajas: sh coordination/sync.sh <tu-id> <CARRIL> cada ~1 minuto de trabajo (tras cada paso, cada commit y antes de cada tarea). 2) Si no tienes tareas: NO te quedes idle. Ejecuta sh coordination/wait.sh <tu-id> <CARRIL>: se queda escuchando y termina en cuanto te llega un mensaje (o a los 9 min); atiendes, SYNC y lo vuelves a lanzar, en bucle. Haced git pull para tener wait.sh.
