# AGENTS.md — Reglas para TODOS los agentes de IA de este repo

> Este fichero es la **fuente única de verdad** para cualquier agente (Claude Code, Codex, Gemini/Antigravity, Copilot, Cursor…).
> `CLAUDE.md` y `GEMINI.md` solo redirigen aquí. Si algo contradice este fichero, **gana este fichero**.

Equipo: **Commit & Pray** · Hackathon **CivicPulse AI** (2C1C · DA-ETSISI · DA-ETSIINF · Orange)
Entrega: **viernes 20/11, 12:00** (repo final). Presentación: 5 min, demo en vivo.

---

## 0. Orden de lectura obligatorio (al empezar cada sesión)

1. `AGENTS.md` (este fichero)
2. `coordination/BRIEF.md` — reglas del hackathon y rúbrica (qué puntúa)
3. `coordination/PLAN.md` — qué construimos, por qué, y en qué orden
4. `coordination/CONTRACTS.md` — **contratos de datos y API** (no se rompen sin acuerdo)
5. `sh coordination/board.sh` — agentes registrados y estado de las tareas
6. Mensajes recientes en `coordination/inbox/` dirigidos a ti, a tu carril o a `all`
7. `coordination/DECISIONS.md` — decisiones ya tomadas (no las reabras sin motivo)

---

## 1. Identidad y arranque (handshake)

Cada agente se identifica como `<herramienta>@<persona>`, p. ej. `claude@diego`, `codex@diego`, `antigravity@diego`.
Usa siempre el mismo ID en tareas, commits, logs y mensajes.

**Reparto inicial** (D-08 en `DECISIONS.md`):

| Agente | Carril | Primeras tareas |
|---|---|---|
| `claude@diego` | API | T02 → T08 → T22 → T11 |
| `antigravity@diego` | WEB | T03 → T09 → T10 → T12 → T13 → T14 |
| `codex@diego` | DATA (aire, transporte, servicios) | T06 → T07 → T23 |
| `<herramienta>@adrian` (IA de Adrián, GitHub `adrisacb`) | DATA principal (datasets que Adrián ya tiene, scout, geometría, alquiler, merge) | T01 → T04 → T05 |
| `<herramienta>@techgallo` (IA del amigo con GitHub `TechGallo`) | SHIP (integración, Dockerfile/deploy, docs, pitch) | T00 → T15 → T16 → T17… |

Repo: **https://github.com/deegolol/CivicPulseAI_Commit-Pray** · Demo: **https://primerallave.up.railway.app** (Railway redespliega solo en cada push a `main`).

**Protocolo de arranque (todos igual):**
1. Lee los documentos del §0.
2. Crea tu ficha `coordination/agents/<tu-id>.md` (plantilla en `coordination/agents/README.md`) con `status: ready`.
3. `git pull --rebase origin main && git add coordination/agents/<tu-id>.md && git commit -m "chore(agents): register <tu-id>" && git push origin HEAD:main`
4. Responde a tu humano: **"LISTO: <tu-id>, carril <X>, empezaré por <Txx> así: …"** y **espera**.
5. Cuando tu humano escriba **GO**: `sh coordination/board.sh` (verás el roster de agentes), lee el inbox, reclama tu tarea y empieza.
   Pon `status: working` en tu ficha. Al acabar la sesión o si te quedas sin trabajo: `status: idle` y pregunta qué hacer.

**Comando SYNC (los agentes no se "despiertan" solos: os sincronizáis por el repo):**
Cada vez que tu humano escriba **SYNC**, y SIEMPRE al terminar una tarea o antes de empezar otra:
1. `git pull --rebase origin main`
2. `sh coordination/board.sh` + lee los mensajes del inbox con `status: open` para ti, tu carril o `all` (`grep -l "status: open" coordination/inbox/*.md`).
3. Responde cada mensaje que te toque (mensaje nuevo en el inbox) y marca el original `status: resolved`.
4. Dile a tu humano en 3 líneas: qué has hecho, qué haces ahora, y si necesitas algo de otro agente (dile a quién avisar).

**Si necesitas algo de otro agente:** deja el mensaje en el inbox, haz push y **pide a tu humano que avise al humano de ese agente** ("dile a Adrián que su IA haga SYNC"). Mientras esperas, sigue con mocks u otra tarea; no te quedes parado.

## 2. Carriles (ownership de carpetas)

Dos agentes pueden compartir carril (p. ej. DATA): entonces cada uno toca **solo** los `files:` de sus tareas.

| Carril | Carpeta(s) que posee | Responsabilidad |
|---|---|---|
| `DATA` | `etl/`, `data/` | Descargar, limpiar, cruzar datasets → `data/processed/*` |
| `API`  | `backend/` | FastAPI, motor de scoring, capa LLM, tests |
| `WEB`  | `frontend/` | React, mapa, gráficos, UX, responsive |
| `SHIP` | raíz, `docs/`, `.github/`, `Dockerfile`, `Makefile` | Integración, deploy, README, AI_USAGE, pitch, QA |

- **Solo editas ficheros de tu carril** o los listados en `files:` de tu tarea.
- ¿Necesitas un cambio en otro carril? → Mensaje en `coordination/inbox/` (o tarea nueva). No lo hagas tú.
- `coordination/CONTRACTS.md` solo se cambia con un mensaje a `all` + entrada en `DECISIONS.md`.

