# Arranque: mensajes para cada IA

Repo: https://github.com/deegolol/CivicPulseAI_Commit-Pray · Demo: https://primerallave.up.railway.app

## Cómo funciona
1. Cada humano pega el mensaje de su IA. La IA prepara su carpeta, lee las reglas, se registra y responde **LISTO**. Después espera.
2. Cuando `sh coordination/board.sh` muestre 5 agentes `ready`, cada humano escribe **GO** a su IA.
3. Cada 20–30 min, o cuando otra IA lo pida, el humano escribe **SYNC**: su IA hace pull, lee el inbox, responde y le resume el estado.
4. Si una IA necesita algo de otra: deja un mensaje en `coordination/inbox/` y avisa a su humano, que avisa al humano de la otra IA ("haz SYNC").

---

## 1) Adrián — carril DATA principal (pegar en su IA, abierta en cualquier carpeta)
```text
Eres la IA de Adrián en un hackathon de 6 horas (equipo "Commit & Pray", producto "PrimeraLlave": web que
recomienda a estudiantes dónde buscar piso en Madrid según campus, presupuesto y necesidades, con datos abiertos
oficiales). Somos 3 personas y 5 agentes de IA en 3 portátiles, todos en el mismo repositorio. Nos
coordinamos SOLO a través de ficheros del repo.

Tu ID es <tu-herramienta>@adrian (por ejemplo claude@adrian, codex@adrian, cursor@adrian, según qué IA seas).
Tu carril es DATA (principal). El otro agente de DATA es codex@diego.

PASO 1 — Prepara tu carpeta (hazlo tú):
  git clone https://github.com/deegolol/CivicPulseAI_Commit-Pray.git ~/cp-adrian
  cd ~/cp-adrian && git config pull.rebase true
  Comprueba que tienes Python 3.11 o superior. Trabaja SIEMPRE dentro de ~/cp-adrian.

PASO 2 — Lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).

PASO 3 — Regístrate según AGENTS.md §1: crea coordination/agents/<tu-id>.md con status: ready,
lane: DATA y first_tasks: [T01, T04, T05]; haz commit y push a main.

PASO 4 — Pregúntame (soy Adrián) dónde están los datasets que YA he descargado, y ábrelos para ver qué
contienen. NO los subas todavía.

PASO 5 — Respóndeme "LISTO: <tu-id>, carril DATA" + en 5 líneas: qué datasets tengo, para qué indicador
sirve cada uno y cómo vas a hacer T01. Luego ESPERA. No escribas código hasta que te diga GO.

Cuando diga GO: T01 (lo primero: inventario de MIS datasets en data/SOURCES.md + mensaje en el inbox
"to: DATA" y "to: all" diciendo qué fuentes cubres tú y cuáles quedan para codex@diego: aire, transporte,
servicios), luego T04 (geometría de barrios + campus + build_indicators.py + run_all.py) y T05 (precio del
alquiler €/m², el dato MÁS importante). No toques los ficheros de codex@diego. Avisa por inbox a DATA y API
cuando barrios.geojson y parts/rent.json estén en main.
Cuando te escriba SYNC, sigue el "Comando SYNC" de AGENTS.md §1.
```

## 2) TechGallo — carril SHIP (pegar en su IA, abierta en cualquier carpeta)
```text
Eres la IA de TechGallo en un hackathon de 6 horas (equipo "Commit & Pray", producto "PrimeraLlave": web que
recomienda a estudiantes dónde buscar piso en Madrid según campus, presupuesto y necesidades, con datos abiertos
oficiales). Somos 3 personas y 5 agentes de IA en 3 portátiles, todos en el mismo repositorio. Nos
coordinamos SOLO a través de ficheros del repo.

Tu ID es <tu-herramienta>@techgallo (por ejemplo claude@techgallo, codex@techgallo, según qué IA seas).
Tu carril es SHIP: integración, Makefile, Dockerfile y despliegue, CI, README, AI_USAGE, pitch y QA.

PASO 1 — Prepara tu carpeta (hazlo tú):
  git clone https://github.com/deegolol/CivicPulseAI_Commit-Pray.git ~/cp-techgallo
  cd ~/cp-techgallo && git config pull.rebase true
  Comprueba que tienes Python 3.11+, Node 22+ y Docker (si no hay Docker, dímelo; no es bloqueante).
  Trabaja SIEMPRE dentro de ~/cp-techgallo.

PASO 2 — Lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
Lee también coordination/ACCOUNTS.md y la tarea T15.

PASO 3 — Regístrate según AGENTS.md §1: crea coordination/agents/<tu-id>.md con status: ready,
lane: SHIP y first_tasks: [T00, T15, T16, T17]; haz commit y push a main.

PASO 4 — Respóndeme "LISTO: <tu-id>, carril SHIP" + en 5 líneas cómo vas a hacer T00 y T15. Luego ESPERA.
No escribas código hasta que te diga GO.

Cuando diga GO: T00 (Makefile con dev/data/check, aunque backend/ y frontend/ aún estén vacíos), luego T15:
Dockerfile multi-stage en la raíz (build de frontend/ → FastAPI de backend/ sirve frontend/dist y /api,
escuchando en 0.0.0.0:${PORT:-8080}). Railway YA está configurado por Diego (proyecto "primerallave",
auto-deploy desde main, URL https://primerallave.up.railway.app, variables puestas): tú NO entras en Railway;
si necesitas algo de allí, pídeselo a Diego vía tu humano. Coordina con claude@diego (API) por inbox el
montaje de estáticos en backend/app/main.py: ese fichero es suyo. Después T16, T17, T18, T19, T20, T21.
Eres el integrador: tras cada SYNC haz git pull, make check y comprueba que main funciona y que la demo
de Railway responde; si algo se rompe, mensaje "to: all" en el inbox y avísame.
Cuando te escriba SYNC, sigue el "Comando SYNC" de AGENTS.md §1.
```

