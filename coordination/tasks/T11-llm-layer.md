---
id: T11
title: Capa IA: /api/ai/parse y /api/ai/explain con fallback
lane: API
priority: P1
status: done
owner: claude@diego
depends_on: [T08]
files: [backend/app/llm.py, backend/app/routers/ai.py, backend/tests/test_ai.py]
---
## Criterios de aceptación
- [ ] Proveedor: **OpenAI** (D-12), SDK oficial `openai`, modelo desde `LLM_MODEL`; salida estructurada (JSON schema) para `parse`. Configurable por `.env` (CONTRACTS §5); timeout 8 s.
- [ ] `parse`: prompt con lista de campus e indicadores → JSON → validado con Pydantic. Error/timeout → parser por palabras clave (`engine: "keywords"`).
- [ ] `explain`: solo recibe números del breakdown; plantilla determinista como fallback.
- [ ] `DEMO_CACHE=true`: respuestas cacheadas en `backend/app/demo_cache.json` para las 3 frases del pitch.
- [ ] Tests del fallback (sin red). Prompts en un fichero legible (`backend/app/prompts.py`).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
- 13:59 · claude@diego · En main. OpenAI gpt-5.6-luna por HTTP (Responses API, JSON schema estricto) + fallback por palabras clave + plantilla + demo_cache.json (3 frases del pitch). 27 tests offline. Regla de producto D-24: la distancia pesa siempre ≥ 0,6.
