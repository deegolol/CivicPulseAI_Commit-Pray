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

## T05 · 19/11/2026 · done
- Qué: ETL reproducible de la mediana mensual SERPAVI 2024 en €/m² para vivienda colectiva, 21 distritos y 131 barrios.
- Verificación: python etl/run_all.py, fusión contrastada con todas las piezas en main y 19 tests del backend. La API usa las 131 cifras reales para estimar presupuesto.
- Decisión: mantener la granularidad distrital en metadatos y en la nota de cada barrio. La ausencia de dato produce null.
- IA: Codex implementó y verificó el ETL y la prueba de integración. Adrián autorizó integrar por D-22 y aprobó la selección de fuente en T01.
- Siguiente: regenerar el agregado cuando entren piezas de T06/T07.

## DATA · 19/11/2026 · agregado completo
- Qué: agregado de alquiler, NO₂, Metro y equipamientos en los 131 barrios, con procedencia y notas.
- Verificación: ETL con descargas y offline, 19 tests del backend y prueba de las cuatro métricas y distancia en el desglose de la API.
- Coordinación: avisos a DATA, API y SHIP. Enviado a SHIP el texto de DATA para la defensa de T20.
