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
