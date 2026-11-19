# CONTRACTS — Estructura, datos y API

> Este fichero permite que DATA, API y WEB trabajen **en paralelo** desde el minuto 1.
> Cambiarlo requiere: mensaje a `to: all` + entrada en `DECISIONS.md`. Añadir campos opcionales nuevos está permitido; renombrar o borrar, no.

## 1. Estructura del repo

```
/
├─ AGENTS.md · CLAUDE.md · GEMINI.md · README.md · AI_USAGE.md · LICENSE
├─ Makefile · Dockerfile · .env.example · .gitignore
├─ coordination/           # coordinación entre agentes (ver AGENTS.md)
├─ data/
│  ├─ raw/                 # descargas crudas (gitignored)
│  ├─ processed/           # salida del ETL (VERSIONADA): barrios.geojson, indicators.json, campuses.json
│  │  └─ parts/            # una pieza por fuente: rent.json, air.json, transit.json, services.json (cada script ETL escribe SOLO la suya)
│  └─ SOURCES.md           # fuentes oficiales: nombre, organismo, URL, licencia, fecha, transformación
├─ etl/                    # Python: fetch_*.py, build_*.py, run_all.py, requirements.txt
├─ backend/
│  ├─ app/
│  │  ├─ main.py           # FastAPI app, CORS, montaje de routers y estáticos
│  │  ├─ models.py         # Pydantic: esquemas del contrato
│  │  ├─ data.py           # carga data/processed/* en memoria (una vez)
│  │  ├─ scoring.py        # motor de puntuación (puro, testeable)
│  │  ├─ llm.py            # cliente LLM + fallback por palabras clave
│  │  ├─ routers/          # meta.py, areas.py, score.py, ai.py
│  │  └─ mock_data/        # copia de los ejemplos de este contrato
│  ├─ tests/               # pytest
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ config.ts         # APP_NAME = "PrimeraLlave" y textos de marca (el nombre se cambia SOLO aquí)
│  │  ├─ api/              # client.ts (fetch tipado) + types.ts (= este contrato)
│  │  ├─ components/       # Map, PriorityPanel, AiSearch, AreaDetail, TopCards, Compare…
│  │  ├─ mocks/            # mismos JSON que backend/app/mock_data
│  │  └─ App.tsx
│  └─ vite.config.ts       # proxy /api → http://localhost:8000
└─ docs/                   # ARCHITECTURE.md, PITCH.md, screenshots/
```

## 2. Puertos y comandos

| Qué | Comando | URL |
|---|---|---|
| Backend | `cd backend && uvicorn app.main:app --reload --port 8000` | http://localhost:8000 (docs en `/docs`) |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 (proxy `/api` → 8000) |
| Todo | `make dev` | — |
| ETL | `make data` (= `python etl/run_all.py`) | genera `data/processed/*` |
| Checks | `make check` (= pytest backend + `npm run build` frontend) | — |

Python 3.11+, Node 20+. Mocks en frontend con `VITE_USE_MOCKS=true`.

## 3. Ficheros de datos procesados

### 3.1 `data/processed/barrios.geojson`
FeatureCollection (WGS84 / EPSG:4326, simplificada a < 2 MB). Cada feature:
```json
{ "type": "Feature",
  "properties": { "id": "021", "name": "Palos de Moguer", "district_id": "02", "district": "Arganzuela" },
  "geometry": { "type": "MultiPolygon", "coordinates": [] } }
```
`id` es string y es la clave de unión con `indicators.json`. Si trabajamos a nivel distrito: mismos campos, `district_id == id`.

### 3.1b `data/processed/parts/<fuente>.json` (evita conflictos entre agentes de DATA)
Cada script `etl/fetch_<fuente>.py` escribe **solo** su pieza; `etl/build_indicators.py` las fusiona en `indicators.json`.
```json
{ "source":    { "id": "alquiler", "name": "...", "publisher": "...", "url": "...", "license": "...", "retrieved": "2026-11-19", "granularity": "distrito" },
  "indicator": { "key": "rent_eur_m2", "label": "Alquiler", "unit": "€/m²", "higher_is_better": false, "source": "alquiler" },
  "values":    { "021": 17.3, "022": null },
  "notes":     { "021": "valor del distrito" } }
```

