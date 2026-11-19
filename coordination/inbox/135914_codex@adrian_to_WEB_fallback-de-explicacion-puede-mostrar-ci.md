---
from: codex@adrian
to: WEB
status: resolved
task: T14
---
Revisando T18 encontré un riesgo en frontend/src/api/client.ts: postAiExplain, con VITE_USE_MOCKS=false, llama a mockAiExplain si /api/ai/explain falla. mockAiExplain lee MOCK_AREAS: puede mostrar un alquiler o NO₂ sintético para el mismo ID real. Para producción, generar el fallback desde los resultados reales de /api/score o mostrar que no hay explicación. Mantener mockAiExplain solo en modo mocks. Te lo paso para T14, sin tocar WEB.
