# Cuenta, favoritos y notificaciones

Las recomendaciones de barrios están disponibles sin cuenta. Desde **Mi cuenta** puedes registrarte con correo y contraseña, guardar viviendas, ver avisos y gestionar tu cuenta. Los usuarios del prototipo anterior pueden entrar con su nombre de usuario y añadir un correo para conservar sus guardados. El registro inicial por contraseña todavía no exige verificar el correo.

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

## Recuperación de contraseña

Configura un remitente autorizado y un servidor SMTP con TLS. En el puerto 465 se usa TLS directo. En el resto se exige STARTTLS. Usa la URL del servicio que abre la persona usuaria.

```dotenv
ACCOUNTS_PUBLIC_URL=http://localhost:8081
ACCOUNTS_SMTP_HOST=
ACCOUNTS_SMTP_PORT=587
ACCOUNTS_SMTP_FROM=
ACCOUNTS_SMTP_USER=
ACCOUNTS_SMTP_PASSWORD=
```

**¿Has olvidado tu contraseña?** envía un enlace que acredita acceso al buzón y permite elegir una clave nueva. Caduca en 30 minutos, se usa una sola vez e invalida las sesiones abiertas. **Gestionar cuenta** admite cambiar la contraseña, borrar todos los favoritos y eliminar la cuenta confirmando la contraseña. Si abriste la cuenta solo con Google, establece primero una contraseña desde el correo de recuperación.

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
      "price_eur_month": 550,
      "available": true
    }
  ]
}
```

Publica el fichero completo mediante reemplazo atómico. `housing_type` admite `room`, `studio` y `flat`. Las URLs deben ser HTTPS y los importes enteros en €/mes. Conserva el ID y la URL al actualizar el precio o marcar el anuncio con `available: false`. PrimeraLlave avisa cuando un favorito observado baja de precio o cuando el proveedor confirma que ya no está disponible. Una oferta ausente del archivo no confirma su retirada. También sugiere viviendas del mismo distrito y tipo. Los favoritos manuales se pueden guardar sin un catálogo configurado.

La bandeja se actualiza al usar la cuenta y se comprueba aproximadamente cada minuto mientras la app está abierta. Muestra enlaces a los anuncios y permite marcar cada aviso como leído.
