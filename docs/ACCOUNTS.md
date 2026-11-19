# Cuenta, guardados y avisos

Las búsquedas y el mapa están disponibles sin iniciar sesión. Desde **Mi cuenta**, el estudiante puede crear un usuario, guardar el enlace de una vivienda y fijar un recordatorio opcional. Desde el detalle de un barrio puede solicitar un aviso para el tipo de vivienda y presupuesto elegidos.

Los recordatorios vencidos aparecen al abrir **Mi cuenta**. En esa misma pantalla se recalculan los avisos de las zonas guardadas con los indicadores oficiales que tiene cargados PrimeraLlave. Los anuncios se abren en el portal de origen. Para alertas sobre anuncios nuevos o cambios en un inmueble concreto se necesita una fuente de anuncios autorizada.

## Datos de la cuenta

En local, activa `ACCOUNTS_ENABLED=true` y `ACCOUNTS_DB=.primerallave/accounts.sqlite3` en el fichero `.env` de la raíz. Esa carpeta está ignorada por Git. `make dev` carga la configuración al arrancar. Guarda tu contraseña. El registro usa un nombre de usuario y carece de recuperación por correo.

En Railway se necesita un volumen persistente en una sola réplica. Diego puede montar el volumen y configurar `ACCOUNTS_ENABLED=true` y `ACCOUNTS_DB=/ruta/del/volumen/accounts.sqlite3`. Las cuentas permanecen deshabilitadas en Railway si el servicio carece de una ruta persistente. Una vez habilitadas, verifica que una cuenta de prueba sigue iniciando sesión tras un redespliegue.
