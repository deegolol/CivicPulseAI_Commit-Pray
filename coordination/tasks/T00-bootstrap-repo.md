---
id: T00
title: Bootstrap del repo y kit de coordinación
lane: SHIP
priority: P0
status: todo
owner: ""
depends_on: []
files: [.gitignore, .env.example, Makefile, carpetas base]
---
## Objetivo
Subir el kit de coordinación a `main` y crear el esqueleto de carpetas para que nadie dependa de nadie.
## Criterios de aceptación
- [ ] `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `coordination/**` en `main`.
- [ ] Carpetas `etl/ data/raw data/processed backend/ frontend/ docs/` existen (con `.gitkeep`).
- [ ] `.gitignore` y `.env.example` en la raíz.
- [ ] `Makefile` con objetivos `dev`, `data`, `check` (pueden ser stubs que luego completan API/WEB).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
