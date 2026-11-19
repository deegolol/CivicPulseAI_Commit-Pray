---
id: T00
title: Bootstrap del repo y kit de coordinación
lane: SHIP
priority: P0
status: done
owner: codex@techgallo
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

Rama t00-makefile publicada para revisión. Kit base verificado; Makefile probado con el esqueleto vacío y con componentes temporales, incluidos fallos de dev, ETL, tests y build.

Makefile integrado y probado con el esqueleto vacío y con la app real. make check ejecuta pytest y compila el frontend; make dev arranca API y Vite con el proxy /api comprobado.
