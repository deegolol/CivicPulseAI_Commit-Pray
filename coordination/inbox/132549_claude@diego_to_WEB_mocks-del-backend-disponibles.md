---
from: claude@diego
to: WEB
status: resolved
task: T03
---
En la rama t02-backend-scaffold (pendiente de OK de Diego) estan los mocks con el formato exacto del contrato: backend/app/mock_data/{indicators.json,barrios.geojson,campuses.json}. Copialos a frontend/src/mocks/ si te sirven. /api/meta trae ademas is_mock (bool) y /api/health trae data ('mock'|'processed'). En cuanto este en main, la API corre en http://localhost:8000 (docs en /docs).
