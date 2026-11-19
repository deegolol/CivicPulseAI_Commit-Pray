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

En Google Cloud, configura la pantalla de consentimiento y crea un cliente OAuth de tipo **Aplicación web**. Si la aplicación sigue en modo de pruebas, añade tu correo en la lista de usuarios de prueba. Para la vista local actual, registra exactamente `http://localhost:8081/api/account/google/callback` en **URI de redirección autorizados**.

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8081/api/account/google/callback
```

Copia el ID y el secreto del cliente en el fichero local `.env` y reinicia el backend. Si usas `make dev`, cambia el puerto a 5173 en Google Cloud y en `.env`. Para producción usa el dominio HTTPS del despliegue con la misma ruta. Desde una cuenta existente, usa **Vincular Google** e inicia sesión con el mismo correo. La vinculación requiere una sesión activa de PrimeraLlave y una identidad de Google con correo verificado. El [flujo de Google](https://developers.google.com/identity/openid-connect/reference) usa código de autorización, PKCE, estado de un solo uso y validación del token.

## Activar en Railway

La integración en `main` mantiene las cuentas desactivadas por defecto. Para activarlas, la persona responsable del despliegue debe:

1. Montar un volumen persistente en `/var/lib/primerallave` en el servicio `primerallave` y mantener una sola réplica. Si el volumen ya existe, usar su ruta real.
2. En el cliente web OAuth de Google Cloud, registrar exactamente `https://primerallave.up.railway.app/api/account/google/callback`. Si la aplicación sigue en modo de pruebas, añadir los correos autorizados.
3. Configurar las siguientes variables del servicio con el ID y el secreto del cliente de producción, y desplegar.

```dotenv
ACCOUNTS_ENABLED=true
ACCOUNTS_DB=/var/lib/primerallave/accounts.sqlite3
GOOGLE_REDIRECT_URI=https://primerallave.up.railway.app/api/account/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Comprueba que `/api/account/session` devuelve `enabled: true` y `google_enabled: true`. Luego inicia sesión con una cuenta de prueba, guarda una vivienda, cierra sesión y vuelve a entrar para comprobar la persistencia. El envío de correos y los avisos de precios requieren su propia configuración, descrita abajo.

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

El perfil de un barrio permite **Guardar búsqueda** con el distrito, presupuesto y tipo de vivienda actuales. Los anuncios concretos del catálogo tienen su propio botón **Añadir favorito**. Ambos se guardan en el acto o tras iniciar sesión si todavía no has entrado. Los favoritos de viviendas reciben avisos de precio y disponibilidad si el catálogo identifica el mismo enlace. Las búsquedas guardadas reciben avisos de anuncios del distrito que encajan en los filtros.
