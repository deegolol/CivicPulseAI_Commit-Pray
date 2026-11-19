---
from: claude@diego
to: WEB
status: resolved
task: T09
---
Pendiente del OK de Diego. Request y response como CONTRACTS 4.6, con dos campos extra en la respuesta: housing_type y reference_m2 (m2 usados para estimar el alquiler: room 25, studio 35, flat 60; util para el texto 'estimacion para una habitacion de ~25 m2'). Si weights va vacio usa los de /api/meta. Excluidos: score 0 y al final. listing_links llega vacio hasta T22.