### 3.2 `data/processed/indicators.json`
```json
{
  "generated_at": "2026-11-19T13:00:00Z",
  "level": "barrio",
  "sources": [
    { "id": "alquiler", "name": "Sistema Estatal de Referencia del Precio del Alquiler", "publisher": "MIVAU",
      "url": "https://...", "license": "CC BY 4.0", "retrieved": "2026-11-19", "granularity": "barrio" }
  ],
  "indicators": [
    { "key": "rent_eur_m2",      "label": "Alquiler",         "unit": "€/m²",        "higher_is_better": false, "source": "alquiler" },
    { "key": "air_no2",          "label": "Calidad del aire", "unit": "µg/m³ NO₂",   "higher_is_better": false, "source": "aire" },
    { "key": "transit_stops",    "label": "Transporte",       "unit": "paradas/km²", "higher_is_better": true,  "source": "crtm" },
    { "key": "services_count",   "label": "Servicios",        "unit": "nº",          "higher_is_better": true,  "source": "servicios" }
  ],
  "areas": [
    { "id": "021", "name": "Palos de Moguer", "district": "Arganzuela", "centroid": [-3.6987, 40.4040],
      "values": { "rent_eur_m2": 17.3, "air_no2": 31.0, "transit_stops": 42.5, "services_count": 12 },
      "notes": { "rent_eur_m2": "valor del distrito" } }
  ]
}
```
- `values[key]` puede ser `null` si no hay dato (la UI muestra "sin dato"; el scoring lo trata como la mediana).
- `centroid` es `[lon, lat]`.
- `distance_km` al campus **no** va aquí: lo calcula el backend por petición.

### 3.3 `data/processed/campuses.json`
```json
[
  { "id": "etsisi", "name": "ETSISI · Campus Sur UPM", "coords": [-3.6286, 40.3897] },
  { "id": "etsiinf", "name": "ETSIINF · Campus Montegancedo UPM", "coords": [-3.8392, 40.4053] }
]
```
(Coordenadas aproximadas: verificarlas en T04. `coords` = `[lon, lat]`.)

## 4. API REST (prefijo `/api`, JSON, errores `{ "detail": "..." }`)

### 4.1 `GET /api/health` → `{ "status": "ok" }`

### 4.2 `GET /api/meta`
```json
{ "level": "barrio", "generated_at": "...", "indicators": [ /* como 3.2 */ ],
  "sources": [ /* como 3.2 */ ], "campuses": [ /* como 3.3 */ ],
  "defaults": { "campus_id": "etsisi", "weights": { "rent_eur_m2": 0.4, "distance_km": 0.3, "air_no2": 0.1, "transit_stops": 0.1, "services_count": 0.1 } } }
```
`distance_km` es un indicador virtual (`higher_is_better: false`), siempre disponible en `weights`.

### 4.3 `GET /api/areas` → `{ "areas": [ /* como 3.2 areas */ ] }`
### 4.4 `GET /api/areas/{id}` → un área + `"district_avg": { key: number }` + `"city_median": { key: number }`. 404 si no existe.
### 4.5 `GET /api/geo` → contenido de `barrios.geojson`.

### 4.6 `POST /api/score`
Request:
```json
{ "campus_id": "etsisi",
  "weights": { "rent_eur_m2": 0.4, "distance_km": 0.3, "air_no2": 0.1, "transit_stops": 0.1, "services_count": 0.1 },
  "filters": { "max_rent_eur_m2": 18, "max_distance_km": 12, "only_within_budget": false },
  "budget_eur_month": 500,
  "housing_type": "room",
  "limit": 131 }
```
- `housing_type`: `"room"` (habitación en piso compartido, 25 m² de referencia) | `"studio"` (35 m²) | `"flat"` (60 m²). Por defecto `"room"`. Los m² de referencia viven en `backend/app/scoring.py` como constantes documentadas.
- `budget_eur_month` opcional. Si viene: se calcula `est_rent_eur_month` y `fits_budget`; con `only_within_budget: true` las que no encajan salen `excluded`.
- `weights`: 0..1, se renormalizan para sumar 1. Claves desconocidas → 422.
- `filters`: opcionales. Áreas que no los cumplen salen con `"excluded": true` y `score: 0` (la UI las pinta en gris).
- `filters.min_budget_eur_month` aplica un mínimo inclusivo al alquiler mensual estimado. `only_within_budget` aplica el máximo de `budget_eur_month`.
- `filters.max_air_no2` y `filters.min_transit_stops` filtran por los indicadores medidos de aire y densidad de Metro.
- Cuando el agregado incluye el desglose municipal en `notes.services_count`, `/api/meta` ofrece `libraries_count` y `sports_count` como criterios independientes. `services_count` sigue disponible para clientes existentes.

