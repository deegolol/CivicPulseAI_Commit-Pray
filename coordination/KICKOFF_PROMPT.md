# Prompt de arranque para cada agente

Pegad esto como primer mensaje en cada agente (Claude Code, Codex, Antigravity…), cambiando `<ID>` y `<CARRIL>`:

```text
Eres <ID> (por ejemplo codex@persona1) y trabajas en el carril <CARRIL> (DATA | API | WEB | SHIP)
de un hackathon de 6 horas. Somos varias personas y varios agentes de IA en el mismo repositorio.

1. Lee AGENTS.md entero y sigue su "Orden de lectura obligatorio" (BRIEF, PLAN, CONTRACTS, tablero, inbox, DECISIONS).
2. Ejecuta `sh coordination/board.sh` y reclama la tarea de mayor prioridad de tu carril cuyas dependencias
   estén hechas (o que puedas avanzar con mocks), siguiendo el protocolo de claim de AGENTS.md §3.
3. Trabaja SOLO en los ficheros de tu carril / de tu tarea. Respeta CONTRACTS.md al pie de la letra.
4. Commits pequeños con el formato de AGENTS.md §4. Antes de cada push: git fetch + rebase + checks.
5. Al acabar cada tarea: actualiza la tarea, tu log en coordination/log/<ID>.md, y si afecta a otro carril
   deja un mensaje en coordination/inbox/. Luego reclama la siguiente.
6. Si algo del plan no te cuadra o te bloqueas, NO improvises cambios de arquitectura: pregúntame a mí
   (tu humano) y/o deja un mensaje en el inbox.

Antes de escribir código, dime en 5 líneas qué tarea vas a coger y cómo la vas a abordar.
```

## Reparto sugerido en este portátil (3 agentes)
- **Claude Code** → `SHIP` (T00, integración, T15, T17–T21) o `API` (T02, T08, T11).
- **Codex** → `API` o `DATA` (scripts y tests le van bien).
- **Gemini / Antigravity** → `WEB` (T03, T09, T10, T12–T14), puede usar su navegador para ver la UI.

Cada agente en **su propia carpeta** (clon o worktree), p. ej.:
```bash
git clone https://github.com/adrisacb/CivicPulseAI_Commit-Pray.git cp-claude
git clone https://github.com/adrisacb/CivicPulseAI_Commit-Pray.git cp-codex
git clone https://github.com/adrisacb/CivicPulseAI_Commit-Pray.git cp-gemini
```
