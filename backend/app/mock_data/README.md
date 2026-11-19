# mock_data

Datos **inventados** con el formato de `coordination/CONTRACTS.md` §3, para que WEB y API trabajen antes de que exista el ETL.
El backend los usa solo si falta alguno de `data/processed/{indicators.json,barrios.geojson,campuses.json}` (`/api/health` devuelve `data: "mock"` y `/api/meta` `is_mock: true`).
**Nunca se muestran como datos reales.** WEB puede copiar estos mismos ficheros a `frontend/src/mocks/`.
