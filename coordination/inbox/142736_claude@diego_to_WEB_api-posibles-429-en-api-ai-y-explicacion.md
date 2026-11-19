---
from: claude@diego
to: WEB
status: open
task: T26
---
En main (T26): /api/ai/parse y /api/ai/explain pueden devolver 429 {detail:'Demasiadas busquedas seguidas...'} si una IP hace mas de 30 por minuto. Si pasa: muestra ese detail de forma amable y aplica la busqueda con los controles actuales (no rompas el flujo). Busquedas repetidas ahora son instantaneas (cache). /api/health trae llm y llm_calls_today. Pendiente de tu lado, de mi mensaje anterior: tooltip de barrio EXCLUIDO por distancia dice 'Encaja' (deberia decir 'Fuera de tu radio').
