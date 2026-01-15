# Bot Podopie - WhatsApp Cloud API

MVP con menu interactivo, flujo de agendado basico y registro de leads en SQLite.

## Requisitos

- Node.js 18+
- Cuenta y app en Meta WhatsApp Cloud API

## Variables de entorno

- `WHATSAPP_TOKEN` - Token de acceso de WhatsApp Cloud API
- `PHONE_NUMBER_ID` - ID del numero de telefono de WhatsApp
- `VERIFY_TOKEN` - Token de verificacion para el webhook de Meta
- `DEBUG_KEY` - Clave para el endpoint `GET /debug/state`
- `SQLITE_PATH` - (Opcional) Ruta del archivo SQLite (por defecto `./data.db`)
- `PORT` - Puerto HTTP (por defecto 3000)

## Instalar y correr

```bash
npm install
npm start
```

## Webhook

- `GET /webhook` verifica el webhook en Meta.
- `POST /webhook` procesa solo mensajes de texto o interactivos.
- Dedup: ignora `message_id` repetidos (ultimos 200 en memoria).

## Flujo MVP

- Mensaje inicial, `menu` o `0` => muestra menu principal.
- `cancelar` => resetea el estado y muestra el menu.
- Agendar cita (pasos: nombre, motivo, dia, rango horario, confirmacion).
- Pagos y pendientes: pide CI/NIT y responde "Recibido, lo revisamos".
- Ubicacion y horarios: respuesta fija (placeholder).
- Servicios y precios: lista fija (placeholder).
- Luego de cada accion se vuelve a mostrar el menu.

Nota: WhatsApp limita los botones interactivos a 3 opciones, por eso el menu principal se envia como lista cuando hay 4 opciones.

## Debug

Endpoint solo para dev:

- `GET /debug/state?key=DEBUG_KEY`
- O header `x-debug-key: DEBUG_KEY`

Devuelve estados en memoria + ultimos registros de leads y pagos.

## Logs

Se loguea cada mensaje entrante con:

- `wa_id`, `message_id`, `type`, payload y timestamp.

Ejemplo:

```
[WA] 2026-01-14T20:00:00.000Z wa_id=54911... message_id=... type=text payload="hola"
```

## Probar en WhatsApp

1. Configura el webhook en Meta:
   - Callback URL: `https://<railway-domain>/webhook`
   - Verify token: el mismo valor que `VERIFY_TOKEN`
   - Suscribete al evento `messages`.
2. Escribi cualquier texto al numero y deberias ver el menu.
3. Completa el flujo de agendado y revisa `data.db` o `GET /debug/state`.

## Railway deploy

1. Crea un nuevo proyecto en Railway y conecta este repo.
2. Configura las variables de entorno listadas arriba.
3. Despliega el servicio.
4. Usa esta URL de webhook en Meta:
   - `https://<railway-domain>/webhook`

## Health check

- `GET /health` devuelve `ok`.
