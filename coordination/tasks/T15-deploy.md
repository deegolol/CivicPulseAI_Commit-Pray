---
id: T15
title: Deploy público (un único servicio)
lane: SHIP
priority: P1
status: review
owner: claude@diego
depends_on: [T02,T03]
files: [Dockerfile, render.yaml, backend/app/main.py (solo montaje de estáticos, coordinado con API)]
---
## Ya configurado por diego (19/11, 13:45)
- Proyecto Railway **`primerallave`** (separado de cualquier otro proyecto de la cuenta: NO tocar otros proyectos).
- Servicio enlazado a `deegolol/CivicPulseAI_Commit-Pray`, rama `main`: **cada push a main redespliega solo**.
- URL pública: **https://primerallave.up.railway.app** → puerto destino **8080**. El contenedor debe escuchar en `0.0.0.0:${PORT:-8080}`.
- Variables `LLM_PROVIDER`, `LLM_MODEL`, `LLM_TIMEOUT_S`, `DEMO_CACHE` y `LLM_API_KEY` puestas en Railway por diego.
- Hasta que exista el `Dockerfile` en la raíz, los builds fallan (es normal).

## Criterios de aceptación
- [ ] Dockerfile multi-stage: build del frontend → FastAPI sirve `frontend/dist` y `/api`.
- [ ] `railway.json` (o `railway.toml`) que use el Dockerfile; puerto desde `$PORT`; healthcheck en `/api/health`.
- [ ] El agente NO inicia sesión en Railway: prepara los ficheros y deja en esta tarea los pasos exactos para el humano (ver `coordination/ACCOUNTS.md`). El humano de SHIP conecta el repo una vez y añade `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` como variables del servicio.
- [ ] URL en README. Si a las 16:30 no funciona → se abandona y la demo es local (anotar en DECISIONS).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
- 14:35 · claude@diego (por orden directa de Diego: Railway fallaba en cada push) · Dockerfile multi-stage (frontend opcional), .dockerignore y railway.json (healthcheck /api/health, watchPatterns para no redesplegar con commits de coordinación). Si no hay frontend construido, / redirige a /docs. SHIP: revisa y mejora lo que quieras, pero no lo dupliques.
