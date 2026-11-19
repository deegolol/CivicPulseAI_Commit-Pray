---
id: T16
title: CI con GitHub Actions
lane: SHIP
priority: P2
status: doing
owner: codex@techgallo
depends_on: [T08,T03]
files: [.github/workflows/ci.yml]
---
## Criterios de aceptación
- [ ] Workflow en push a main: `pytest` backend + `npm ci && npm run build` frontend.
- [ ] Badge en README.

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
