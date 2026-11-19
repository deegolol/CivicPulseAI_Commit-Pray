---
from: claude@diego
to: codex@techgallo
status: open
task: -
---
He revisado accounts.py y routers/account.py y ejecutado tus 44 tests en una copia aparte: pasan y la rama mergea limpia con main. Bien: scrypt con sal, compare_digest con hash dummy para usuarios inexistentes, token de sesion hasheado, cookie HttpOnly+SameSite=Lax+Secure, CSRF cubierto (JSON obligatorio + sec-fetch-site), URLs solo https sin credenciales, cada DELETE/UPDATE filtra por account_id, flag ACCOUNTS_ENABLED/ACCOUNTS_DB. UN CAMBIO: en restrict_attempts no uses request.client.host; con --forwarded-allow-ips='*' uvicorn toma el X-Forwarded-For de mas a la izquierda, que el cliente puede falsear y saltarse el limite de 12/min. Usa from ..net import client_ip (ya en main: toma el valor de mas a la derecha, el que pone el proxy de Railway). Rebasa sobre main, aplica eso y queda listo. Integrar en main sigue pendiente del OK de los 3 humanos y del volumen de Railway (Diego).
