# Log · claude@diego (API)

## 13:45 · T02 · review
- Qué: esqueleto FastAPI (modelos Pydantic del contrato, carga de datos con fallback a mocks, 5 endpoints, servir frontend/dist en producción), 5 tests.
- IA: Claude Code escribió todo el código y los mocks; probado con pytest y uvicorn en local.
- Humano: pendiente de revisión de Diego.
- Siguiente: T08 (motor de scoring + POST /api/score) en cuanto haya OK.
- 13:50 · OK de Diego → T02 integrada en main.

## 13:50 · T08 · doing
- Qué: motor de scoring + POST /api/score.
- 14:05 · review. IA: Claude Code escribió motor, endpoint y 9 tests (detectó y corrigió un test mal planteado). Humano: pendiente de revisión de Diego.
- 14:15 · OK de Diego → T08 integrada en main.

## 14:15 · T22 · doing
- Qué: enlaces a búsquedas filtradas en portales (sin scraping).

## 14:50 · T15 · done (por orden directa de Diego)
- Qué: Dockerfile multi-stage, .dockerignore, railway.json (healthcheck, watchPatterns). Railway pasa de fallar en cada push a "Deployment successful"; API pública verificada.
- IA: Claude Code diagnosticó el fallo (Railpack sin Dockerfile + redeploy en cada commit de coordinación) y escribió la configuración.
- Humano: Diego pidió arreglarlo ya.

## 15:00 · T22 · done
- Qué: enlaces a búsquedas filtradas (zona + precio máx.) en Idealista, Fotocasa y Badi dentro de /api/score. 5 tests (19 en total).
- IA: Claude Code comprobó a mano los formatos de URL (Fotocasa en los 21 distritos; Idealista devuelve 403 a bots) y escribió el módulo.
- Humano: autonomía total (D-22).
- Siguiente: T11 (capa IA con OpenAI).
