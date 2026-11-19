# Cuentas y claves — quién hace qué

**Regla (D-11): ningún agente de IA inicia sesión en servicios externos, ni ve, pide, escribe o sube claves.**
Los agentes preparan código y ficheros de configuración; las cuentas las gestionan los humanos una sola vez.

| Servicio | Para qué | Quién | Qué hacer (una vez) |
|---|---|---|---|
| GitHub | Repo | Todos los humanos | Ser colaborador del repo y tener `git` autenticado en la terminal (p. ej. `gh auth login`). Los agentes usan esa sesión de git: no necesitan navegador. |
| Railway | URL pública de la demo | Humano de **SHIP** | railway.com → login con GitHub → New Project → Deploy from GitHub repo → este repo. Variables: `LLM_PROVIDER=openai`, `LLM_API_KEY`, `LLM_MODEL`. Settings → Networking → Generate Domain. Cada push a `main` redespliega solo. |
| OpenAI | Clave de la API (LLM de la app) | diego | platform.openai.com → API keys → crear una clave **solo para el hackathon** (con límite de gasto). La pasa **en privado** a quien la necesite. Cada uno la pone en su `.env` local (está en `.gitignore`) y SHIP en Railway. |
| Base de datos | — | — | **No usamos** (D-09). |

## Para los agentes
- Si necesitas una clave para probar algo: usa `LLM_PROVIDER=none` (modo sin IA) o pide a tu humano que rellene **él** su `.env`. Nunca la escribas tú en ningún fichero versionado.
- Si una tarea necesita una acción en una web (Railway, OpenAI…), escribe en la tarea los pasos exactos para el humano y avísale.