## 3. Ciclo de vida de una tarea

Las tareas son ficheros `coordination/tasks/Txx-*.md` con frontmatter:
`status: todo | doing | review | done | blocked`, `owner:`.

**Reclamar (claim):**
```bash
git pull --rebase origin main
# edita la tarea: status: doing, owner: <tu-id>
git add coordination/tasks/Txx-*.md
git commit -m "chore(tasks): claim Txx [<tu-id>]"
git push origin HEAD:main
```
Si el push falla por conflicto en ese fichero → **otro agente la reclamó antes**: descarta tu cambio y elige otra.

**Reglas:**
- Máximo **1 tarea `doing`** por agente.
- Elige por prioridad (`P0` > `P1` > `P2`) y solo si sus `depends_on` están `done` (o puedes avanzar con mocks).
- Al terminar: rellena "Notas / progreso" en la tarea, `status: done`, y commit.
- Si te bloqueas > 15 min: `status: blocked`, explica por qué en la tarea y manda mensaje.

## 4. Git — cómo trabajar sin pisarnos

- **Cada agente trabaja en SU PROPIA copia del repo** (clon o `git worktree`). Nunca dos agentes en la misma carpeta.
- Rama local por tarea: `git switch -c txx-descripcion-corta`.
- Para integrar en `main` (historial lineal):
  ```bash
  git fetch origin
  git rebase origin/main
  make check            # o los checks de tu carril (ver CONTRACTS.md §6)
  git push origin HEAD:main
  ```
- Commits **pequeños y frecuentes** (cada 20–40 min como máximo). Push a `main` solo si compila/pasa tests.
- Formato de commit (Conventional Commits + tarea + autor):
  `feat(api): endpoint POST /api/score con pesos (T08) [codex@persona1]`
  Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `data`, `style`, `ci`.
- **PROHIBIDO:** `git push --force`, reescribir historial de `main`, `git reset --hard` sobre trabajo ajeno, borrar ficheros de otros carriles o de `coordination/`.
- El humano responsable revisa el diff antes del push a `main`.

## 5. Comunicación entre agentes

**Mensajes** → un fichero nuevo por mensaje en `coordination/inbox/` (nunca edites mensajes ajenos salvo para marcar `status: resolved`):
```
coordination/inbox/HHMM_<de>_to_<para>_<asunto>.md
```
Contenido:
```markdown
---
from: codex@persona1
to: WEB            # all | DATA | API | WEB | SHIP | <id-agente>
status: open       # open | resolved
task: T09
---
El endpoint /api/score ya devuelve `breakdown`. Ejemplo en CONTRACTS.md §4.3.
```

**Log de trabajo** → append-only en `coordination/log/<tu-id>.md` (un fichero por agente = cero conflictos):
```markdown
## 13:05 · T08 · done
- Qué: motor de scoring min-max + 6 tests.
- IA: Codex generó el 80% del código; humano revisó normalización.
- Siguiente: T11
```
Este log alimenta `AI_USAGE.md` al final: **apunta qué hizo la IA y qué revisó el humano**.

**Decisiones** → append en `coordination/DECISIONS.md` (`D-xx · hora · quién · decisión · motivo`).

## 6. Definition of Done (DoD)

Una tarea está `done` solo si:
- [ ] Cumple los criterios de aceptación de su fichero.
- [ ] Respeta `CONTRACTS.md` (mismos nombres de campos, rutas y tipos).
- [ ] Pasa los checks del carril (tests backend / build frontend / script ETL ejecuta de cero).
- [ ] Sin secretos en el código (las claves van en `.env`, nunca en git).
- [ ] Código legible: nombres claros, funciones cortas, un comentario arriba de cada módulo explicando qué hace.
- [ ] Log actualizado y commit pusheado a `main`.

## 7. Reglas de calidad (los jueces preguntan sobre el código)

- **Simple > ingenioso.** Cualquier humano del equipo debe poder explicar el código en 30 s.
- No añadas dependencias pesadas sin anotarlo en `DECISIONS.md`.
- No inventes datos. Todo número mostrado debe venir de un dataset oficial listado en `data/SOURCES.md`.
- El LLM **nunca** genera datos: solo traduce intención del usuario → parámetros, y explica números reales.
- Todo lo que dependa de red (APIs, LLM) tiene **fallback** que funciona offline (la demo no puede caerse).
- Datos crudos > 5 MB no se suben (`data/raw/` está en `.gitignore`); el script de ETL los descarga.
- Idioma de la UI: español. Código y nombres de variables: inglés. Docs: español.

## 8. Lo que NO debes hacer

- No cambies el stack, la idea ni los contratos por tu cuenta.
- No toques tareas con `owner` distinto al tuyo.
- No "arregles" código de otro carril aunque veas un bug: avisa por inbox.
- No hagas refactors masivos ni reformatees ficheros que no son tuyos.
- No borres ni reescribas `coordination/` (solo añades / actualizas tu tarea).
- No subas `.env`, claves API, `node_modules/`, `.venv/`, ni ficheros enormes.
- No inicies sesión en servicios externos (Railway, Google, etc.) ni manejes claves: eso lo hacen los humanos (`coordination/ACCOUNTS.md`).
