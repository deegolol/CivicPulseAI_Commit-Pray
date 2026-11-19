---
id: T26
title: API robusta para demo pública (límite de uso de IA, caché, compresión, diagnóstico)
lane: API
priority: P1
status: doing
owner: claude@diego
depends_on: [T11]
files: [backend/app/main.py, backend/app/llm.py, backend/app/routers/ai.py, backend/app/routers/meta.py, backend/app/models.py, backend/tests/test_hardening.py]
---
## Objetivo
La demo es pública y usa la clave de OpenAI de Diego: evitar abusos y costes, y hacerla más rápida.
## Criterios de aceptación
- [ ] Límite por IP en /api/ai/* (por defecto 30 peticiones/min) → 429 con mensaje claro; tope diario global de llamadas al LLM (por defecto 1500) → a partir de ahí, modo sin IA automático.
- [ ] Caché en memoria (LRU) de parse y explain: repetir la misma petición es instantáneo y no gasta.
- [ ] GZip en respuestas grandes (/api/geo, /api/areas, /api/score) y Cache-Control en /api/geo y /api/meta.
- [ ] /api/health añade `llm` (activo o no) y `llm_calls_today` (campos opcionales nuevos).
- [ ] Tests sin red.

## Notas / progreso
