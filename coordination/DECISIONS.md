# DECISIONS — registro de decisiones (append-only)

Formato: `D-xx · HH:MM · <quién> · <decisión> — <motivo>`

- D-01 · 12:00 · equipo · Idea: recomendador de barrios para estudiantes (BarrioMatch) — problema real, cruce natural de datasets, IA con sentido. Ver PLAN.md.
- D-02 · 12:00 · equipo · Stack: Python/FastAPI + React/Vite/TS/Tailwind + Leaflet + Recharts; ETL precalculado a JSON — rapidez, fiabilidad en la demo, fácil de explicar.
- D-03 · 12:00 · equipo · El LLM solo traduce intención → parámetros y explica cifras reales; siempre con fallback sin LLM — defendible y a prueba de fallos.
- D-04 · 12:00 · equipo · Coordinación por ficheros en `coordination/` + carriles por carpeta + un clon por agente — varios agentes y personas en el mismo repo sin pisarse.
