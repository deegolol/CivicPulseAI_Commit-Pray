# Cuenta, favoritos y notificaciones

Las recomendaciones de barrios están disponibles sin cuenta. Desde **Mi cuenta** puedes registrarte con correo y contraseña, guardar el enlace de una vivienda y fijar un recordatorio. Los usuarios del prototipo anterior pueden entrar con su nombre de usuario y añadir un correo desde la misma cuenta para conservar sus guardados. El registro por contraseña aún carece de confirmación por correo y recuperación de contraseña.

## Probar en local

Instala `backend/requirements.txt` y añade estas variables al fichero `.env`:

```dotenv
ACCOUNTS_ENABLED=true
ACCOUNTS_DB=.primerallave/accounts.sqlite3
```

Ejecuta `make dev` y abre [PrimeraLlave](http://localhost:5173). La base SQLite y los datos de prueba pueden guardarse en `.primerallave/`, ignorada por Git. Para Railway el volumen ha de ser persistente y la app debe usar una sola réplica; apunta `ACCOUNTS_DB` al volumen antes de habilitar las cuentas.

## Iniciar sesión con Google

Crea un cliente OAuth de tipo **Aplicación web** en Google Cloud y añade esta URI de redirección autorizada. Para producción usa el dominio HTTPS del despliegue con la misma ruta.

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/account/google/callback
```

El secreto se configura en el servidor. Desde una cuenta existente, usa **Vincular Google** e inicia sesión con el mismo correo. La vinculación requiere una sesión activa de PrimeraLlave y una identidad de Google con correo verificado. El [flujo de Google](https://developers.google.com/identity/openid-connect/reference) usa código de autorización, PKCE, estado de un solo uso y validación del token.

## Catálogo autorizado

Configura `ACCOUNTS_CATALOG_PATH` con la ruta a un fichero JSON que actualice un proveedor autorizado o un importador bajo su licencia. Formato:

```json
{
  "offers": [
    {
      "id": "id-estable-del-proveedor",
      "title": "Título del anuncio",
      "url": "https://example.org/anuncios/id-estable-del-proveedor",
      "district": "Centro",
      "housing_type": "room",
      "price_eur_month": 550
    }
  ]
}
```

Publica el fichero completo mediante reemplazo atómico. `housing_type` admite `room`, `studio` y `flat`. Las URLs deben ser HTTPS y los importes enteros en €/mes. Conserva el ID y la URL cuando actualices el precio. PrimeraLlave registra el primer precio observado y avisa cuando el precio baja respecto al último registro. Sugiere viviendas del mismo distrito y tipo, con un precio dentro del rango de referencia de tus favoritos. El catálogo queda vacío sin una fuente configurada. Los favoritos por enlace, los recordatorios y los avisos de presupuesto de zonas siguen disponibles.

La bandeja se actualiza al usar la cuenta y se comprueba aproximadamente cada minuto mientras la app está abierta. Muestra enlaces a los anuncios y permite marcar cada aviso como leído.
