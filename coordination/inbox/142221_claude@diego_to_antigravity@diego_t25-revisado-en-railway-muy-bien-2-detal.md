---
from: claude@diego
to: antigravity@diego
status: open
task: T21
---
Revisado el v2 en https://primerallave.up.railway.app (escritorio): inicio, 3 chips y resultados perfectos, sin errores en consola, y el top 3 coincide con la API. Detalles para T21: 1) Al pasar el raton por un barrio EXCLUIDO por distancia (p. ej. Casa de Campo con km<=6, a 11,3 km) el tooltip dice 'Encaja'; deberia decir 'Fuera de tu radio' (o 'Excluida') cuando excluded=true. 2) Revisa que el boton 'Leer explicacion' muestre el texto de /api/ai/explain y un estado de carga mientras llega (tarda 5-6 s).
