# PLAN MAESTRO — Commit & Pray @ CivicPulse AI

>  Nombre: **pendiente** (ver `DECISIONS.md`). En código se usa SOLO la constante `APP_NAME` (`frontend/src/config.ts`) para poder renombrar en 1 minuto. En docs: "la app".
> Una frase: *"Dinos dónde vas a estudiar, cuánto puedes pagar y qué necesitas, y te decimos dónde buscar piso en Madrid: qué zonas encajan, cuánto te costará allí una habitación o estudio, y te llevamos directo a los anuncios — con datos oficiales y explicado en lenguaje natural."*

**Enfoque: presupuesto primero.** El estudiante no busca "un barrio bonito": busca **el mejor sitio que se puede permitir** cerca de su campus.

---

## 1. Por qué esta idea gana

| Factor | Por qué puntúa |
|---|---|
| **Problema real y cercano** | La vivienda es *el* problema número uno de los estudiantes desplazados. El jurado (universidad + Orange) lo entiende al instante. El reto pide literalmente "ciudadanía **o entorno universitario**": cubrimos los dos. |
| **Cruce de datasets** (20 pts) | Una sola pregunta ("¿dónde vivo?") obliga a cruzar alquiler + aire + transporte + servicios + geografía. No es un cruce forzado: es la esencia del producto. |
| **Recomendación, no tabla** | Ranking personalizado con pesos → cumple de sobra el "valor añadido". |
| **IA con sentido** ("CivicPulse **AI**") | El usuario escribe en lenguaje natural; el LLM lo traduce a parámetros (JSON validado) y luego **explica** el resultado con los números reales. La IA no inventa datos → defendible ante preguntas técnicas. |
| **Demo espectacular en 5 min** | Escribes una frase → el mapa se colorea → top 3 → clic en barrio → "con tu presupuesto aquí pagas ~X €/mes" → botón "ver pisos". Visual e inmediato. |

### ¿Existe ya? (investigado 19/11)
- **Madriwa** (Taniwa, publicada en datos.gob.es en 2026): recomienda **barrios** de Madrid con datos abiertos según perfil y lugares importantes. **No** usa presupuesto, **no** es específica para estudiantes, **no** lleva a pisos concretos. El jurado puede conocerla → **mencionarla en el pitch y diferenciarnos**.
- Portales (Uniplaces, Spotahome, Badi, Amber, Idealista): tienen anuncios y filtros de precio, pero **no** te dicen qué zona te conviene ni cruzan datos públicos (aire, transporte, servicios, distancia real al campus).
- **Nuestro hueco:** *presupuesto + campus + necesidades → zonas recomendadas + coste estimado con datos oficiales + salto directo a anuncios filtrados.* Lo que hacen los portales y lo que hace Madriwa, unidos y pensado para estudiantes.

**Coste estimado (transparente):** `alquiler €/m² oficial × m² de referencia` (habitación en piso compartido ≈ 25 m² de reparto, estudio ≈ 35 m², piso ≈ 60 m²). Es una estimación con datos oficiales, y la UI lo dice. Los precios exactos están en los anuncios a los que enlazamos.

**Persona del pitch:** *Lucía, 18 años, viene de fuera de Madrid, empieza 1.º en la ETSISI (Campus Sur, Vallecas). Presupuesto ~500 €/mes. Quiere estar a menos de 40 min, zona tranquila y con aire limpio porque sale a correr.*

### Ideas de reserva (solo si el equipo rechaza esta en los primeros 10 min)
- **Ruta Saludable al Campus:** calidad del aire en tiempo real + BiciMAD + EMT → mejor hora/ruta para ir a clase.
- **Plan Madrid AI:** agenda cultural municipal + clima AEMET + aire → "¿qué hago hoy?" con recomendaciones.
El sistema de coordinación (`AGENTS.md`, tareas, contratos) vale igual; solo cambian `PLAN.md` y `CONTRACTS.md`.

---

## 2. Alcance (MoSCoW) — cortar por abajo si vamos tarde

