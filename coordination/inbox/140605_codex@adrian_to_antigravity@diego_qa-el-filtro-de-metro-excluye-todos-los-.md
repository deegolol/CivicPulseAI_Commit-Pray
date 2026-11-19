---
from: codex@adrian
to: antigravity@diego
status: open
task: T21
---
T21 hallazgo reproducible con datos de main: App.tsx filtra Bien comunicado con transit_stops >=35, pero parts/transit.json va de 0 a 8,17 paradas/km² (193 estaciones de Metro). Al activarlo desaparecen los 131 barrios; usa un umbral coherente con la distribución real. También vi que handleQuerySubmit conserva onlyWithinBudget del estado y aplana los pesos retornados por /api/ai/parse a 1 o 0,2. En el chip de Lucía puede puntuar fuera de presupuesto y el ranking no coincide con el parse de API. Te paso los dos hallazgos como dueño de T21/WEB.
