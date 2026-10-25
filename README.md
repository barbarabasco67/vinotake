# Vinotake

App web para móvil: dime qué vas a cenar y te digo qué vino coger del súper.

Se publica en Cloudflare automáticamente con cada cambio en `main`.

## Premium y pagos

Gratis: 5 fotos/mes y 25 vinos en la bodega. Premium: 60 fotos/mes, bodega sin límite y "mejor súper" para la lista.

Se configura con secretos del Worker (`npx wrangler secret put NOMBRE`, o en el panel de Cloudflare):

| Secreto | Para qué |
|---|---|
| `STRIPE_LINK_MES` | URL del Payment Link mensual de Stripe |
| `STRIPE_LINK_ANIO` | URL del Payment Link anual de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Clave `whsec_…` del webhook de Stripe |
| `ADMIN_TOKEN` | (opcional) para crear códigos de regalo |
| `PRECIO_MES`, `PRECIO_ANIO` | (opcional) precios mostrados, por defecto `2,49` y `19,99` |
| `AFILIADOS` | (opcional) JSON de tiendas, ver abajo |
| `AWIN_PUBLISHER_ID` | (opcional) tu ID de editor en Awin |

### Stripe
1. Crea dos productos con suscripción (mensual y anual) y un Payment Link por cada uno.
2. En cada Payment Link, deja activado que se pase `client_reference_id` (la app lo añade sola).
3. Crea un webhook a `https://vino.picfy.es/api/premium/stripe` con los eventos `checkout.session.completed` e `invoice.paid`.

### Códigos de regalo
```
curl -X POST https://vino.picfy.es/api/premium/codigos \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"n":5,"dias":30}'
```

### Afiliados
`AFILIADOS` es una lista JSON; `{q}` se sustituye por el nombre del vino. Con Awin, añade `awin.mid` y la app envuelve el enlace:
```
[{"id":"tienda1","nombre":"Tienda 1","url":"https://www.tienda1.es/buscar?q={q}","awin":{"mid":12345}}]
```
Sin `AFILIADOS` no aparece el bloque "Comprar online".
