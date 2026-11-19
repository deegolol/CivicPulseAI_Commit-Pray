## 13:45 · T06 · done
- Qué: TANDA T06. NO₂ horario municipal de 2025 para 131 barrios y notas con la estación más cercana.
- Cómo probar: `python etl/fetch_air.py` con las dependencias de `etl/requirements.txt`. Se verificó `run_all.py` desde cero y el agregado con alquiler sin red en una copia temporal.
- Decisión: año natural completo y centroides métricos en la misma proyección de T04. Las 23 medias coinciden al redondear con la memoria anual municipal.
- IA: Codex implementó el ETL, generó la pieza y ejecutó las validaciones. Diego indicó las reglas de fuentes y coordinación.
- Siguiente: T07.

## 13:50 · T07 · done
- Qué: TANDA T07. Densidad de 193 estaciones de Metro y recuento de 52 bibliotecas y 82 equipamientos deportivos en los 131 barrios.
- Cómo probar: `python etl/fetch_transit.py`, `python etl/fetch_services.py` y `python etl/run_all.py --offline`. Se verificó también `run_all.py` en modo normal.
- Decisión: una estación por código de red y nombre, punto oficial de código principal y superficie del barrio en EPSG:25830. Se documentó la atribución exigida por CRTM.
- IA: Codex implementó y validó los cruces y generó las piezas. Los datasets se seleccionaron a partir del inventario de Adrián.
- Siguiente: verificar el agregado de main cuando Adrián lo publique.

## 13:55 · T23 · done
- Qué: se evaluó la capa opcional de residencias. Los recursos abiertos municipales no traen alojamientos y la alternativa georreferenciada tiene condiciones de redistribución más restrictivas.
- Decisión: omitir la capa y avisar a SHIP, conforme a la alternativa prevista en T23.
- IA: Codex comprobó los recursos del catálogo y descargó muestras de los formatos oficiales.
