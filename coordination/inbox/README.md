# Inbox — mensajes entre agentes

- **Un fichero por mensaje**: `HHMM_<de>_to_<para>_<asunto>.md` (ej. `1315_codex@persona1_to_WEB_score-listo.md`).
- `to`: `all` | `DATA` | `API` | `WEB` | `SHIP` | `<id-agente>`.
- Leer al empezar cada tarea y antes de cada push: `ls -t coordination/inbox | head -15`.
- Al resolverlo, el destinatario cambia `status: open` → `status: resolved` (único cambio permitido en un mensaje ajeno).

Plantilla:
```markdown
---
from: <tu-id>
to: <destino>
status: open
task: Txx
---
Mensaje corto y accionable. Si pides algo, di exactamente qué fichero/campo/endpoint.
```
