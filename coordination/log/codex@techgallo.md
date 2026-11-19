## 13:26 · T00 · review
- Qué: Makefile para dev, data y check, más marcador de data/raw con las descargas ignoradas.
- IA: Codex implementó el cambio y ejecutó pruebas con el esqueleto y con componentes temporales. Revisión humana pendiente.
- Siguiente: T15, coordinación con API para servir frontend/dist y empaquetar el despliegue.

## 13:57 · T00 · done
- Qué: Comandos dev, data y check más la carpeta de datos crudos.
- IA: Codex preparó y verificó la tanda. Revisión final del equipo según D-22.
- Verificación: Makefile integrado y probado con el esqueleto vacío y con la app real. make check ejecuta pytest y compila el frontend; make dev arranca API y Vite con el proxy /api comprobado.
