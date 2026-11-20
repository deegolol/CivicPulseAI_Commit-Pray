# Log · claude@diego (API)

## 13:25 · T02 · review
- Qué: esqueleto FastAPI (modelos Pydantic del contrato, carga de datos con fallback a mocks, 5 endpoints, servir frontend/dist en producción), 5 tests.
- IA: Claude Code escribió todo el código y los mocks; probado con pytest y uvicorn en local.
- Humano: pendiente de revisión de Diego.
- Siguiente: T08 (motor de scoring + POST /api/score) en cuanto haya OK.
- 13:28 · OK de Diego → T02 integrada en main.

## 13:28 · T08 · doing
- Qué: motor de scoring + POST /api/score.
- 13:29 · review. IA: Claude Code escribió motor, endpoint y 9 tests (detectó y corrigió un test mal planteado). Humano: pendiente de revisión de Diego.
- 13:33 · OK de Diego → T08 integrada en main.

## 13:33 · T22 · doing
- Qué: enlaces a búsquedas filtradas en portales (sin scraping).

## 13:39 · T15 · done (por orden directa de Diego)
- Qué: Dockerfile multi-stage, .dockerignore, railway.json (healthcheck, watchPatterns). Railway pasa de fallar en cada push a "Deployment successful"; API pública verificada.
- IA: Claude Code diagnosticó el fallo (Railpack sin Dockerfile + redeploy en cada commit de coordinación) y escribió la configuración.
- Humano: Diego pidió arreglarlo ya.

## 13:40 · T22 · done
- Qué: enlaces a búsquedas filtradas (zona + precio máx.) en Idealista, Fotocasa y Badi dentro de /api/score. 5 tests (19 en total).
- IA: Claude Code comprobó a mano los formatos de URL (Fotocasa en los 21 distritos; Idealista devuelve 403 a bots) y escribió el módulo.
- Humano: autonomía total (D-22).
- Siguiente: T11 (capa IA con OpenAI).

## 13:59 · T11 · done
- Qué: /api/ai/parse y /api/ai/explain con OpenAI (gpt-5.6-luna, Responses API, JSON schema estricto), validación/recorte de la salida, fallback por palabras clave y plantilla, caché para las 3 frases del pitch. 8 tests offline (27 en total).
- IA: Claude Code escribió todo; al probar de punta a punta detectó 2 fallos y los corrigió: (1) "Estudio en la ETSISI" se leía como "un estudio"; (2) sin peso mínimo de distancia salía El Pardo a 21 km como n.º 1.
- Medido: parse 2–3 s, explain 5–6 s (por eso la UI debe pintar resultados primero y la explicación después).
- Siguiente: no quedan tareas de API; ayudo en P0 de otros carriles.

## 14:02 · fix + T17 · done
- Fix: el modo sin IA perdía el presupuesto con "500 €" (bug encontrado por codex@adrian revisando mi código); caché del pitch re-indexada y test que asegura que los 3 chips de la web dan respuesta instantánea.
- T17: README final.
- IA: Claude Code; la revisión cruzada entre agentes (Adrián → API) funcionó como debía.

> Nota: horas corregidas con las horas reales de los commits (antes había estimaciones erróneas).

## 14:05 · T19 · done
- Qué: guion del pitch (docs/PITCH.md). Probé el flujo de la demo en la web publicada: los chips solo se ven en escritorio y el top 3 de la web difiere del de la API directa (la UI traduce prioridades a su manera), así que el guion usa las cifras que ve el jurado.
- IA: Claude Code. Humano: falta ensayar y grabar el vídeo de respaldo.

## 14:27 · T22 fix + T26 · done
- T22: slugs propios de Idealista (moncloa, fuencarral) tras el aviso de codex@techgallo; Fotocasa primero.
- T26: límite por IP y tope diario del LLM (protege la clave de pago en la demo pública), caché LRU de parse/explain, GZip y Cache-Control, health con estado del LLM. 35 tests.
- IA: Claude Code. Humano: Diego pidió que todo funcione perfecto mientras se decide el siguiente rediseño.

## 14:33 · T27 · done
- Qué: recomendación destacada con motivos y peros, y alternativas etiquetadas, en /api/score. 40 tests.
- IA: Claude Code; detectó que con 'aire limpio' el n.º 1 cerca de Campus Sur tiene aire mediocre y lo convirtió en un aviso honesto en vez de ocultarlo.
- Humano: idea de Diego.

## 16:58 · T29 · done (frontend, por orden de Diego)
- Qué: rediseño de inicio/formulario/cuenta, rutas con historial, botón Volver, arreglo del bug de scroll. Fusión con los cambios de animación de codex@adrian (resueltos 5 conflictos; un @keyframes partido rompía el build y se corrigió).
- IA: Claude Code; probado en navegador (escritorio 1440×900/1280×640 y móvil 375), build de producción y rutas servidas por FastAPI.
- Humano: Diego pidió hacerlo yo (no Codex) y fue ajustando: Volver a la derecha del logo, titular en una línea, quitar 'Datos abiertos' y 'Código'.

## 17:55 · T32 · done
- Qué: tiempos reales puerta a puerta (GTFS CRTM + OSRM), precios solo oficiales o anuncios reales, filtro de frases sin sentido o fuera de tema (sin IA) y IA siempre primero, panel único de capas que se atenúa al mover, parques apagados, zoom más cercano.
- IA: Claude generó ETL, backend, frontend y tests (61 en verde); Diego pidió y revisó los cambios.
- Siguiente: T33 (pendientes para el viernes).

## 10:45 · T33 · done
- Qué: pendientes del viernes + pasada de QA (bugs de filtros, mapa, parser, API 422, textos).
- IA: Claude + 3 subagentes Haiku revisaron código; Claude probó en navegador y corrigió.