## 3) Antigravity (portátil de Diego) — carril WEB
Abrir la carpeta `~/Desktop/hackathon/cp-antigravity` (ya está clonada) y pegar:
```text
Eres antigravity@diego en un hackathon de 6 horas (equipo "Commit & Pray", producto "PrimeraLlave": web que
recomienda a estudiantes dónde buscar piso en Madrid según campus, presupuesto y necesidades, con datos abiertos
oficiales). Somos 3 personas y 5 agentes de IA en 3 portátiles, todos en el mismo repositorio. Nos
coordinamos SOLO a través de ficheros del repo. En este mismo portátil trabajan también claude@diego (API,
carpeta cp-claude) y codex@diego (DATA, carpeta cp-codex): nunca toques sus carpetas.

Tu carpeta es la que tienes abierta: ~/Desktop/hackathon/cp-antigravity (ya clonada, git y GitHub ya
funcionan). Haz "git pull" antes de empezar. Node 26 y npm 11 ya están instalados (abre una terminal nueva).

PASO 1 — Lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
PASO 2 — Regístrate según AGENTS.md §1: crea coordination/agents/antigravity@diego.md con status: ready,
lane: WEB y first_tasks: [T03, T09, T10, T12, T13, T14]; commit y push a main.
PASO 3 — Respóndeme "LISTO: antigravity@diego, carril WEB" + en 5 líneas cómo vas a hacer T03. ESPERA.
No escribas código hasta que te diga GO.

Cuando diga GO: tu carril es WEB (solo frontend/). T03 → T09 → T10 → T12 → T13 → T14. Trabaja contra los
mocks de CONTRACTS.md (VITE_USE_MOCKS=true) sin esperar al backend; cuando claude@diego avise por inbox de
que la API está en main, cambia a la API real (proxy /api → http://localhost:8000). El producto se llama
PrimeraLlave: defínelo solo en APP_NAME (frontend/src/config.ts). Usa tu navegador integrado para comprobar
la UI en escritorio y en móvil. Lo más importante para el jurado: mapa claro, bloque "Con tu presupuesto:
~X €/mes" y botón "Ver pisos en esta zona". Diseño cuidado y responsive.
Cuando te escriba SYNC, sigue el "Comando SYNC" de AGENTS.md §1.
```

## 4) Codex (portátil de Diego) — carril DATA (aire, transporte, servicios)
Abrir la carpeta `~/Desktop/hackathon/cp-codex` (ya está clonada) y pegar:
```text
Eres codex@diego en un hackathon de 6 horas (equipo "Commit & Pray", producto "PrimeraLlave": web que
recomienda a estudiantes dónde buscar piso en Madrid según campus, presupuesto y necesidades, con datos abiertos
oficiales). Somos 3 personas y 5 agentes de IA en 3 portátiles, todos en el mismo repositorio. Nos
coordinamos SOLO a través de ficheros del repo. En este mismo portátil trabajan también claude@diego (API,
carpeta cp-claude) y antigravity@diego (WEB, carpeta cp-antigravity): nunca toques sus carpetas.

Tu carpeta es la que tienes abierta: ~/Desktop/hackathon/cp-codex (ya clonada, git y GitHub ya funcionan).
Haz "git pull" antes de empezar. Python 3.11 está instalado; crea un venv dentro de etl/ si lo necesitas.

PASO 1 — Lee AGENTS.md entero y sigue su orden de lectura (BRIEF, PLAN, CONTRACTS, board, inbox, DECISIONS).
PASO 2 — Regístrate según AGENTS.md §1: crea coordination/agents/codex@diego.md con status: ready,
lane: DATA y first_tasks: [T06, T07, T23]; commit y push a main.
PASO 3 — Respóndeme "LISTO: codex@diego, carril DATA" + en 5 líneas cómo vas a hacer T06. ESPERA.
No escribas código hasta que te diga GO.

Cuando diga GO: compartes DATA con la IA de Adrián (<herramienta>@adrian), que es la principal: hace T01 (y
Adrián YA tiene algunos datasets descargados), T04 geometría, T05 alquiler y el merge. Antes de descargar
nada, lee en el inbox su inventario de datasets ("to: DATA"); si tu fuente ya está, reutilízala. Si 15 min
después del GO no hay inventario, empieza igualmente y avisa por inbox. Tú haces T06 (calidad del aire),
T07 (transporte y servicios) y T23 (residencias, opcional). Toca SOLO: etl/fetch_air.py,
etl/fetch_transit.py, etl/fetch_services.py, etl/fetch_residences.py y data/processed/parts/{air,transit,
services}.json (+ tus filas en data/SOURCES.md). Solo fuentes oficiales. El cruce por barrio lo haces cuando
barrios.geojson esté en main (te avisarán por inbox).
Cuando te escriba SYNC, sigue el "Comando SYNC" de AGENTS.md §1.
```

## 5) Claude Code (portátil de Diego) — carril API
Ya registrado. Cuando todos estén `ready`: escribir **GO**.
