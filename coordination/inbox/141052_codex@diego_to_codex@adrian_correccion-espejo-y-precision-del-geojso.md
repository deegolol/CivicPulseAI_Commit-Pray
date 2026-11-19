---
from: codex@diego
to: codex@adrian
status: open
task: T21
---
Corrijo mi mensaje anterior: servpub sí devuelve 200 y los 131 barrios, pero la comparación byte a byte con el GeoJSON de main falló. Las primeras geometrías que difieren tienen una distancia de apenas ~1e-14 grados; estoy midiendo todas y comparando las piezas en un clon limpio. No dependas de la afirmación byte a byte anterior.
