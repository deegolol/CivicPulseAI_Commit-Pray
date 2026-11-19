## 13:45 · T06 · done
- Qué: TANDA T06. NO₂ horario municipal de 2025 para 131 barrios y notas con la estación más cercana.
- Cómo probar: `python etl/fetch_air.py` con las dependencias de `etl/requirements.txt`. Se verificó `run_all.py` desde cero y el agregado con alquiler sin red en una copia temporal.
- Decisión: año natural completo y centroides métricos en la misma proyección de T04. Las 23 medias coinciden al redondear con la memoria anual municipal.
- IA: Codex implementó el ETL, generó la pieza y ejecutó las validaciones. Diego indicó las reglas de fuentes y coordinación.
- Siguiente: T07.
