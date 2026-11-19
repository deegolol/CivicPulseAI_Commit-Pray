# Pitch PrimeraLlave — 5 minutos, demo en vivo

> Rúbrica: impacto 25 · técnica 25 · dato abierto 20 · diseño 15 · **presentación y defensa 15** (pitch claro, demo en vivo **sin diapositivas innecesarias**, dominio técnico en preguntas).
> Regla de oro: **enseñar, no contar.** El 60 % del tiempo es la app funcionando.

**Demo:** https://primerallave.up.railway.app (plan B en local: `make dev` → http://localhost:5173)
**Reparto propuesto** (cambiadlo si queréis): **TechGallo** abre y cierra · **Diego** lleva el ratón y explica la IA · **Adrián** explica los datos.

---

## Guion (≈ 650 palabras habladas)

### 0:00–0:30 · Gancho — TechGallo (pantalla: la app ya abierta, sin tocar)
> "Esta es Lucía. Tiene 18 años, viene de fuera y la semana que viene empieza en la ETSISI. Tiene 500 euros al mes y no conoce Madrid. Abre Idealista y ve miles de pisos… pero nadie le dice **en qué zona le conviene buscar**: cuánto se paga allí de verdad, a cuánto queda de su campus o si el aire está limpio. Esa información existe, pero está en datasets públicos que nadie cruza. Por eso hemos hecho **PrimeraLlave**."

### 0:30–3:00 · Demo en vivo — Diego (Adrián le apoya con los datos)
> Se empieza en la **pantalla de inicio** (sin mapa): "¿Dónde vas a vivir este curso?". Abrid la demo **sin parámetros en la URL**.

1. **Escribe como Lucía**: pulsa el chip *"Estudio en la ETSISI, tengo 500 euros y quiero una zona tranquila con aire limpio"* (o escríbelo).
   > "Lucía no rellena un formulario: escribe como habla. Entendemos su campus, su presupuesto, que busca habitación y que le importa el aire."
2. **Aparece su recomendación**, arriba del todo y resaltada en rojo también en el mapa.
   > "No le damos una lista y ya está: le decimos **cuál es su mejor opción y por qué**. **Palomeras Bajas**: unos **287 € al mes** por una habitación, **le sobran 213 €** de su presupuesto, a 2,7 km de su campus y bien comunicada."
3. **Señala "A tener en cuenta"**.
   > "Y somos honestos: Lucía pidió aire limpio y aquí el aire es mejorable. **Se lo decimos**, con la cifra. Debajo tiene alternativas: la más cercana, la más barata, la de mejor aire… y si quiere, la explicación en lenguaje natural, solo con cifras reales."
4. **"Ver detalle"** de la recomendada → precio estimado grande y cada cifra con su fuente.
   > "Es la **mediana oficial del alquiler del Ministerio de Vivienda** por m², por los m² de una habitación: **encaja**. Aire, metro, distancia… y cada cifra lleva su fuente."
5. **"Ver pisos"** → el portal (Fotocasa/Idealista/Badi) abierto con el distrito y el precio máximo ya filtrados.
   > "Y de la zona, al piso: te llevamos a los anuncios ya filtrados por zona y presupuesto."
6. **Cambia un chip de la barra superior** (presupuesto o km) → la lista y el mapa cambian al instante.
7. **10 segundos en móvil**: misma app, lista primero y botón "Mapa".

### 3:00–4:00 · Cómo funciona — Adrián (datos) + Diego (IA) · *una sola imagen: el diagrama del README*
- **Adrián:** "Cruzamos **5 fuentes oficiales**: los 131 barrios y la calidad del aire del **Ayuntamiento de Madrid**, el alquiler **SERPAVI 2024 del Ministerio de Vivienda**, las estaciones de **Metro del CRTM** y bibliotecas y polideportivos municipales. Scripts reproducibles: `make data` lo regenera todo desde las fuentes."
- **Diego:** "El encaje es un motor propio, sencillo y explicable: normalizamos cada indicador, lo ponderamos según lo que importa al estudiante, y lo cubren 29 tests. **La IA no inventa datos**: traduce la frase a parámetros con un JSON Schema estricto que validamos, y redacta la explicación solo con cifras que ya hemos calculado. Si OpenAI cae, la app sigue funcionando sin IA."

### 4:00–4:40 · Impacto — TechGallo
> "Hay herramientas que recomiendan barrios, como Madriwa, y portales que enseñan anuncios. **PrimeraLlave une las dos cosas para estudiantes**: tu campus, tu presupuesto y tus prioridades, con datos oficiales, y de ahí directo al piso. Funciona con cualquier campus y es trasladable a cualquier ciudad con portal de datos abiertos."

> «El siguiente paso es crear una cuenta para guardar viviendas y recibir recordatorios y avisos de presupuesto».

### 4:40–5:00 · Cierre — TechGallo
> "Encontrar tu primera casa en Madrid no debería ser una lotería. **PrimeraLlave: tu primera llave en Madrid.** Lo tenéis en primerallave.up.railway.app. Gracias."

---

## Antes de salir (checklist)
- [ ] Portátil de la demo **cargado**, notificaciones **desactivadas** (modo No molestar) y otras apps cerradas.
- [ ] La demo abierta en **Chrome a pantalla completa**, zoom 100 % (o 110 % si la sala es grande), probada **5 minutos antes**.
- [ ] Pestañas preparadas: 1) la demo, 2) `/docs` de la API, 3) README en GitHub. Nada más.
- [ ] Probada la **wifi de la sala**; si falla, conecta el móvil como punto de acceso o usa el plan B.
- [ ] Ensayado con cronómetro **3 veces** (jueves 17:00, viernes 11:15 y 11:30). Si pasa de 5:00, quita el paso 6.

