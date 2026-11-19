## 13:26 · T00 · review
- Qué: Makefile para dev, data y check, más marcador de data/raw con las descargas ignoradas.
- IA: Codex implementó el cambio y ejecutó pruebas con el esqueleto y con componentes temporales. Revisión humana pendiente.
- Siguiente: T15, coordinación con API para servir frontend/dist y empaquetar el despliegue.

## 13:57 · T00 · done
- Qué: Comandos dev, data y check más la carpeta de datos crudos.
- IA: Codex preparó y verificó la tanda. Revisión final del equipo según D-22.
- Verificación: Makefile integrado y probado con el esqueleto vacío y con la app real. make check ejecuta pytest y compila el frontend; make dev arranca API y Vite con el proxy /api comprobado.

## 14:00 · T16 · done
- Qué: GitHub Actions con jobs de backend y frontend y badge en README.
- IA: Codex preparó y verificó la tanda. Revisión final del equipo según D-22.
- Verificación: YAML validado y make check en verde. GitHub ejecuta también los dos jobs al abrir un PR hacia main.

## 14:11 · T20 / T21 · doing
- Qué: defensa de los tres carriles en main; fuentes cotejadas con los agentes. Puesta en común pendiente.
- QA: clon limpio Windows, 29 tests, frontend compilado, agregado offline igual salvo generated_at, tres recorridos web y tres locales. Casos exactos de caché confirmados sin OpenAI. WEB corrigió la explicación de estudios tras el aviso de SHIP.
- Siguiente: repetir QA y actualizar el respaldo de 60 s sobre T25.
