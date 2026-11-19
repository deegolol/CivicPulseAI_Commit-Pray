# Defensa técnica de PrimeraLlave

## DATA

- `etl/fetch_geometry.py` normaliza los 131 barrios municipales a WGS84, simplifica los polígonos y registra los dos campus de la UPM.
- `etl/fetch_rent.py` asigna la mediana distrital de vivienda colectiva de SERPAVI 2024 en €/m². Cada barrio conserva una nota de procedencia.
- `etl/fetch_air.py` calcula las medias de NO₂ de las horas válidas de 2025 en 23 estaciones. Asigna a cada barrio la estación más cercana a su centroide en ETRS89 / UTM 30N.
- `etl/fetch_transit.py` consolida las entradas de Metro por código y nombre de estación, cruza sus puntos con los barrios y divide el recuento por el área en km².
- `etl/fetch_services.py` cruza y cuenta bibliotecas y equipamientos deportivos del catálogo municipal por identificador.
- `etl/build_indicators.py` une las piezas por ID, rechaza IDs ajenos al mapa y conserva notas. `python etl/run_all.py --offline` regenera el agregado con las piezas versionadas.
- Para el jurado, el alquiler tiene resolución distrital, el NO₂ aproxima el barrio con una estación y se han elegido Metro y dos tipos de equipamiento. La capa de residencias quedó fuera del MVP tras comprobar cobertura y condiciones de reutilización. [Fuentes y licencias](../data/SOURCES.md).

## API

- `backend/app/main.py` registra los routers FastAPI y sirve `frontend/dist`. `data.py` carga los datos al arrancar y recurre a los ejemplos si falta el conjunto procesado. `/api/health` indica el origen.
- `models.py` valida las peticiones con Pydantic. Los routers sirven metadatos, GeoJSON, fichas y ranking bajo `/api`.
- `scoring.py` aplica min–max por indicador, invierte alquiler, NO₂ y distancia, usa la mediana para valores ausentes y suma los criterios con pesos normalizados. Los filtros marcan zonas excluidas.
- La distancia al campus usa Haversine desde el centroide. El coste mensual multiplica €/m² por 25 m² para habitación, 35 m² para estudio o 60 m² para piso. `listings.py` forma búsquedas en portales por zona y presupuesto.
- `llm.py` y `prompts.py` usan la API Responses de OpenAI. La interpretación tiene esquema JSON estricto y validación posterior. La explicación recibe cifras calculadas por el motor.
- Ante error o timeout, el backend interpreta palabras clave y compone la explicación con una plantilla. `demo_cache.json` conserva las interpretaciones de las tres frases del pitch y el ranking se recalcula para cada petición.
- `Dockerfile` compila el frontend con Node y empaqueta FastAPI con el contenido estático. `railway.json` configura el healthcheck y qué cambios disparan un despliegue.

## WEB

- `frontend/src/App.tsx` orquesta los criterios, el ranking y el flujo IA `parse → score → explain`. El cliente tipado en `src/api/` comparte el formato de las peticiones y Vite reenvía `/api` a FastAPI en local.
- `PriorityPanel.tsx` recibe presupuesto, campus, tipo de vivienda y prioridades en unidades reales. El ranking se recalcula tras una espera de 250 ms al cambiar los controles.
- `MadridMap.tsx` dibuja los 131 polígonos en Leaflet y actualiza sus estilos en la capa existente al cambiar el ranking. Los datos de Metro llevan la atribución Powered by CRTM.
- `TopZonesRail.tsx` muestra las tres primeras recomendaciones. `AreaDetailPanel.tsx` explica alquiler e indicadores con su procedencia y enlaces. `CompareModal.tsx` compara dos o tres zonas con radar y tabla.
- `index.css` concentra los estilos. En escritorio hay paneles junto al mapa y en móvil un panel inferior con tres alturas.
- El mapa base, las fuentes tipográficas remotas y los portales dependen de sus servicios. El GeoJSON y el cálculo del ranking pueden servirse desde la copia local.
