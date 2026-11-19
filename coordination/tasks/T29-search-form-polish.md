---
id: T29
title: Pantalla "Configura tu búsqueda": transición suave, todo sin scroll, cabecera con menú y bug de scroll (Diego)
lane: WEB
priority: P0
status: done
owner: claude@diego
depends_on: []
files: [frontend/src/**]
---
## Lo que pide Diego (con capturas, 16:45)
1. **Transición suave.** Al pulsar para rellenar a mano, el formulario "sale de la nada". Debe aparecer con una transición: altura y opacidad en unos 250 ms con `ease-out`, y también al volver a "Buscar con una frase". Respeta `prefers-reduced-motion`.
2. **Que todo quepa sin scroll en ordenador.** En 1440×900 y en 1280×800, todas las opciones y el botón "Ver zonas" deben verse sin bajar. Ahora el usuario hace scroll inútil con media pantalla en blanco. Propuesta: tarjeta más ancha (unos 1.000–1.100 px) a **dos columnas**:
   - izquierda: campus, presupuesto (desde/hasta), tipo, radio máximo y cómo te desplazas;
   - derecha: "Qué te importa en el barrio" (las 6 filas Indiferente / Algo / Mucho, más compactas);
   - abajo: "Buscar con una frase" y el botón **Ver zonas**.

   Menos espacio vertical entre campos, y titular y subtítulo más compactos. En móvil sí se puede hacer scroll (una columna).
3. **Cabecera de ancho completo.** Logo y nombre **pegados a la izquierda**, con un margen normal de 24–32 px (ahora tienen un margen enorme). **A la derecha**, un menú:
   - **"Cómo funciona"**: abre un panel o modal breve con los 3 pasos (dinos qué buscas → cruzamos datos oficiales de alquiler, aire, metro y servicios → te recomendamos zonas y te llevamos a los pisos) y las fuentes;
   - **icono de usuario**: abre el panel de cuenta (Mi cuenta / Iniciar sesión). Las cuentas ya están ACTIVAS en Railway (D-30).
4. **Lados vacíos:** de momento basta con lo anterior. Se rellenará más adelante.
5. **BUG que no debe volver a pasar:** tras pulsar "Ver zonas", una vez la página apareció **desplazada hacia abajo, con un hueco en blanco al final**. Corrígelo de raíz:
   - al cambiar de pantalla, `window.scrollTo(0, 0)`;
   - la vista de resultados mide exactamente `100dvh`, sin overflow en el body (`overflow: hidden` mientras se muestran los resultados);
   - ningún elemento del inicio debe quedar montado y estirando la página;
   - pruébalo varias veces, también tras hacer scroll en el formulario antes de pulsar.

## Criterios de aceptación
- [ ] Sin scroll en 1440×900 ni en 1280×800 (formulario completo y botón visibles). Móvil correcto.
- [ ] Transiciones suaves en ambos sentidos.
- [ ] Cabecera a la izquierda + menú "Cómo funciona" y usuario a la derecha.
- [ ] El bug de scroll no se reproduce en 10 intentos.
- [ ] Capturas `t29_*`, `npm run build` y `make check` en verde. Integrar y avisar a claude@diego.

## Notas / progreso
- Diego reasigna T29 a claude@diego y amplía: menú de cabecera más completo, formulario manual mucho más simple, botón Volver arriba y 'Mi cuenta' simple.
- 16:58 · claude@diego · En main (8e311d5). Rutas /, /buscar, /resultados con atrás del navegador; cabecera logo→Volver + 'Cómo funciona' + cuenta; titular 'Encuentra tu sitio en Madrid'; formulario a dos columnas sin scroll (1440×900 y 1280×640); Mi cuenta simple; bug de scroll arreglado (scrollY 0 y altura exacta comprobados). Fusionado con las animaciones de codex@adrian (motion).
