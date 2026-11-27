# Devoluciones con Mercado Pago

La anulación libera el alojamiento y conserva los cobros. El reintegro es una operación administrativa separada, autorizada explícitamente para esta entrega: no se devuelve dinero automáticamente por cancelar una reserva.

## Operación en el backoffice

1. Abrir **Reservas → Ver archivados → Ver** en una reserva anulada con pagos.
2. En **Devoluciones**, seleccionar un cobro original de Mercado Pago, el total disponible o un importe parcial y el motivo.
3. El Administrador aprueba o rechaza la solicitud. Aprobar todavía no envía dinero.
4. **Devolver con Mercado Pago** abre una confirmación del importe. Al confirmar, el servidor envía el reintegro a la Orders API.
5. El historial muestra la referencia del proveedor y su resultado. El detalle de la reserva y Pagos conservan lo cobrado, lo devuelto y el neto recibido.

Personal administrativo puede solicitar y consultar. Sólo Administrador y PLATFORM_ADMIN pueden aprobar, rechazar y ejecutar. La autorización se verifica en servidor y RLS mantiene la separación entre complejos.

No se admite reintegrar por esta API pagos manuales, cobros sin referencia verificable, solicitudes históricas sin pago asociado ni reservas activas. El reintegro de un pago manual se realiza por su medio de origen.

## Estados y dinero

| Estado técnico | Estado mostrado | Comportamiento                                  |
| -------------- | --------------- | ----------------------------------------------- |
| REQUESTED      | Solicitada      | Reserva el importe; espera decisión             |
| APPROVED       | Aprobada        | Espera confirmación del envío                   |
| PROCESSING     | En proceso      | Se envió o se está enviando al proveedor        |
| UNCERTAIN      | En verificación | No se conoce el resultado; bloquea otro envío   |
| EXECUTED       | Devuelta        | Existe evidencia confirmada del proveedor       |
| FAILED         | No realizada    | Rechazo definitivo; permite una nueva solicitud |
| REJECTED       | Rechazada       | Decisión administrativa, sin envío              |

Los importes se calculan en centavos enteros. La suma de solicitudes abiertas y devoluciones confirmadas nunca puede superar el cobro original. Las solicitudes y ejecuciones concurrentes se serializan bloqueando reserva y pago. Una clave de idempotencia persistente evita duplicar la solicitud y la devolución.

La API sólo envía una vez la ejecución de cada solicitud. Ante desconexión, timeout o respuesta ambigua, **Consultar estado**, el webhook y la tarea de conciliación consultan el pedido original mediante GET. No vuelven a enviar dinero. Si sigue sin haber evidencia suficiente, la solicitud permanece protegida para revisión.

Los reintegros detectados directamente en Mercado Pago también se conservan y descuentan del importe disponible. Una notificación repetida no duplica la devolución ni reactiva una reserva anulada.

## Configuración y despliegue

- Aplicar `drizzle/0005-mercadopago-refunds.sql` con el migrador, separadamente del build.
- Configurar `MERCADO_PAGO_ACCESS_TOKEN` en el entorno apropiado. Sin token se permite registrar solicitudes y decisiones, pero la ejecución no envía dinero ni se marca como realizada.
- Configurar y validar el webhook existente y el procesamiento de la outbox para la conciliación automática. También existe consulta administrativa del estado.
- Validar con cuentas y credenciales de prueba de Mercado Pago antes de producción. Los tests automatizados usan respuestas simuladas del proveedor y PostgreSQL descartable; no prueban acreditaciones bancarias.
- Las devoluciones registradas por el proveedor no garantizan una acreditación inmediata al huésped: los plazos dependen del medio de pago.
- Producción y operaciones con dinero real requieren la autorización correspondiente.

## Validación

Las pruebas de integración cubren permisos, RLS, importes, idempotencia, carreras, devoluciones parciales, falta de configuración, rechazo definitivo, resultado pendiente y recuperación después de un timeout. Playwright recorre solicitud, aprobación y confirmación en escritorio y móvil con un simulador HTTP precargado exclusivamente en CI. No hay un modo de pagos simulados dentro del código de producción.

## Próximo paso: feature flags

La entrega progresiva se implementará después: flags por entorno y complejo, evaluados en servidor para acceso y en UI para visibilidad, con valores seguros por defecto. Los flags no reemplazarán permisos ni ocultarán el estado financiero de operaciones ya realizadas.
