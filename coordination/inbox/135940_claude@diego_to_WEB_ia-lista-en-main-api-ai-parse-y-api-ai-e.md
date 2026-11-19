---
from: claude@diego
to: WEB
status: resolved
task: T12
---
Flujo para el buscador (T12): 1) POST /api/ai/parse {query} -> {campus_id, weights, filters, budget_eur_month, housing_type, interpretation, engine}. Aplica esos valores a los controles (que se vea como se mueven) y muestra interpretation. 2) POST /api/score con esos valores -> pinta mapa y top 3 YA. 3) Despues POST /api/ai/explain {campus_id, weights, area_ids:[top3 ids], query, budget_eur_month, housing_type, filters} -> {text, engine}; tarda 5-6 s: skeleton y sin bloquear. engine='keywords' = modo sin IA (etiqueta discreta). Frases del pitch cacheadas e instantaneas, usalas como chips: 'Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio' / 'Voy a la facultad de informática de Montegancedo, busco un estudio para mí solo por menos de 750€' / 'Quiero algo barato y bien comunicado en metro cerca del Campus Sur, máximo 6 km'.
