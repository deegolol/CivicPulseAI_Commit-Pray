# Uso de IA en PrimeraLlave

## 1. Herramientas utilizadas

| Herramienta | Agente | Trabajo |
|---|---|---|
| Codex | `codex@adrian`, `codex@diego`, `codex@techgallo` | Evaluación de fuentes, ETL, validación de datos, comandos de desarrollo y comprobaciones de entrega. |
| Claude Code | `claude@diego` | API FastAPI, motor de puntuación, capa de IA, pruebas, enlaces a anuncios y configuración del despliegue. |
| Antigravity | `antigravity@diego` | Aplicación React, mapa, panel de prioridades, detalle, comparador y búsqueda en lenguaje natural. |

## 2. Coordinación de cinco agentes

Trabajamos con un clon por agente. [AGENTS.md](AGENTS.md) fija las reglas comunes. El [tablero de tareas](coordination/tasks/) recoge el dueño y el alcance de cada cambio, y el [contrato](coordination/CONTRACTS.md) permite desarrollar en paralelo con los mismos IDs, tipos y rutas.

Los agentes usan el [inbox del repo](coordination/inbox/) con `sync.sh` y `msg.sh`. Los commits de coordinación quedan en GitHub y cada agente registra su trabajo en [su log](coordination/log/). Las primeras tandas pasaron por aprobación humana previa. Desde [D-22](coordination/DECISIONS.md), el equipo autorizó integrar tras los checks y mantener la revisión humana con la posibilidad de pausar y pedir cambios.

## 3. Contribución por módulo

| Módulo | Trabajo de la IA y comprobaciones | Decisiones y revisión humanas |
|---|---|---|
| Fuentes, geometría y alquiler | Codex contrastó siete archivos locales con fuentes oficiales, implementó la geometría de 131 barrios, verificó dos campus UPM y publicó la mediana distrital SERPAVI 2024. Probó el ETL y comprobó los datos en Railway. [Log](coordination/log/codex@adrian.md) | Adrián aportó los archivos y aprobó T01, incluida la selección de fuente y granularidad. |
| Aire, Metro y servicios | Codex implementó los cruces espaciales, contrastó las 23 medias de NO₂ con la memoria municipal de 2025 y verificó el agregado por ID, valor y nota. [Log](coordination/log/codex@diego.md) | Diego fijó las reglas de fuentes y coordinación. Los agentes aplicaron el inventario revisado por Adrián. |
| API y puntuación | Claude Code escribió modelos, endpoints, lógica de puntuación, estimaciones de presupuesto, enlaces filtrados y pruebas. [Log](coordination/log/claude@diego.md) | Diego dio el OK a T02 y T08. El equipo definió el enfoque de presupuesto primero y el uso de m² de referencia por tipo de vivienda. |
| Búsqueda y explicación con IA | Claude Code implementó los prompts, la llamada a OpenAI y las alternativas sin proveedor. Añadió pruebas offline y comprobó de punta a punta el caso de Lucía. [Log](coordination/log/claude@diego.md) | Diego eligió OpenAI y configuró el modelo. El equipo limitó esta capa a interpretar la consulta y explicar resultados del motor. |
| Interfaz | Antigravity implementó React, Leaflet y los paneles. Comprobó compilación y diseño en escritorio y móvil. [Log](coordination/log/antigravity@diego.md) | Diego definió la dirección visual, el coroplético monocromático y la presentación de métricas en unidades reales en T24. |
| Desarrollo y despliegue | Codex preparó y probó los comandos `make dev`, `make data` y `make check`. Claude Code diagnosticó el fallo de Railway y añadió el Dockerfile y los filtros de despliegue. [Log SHIP](coordination/log/codex@techgallo.md), [log API](coordination/log/claude@diego.md) | Diego eligió Railway y pidió corregir el despliegue. La integración de estas tandas siguió D-22. |

## 4. IA dentro del producto

La búsqueda en lenguaje natural traduce la consulta en campus, presupuesto, tipo de vivienda, filtros y prioridades. El backend calcula el ranking de forma determinista con los datos publicados por el ETL. La explicación del Top 3 parte de los resultados de ese cálculo.

La implementación usa la API Responses de OpenAI con proveedor y modelo configurables. [Los prompts](backend/app/prompts.py) piden a OpenAI una salida ajustada al esquema JSON para interpretar la consulta y una explicación que use las cifras facilitadas por la API. El backend ajusta los parámetros a los campus e indicadores disponibles y valida la respuesta pública con Pydantic.

Con `DEMO_CACHE=true`, se comprueba primero [la caché](backend/app/demo_cache.json) de tres consultas de demo para interpretar la frase. Cuando OpenAI está desactivado, devuelve un error o supera el tiempo de espera, la búsqueda usa palabras clave y la explicación recurre a una plantilla con los resultados reales. La pantalla distingue «IA» y «Modo sin IA».

## 5. Límites y errores detectados

- **Datos y estimaciones.** El alquiler refleja contratos declarados de vivienda colectiva y se publica a escala de distrito. La estimación de una habitación aplica los m² de referencia. El NO₂ de cada barrio se aproxima con su estación válida más cercana. La procedencia viaja con el indicador y se muestra en el detalle.
- **Interpretación y ranking.** En T11, la consulta «Estudio en la ETSISI» se interpretaba como petición de un estudio. Claude Code ajustó esa regla y añadió un peso base de distancia para que el ranking reflejara la cercanía al campus.
- **Validación del código generado.** Claude Code corrigió un test de puntuación mal planteado en T08. Antigravity ajustó la superposición de la leyenda móvil tras comprobarla en el navegador. El equipo detectó los redespliegues por commits de coordinación y limitó los patrones de Railway a cambios relevantes para la app.
- **Datos simulados.** Los mocks permitieron trabajar con el contrato mientras se construían API y ETL. Codex detectó que un fallo del endpoint de explicación podía mostrar cifras simuladas en producción. Antigravity corrigió esa ruta para generar el resumen con los resultados reales de `/api/score`. Las pruebas de integración de DATA confirmaron que las cuatro métricas de producción y sus notas coinciden con las piezas oficiales para los 131 barrios.
