<img width="3950" height="868" alt="2c1c-encadenados-logo-fondo-oscuro" src="https://github.com/user-attachments/assets/6c74e246-e94f-417c-8e98-ac9a276aa3a9" />

[![CI](https://github.com/deegolol/CivicPulseAI_Commit-Pray/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/deegolol/CivicPulseAI_Commit-Pray/actions/workflows/ci.yml)

# 🔑 PrimeraLlave — tu primera llave en Madrid

**Dinos dónde vas a estudiar, cuánto puedes pagar y qué necesitas, y te decimos dónde buscar piso en Madrid:** qué zonas encajan contigo, cuánto te costará allí una habitación o un estudio según datos oficiales, y te llevamos directo a los anuncios ya filtrados.

### 👉 Demo en vivo: **https://primerallave.up.railway.app**

| Escritorio | Móvil |
|---|---|
| <img src="docs/screenshots/t24_after_desktop.png" alt="PrimeraLlave en escritorio" width="560"> | <img src="docs/screenshots/t24_after_mobile.png" alt="PrimeraLlave en móvil" width="220"> |

Equipo **Commit & Pray** · Hackatón **CivicPulse AI** — 2Campus1Code (DA-ETSISI · DA-ETSIINF · Orange), noviembre de 2026.

---

## 🎯 El problema

Cada curso, miles de estudiantes llegan a Madrid sin conocer la ciudad y con un presupuesto ajustado. Los portales de anuncios enseñan pisos, pero no te dicen **qué zona te conviene**: cuánto se paga allí de verdad, a qué distancia queda tu campus, cómo es el aire o si está bien comunicada. Esa información existe, pero está repartida en datasets públicos difíciles de cruzar.

> **Lucía**, 18 años, empieza 1.º en la ETSISI (Campus Sur, Vallecas). Tiene 500 €/mes y no conoce Madrid. Escribe *"Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio"* y en segundos ve en el mapa las zonas que encajan, cuánto le costaría una habitación en cada una y un botón para ver pisos reales allí.

## ✨ Qué hace

- **Búsqueda en lenguaje natural** — escribe lo que buscas; la IA lo convierte en campus, presupuesto, tipo de vivienda, distancia y prioridades (y los controles se ajustan solos).
- **Mapa de los 131 barrios** coloreado según lo bien que encajan contigo, con el campus y el radio de distancia.
- **"Con tu presupuesto aquí: ~X €/mes"** — alquiler estimado para habitación, estudio o piso a partir de la mediana oficial en €/m², y si encaja o no en tu bolsillo.
- **Controles en unidades reales**: €/mes, km, tipo de vivienda y lo que más te importa (sin porcentajes).
- **Top 3, detalle de cada zona y comparador** con las cifras y la fuente oficial de cada dato.
- **"Ver pisos en esta zona"** — enlaces a Idealista, Fotocasa y Badi ya filtrados por distrito y precio máximo (solo enlaces, sin scraping).
- **Explicación en lenguaje natural** del top 3, citando únicamente cifras reales.
- **Responsive**: mapa a pantalla completa y bottom sheet en móvil.

## 📊 Datos abiertos utilizados

Todos oficiales, descargados el 19/11/2026 y transformados con scripts reproducibles (`etl/`). Detalle completo de licencias, formatos y transformaciones en **[data/SOURCES.md](data/SOURCES.md)**.

| Indicador | Dataset | Organismo | Enlace |
|---|---|---|---|
| Geometría | Barrios municipales (131 barrios, 21 distritos) | Ayuntamiento de Madrid | [datos.madrid.es](https://datos.madrid.es/dataset/300496-0-barrios-madrid) |
| Alquiler (€/m²) | SERPAVI 2011–2024 · mediana del alquiler de vivienda colectiva (por distrito) | Ministerio de Vivienda y Agenda Urbana | [XLSX](https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03_09_bd_SERPAVI_2011-2024%20-%20DEFINITIVO%20WEB_v2.xlsx) |
| Calidad del aire (NO₂) | Calidad del aire · datos horarios + estaciones de control | Ayuntamiento de Madrid | [datos horarios](https://datos.madrid.es/dataset/201200-0-calidad-aire-horario) · [estaciones](https://datos.madrid.es/dataset/212629-0-estaciones-control-aire) |
| Transporte | Estaciones de Metro (M4) · *Powered by CRTM* | Consorcio Regional de Transportes de Madrid | [crtm.es](https://www.crtm.es/) |
| Servicios | Bibliotecas municipales · Centros deportivos municipales | Ayuntamiento de Madrid | [bibliotecas](https://datos.madrid.es/dataset/201747-0-bibliobuses-bibliotecas) · [polideportivos](https://datos.madrid.es/dataset/200186-0-polideportivos) |
| Campus | Ubicación de ETSISI y ETSIINF | Universidad Politécnica de Madrid | [ETSISI](https://www.etsisi.upm.es/ubicacion-como-llegar/) · [ETSIINF](https://dia.etsiinf.upm.es/index.php?pagina=166) |

**Cruce de fuentes:** cada barrio recibe el alquiler de su distrito, la media anual de NO₂ de la estación más cercana, la densidad de estaciones de Metro (paradas/km²) y el recuento de equipamientos dentro de su polígono (cruces espaciales con `shapely` en ETRS89/UTM 30N).

## 🏗️ Arquitectura

```
datos.madrid.es · MIVAU (SERPAVI) · CRTM · UPM        ← fuentes oficiales
                │   etl/*.py  (descarga, limpieza, reproyección, cruce espacial)
                ▼
data/processed/  barrios.geojson · indicators.json · campuses.json   (versionado y reproducible)
                │
                ▼
backend/  FastAPI (Python)
  ├─ scoring.py   motor de recomendación (puro y testeado)
  ├─ listings.py  enlaces a búsquedas filtradas en portales
  └─ llm.py       IA: OpenAI (gpt-5.6-luna) con JSON validado + modo sin IA
                │   API REST JSON (/api/…)
                ▼
frontend/ React + Vite + TypeScript + Tailwind + Leaflet + Recharts
                │
                ▼
Railway: un único contenedor (Dockerfile) — FastAPI sirve la API y el frontend compilado
```

**Cómo se calcula el encaje** (`backend/app/scoring.py`):
1. Cada indicador se normaliza de 0 a 1 entre los 131 barrios (min–max), donde 1 es siempre "mejor" (se invierte en alquiler, NO₂ y distancia). Un dato ausente cuenta como la mediana de la ciudad.
2. La distancia al campus se calcula en línea recta (haversine) desde el centroide del barrio.
3. Las prioridades del estudiante se convierten en pesos que suman 1, y el encaje es Σ normalizado × peso.
4. Presupuesto: **alquiler estimado = mediana oficial €/m² × m² de referencia** (habitación 25 m², estudio 35 m², piso 60 m²). Es una estimación con datos oficiales, no el precio de un anuncio.
5. Los filtros (presupuesto, distancia máxima) excluyen zonas sin alterar la puntuación de las demás.

**IA con los pies en el suelo** (`backend/app/llm.py`, `backend/app/prompts.py`):
- La IA **nunca genera datos**: solo (1) traduce la frase del estudiante a parámetros con un **JSON Schema estricto** construido a partir de nuestros campus e indicadores, que luego validamos y acotamos, y (2) redacta la explicación con las cifras que ya ha calculado nuestro motor.
- **Si falla o tarda** (8 s para entender, 12 s para explicar), la app sigue funcionando con un intérprete por palabras clave y una explicación por plantilla. Las frases del pitch están cacheadas para que la demo no dependa de la red.
- Regla de producto: la cercanía al campus siempre pesa al menos 0,6 (un estudiante va a clase cada día).

## 🚀 Ejecutar en local

Requisitos: **Python 3.11+**, **Node 20.19+** (o 22+) y `make`.

```bash
git clone https://github.com/deegolol/CivicPulseAI_Commit-Pray.git && cd CivicPulseAI_Commit-Pray
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt -r etl/requirements.txt
(cd frontend && npm install)
cp .env.example .env        # opcional: pon tu clave de OpenAI en LLM_API_KEY; sin clave funciona en modo sin IA
```

```bash
make dev      # API en http://localhost:8000 (docs en /docs) + web en http://localhost:5173
make check    # tests del backend (pytest) + build del frontend
make data     # regenera data/processed/ desde las fuentes oficiales (opcional: ya está versionado)
```

Sin `make`: `cd backend && uvicorn app.main:app --reload --port 8000` y, en otra terminal, `cd frontend && npm run dev`.

**Variables de entorno** (`.env`, nunca en git): `LLM_PROVIDER` (`openai` | `none`), `LLM_API_KEY`, `LLM_MODEL` (por defecto `gpt-5.6-luna`), `LLM_TIMEOUT_S`, `LLM_EXPLAIN_TIMEOUT_S`, `LLM_REASONING_EFFORT`, `DEMO_CACHE`.

**Despliegue:** Railway construye el `Dockerfile` de la raíz en cada push a `main` que toque código o datos (`railway.json`), con *healthcheck* en `/api/health`.

## 🔌 API

Documentación interactiva: **[/docs](https://primerallave.up.railway.app/docs)**. Contrato completo en [coordination/CONTRACTS.md](coordination/CONTRACTS.md).

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/health` | Estado y origen de los datos (`processed` / `mock`) |
| GET | `/api/meta` | Indicadores, fuentes, campus y valores por defecto |
| GET | `/api/areas` · `/api/areas/{id}` | Barrios con sus valores; detalle con media del distrito y mediana de la ciudad |
| GET | `/api/geo` | Polígonos de los barrios (GeoJSON) |
| POST | `/api/score` | Ranking personalizado: encaje, desglose, alquiler estimado, ¿encaja en el presupuesto?, enlaces a anuncios |
| POST | `/api/ai/parse` | Frase en lenguaje natural → parámetros de búsqueda |
| POST | `/api/ai/explain` | Explicación del top 3 con cifras reales |

## 📁 Estructura

```
backend/        FastAPI: app/ (routers, scoring, listings, llm, prompts, models) y tests/
frontend/       React + Vite + TS: src/components (mapa, panel, detalle, comparador, IA), src/api
etl/            Scripts de descarga y transformación de cada fuente + run_all.py
data/           processed/ (salida versionada) y SOURCES.md (fuentes y licencias)
coordination/   Cómo nos coordinamos humanos y agentes de IA (tareas, contratos, decisiones, logs)
docs/           Capturas
Dockerfile · railway.json · Makefile
```

## 🤖 Uso de IA

Hemos trabajado 3 personas con 5 agentes de IA (Claude Code, ChatGPT Codex y Gemini Antigravity) en paralelo sobre este mismo repositorio, coordinados mediante ficheros: reglas comunes en [AGENTS.md](AGENTS.md), tareas con dueño, contratos de API fijos, un buzón de mensajes entre agentes y un registro de decisiones en [coordination/](coordination/). Detalle de qué hizo cada herramienta y qué revisaron los humanos en **[AI_USAGE.md](AI_USAGE.md)**.

## ⚠️ Limitaciones conocidas

- El alquiler oficial más fino y completo disponible es **por distrito** (SERPAVI 2024): todos los barrios de un distrito comparten €/m², y la app lo indica.
- El alquiler mensual es una **estimación** (€/m² × m² de referencia); el precio real está en los anuncios enlazados.
- La distancia al campus es en línea recta, no el tiempo en transporte público.
- Transporte = estaciones de Metro (no incluye EMT ni Cercanías); servicios = bibliotecas y polideportivos municipales.
- Idealista no permite comprobar sus URLs automáticamente; sus enlaces siguen su formato público.

## 👥 Equipo — Commit & Pray

- **Diego** — API, motor de recomendación, IA y despliegue · coordinación de agentes
- **Adrián** — datos abiertos: fuentes, geometría, alquiler, documentación
- **TechGallo** — integración, CI, calidad y presentación

Licencia: ver [LICENSE](LICENSE).
