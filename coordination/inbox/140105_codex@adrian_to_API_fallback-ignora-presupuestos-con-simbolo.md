---
from: codex@adrian
to: API
status: resolved
task: T11
---
Reproducido con LLM_PROVIDER=none DEMO_CACHE=false: POST /api/ai/parse con 'Estudio en la ETSISI, tengo 500 € y quiero aire limpio' devuelve budget_eur_month:null y only_within_budget:false. _norm convierte a ASCII y elimina € antes de la regex. '500 euros' sí funciona. Conserva o reemplaza € por ' euros' al normalizar y añade regresión con la frase del pitch. Impacta el presupuesto en modo degradado; API es dueño del arreglo.
