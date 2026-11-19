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

- `backend/app/main.py` registra los routers FastAPI y sirve `frontend/dist`. `data.py` carga y guarda los datos en memoria en el primer acceso y recurre a los ejemplos si falta el conjunto procesado. `/api/health` indica el origen.
- `models.py` valida las peticiones con Pydantic. Los routers sirven metadatos, GeoJSON, fichas y ranking bajo `/api`.
- `scoring.py` aplica min–max por indicador, invierte alquiler, NO₂ y distancia, usa la mediana para valores ausentes y suma los criterios con pesos normalizados. Los filtros marcan zonas excluidas.
- La distancia al campus usa Haversine desde el centroide. El coste mensual multiplica €/m² por 25 m² para habitación, 35 m² para estudio o 60 m² para piso. `listings.py` forma búsquedas en portales por zona y presupuesto.
- `llm.py` y `prompts.py` usan la API Responses de OpenAI. La interpretación tiene esquema JSON estricto y validación posterior. La explicación recibe cifras calculadas por el motor.
- Ante error o timeout, el backend interpreta palabras clave y compone la explicación con una plantilla. `demo_cache.json` conserva las interpretaciones de las tres frases del pitch y el ranking se recalcula para cada petición.
- `Dockerfile` compila el frontend con Node y empaqueta FastAPI con el contenido estático. `railway.json` configura el healthcheck y qué cambios disparan un despliegue.

## WEB

- `frontend/src/App.tsx` mantiene los filtros y el flujo `parse → score → explain`. Vite reenvía `/api` a FastAPI en local y el cliente tipado centraliza las peticiones.
- `OnboardingScreen.tsx` ofrece una frase o un formulario de campus, presupuesto y tipo de vivienda. Una URL con filtros abre los resultados directamente.
- `TopFilterBar.tsx` permite editar la búsqueda desde los resultados. `ZoneList.tsx` presenta las estimaciones, el encaje y los enlaces a portales en una lista.
- `MadridMap.tsx` dibuja los 131 polígonos con Leaflet, destaca las diez mejores zonas en azul y conserva la atribución Powered by CRTM para Metro.
- `AreaDetailPanel.tsx` presenta el coste, los indicadores y las fuentes. `CompareModal.tsx` compara dos o tres zonas con un radar y una tabla.
- `index.css` concentra los estilos. Móvil abre la lista y ofrece un botón para alternar con el mapa. Las teselas del mapa base y los portales requieren conexión. La copia local conserva el GeoJSON y el ranking.
