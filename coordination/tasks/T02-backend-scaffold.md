---
id: T02
title: Esqueleto FastAPI con datos mock
lane: API
priority: P0
status: doing
owner: claude@diego
depends_on: []
files: [backend/**]
---
## Objetivo
API levantada que sirve los ejemplos de `CONTRACTS.md` para que WEB pueda integrar ya.
## Criterios de aceptación
- [ ] `backend/requirements.txt` (fastapi, uvicorn, pydantic, pytest, httpx).
- [ ] `models.py` con los esquemas Pydantic de CONTRACTS §3–4.
- [ ] `GET /api/health`, `/api/meta`, `/api/areas`, `/api/areas/{id}`, `/api/geo` funcionando con `mock_data/` (o con `data/processed/` si ya existe).
- [ ] `data.py` carga `data/processed/*` si existe, si no `mock_data/`.
- [ ] CORS abierto para `localhost:5173`. Un test de humo con `TestClient`.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
