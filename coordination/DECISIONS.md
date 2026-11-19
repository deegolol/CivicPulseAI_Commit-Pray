# DECISIONS — registro de decisiones (append-only)

Formato: `D-xx · HH:MM · <quién> · <decisión> — <motivo>`

- D-01 · 12:00 · equipo · Idea: recomendador de dónde buscar piso para estudiantes (campus + presupuesto + necesidades) — problema real, cruce natural de datasets, IA con sentido. Ver PLAN.md.
- D-02 · 12:00 · equipo · Stack: Python/FastAPI + React/Vite/TS/Tailwind + Leaflet + Recharts; ETL precalculado a JSON — rapidez, fiabilidad en la demo, fácil de explicar.
- D-03 · 12:00 · equipo · El LLM solo traduce intención → parámetros y explica cifras reales; siempre con fallback sin LLM — defendible y a prueba de fallos.
- D-04 · 12:00 · equipo · Coordinación por ficheros en `coordination/` + carriles por carpeta + un clon por agente — varios agentes y personas en el mismo repo sin pisarse.
- D-05 · 12:15 · diego · Enfoque **presupuesto primero**: coste estimado por zona (€/m² oficial × m² de referencia) + enlaces a búsquedas filtradas en portales (sin scraping) — es lo que el estudiante necesita de verdad y nos diferencia de Madriwa.
- D-06 · 12:15 · diego · Nombre del producto **pendiente**. Solo existe en `frontend/src/config.ts` (`APP_NAME`) y en README; en docs se dice "la app".
- D-07 · 12:15 · equipo · ETL por piezas (`data/processed/parts/<fuente>.json`) para que varios agentes de DATA no editen el mismo fichero.
- D-08 · 12:15 · equipo · Reparto: claude@diego=API · antigravity@diego=WEB · codex@diego=DATA (aire, transporte, servicios) · IA de amigo1=DATA (scout, geometría, alquiler, merge) · IA de amigo2=SHIP (integración, deploy, README, pitch). Arranque con registro en `coordination/agents/` y señal GO de los humanos.
- D-09 · 12:45 · diego · Hosting: **Railway**, un servicio con Dockerfile y auto-deploy desde `main` — no se duerme (demo rápida), cero config extra. Sin base de datos.
- D-10 · 12:45 · diego · LLM dentro de la app: **Gemini** (clave gratis de Google AI Studio) — rápido y sin coste; fallback sin IA siempre activo.
- D-11 · 12:45 · diego · **Ningún agente inicia sesión en servicios externos ni maneja claves.** Las cuentas y las claves son cosa de humanos (ver `coordination/ACCOUNTS.md`).
- D-12 · 13:00 · diego · **Sustituye a D-10**: el LLM de la app es **OpenAI** (API ya pagada por diego). Modelo en `LLM_MODEL`, elegido por diego. Fallback sin IA igual.
- D-13 · 13:20 · diego · **Sustituye a D-06**: el producto se llama **PrimeraLlave** ("tu primera llave en Madrid"). Constante `APP_NAME` en `frontend/src/config.ts`.
- D-14 · 13:20 · diego · Modelo LLM: **`gpt-5.6-luna`** vía API Responses de OpenAI (2,0 s frente a 5–6 s de gpt-6-luna y gpt-5.4-mini en la misma prueba). La clave solo está en `.env` locales y en Railway.
- D-15 · 13:35 · equipo · Repo transferido a **deegolol/CivicPulseAI_Commit-Pray** (sigue siendo fork de DA-ETSISI/CivicPulseAI). Railway lo conecta diego en un proyecto nuevo y separado.
- D-16 · 13:05 · diego · Railway: proyecto `primerallave`, auto-deploy desde `main`, URL https://primerallave.up.railway.app (puerto 8080, el contenedor escucha en `$PORT`).
- D-17 · 13:10 · diego · Carriles con nombre: **Adrián (adrisacb) → DATA principal** (ya tiene datasets descargados), **TechGallo → SHIP**. Comando **SYNC** para sincronizar agentes vía repo (AGENTS.md §1).
- D-18 · 13:15 · equipo · **Control humano**: trabajo por tandas (1 tarea = 1 rama + informe), nada entra en main sin OK del humano; comandos GO/SYNC/PAUSA/REVISIÓN/OK/CAMBIOS/PARA; puntos de control 14:30, 15:15, 16:45 y vie 11:30. Comunicación por el repo con `coordination/sync.sh` y `coordination/msg.sh`. Datasets de Adrián = complemento evaluado, no la base.

- D-19 · 13:26 · codex@adrian · T01: mapa y ranking de 131 barrios con alquiler SERPAVI 2024 por distrito — la mediana oficial en €/m² está disponible para los 21 distritos. Cada barrio hereda la cifra con una nota de procedencia.
- D-20 · 13:34 · diego · Rediseño premium de la UI (T24, P0, WEB) antes de T09/T10: dirección editorial, acento latón, coroplético de un solo tono, Inter + serif para cifras, mapa CARTO Positron, panel flotante + bottom sheet en móvil.
- D-21 · 13:37 · diego · claude@diego hace T15 (Dockerfile + railway.json) ya, por orden de Diego. Railway solo redespliega si cambian backend/, frontend/, data/processed/, Dockerfile o railway.json.
- D-22 · 13:39 · diego · **Sustituye el flujo de OK de D-18: autonomía total.** Los agentes integran en main en cuanto pasan los checks y siguen; los humanos frenan con PAUSA/PARA/CAMBIOS. SYNC tras cada commit y como mínimo cada 10 min. `coordination/watch.sh` avisa a los humanos (notificación del Mac) de mensajes nuevos.
- D-23 · 13:53 · diego · Prohibido preguntar si seguir. Todos los agentes trabajan solos hasta terminar; al acabar su carril ayudan en otros P0. Los humanos revisan al final y piden cambios.
- D-24 · 13:59 · claude@diego · Regla de producto: la cercanía al campus pesa siempre ≥ 0,6 en la búsqueda por IA (sin ella, 'aire limpio' recomendaba El Pardo a 21 km de la ETSISI).
- D-25 · 14:08 · diego · **Sustituye la dirección visual de D-20/T24**: la UI parecía hecha por IA (crema + serif + dorado). Rediseño v2 (T25, P0, WEB): pantalla inicial de preguntas → resultados en lista con mapa de apoyo; blanco, rojo Madrid para marca, azules para el mapa, Bricolage Grotesque + Instrument Sans, sin ✨ ni degradados.
- D-26 · 14:12 · diego · Escucha constante: SYNC cada ~1 min de trabajo; sin tareas, `coordination/wait.sh` en bucle en vez de quedarse idle.
- D-27 · 14:33 · diego · /api/score añade `recommendation` (mejor opción + motivos + peros honestos) y `highlights` (más barata, más cerca, mejor aire, mejor comunicada). Deterministas, sin IA, para que salgan al instante y sean siempre verdad. UI en T28.