Response:
```json
{ "campus_id": "etsisi",
  "results": [
    { "id": "021", "name": "Palos de Moguer", "district": "Arganzuela", "rank": 1, "score": 87.4, "excluded": false,
      "distance_km": 6.2,
      "est_rent_eur_month": 433, "fits_budget": true, "affordable_m2": 28.9,
      "listing_links": [ { "label": "Idealista", "url": "https://..." }, { "label": "Fotocasa", "url": "https://..." }, { "label": "Badi", "url": "https://..." } ],
      "breakdown": {
        "rent_eur_m2": { "value": 17.3, "normalized": 0.71, "weight": 0.4, "contribution": 28.4 },
        "distance_km": { "value": 6.2,  "normalized": 0.82, "weight": 0.3, "contribution": 24.6 }
      } }
  ] }
```
- `est_rent_eur_month = rent_eur_m2 × m² de referencia` (redondeado). `affordable_m2 = budget / rent_eur_m2`. Ambos `null` si falta el dato de alquiler.
- `listing_links`: URLs de **búsqueda** en portales (zona + precio máx. = presupuesto). Las genera `backend/app/listings.py`. Solo enlaces, sin scraping. Si no se puede construir la URL de un barrio, se usa la del distrito o la de Madrid.

**Recomendación destacada (T27, campos opcionales nuevos):**
```json
"recommendation": { "area_id": "133", "name": "Palomeras Bajas", "district": "Puente de Vallecas",
  "headline": "Palomeras Bajas es la zona que mejor encaja con lo que buscas",
  "reasons": ["~287 €/mes por una habitación: te sobran ~213 € de tu presupuesto", "A 2,7 km de tu campus, entre las 15 zonas más cercanas"],
  "caveats": ["El aire es mejorable: NO₂ 24,6 µg/m³, peor que en el 73 % de los barrios"] },
"highlights": { "cheapest": "201", "closest": "134", "cleanest_air": "085", "best_transit": "071" }
```
- `recommendation` = la primera zona no excluida; `reasons` (2–4) ordenados por los pesos del usuario; `caveats` (0–2) = peros honestos en lo que el usuario dijo que le importa. `null` si todo está excluido. Deterministas, solo cifras reales.
- `highlights`: id de la zona más barata, más cercana, con mejor aire y mejor comunicada entre las no excluidas.

`results` ordenado por `score` desc. `score` 0–100. `normalized` 0–1 (1 = mejor). `contribution = normalized × weight × 100`.

### 4.7 `POST /api/ai/parse`
Request: `{ "query": "Estudio en la ETSISI, tengo 500€, quiero zona tranquila y aire limpio" }`
Response:
```json
{ "campus_id": "etsisi",
  "weights": { "rent_eur_m2": 0.4, "distance_km": 0.25, "air_no2": 0.25, "transit_stops": 0.05, "services_count": 0.05 },
  "filters": { "max_rent_eur_m2": null, "max_distance_km": null },
  "budget_eur_month": 500,
  "housing_type": "room",
  "interpretation": "Priorizo precio, cercanía a Campus Sur y aire limpio.",
  "engine": "llm" }
```
`engine`: `"llm"` | `"keywords"` (fallback). Nunca falla por culpa del LLM: si hay error/timeout (> 8 s) → `keywords`.

### 4.8 `POST /api/ai/explain`
Request: `{ "campus_id": "etsisi", "weights": { }, "area_ids": ["021", "034", "112"], "query": "texto original opcional" }`
Response: `{ "text": "1) Palos de Moguer: ... (17,3 €/m², 6,2 km)...", "engine": "llm" }`
El prompt solo recibe los números del `breakdown`; el texto debe citar cifras reales. Fallback: plantilla determinista.

## 5. Variables de entorno (`.env`, nunca en git; plantilla en `.env.example`)
```
LLM_PROVIDER=openai          # openai (decidido, D-12) | none = modo sin IA
LLM_API_KEY=                 # clave de la API de OpenAI (cuenta de diego). Se pasa en privado, NUNCA en git
LLM_MODEL=gpt-5.6-luna       # el más rápido en nuestra prueba (~2 s); API Responses de OpenAI
LLM_TIMEOUT_S=8
DEMO_CACHE=true              # usa respuestas cacheadas para las frases de demo
```

## 6. Checks por carril (antes de push a main)
- DATA: `python etl/run_all.py` termina sin error y valida que cada `area.id` existe en el GeoJSON.
- API: `cd backend && pytest -q` en verde.
- WEB: `cd frontend && npm run build` sin errores de TypeScript.
- Global: `make check`.
