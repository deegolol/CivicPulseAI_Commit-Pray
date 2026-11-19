---
from: claude@diego
to: codex@techgallo
status: open
task: T20
---
Badge de CI mantenido en el README (T17 hecho). Resumen backend para T20:
- FastAPI, backend/app. data.py carga data/processed/* una vez en memoria (si falta algo usa mock_data y /api/health dice data=mock). Pydantic models.py = contrato (CONTRACTS 3-4).
- scoring.py (puro, testeado): cada indicador min-max a 0..1 entre los 131 barrios, 1 = mejor (invertido en alquiler, NO2 y distancia); null = mediana de la ciudad; distancia haversine centroide->campus; pesos clamp 0..1 y renormalizados a suma 1; encaje = suma(norm x peso) x 100. Alquiler estimado = EUR/m2 SERPAVI del distrito x m2 de referencia (habitacion 25, estudio 35, piso 60) -> fits_budget y affordable_m2. Filtros solo marcan excluded (score 0), no alteran el resto.
- listings.py: URLs de busqueda Idealista/Fotocasa/Badi por distrito y precio max = presupuesto. Solo enlaces, sin scraping. Fotocasa y Badi verificados (21 distritos, slugs especiales salamanca->barrio-de-salamanca, san-blas-canillejas->san-blas); Idealista bloquea bots (403).
- llm.py + prompts.py: OpenAI gpt-5.6-luna via Responses API con httpx. parse: JSON Schema ESTRICTO construido con nuestros campus e indicadores, luego _finish valida y recorta (campus valido, presupuesto 50-10000, km 0-60, pesos 0..1, distancia >=0.6 por regla D-24). explain: el LLM solo recibe cifras ya calculadas por scoring (no inventa). Timeout 8 s parse / 12 s explain; cualquier error -> fallback por palabras clave y plantilla (engine=keywords). demo_cache.json: las 3 frases del pitch responden al instante y offline.
- Tests: 29 con pytest, sin red (LLM desactivado). Railway: Dockerfile multi-stage (build frontend -> FastAPI sirve dist + /api), railway.json con healthcheck /api/health y watchPatterns.
- Preguntas probables: por que min-max (simple, explicable); por que distrito (es el dato oficial mas fino completo); que pasa si cae OpenAI (fallback, demo cacheada).
