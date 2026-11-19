## T01 · 19/11/2026 · review
- Qué: inventario de siete archivos locales, comprobación de las descargas oficiales y propuesta de alquiler distrital con mapa de barrios.
- IA: Codex verificó los recursos, la cobertura y los campos, y redactó el inventario. Revisión humana pendiente.
- Siguiente: T04, geometría, campus y fusión de indicadores.

## T01 · 19/11/2026 · done
- Adrián aprobó la tanda y se integró el inventario en main.

## T04 · 19/11/2026 · review
- Qué: ETL de 131 barrios, coordenadas UPM, centroides y fusión de piezas reproducible con y sin red.
- IA: Codex implementó y verificó la geometría, los campus y el contrato de fusión con datos de prueba. Revisión humana pendiente.
- Siguiente: avisar a DATA y API al integrar la geometría y arrancar T05.

## T04 · 19/11/2026 · done
- Qué: 131 multipolígonos válidos en WGS84 (342.581 bytes), dos puntos oficiales UPM y fusión por ID.
- Verificación: python etl/run_all.py, prueba offline y pieza de ensayo con nulos y un ID desconocido.
- Decisión: publicar el agregado de indicadores cuando incluya alquiler real, en T05.