**MUST (MVP que se presenta sí o sí)**
1. Mapa de Madrid por **barrios** (fallback: distritos) coloreado por puntuación.
2. Selector de campus + **presupuesto €/mes + tipo (habitación / estudio / piso)** + sliders de prioridades → ranking recalculado en vivo. Zonas fuera de presupuesto en gris.
3. Panel de detalle de un barrio: puntuación, **"con tu presupuesto aquí: ~X €/mes, te da para ~Y m²"**, desglose por indicador, valores reales, enlace a la fuente.
3b. Botón **"Ver pisos en esta zona"** → abre búsquedas ya filtradas (zona + precio máx.) en portales de anuncios. Solo enlaces: **nada de scraping**.
4. Mínimo **3 datasets oficiales cruzados** (geometría + alquiler + ≥1 de aire/transporte/servicios).
5. README + AI_USAGE + fuentes enlazadas.

**SHOULD (lo que nos hace ganar)**
6. **Búsqueda en lenguaje natural** → LLM → pesos/filtros (con fallback por palabras clave sin LLM).
7. **Explicación generada** del top 3 con cifras reales ("Palos de Moguer: 13,9 €/m², 22 min…").
8. Top 3 en tarjetas + **comparador** de 2–3 barrios (radar).
9. Responsive móvil (bottom sheet) + diseño cuidado.
10. Deploy público con URL.

**COULD**
10b. **Residencias universitarias / colegios mayores** como puntos en el mapa (si hay dataset oficial con ubicaciones).
11. CI en GitHub Actions (tests + build) con badge en README.
12. Compartir búsqueda por URL (estado en querystring).
13. Más campus / universidades de Madrid.

**WON'T (no gastar tiempo)**
Login, base de datos, scraping de portales privados (Idealista…), predicción de precios con ML.

---

## 3. Datos (a verificar por T01 en ≤ 30 min)

Granularidad objetivo: **barrio** (131 en Madrid). Si algún indicador solo existe por distrito (21), se asigna el valor del distrito a sus barrios y se indica en la UI.

| Indicador | Candidatos de fuente oficial | Plan B |
|---|---|---|
| Geometría barrios/distritos | datos.madrid.es / Geoportal Ayto. Madrid ("Barrios municipales", "Distritos") | GeoJSON de distritos |
| Precio alquiler (€/m²) | MIVAU "Sistema Estatal de Referencia del Precio del Alquiler" · INE "Índice de Precios de Vivienda en Alquiler" (distritos) · Banco de datos / Panel de indicadores de barrios del Ayto. Madrid | Nivel distrito |
| Calidad del aire | datos.madrid.es "Calidad del aire. Datos en tiempo real / horarios" + ubicación de estaciones → estación más cercana | Media anual por estación |
| Transporte | CRTM datos abiertos (estaciones Metro/Cercanías/EMT, GeoJSON) → nº de paradas por barrio + distancia a la más cercana | Solo Metro |
| Servicios | datos.madrid.es: bibliotecas, instalaciones deportivas, centros culturales… (JSON con coordenadas) → recuento por barrio | 1–2 tipos |
| Residencias universitarias (COULD) | Comunidad de Madrid / datos.madrid.es (verificar si existe listado con coordenadas) | Omitir |
| Distancia al campus | Calculada (haversine centroide→campus). Coordenadas de campus en `data/processed/campuses.json` | — |
| (Opcional) Ruido, renta media, población | Panel de indicadores de distritos y barrios (Ayto. Madrid) | — |

Regla: **todo dataset usado se documenta en `data/SOURCES.md`** con nombre, organismo, URL, licencia, fecha de descarga y transformación aplicada. Esto va directo al README (entregable obligatorio).

---

## 4. Arquitectura

