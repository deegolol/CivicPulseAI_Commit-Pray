# Arranque: qué abrir y qué mensaje pegar a cada IA

## Reglas de oro
- **Cada IA en SU propia carpeta (clon del repo).** Nunca abras la misma carpeta en dos IAs ni abras la carpeta padre `hackathon/`.
- Todas se comunican **a través del repo** (`coordination/`), no entre ventanas.
- Primero todas se **registran y esperan**; cuando el roster está completo, cada humano escribe **GO** a sus IAs.

## Portátil de Diego
| App | Carpeta que debe abrir | ID |
|---|---|---|
| Claude Code (desktop) | `~/Desktop/hackathon/cp-claude` | `claude@diego` |
| Gemini Antigravity | `~/Desktop/hackathon/cp-antigravity` | `antigravity@diego` |
| ChatGPT Codex | `~/Desktop/hackathon/cp-codex` | `codex@diego` |

## Portátiles de los amigos
```bash
git clone https://github.com/adrisacb/CivicPulseAI_Commit-Pray.git cp-<tuNombre>
```
Abrid esa carpeta en vuestra IA. ID = `<herramienta>@<tuNombre>` (ej. `cursor@adri`, `claude@adri`).

---

## Mensaje para Gemini Antigravity (portátil de Diego) — carril WEB
```text
Eres antigravity@diego, del carril WEB, en un hackathon de 6 horas. En este repositorio trabajamos a la vez
3 personas y 5 agentes de IA (Claude, Codex, tú y las IAs de dos amigos en otros portátiles).
Nos coordinamos SOLO a través de ficheros del repo.

FASE 1 (ahora): lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
Después regístrate según AGENTS.md §1 (ficha en coordination/agents/antigravity@diego.md con status: ready,
commit y push). Respóndeme "LISTO: <id>, carril, primera tarea y cómo la vas a hacer en 5 líneas" y ESPERA.
No escribas código de producto hasta que yo te diga GO.

Cuando diga GO: tu carril es WEB (solo frontend/). Empiezas por T03 y sigues con T09, T10, T12, T13, T14.
Trabaja contra los mocks de CONTRACTS.md sin esperar al backend. Usa tu navegador integrado para comprobar
la UI (desktop y móvil). El producto se llama PrimeraLlave: defínelo solo en la constante APP_NAME de
frontend/src/config.ts y úsala en toda la UI.
```

## Mensaje para ChatGPT Codex (portátil de Diego) — carril DATA (aire, transporte, servicios)
```text
Eres codex@diego, del carril DATA, en un hackathon de 6 horas. En este repositorio trabajamos a la vez
3 personas y 5 agentes de IA (Claude, Antigravity, tú y las IAs de dos amigos en otros portátiles).
Nos coordinamos SOLO a través de ficheros del repo.

FASE 1 (ahora): lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
Después regístrate según AGENTS.md §1 (ficha en coordination/agents/codex@diego.md con status: ready,
commit y push). Respóndeme "LISTO: <id>, carril, primera tarea y cómo la vas a hacer en 5 líneas" y ESPERA.
No escribas código de producto hasta que yo te diga GO.

Cuando diga GO: compartes el carril DATA con la IA de amigo1 (que hace T01 scout, T04 geometría, T05 alquiler
y el merge). Tú haces T06 (calidad del aire), T07 (transporte y servicios) y T23 (residencias, opcional).
Toca SOLO tus ficheros: etl/fetch_air.py, etl/fetch_transit.py, etl/fetch_services.py, etl/fetch_residences.py
y data/processed/parts/{air,transit,services}.json. Puedes empezar a descargar y limpiar las fuentes antes de
que exista barrios.geojson; el cruce por barrio lo haces cuando T04 esté en main (te avisarán por inbox).
Solo fuentes oficiales, documentadas en data/SOURCES.md.
```

## Mensaje para la IA de amigo1 — carril DATA (scout, geometría, alquiler, merge)
```text
Eres <herramienta>@<amigo1>, del carril DATA, en un hackathon de 6 horas. En este repositorio trabajamos a la vez
3 personas y 5 agentes de IA en 3 portátiles. Nos coordinamos SOLO a través de ficheros del repo.

FASE 1 (ahora): lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
Después regístrate según AGENTS.md §1 (ficha en coordination/agents/<tu-id>.md con status: ready, commit y push).
Respóndeme "LISTO: <id>, carril, primera tarea y cómo la vas a hacer en 5 líneas" y ESPERA. Nada de código hasta GO.

Cuando diga GO: eres el agente principal de DATA. T01 (elegir datasets oficiales, máximo 30 min, y anotar la
decisión barrio/distrito en DECISIONS.md), luego T04 (geometría de barrios + campus + build_indicators.py +
run_all.py) y T05 (precio del alquiler €/m², el dato MÁS importante del producto). codex@diego hace aire,
transporte y servicios: no toques sus ficheros. Avisa por inbox a DATA y API en cuanto barrios.geojson y
parts/rent.json estén en main.
```

## Mensaje para la IA de amigo2 — carril SHIP (integración, deploy, docs, pitch)
```text
Eres <herramienta>@<amigo2>, del carril SHIP, en un hackathon de 6 horas. En este repositorio trabajamos a la vez
3 personas y 5 agentes de IA en 3 portátiles. Nos coordinamos SOLO a través de ficheros del repo.

FASE 1 (ahora): lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
Después regístrate según AGENTS.md §1 (ficha en coordination/agents/<tu-id>.md con status: ready, commit y push).
Respóndeme "LISTO: <id>, carril, primera tarea y cómo la vas a hacer en 5 líneas" y ESPERA. Nada de código hasta GO.

Cuando diga GO: eres el integrador. Primero completa T00 (Makefile con dev/data/check, aunque API y WEB aún no
existan del todo). Luego T15 deploy, T16 CI, T17 README, T18 AI_USAGE, T19 pitch, T20 y T21. Cada 30 min:
git pull, make dev y comprobar que main funciona; si main se rompe, mensaje a "all" en el inbox. Vigila
el inbox y el tablero, y avisa si una tarea P0 lleva más de 45 min en "doing" o está "blocked".
```

## Mensaje para Claude Code (portátil de Diego) — carril API
```text
GO. Eres claude@diego, carril API. Reclama T02 y sigue con T08, T22 y T11 según AGENTS.md.
```

---

## Señal GO
1. Cada IA responde "LISTO…" a su humano.
2. Cualquiera ejecuta `git pull && sh coordination/board.sh` → en "AGENTES" deben salir los 5 con `ready`.
3. Diego dice "¡GO!" en voz alta; cada humano escribe **`GO`** a cada una de sus IAs.
