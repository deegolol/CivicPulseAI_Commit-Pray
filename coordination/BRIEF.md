# BRIEF — Reglas oficiales del hackathon (transcritas del PDF)

**Hackathon "CivicPulse AI" — Soluciones Web Basadas en Datos Abiertos** · 2C1C · Orange
- Participantes: estudiantes de 3.º y 4.º de Ingeniería Informática.
- Duración efectiva de desarrollo: **6 horas**.
- Herramientas permitidas: uso libre de asistentes de código (Copilot, Cursor, ChatGPT, Claude…) y **APIs de modelos de lenguaje**.

## 1. Reto
Desarrollar en 6 h un **MVP de aplicación web funcional** que consuma **al menos una fuente de datos abiertos oficial** y la transforme en un **servicio útil, visual e interactivo** para resolver un **problema real de la ciudadanía o del entorno universitario**.

## 2. Requisitos técnicos obligatorios (si no se cumplen, NO se evalúa)
- **Datos abiertos:** datos reales de un portal oficial (datos.gob.es, ayuntamientos, AEMET, INE, Eurostat…). Vale API directa o datasets descargados (CSV/JSON/GeoJSON).
- **Arquitectura web:** frontend funcional + capa de lógica/procesamiento (backend o serverless) **desacopladas o estructuradas**.
- **Valor añadido:** no basta una tabla. Filtrado inteligente, visualización (mapas, gráficos interactivos), **cruce de fuentes** o **generación de recomendaciones**.
- **Control de versiones:** repo **público** en GitHub, fork de `github.com/DA-ETSISI/CivicPulseAI`, con **historial de commits coherente**.

## 3. Cronograma
**Día 1 (jue 19/11) · ETSISI**
- 10:30–15:30 Programar en La Rotonda
- 15:30–17:30 Cambio a **aula 5101** (⚠️ hacer commit + push ANTES de moverse)
- Comida: libre (con el vale).

**Día 2 (vie 20/11) · ETSIINF**
- 10:30–12:00 Últimos retoques — Sala de Exámenes A-3001
- **12:00 — DEADLINE del repositorio**
- 12:00–13:30 Presentaciones: **5 min por equipo**, en orden de inscripción
- 13:30–15:30 Comida / deliberación · 15:30–16:00 Premios (Salón de Actos)

## 4. Entregables (en el repo antes de las 12:00 del viernes)
- [ ] Código fuente completo y funcional
- [ ] `README.md` con instrucciones claras de ejecución + enlace a la demo desplegada (si aplica)
- [ ] `AI_USAGE.md` detallando el uso de IA
- [ ] Enlace(s) a la(s) fuente(s) de datos abiertos utilizadas

Del README base: en la evaluación **debemos poder explicar cualquier parte del código o decisión técnica**.

## 5. Rúbrica (100 pts) → qué hacemos para maximizarla

| Criterio | Pts | Qué miran | Nuestra jugada |
|---|---|---|---|
| Impacto y utilidad | **25** | ¿Problema real? ¿Intuitiva y útil? | Problema real y cercano al jurado (vivienda de estudiantes), persona concreta, flujo en 3 clics |
| Calidad técnica y arquitectura | **25** | Código limpio, buen manejo de datos, sin fallos críticos, complejidad lograda | ETL reproducible + API tipada + scoring testeado + LLM con salida validada + fallbacks + CI |
| Explotación del dato abierto | **20** | Datos brutos → info comprensible, **cruce de datasets**, calidad de visualizaciones | ≥4 datasets oficiales cruzados por barrio, mapa coroplético, radar, procedencia de cada dato |
| Diseño e interfaz | **15** | Claridad visual, usabilidad, **responsive** | Diseño limpio, mobile-first (bottom sheet), estados de carga/error |
| Presentación y defensa | **15** | Pitch claro, **demo en vivo sin diapositivas innecesarias**, dominio técnico en preguntas | Guion de 5 min ensayado ×3, demo offline-proof, todos saben explicar cada módulo |
