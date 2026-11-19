---
id: T25
title: Rediseño v2 — que NO parezca hecho por IA + flujo "primero preguntas, luego mapa" (Diego)
lane: WEB
priority: P0
status: done
owner: antigravity@diego
depends_on: [T24]
files: [frontend/src/**, frontend/index.html]
---
## Por qué
Los 3 humanos coinciden: la UI actual **parece hecha por IA ("muy de Claude")**. Fondo crema, serif Fraunces, acento dorado, tarjetas redondeadas con brillo y ✨: es la estética por defecto de los generadores. Queremos algo **premium, bonito y simple**, con personalidad propia. **Sustituye la dirección visual de T24**; la funcionalidad se mantiene.

## 1. Nuevo flujo (lo más importante)
**No arrancamos con el mapa.** 131 barrios coloreados sin contexto abruman. Flujo en 2 pantallas:

**A) Pantalla de inicio** (sin mapa; si la URL ya trae parámetros, se salta y va directo a B)
- Titular grande: **"¿Dónde vas a vivir este curso?"**. Subtítulo de 1 línea: "Te decimos qué zonas de Madrid encajan con tu campus y tu presupuesto. Con datos oficiales."
- **Un bloque central** con dos formas de empezar:
  1. Buscador grande en lenguaje natural + los 3 chips del pitch (ya cacheados).
  2. Debajo, "o elige tú": **Campus** (2 tarjetas seleccionables, ETSISI y ETSIINF), **Presupuesto** (número grande + slider, €/mes) y **Tipo** (Habitación · Estudio · Piso). Botón principal: **"Ver zonas"**.
- Pie discreto con la confianza: "Datos de Ayuntamiento de Madrid · Ministerio de Vivienda · CRTM".
- Transición suave (≈300 ms) hacia B.

**B) Resultados: lista primero, mapa de apoyo**
- **Barra superior fija** con el resumen editable en chips: `ETSISI · 500 €/mes · Habitación · ≤ 10 km · Más filtros`. Al tocar un chip se edita en un popover; "Más filtros" abre el aire, el transporte y "solo dentro de mi presupuesto".
- **Escritorio:** columna izquierda (~440 px) con la **lista ordenada de zonas** y mapa a la derecha. **Móvil:** lista a pantalla completa y botón flotante "Mapa" / "Lista".
- **Tarjeta de zona** (simple): puesto, nombre del barrio en grande, distrito en pequeño; **"~287 €/mes"** como cifra protagonista; "2,7 km de tu campus"; una etiqueta "Encaja" o "Se pasa 40 €"; botón secundario **"Ver pisos"**. Nada más; el resto va en el detalle.
- **Mapa:** solo destacan las zonas del top 10 (azul por encaje); el resto en gris muy claro. Pasar el ratón por la tarjeta resalta el barrio y viceversa. Campus como punto rojo con etiqueta.
- **Resumen de la búsqueda** encima de la lista: una línea ("Habitación hasta 500 € cerca de la ETSISI, priorizando aire limpio") y "Leer explicación" que despliega el texto de `/api/ai/explain`. **Sin** etiquetas "IA", sin ✨, sin degradados.
- **Detalle** en panel lateral (o pantalla completa en móvil): precio estimado grande, "Ver pisos en Idealista / Fotocasa / Badi", cifras con su fuente y comparación con la media de Madrid en barras finas (sin radar si no aporta).

## 2. Identidad visual (tokens en `src/index.css`, sustituyen los actuales)
- **Tipografía (Google Fonts):** titulares y cifras grandes en **Bricolage Grotesque** (600/700); interfaz en **Instrument Sans** (400/500/600). **Fuera Fraunces y fuera Inter.** Cifras con `tabular-nums`.
- **Color:**
  - Fondo `#FFFFFF`; superficie `#F5F6F8`; borde `#E4E7EC`; tinta `#0D1117`; secundario `#5D6673`.
  - **Marca y CTA: rojo Madrid `#D7262E`** (hover `#B91F26`). Úsalo poco: logo, botón principal, punto del campus.
  - **Mapa, escala de azules** (de menos a más encaje): `#EEF3FF` `#C9D8FF` `#8FB0FF` `#4D7CF5` `#1F4FD6`; excluido `#ECEEF2`.
  - Estados: encaja `#12805C`; se pasa `#B54708` (ámbar, no rojo, para no confundir con la marca).
- **Forma:** radio 10 px (tarjetas) y 8 px (controles); bordes de 1 px en vez de sombras grandes; como mucho una sombra suave en popovers. **Sin** glassmorphism, sin desenfoques, sin degradados, sin emojis.
- **Iconos:** lucide con trazo 1.75, solo donde aporten (no uno por línea).
- **Microcopy:** en español, directo y cercano: "Ver zonas", "Ver pisos", "Encaja", "Se pasa 40 €", "2,7 km de tu campus".
- **Mapa base:** CARTO **Positron sin etiquetas** (`light_nolabels`) + etiquetas solo de los barrios destacados, para que el azul sea lo único que destaca.

## 3. Referencias de tono
Citymapper (claridad urbana), Airbnb (tarjetas limpias y precio protagonista), Linear (tipografía y aire). **No** debe recordar a una demo genérica de IA.

## Criterios de aceptación
- [x] Flujo A → B funcionando; con parámetros en la URL se abre directamente B.
- [x] Ni Fraunces ni Inter ni tonos crema o dorados; tokens solo en `index.css`.
- [x] Escritorio y móvil sin errores en consola; `npm run build` limpio.
- [x] Los 3 chips del pitch siguen funcionando (y visibles también en móvil).
- [x] Capturas antes/después en `docs/screenshots/` (`t25_*`) y aviso por `msg.sh` a `claude@diego` para actualizar el guion del pitch.

## Notas / progreso
- Implementado flujo en 2 pantallas (`OnboardingScreen.tsx` sin mapa → `TopFilterBar.tsx` con popovers + `ZoneList.tsx` lista primero 440 px + `MadridMap.tsx` azul Top 10 / resto gris + `AreaDetailPanel.tsx` + `CompareModal.tsx`).
- Paleta blanca `#FFFFFF` + rojo Madrid `#D7262E` + escala azul de 5 pasos; tipografía `Bricolage Grotesque` + `Instrument Sans`; cero crema/dorado/sparkles/IA badges/degradados/glass/porcentajes.
- Corregido crash móvil `Invalid LatLng (NaN, NaN)` al ocultar el mapa y sustituidas teselas CARTO (que devolvían marca de agua `API KEY REQUIRED`) por OSM con filtro Positron claro.
- Verificado en navegador integrado (`1440×900` y `390×844`): 0 errores de consola, 0 `%` en DOM, capturas en `docs/screenshots/t25_*.png` y `npm run build` en verde.
