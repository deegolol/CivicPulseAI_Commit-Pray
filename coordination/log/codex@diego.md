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

## 13:57 · Apoyo a T20 y T21
- Envié el resumen técnico de DATA a SHIP. Pasaron 19 pruebas de backend, un smoke de API con los datos reales y la compilación del frontend en una copia aislada.
- Comparé el agregado publicado por Adrián (`ca91e4b`) con las cuatro piezas. Coinciden todos los IDs, valores y notas de los 131 barrios. SHIP informado.

## 14:14 · T20 y T21 · comprobación desde clon limpio
- Envié el resumen de defensa a TechGallo, y a SHIP el resultado de make check (29 tests y build web) y de make data.
- Reproduje el error de red del Geoportal y confirmé un espejo municipal. Adrián integró el fallback a7cf5aa. La descarga automática se verificó desde un clon sin caché.
- Cuatro piezas y campus byte a byte. Agregado idéntico salvo generated_at. Propiedades de los 131 barrios idénticas, distancia máxima de 7,12e-15 grados.

## 14:18 · T21 · compatibilidad del ETL en Windows
- SHIP reprodujo la falta de la zona Europe/Madrid y un error de salida CP1252. Añadí tzdata y cambié el mensaje de consola a NO2 ASCII, conservando el símbolo del indicador.
- El pipeline completo pasó en un entorno recién instalado, sin zonas del sistema y con la salida redirigida en CP1252. Piezas de aire, Metro y servicios idénticas. Integrado como d8f2cf8.
- TechGallo confirmó make data en Windows desde un entorno nuevo con solo etl/requirements.txt y sin ajustes de codificación. Se regeneraron los 131 barrios con los cuatro indicadores.

## 14:42 · Cobertura de API (D-28)
- Revisé los contratos, el backend y el log de Claude.
- Suite local con `LLM_PROVIDER=none`: 41 tests en verde.

## 14:57 · T27 · texto de recomendación
- Por feedback de Diego, la tarjeta separa los recuentos oficiales de deporte y bibliotecas, indica el alcance municipal si Servicios pesa mucho y expresa aire y Metro en lenguaje sencillo.
- Las medidas siguen disponibles en el desglose. Probé el caso ETSIINF con deporte y añadí una prueba de regresión. 42 tests en verde.

## T25 · Logo de PrimeraLlave
- Diego pidió una marca simple y premium. Codex diseñó una puerta geométrica en carbón, blanco y rojo, y reutilizó el símbolo en las dos cabeceras y el favicon.
- Verificado en Chromium a 1280 y 390 px y con npm run build. Integrado como 25a163b.

## T25 y T28 · Búsqueda, preferencias y mapa
- Diego pidió completar los cambios pendientes de publicación. Revisé main y las ramas remotas. Implementé búsqueda con revisión y formulario manual, criterios opcionales vinculados al scoring y estrellas globales destacadas.
- El mapa conserva el color, limita el zoom y el desplazamiento al entorno de España y reduce actualizaciones durante hover. Corregí las fichas que quedaban pegadas al arrastrar (8c73930).
- QA local con Chromium en escritorio y móvil, build web y 43 tests de backend.
