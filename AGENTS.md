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
6. Mensajes abiertos para ti, tu carril o `all`: `sh coordination/sync.sh <tu-id> <TU_CARRIL>`
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

## 1b. Los humanos mandan: comandos y revisión por tandas

Los 3 humanos (Diego, Adrián, TechGallo) revisan todo. **Un agente nunca integra trabajo en `main` sin el OK de su humano.**

**Comandos que puede escribirte tu humano:**

| Comando | Qué haces |
|---|---|
| `GO` | Empiezas (o continúas) con tu siguiente tarea. |
| `SYNC` | `sh coordination/sync.sh <tu-id> <TU_CARRIL>` → respondes los mensajes que te toquen → le resumes en 3 líneas: qué hiciste, qué haces, qué necesitas y de quién. |
| `PAUSA` | Terminas el paso en curso, haces commit en tu rama (sin tocar main) y te paras. Le dices dónde lo has dejado. |
| `REVISIÓN` | Le enseñas tu tanda (formato abajo) aunque no hayas terminado. |
| `OK` | Integras la tanda en `main` (rebase + checks + push), marcas la tarea `done`, borras la rama remota y sigues con la siguiente. |
| `CAMBIOS: …` | Aplicas exactamente esos cambios en la misma rama y vuelves a pedir REVISIÓN. |
| `PARA` | Dejas de hacer lo que estés haciendo **ya** y esperas instrucciones. |

**Tanda = una tarea.** Flujo:
1. Trabajas en tu rama `txx-descripcion` y haces push **de la rama** (`git push -u origin txx-descripcion`), no de main.
2. Al acabar: tarea en `status: review` (este cambio de estado sí va directo a main) y le das a tu humano el **informe de tanda**:
   ```
   TANDA Txx — <título>
   Hecho: 3–5 viñetas
   Cómo probarlo: comando o URL concreta
   Decisiones que he tomado y por qué
   Dudas / riesgos
   Diff: https://github.com/deegolol/CivicPulseAI_Commit-Pray/compare/main...txx-descripcion
   ```
3. Esperas `OK` o `CAMBIOS`. Mientras esperas puedes **empezar la siguiente tarea en otra rama** (máximo 1 en `review` + 1 en `doing`).
4. Los cambios **solo de coordinación** (reclamar tarea, tu ficha, tu log, mensajes del inbox) van directos a main sin esperar OK.

**Feedback de humanos a otros carriles:** cualquier humano puede pedir cambios a cualquier carril con un mensaje `from: humano@<nombre>` en el inbox (se lo puede pedir a su propia IA: "apunta en el inbox para WEB: …"). **Los mensajes de humanos tienen prioridad máxima**: en tu siguiente SYNC los atiendes antes que nada. Si contradicen el plan, haz lo que diga el humano y anótalo en `DECISIONS.md`.

**Puntos de control de equipo** (las 3 personas revisan juntas la app integrada; todos los agentes en PAUSA, con todo commiteado):
- **14:30** — MVP de punta a punta con datos reales.
- **15:15** — antes de cambiar de aula (todo pusheado).
- **16:45** — feature freeze.
- **Viernes 11:30** — revisión final antes de la entrega.
Tras cada punto de control, los humanos anotan en `DECISIONS.md` qué cambia y dan `GO` otra vez.

**Si necesitas algo de otro agente:** `sh coordination/msg.sh <tu-id> <destino> <Txx> "<asunto>" "<texto>"` y **pide a tu humano que avise al humano de ese agente** ("dile a Adrián que su IA haga SYNC"). Mientras esperas, sigue con mocks u otra tarea; no te quedes parado.

**Al terminar una tarea o antes de empezar otra, haz siempre SYNC tú mismo.**

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
`status: todo | doing | review | done | blocked`, `owner:`. (`review` = esperando el OK de un humano.)

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
- Máximo **1 tarea `doing` + 1 en `review`** por agente.
- Elige por prioridad (`P0` > `P1` > `P2`) y solo si sus `depends_on` están `done` (o puedes avanzar con mocks).
- Al terminar: rellena "Notas / progreso", `status: review`, informe de tanda a tu humano (§1b). Solo con su `OK` pasa a `done`.
- Si te bloqueas > 15 min: `status: blocked`, explica por qué en la tarea y manda mensaje.

## 4. Git — cómo trabajar sin pisarnos

- **Cada agente trabaja en SU PROPIA copia del repo** (clon o `git worktree`). Nunca dos agentes en la misma carpeta.
- Rama por tarea: `git switch -c txx-descripcion-corta` y push **de la rama** para que tu humano la revise (§1b).
- Para integrar en `main` **solo tras el OK de tu humano** (historial lineal):
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
- El humano responsable revisa la rama (enlace `compare`) y da `OK` antes de que llegue a `main`.

## 5. Comunicación entre agentes

**Mensajes** → usa `sh coordination/msg.sh <de> <para> <Txx|-> "<asunto>" "<texto>"` (crea el fichero, hace commit y push con reintento). Formato resultante (nunca edites mensajes ajenos salvo para marcar `status: resolved`):
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
- [ ] Log actualizado.
- [ ] **OK de tu humano** y commit integrado en `main`.

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