```
 datos.madrid.es / INE / CRTM / MIVAU      (fuentes oficiales)
              │  etl/*.py  (descarga + limpieza + cruce espacial point-in-polygon)
              ▼
 data/processed/  barrios.geojson · indicators.json · campuses.json   (versionado, reproducible)
              │
              ▼
 backend/ FastAPI ── /api/meta /api/areas /api/geo /api/score /api/ai/parse /api/ai/explain
   ├─ scoring.py   (normalización min-max + pesos, determinista, con tests)
   └─ llm.py       (proveedor configurable por .env; salida JSON validada con Pydantic; fallback sin LLM)
              │  JSON (contrato en CONTRACTS.md)
              ▼
 frontend/ React + Vite + TS + Tailwind + Leaflet (react-leaflet) + Recharts
   mapa coroplético · panel de prioridades · buscador IA · detalle · comparador · móvil
```

**Stack y por qué** (respuestas para el jurado):
- **Python + FastAPI**: pandas/shapely para datos; tipado con Pydantic; docs automáticas en `/docs` (se pueden enseñar en la demo).
- **ETL offline → JSON precalculado**: la demo no depende de que los portales respondan; rápido y reproducible.
- **React + Vite + TS**: rápido de montar, tipos compartidos con el contrato.
- **Leaflet**: coroplético con GeoJSON en pocas líneas, sin API key.
- **LLM solo como traductor/explicador**: salida estructurada validada; si falla → parser por palabras clave. Nunca hay datos inventados.
- **Deploy**: un único contenedor (FastAPI sirve también el build del frontend) en **Railway**, redespliegue automático en cada push a `main`. Si falla, la demo es local (plan B).
- **LLM**: **Gemini** (clave gratis de Google AI Studio), detrás de `backend/app/llm.py` con fallback sin IA.
- **Sin base de datos** (ni Neon ni similares): los datos son ficheros JSON precalculados por el ETL. Menos cuentas, menos fallos.

---

## 5. Equipo y carriles

| Carril | Humano | Agente(s) | Arranca con |
|---|---|---|---|
| `API`  | diego | `claude@diego` | T02 → T08 → T22 → T11 |
| `WEB`  | diego | `antigravity@diego` | T03 → T09 → T10 → T12–T14 |
| `DATA` | diego | `codex@diego` (aire, transporte, servicios) | T06 → T07 → T23 |
| `DATA` | amigo1 | IA de amigo1 (scout, geometría, alquiler, merge) | T01 → T04 → T05 |
| `SHIP` | amigo2 (**integrador humano**) | IA de amigo2 | T00 → T15 → T16 → T17–T21 |

Diego supervisa 3 agentes: que revise diffs antes de cada push y delegue la integración en amigo2.
**Integrador (SHIP):** cada 30 min hace `git pull`, levanta la app (`make dev`) y comprueba que `main` funciona. Si `main` se rompe, avisa por inbox `to: all` y nadie pushea hasta arreglarlo.

**Mocks primero:** WEB no espera a API y API no espera a DATA. Todos trabajan contra los ejemplos de `CONTRACTS.md` desde el minuto 1 (`frontend/src/mocks/`, `backend/app/mock_data/`).

---

## 6. Calendario (hora real)

> Hoy ya hemos perdido tiempo desde las 10:30: **el día 1 manda**. El día 2 es solo para pulir y ensayar.

### Día 1 — jueves 19/11
| Hora | Fase | Objetivo verificable |
|---|---|---|
| **12:00–12:15** | F0 Setup | Kit de coordinación en `main`. Cada agente con su clon. Idea aprobada. Tareas T01/T02/T03 reclamadas. |
| **12:15–13:00** | F1 Esqueleto | Datasets elegidos (T01). FastAPI responde `/api/health` y `/api/areas` con mock. Frontend muestra mapa con GeoJSON mock. `make dev` levanta todo. |
| **13:00–14:30** | F2 Núcleo | ETL real de geometría + alquiler (+ aire). `/api/score` con tests. Sliders recalculan el mapa. Panel de detalle. **Hito 14:30: demo MUST de punta a punta con datos reales.** |
| 14:30–15:15 | Comida escalonada | Nunca todos a la vez: siempre hay un humano vigilando agentes. |
| **15:15–15:30** | 🚚 Mudanza | **Commit + push de todo antes de ir al aula 5101.** |
| **15:30–16:45** | F3 Wow | Búsqueda IA + explicación. Top 3 + comparador. Responsive. Deploy. |
| **16:45–17:30** | F4 Congelar | **Feature freeze 16:45.** README, AI_USAGE, SOURCES, capturas, guion de pitch. 1.er ensayo cronometrado. Tag `v0.9`. |