## Plan B
| Si falla… | Hacemos… |
|---|---|
| Internet en la sala | `make dev` en local (datos versionados): todo funciona sin red. Los 3 chips de la demo usan **respuestas cacheadas**, así que la IA "funciona" también offline. |
| OpenAI lento o caído | La app pasa sola al **modo sin IA** (etiqueta discreta). Seguir sin comentarlo; si preguntan, es un punto a favor: "está diseñado para no depender de la IA". |
| Railway caído | Plan B local. |
| Todo | **[GIF de respaldo de 60 s](demo.gif)** (preparado por codex@techgallo) y capturas en `docs/screenshots/`. ⚠️ Si aún muestra el diseño anterior, codex@techgallo lo regraba con el v2. |

## Preguntas difíciles (todos deberíais saber responderlas)
| Pregunta | Respuesta corta |
|---|---|
| ¿De dónde sale el precio? ¿Es real? | Mediana oficial en €/m² de contratos de vivienda colectiva (SERPAVI 2024, Ministerio de Vivienda) **por distrito**, × m² de referencia (habitación 25, estudio 35, piso 60). Es una **estimación con datos oficiales**; el precio exacto está en los anuncios enlazados. |
| ¿Por qué por distrito y no por barrio? | Es el dato oficial más fino que cubre los 21 distritos. SERPAVI tiene secciones censales, pero combinar medianas de sección en una mediana de barrio no es estadísticamente válido sin microdatos. Lo indicamos en la app. |
| ¿Cómo calculáis el encaje? | Min–max de cada indicador entre los 131 barrios (1 = mejor; se invierte en alquiler, NO₂ y distancia), un dato que falta cuenta como la mediana, pesos que suman 1 y media ponderada. Los filtros excluyen sin alterar al resto. `backend/app/scoring.py` + tests. |
| ¿Y si la IA se inventa algo? | No puede: solo devuelve parámetros con un **JSON Schema estricto** que además validamos y recortamos (campus que exista, presupuesto 50–10.000 €, km 0–60, pesos 0–1). La explicación solo recibe cifras ya calculadas por nuestro motor. |
| ¿Qué pasa si OpenAI no responde? | Timeout de 8 s (12 s la explicación) → intérprete por palabras clave y explicación por plantilla. La app nunca se queda colgada. |
| ¿Cómo asignáis el aire a un barrio? | Media anual de NO₂ 2025 (horas válidas) de la **estación más cercana** al centroide del barrio (23 estaciones con datos). |
| ¿Y el transporte? | Estaciones de Metro del CRTM por km² de barrio. Limitación: no incluye EMT ni Cercanías. |
| ¿La distancia es en tiempo? | Es en línea recta (haversine). El tiempo en transporte público es la mejora natural siguiente (GTFS del CRTM). |
| ¿Hacéis scraping de Idealista? | No. Solo generamos **enlaces** a sus búsquedas filtradas; el estudiante aterriza en el portal. |
| ¿Por qué Montegancedo da barrios de Latina? | El campus está en Boadilla/Pozuelo, fuera del municipio, y nuestros datos son de los barrios de Madrid capital: los más cercanos están en Latina y Moncloa. Ampliar a municipios es una mejora siguiente. |
| ¿Arquitectura? | ETL Python → JSON versionados → FastAPI (scoring, enlaces, IA) → React + Vite + TS + Leaflet. Un único contenedor Docker en Railway que se despliega en cada push a main. |
| ¿Cómo habéis usado la IA para programar? | 3 personas y 5 agentes (Claude Code, Codex, Antigravity) en el mismo repo, coordinados con AGENTS.md, tareas con dueño, contratos fijos y un buzón de mensajes. Revisión cruzada: un agente de DATA encontró un bug en la API y se arregló con test de regresión. Detalle en AI_USAGE.md. |
| ¿Existe ya algo así? | Madriwa recomienda barrios con datos abiertos, pero no usa presupuesto ni está pensada para estudiantes ni lleva a pisos. Los portales tienen pisos, pero no te dicen qué zona te conviene. Nosotros unimos las dos cosas. |

## Cifras para no equivocarse (comprobadas en la demo publicada tras el rediseño v2)
- 131 barrios · 21 distritos · 5 fuentes oficiales (9 ficheros) · 2 campus UPM.
- **Frase 1** (ETSISI, 500 €, aire limpio): **#1 Palomeras Bajas** (Puente de Vallecas) ~287 €/mes · 2,7 km · **#2 Palomeras Sureste** ~287 € · 0,9 km · **#3 Pavones** (Moratalaz) ~293 € · 1,1 km.
- **Frase 2** (Montegancedo, estudio < 750 €): **#1 Campamento** (Latina) ~404 €/mes · **#2 Águilas** · **#3 Aluche**.
- **Frase 3** (barato, metro, ≤ 6 km de Campus Sur): **#1 Media Legua** (Moratalaz) ~293 €/mes · 3,5 km · **#2 Palomeras Bajas** · **#3 Palomeras Sureste**, con el radio de 6 km dibujado en el mapa.
- Repasadlas igualmente el viernes a las 11:15 pulsando los chips en la demo.
