---
id: T24
title: Rediseño premium de la interfaz (petición de Diego)
lane: WEB
priority: P0
status: doing
owner: antigravity@diego
depends_on: [T03]
files: [frontend/src/**, frontend/index.html, frontend/tailwind.config.*, frontend/src/index.css]
---
## Objetivo
Diego (humano) pide que la interfaz sea **fácil de usar, bonita y con aspecto premium**. Ahora mismo no lo es. Hazlo **antes de T09/T10**: así esas tareas ya se construyen sobre el sistema de diseño nuevo. Para el jurado, el diseño vale 15 puntos y además es lo primero que ven en la demo.

## Dirección de diseño: "editorial, calmado, de confianza"
Referencias de tono: Airbnb, Linear, Revolut. Poco ruido, mucho aire, jerarquía clara y un solo color de acento.

**1. Paleta (tokens en un único sitio: tema de Tailwind o variables CSS)**
- Fondo: blanco roto cálido `#FAFAF7`; superficies `#FFFFFF`; bordes `#E7E5E0`.
- Texto: tinta `#14161A`; secundario `#5B6170`.
- Acento único "llave/latón": `#B8862B` (hover `#9C7022`). Úsalo con moderación: botón principal, rango #1, foco.
- Estados: encaja `#1F7A5A`; no encaja `#B4473A`; información `#3B5BA9`.
- **Coroplético con una sola tonalidad** (5 pasos del acento, de claro a intenso), NO semáforo verde/amarillo/rojo, que da aspecto barato. Excluidos: gris claro con trama o con opacidad 0.35.

**2. Tipografía (Google Fonts)**
- UI: **Inter** (400/500/600). Titulares y cifras grandes: **Fraunces** o **Instrument Serif**: el precio grande en serif da el toque premium.
- Números con `font-variant-numeric: tabular-nums`. Formato español: `1.234 €`, `14,1 €/m²`.

**3. Mapa**
- Teselas **CARTO Positron** (claras y minimalistas) en lugar de las de OSM por defecto. Mantén la atribución.
- Polígonos con borde blanco de 1 px y relleno al 70 %. Al pasar el ratón: borde del acento y tarjeta flotante (nombre, puntuación, €/mes).
- Marcador del campus personalizado (icono de llave o gorro en un círculo del acento). `flyTo` suave al seleccionar un barrio.

**4. Layout en escritorio**
- Mapa a pantalla completa. **Panel flotante a la izquierda** (≈380 px, `rounded-2xl`, sombra suave, fondo blanco al 90 % con desenfoque) con, por orden:
  1. Logo + nombre (APP_NAME) y el lema "Tu primera llave en Madrid".
  2. **Buscador en lenguaje natural** grande (placeholder: "Estudio en la ETSISI, tengo 500 € y quiero zona tranquila…") con 3 ejemplos en chips (T12 lo conecta; ahora puede ser solo visual).
  3. Campus (select bonito), **presupuesto con número grande** + slider, tipo de vivienda como control segmentado (Habitación / Estudio / Piso).
  4. **PROHIBIDO mostrar porcentajes o pesos (orden de Diego).** Cada control va en su unidad real:
     - Presupuesto: **€/mes** (slider + número grande, p. ej. 300–1.200 €).
     - Distancia máxima al campus: **km** (radio; dibuja el círculo en el mapa alrededor del campus).
     - Tipo: Habitación / Estudio / Piso.
     - Calidad del aire: **µg/m³ de NO₂ máximo** o niveles con nombre ("Buena ≤ 30 · Aceptable ≤ 40"), nunca %.
     - Transporte: **paradas cerca** (mínimo) o "Bien comunicado" sí/no.
     - "Lo que más me importa": chips para elegir (Precio · Cercanía · Aire limpio · Transporte · Servicios), sin números. Por dentro el frontend lo traduce a `weights` (p. ej. chip elegido = 1, no elegido = 0,2) y a `filters` (`max_distance_km`, `only_within_budget`…), pero el usuario nunca ve un %.
   - El resultado también en unidades: "~353 €/mes · 1,3 km · NO₂ 25 µg/m³", y la puntuación como "Encaje alto/medio/bajo" o estrellas, no "79/100" a secas.
- **A la derecha:** carril con las 3 mejores zonas en tarjetas (puesto, nombre, ~€/mes en serif, km, "Encaja"). Al hacer clic, el detalle se abre como panel lateral.
- **Detalle de la zona:** el héroe es el bloque "Con tu presupuesto: **~353 €/mes**", con la etiqueta "Encaja" y el CTA principal **"Ver pisos en esta zona"**. Debajo, el desglose de la puntuación en barras finas y las fuentes con enlace.

**5. Móvil (< 768 px)**
- Mapa a pantalla completa, buscador arriba, **bottom sheet** con 3 alturas (asoma con el n.º 1, mitad con el top 3, completo con el detalle). Zonas táctiles de 44 px o más.

**6. Detalles que hacen "premium"**
- Animaciones de 150–250 ms con `ease-out`; las cifras cuentan hacia arriba al cambiar; esqueletos de carga en vez de "Cargando…".
- Iconos **lucide** con trazo 1.5, siempre del mismo tamaño. Sombras suaves y en capas (nada de sombras duras).
- La etiqueta "Modo mock": discreta (pequeña, gris, en la esquina), nunca protagonista.
- Contraste AA, anillos de foco visibles y `prefers-reduced-motion`.
- Microcopy en español, cercano, tuteando: "Esto es lo que te da tu presupuesto aquí".

## Criterios de aceptación
- [ ] Tokens de color y tipografía en un único sitio; ningún color "a pelo" en los componentes.
- [ ] Escritorio y móvil según lo anterior, sin errores en consola y con `npm run build` limpio.
- [ ] El informe de tanda incluye **capturas antes/después** (escritorio y móvil) en `docs/screenshots/`.
- [ ] Respeta CONTRACTS.md (solo cambia la presentación, no los datos).

## Notas / progreso
<!-- El owner apunta aquí avances, decisiones y bloqueos -->