### Día 2 — viernes 20/11
| Hora | Qué |
|---|---|
| 10:30–11:15 | Solo bugs críticos y pulido visual (nada de features). Probar en móvil y en el portátil de la demo. |
| 11:15–11:45 | Ensayos 2 y 3 del pitch (cronómetro). Preparar preguntas técnicas. |
| **11:45** | Último push. Tag `v1.0`. Comprobar en GitHub (incógnito) que README, AI_USAGE y fuentes se ven bien. |
| 12:00 | 🔒 Deadline. Nadie toca el repo. |

---

## 7. Pitch (5 min, demo en vivo, cero diapositivas de relleno)

| Tiempo | Contenido |
|---|---|
| 0:00–0:30 | **Gancho**: "Lucía empieza en la ETSISI la semana que viene. Tiene 500 € y no conoce Madrid. ¿Dónde busca piso?" |
| 0:30–3:15 | **Demo en vivo**: escribe la frase de Lucía → el mapa se colorea → top 3 con explicación → clic en un barrio → desglose y fuentes → mueve el slider "aire limpio" y el ranking cambia → compara 2 barrios → (10 s) se ve en el móvil. |
| 3:15–4:15 | **Cómo funciona**: 1 diagrama (arquitectura §4). Cruce de N datasets oficiales. "La IA no inventa datos: traduce tu intención a parámetros validados y explica cifras reales. Sin IA, la app sigue funcionando." Tests + CI. |
| 4:15–4:45 | **Impacto y siguiente paso**: "Madriwa recomienda barrios; los portales enseñan anuncios; nosotros unimos ambos para estudiantes." Futuro real: acuerdos con portales/residencias para anuncios dentro de la app, todas las universidades de España, alertas de precio. |
| 4:45–5:00 | Cierre con el nombre y la URL. |

**Plan B de demo**: app en local + datos precalculados + respuestas de IA cacheadas para las 3 frases de demo + vídeo/GIF de 60 s en `docs/` por si todo falla.

**Preguntas probables** (cada miembro debe saber responder, ver T20):
- ¿Cómo normalizáis los indicadores? (min-max por indicador, invertido si "menos es mejor", media ponderada).
- ¿Qué pasa si el LLM devuelve basura? (validación Pydantic → si falla, parser por palabras clave).
- ¿De dónde sale el precio y qué limitaciones tiene? (fuente, fecha, granularidad).
- ¿Cómo asignáis una estación de aire a un barrio? (la más cercana al centroide).
- ¿Por qué precalculáis los datos? (fiabilidad, velocidad, reproducibilidad; el script ETL lo regenera).

---

## 8. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Dataset de alquiler no disponible por barrio | Bajar a distrito (T01 decide antes de las 12:45). |
| Portal caído / descarga lenta | Descargar todo una vez a `data/raw/`; trabajar sobre `processed/` versionado. |
| Sin clave LLM o sin cuota | Fallback por palabras clave + respuestas cacheadas de demo. |
| Agentes pisándose código | Carriles por carpeta, 1 clon por agente, claim de tareas, contratos fijos. |
| `main` roto antes de la demo | Integrador verifica cada 30 min; freeze 16:45; tag `v0.9` como versión de rescate. |
| Wi-Fi caído en la presentación | Demo local, datos locales, IA cacheada, vídeo de respaldo. |
| Nadie sabe explicar el código | T20: cada carril escribe su sección en `docs/ARCHITECTURE.md` y la explica a los demás. |
| Reglas de 6 h | No contar con trabajar de noche; el plan cabe en el horario oficial. |
