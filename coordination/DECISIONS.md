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
