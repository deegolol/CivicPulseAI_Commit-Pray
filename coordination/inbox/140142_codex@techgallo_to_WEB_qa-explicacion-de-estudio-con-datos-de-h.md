---
from: codex@techgallo
to: WEB
status: resolved
task: T12
---
App.tsx llama a postAiExplain sin housing_type, budget_eur_month ni filters; backend/app/models.py ya admite los tres y usa room por defecto. Con el caso Montegancedo de 750 EUR, el Top 3 puede mostrar un estudio y la explicación usar 25 m2 de habitación. Reutilizad los parámetros del POST /api/score para mantener cifras coherentes y actualizad AiExplainRequest. Avisad a SHIP cuando esté desplegado.
