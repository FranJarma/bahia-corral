# Bahía Corral

**Plataforma web de reservas y operación para un complejo turístico en el Dique Cabra Corral, Salta (Argentina).**

> **Estado actual:** MVP en implementación en `feat/mvp-36-tasks`. Existe una Preview en Vercel y una base de datos Neon separada. No todas las integraciones externas están configuradas ni el MVP se considera listo para producción.

## Objetivo

Centralizar el sitio público, la disponibilidad de alojamientos, las reservas, los pagos y la gestión del complejo en una aplicación sencilla, segura y mantenible. La primera entrega se orienta a **Bahía Corral** y deja preparada la separación de datos para incorporar otros complejos en una evolución futura a SaaS.

La experiencia visual aprobada por el cliente se encuentra en **[Figma — Diseño de interfaces](https://www.figma.com/design/QL0scBDlEkjJ1la7bgXb1B/Bah%C3%ADa-Corral---DIse%C3%B1o-de-Interfaces)**. **Figma es la fuente de verdad visual:** no rediseñar pantallas, cambiar la identidad o sustituir recursos aprobados sin una decisión explícita.

## Alcance del MVP (Base + M1 + M2)

| Superficie     | Funcionalidades previstas                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sitio público  | Landing, fichas de seis alojamientos, consulta de disponibilidad y cotización por fechas y ocupantes                                                          |
| Checkout       | Una unidad por reserva, bloqueo temporal, pago de seña con Mercado Pago Checkout Pro y confirmación verificada                                                |
| Mis reservas   | Guest checkout; acceso posterior a una reserva concreta mediante código OTP por email; cuenta opcional                                                        |
| Administración | Dashboard, calendario, reservas manuales y telefónicas, alojamientos, tarifas, huéspedes, pagos y consultas de eventos                                        |
| M1 — Cobranzas | Registro de pagos y comprobantes, enlaces de saldo, recordatorios por correo y devoluciones totales o parciales de Mercado Pago con aprobación administrativa |
| M2 — Operación | Estados de limpieza, personal de limpieza y pantalla de recepción con actualización periódica                                                                 |

La administración funciona con roles **PLATFORM_ADMIN** (global), **OWNER**, **STAFF** y **CLEANING** (por complejo). Los huéspedes no son miembros del equipo.

**Fuera del MVP:** carta digital y reservas de restaurante (M3/M4), agendas de spa y cava (M5), gestión ampliada de eventos (M6), suscripciones SaaS, promociones, integraciones con Booking/Airbnb, facturación electrónica, WebSockets, MFA y devoluciones automáticas. Los módulos futuros se incorporarán respetando límites del dominio, **sin crear capas, tablas o endpoints vacíos por anticipado**.

## Stack tecnológico previsto

| Área                  | Tecnología                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aplicación            | Next.js (App Router), React, TypeScript en modo estricto                                                                                                 |
| Interfaz              | Tailwind CSS 4; Shadcn/Radix sólo como primitivas necesarias                                                                                             |
| Arquitectura          | Monolito modular, Screaming Architecture por dominio/feature                                                                                             |
| Datos                 | PostgreSQL en Neon + Drizzle ORM, restricciones transaccionales y RLS por tenant                                                                         |
| Autenticación         | Better Auth; **nombre de usuario y contraseña para el equipo**, correo verificado para recuperación, OTP por email para huéspedes; **sin MFA en el MVP** |
| Pagos                 | Mercado Pago Checkout Pro / Orders API + registro manual de pagos                                                                                        |
| Jobs y notificaciones | Trigger.dev (adaptador propio + outbox) y Resend (plantillas propias)                                                                                    |
| Archivos              | Cloudflare R2, con separación entre fotografías públicas y comprobantes privados                                                                         |
| Observabilidad        | Sentry + herramientas de Vercel, Neon y Trigger.dev                                                                                                      |
| Calidad               | ESLint, Prettier, TypeScript strict, Husky, lint-staged, GitHub Actions                                                                                  |
| Tests                 | Vitest, PostgreSQL real con Testcontainers y Playwright                                                                                                  |
| Hosting               | Vercel, con promoción a producción bajo aprobación manual                                                                                                |

**Importante:** esta tabla describe decisiones de diseño, **no dependencias ya instaladas**. El estado real del repositorio se actualizará en cada entrega.

## Organización de código proyectada

```text
src/
  app/                      # rutas, layouts, Server Components y endpoints
  modules/
    accommodations/
    availability/
    reservations/
    pricing/
    payments/
    guests/
    identity-access/
    housekeeping/
    event-inquiries/
  infrastructure/           # BD, mail, jobs, storage, seguridad, observabilidad
  shared/                   # código genuinamente compartido
  trigger/                  # entradas de workers
drizzle/                    # migraciones versionadas
tests/                      # unitarias, integración y end-to-end
docs/                       # decisiones y documentación técnica
.github/workflows/          # validaciones y despliegue
AGENTS.md                   # convenciones obligatorias para agentes de IA
```

Cada módulo tendrá sólo las carpetas que necesite (`domain`, `application`, `data`, `ui`, `integrations`). **La lógica de negocio vive en Domain/Application**, no en componentes React ni en proveedores externos.

## Principios y decisiones críticas

- **Una reserva = una unidad física.** La disponibilidad no admite superposiciones, incluidas las reservas creadas manualmente.
- **Continuidad del checkout:** en el mismo navegador se retoma la reserva pendiente usando una cookie HttpOnly. En otro dispositivo se verifica el correo mediante OTP y se rota el acceso, sin extender el plazo original. Una coincidencia de correo nunca otorga acceso por sí sola.
- **Huéspedes:** se reutiliza el contacto por correo normalizado; sin correo, por nombre, apellido y teléfono normalizados. Los duplicados históricos se consolidan sin borrar reservas, pagos ni registros originales.
- **Un intento web pendiente por huésped:** la creación se serializa en PostgreSQL y rechaza un segundo intento mientras el anterior siga vigente o en conciliación. Los reintentos del mismo checkout son idempotentes.
- **Checkout de 10 minutos**, con hasta 5 minutos adicionales para verificar un cobro realmente iniciado. Un pago de resultado desconocido se concilia antes de liberar la disponibilidad comprometida.
- **Vencimiento:** un intento sin pago iniciado pasa a No completada y libera su hold. La búsqueda de disponibilidad, el listado administrativo y la recuperación del checkout ejecutan la limpieza; además se registra la tarea en la outbox para el scheduler. Los pagos iniciados o inciertos requieren conciliación y las reservas confirmadas conservan su asignación.
- **Anulación administrativa:** Administrador y Personal administrativo pueden anular reservas Por Confirmar o Confirmadas desde el botón rojo Anular en la columna Acciones del listado o desde su modal, con motivo obligatorio y confirmación. Se conserva la reserva y su auditoría, se libera la asignación y se cierra el checkout. La anulación explícita también admite pagos en verificación; conserva los cobros y cualquier acreditación posterior se registra como incidencia para revisión administrativa, sin reabrir la reserva ni devolver dinero automáticamente. La expiración automática sigue protegiendo los pagos inciertos.
- **Devoluciones de Mercado Pago:** desde el detalle de una reserva anulada se solicita un importe del pago original. Personal administrativo puede solicitar; el Administrador aprueba y confirma el envío al proveedor. Se conserva cada cobro y la devolución sólo se da por realizada con evidencia de Mercado Pago. La anulación no devuelve dinero por sí sola. Ver [operación de devoluciones](./docs/mercadopago-refunds.md).
- **Precios históricos inmutables:** cotización por noche, tarifa base obligatoria y reglas por ocupación; cambios futuros de tarifas no alteran reservas existentes.
- **Menores de 4 años:** no se cobran, pero cuentan para la capacidad total.
- **Seña como condición financiera:** la reserva puede estar confirmada y tener un saldo pendiente; se permiten excepciones administrativas auditadas.
- **Seguridad por tenant:** autorización en servidor, RLS y relaciones de datos que impiden mezclar complejos.
- **Integraciones reemplazables:** no acoplar dominio a Mercado Pago, Trigger.dev, Resend o Cloudflare R2.
- **Código legible:** responsabilidades claras, imports ordenados, sin código muerto y sin abstracciones ceremoniales.

## Acceso administrativo y recuperación

- **Dashboard:** `/admin` (requiere cuenta administrativa y sesión válida).
- **Iniciar sesión:** `/admin/login`, utilizando **nombre de usuario + contraseña**; no se inicia sesión con correo desde el formulario.
- **Recuperación:** `/admin/recuperar-contrasena`, mediante enlace de un solo uso enviado al **correo asociado a la cuenta**. El enlace lleva a `/admin/restablecer-contrasena`.
- **Altas:** cada cuenta necesita un nombre de usuario único y un correo real verificado; los roles se asignan mediante el mecanismo de acceso autorizado. No deben insertarse contraseñas en commits o seeds públicos.
- **Entorno Preview:** sólo usa Neon Preview; el envío de recuperación no será operativo hasta configurar `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y un dominio emisor verificado.
- **Dominio administrativo deseado:** `admin.bahiacorral.com`, pendiente de confirmar propiedad del dominio, configuración de DNS y alias en Vercel. En el MVP puede utilizarse la misma aplicación Next.js y el segmento interno `/admin`; el subdominio no implica un backend separado.

## Desarrollo local

Después de clonar el repositorio, creá el archivo local `.env` a partir de `.env.example` y cargá credenciales de **desarrollo**. Nunca uses credenciales ni datos de producción para pruebas.

```bash
npm install
npm run dev
```

Controles disponibles: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` y `npm run build`. Las pruebas de integración necesitan un motor PostgreSQL de test mediante Testcontainers y las pruebas E2E pueden usar `PLAYWRIGHT_BASE_URL`. Las migraciones requieren `DATABASE_MIGRATION_URL` del entorno correspondiente y deben ejecutarse de manera controlada, separadas del build.

## Plan de trabajo — 36 tareas

| Fase                       | Tareas | Resultado esperado                                              |
| -------------------------- | -----: | --------------------------------------------------------------- |
| 1. Fundamentos             |      8 | Estructura, diseño base, Neon, roles, seguridad y autenticación |
| 2. Reservas                |      9 | Tarifas, disponibilidad concurrente, holds y flujos de reserva  |
| 3. Pagos y comunicación    |     10 | Mercado Pago, OTP, email, jobs, archivos y cobranzas            |
| 4. Operación y publicación |      9 | Limpieza, recepción, dashboard, pruebas y entrega en Vercel     |

**Meta:** prototipo navegable en Vercel durante las etapas iniciales y, al completar las 36 tareas y sus verificaciones, MVP operable dentro del alcance contratado.

## Diseño y revisión visual

- Implementar los componentes y las vistas **a partir de Figma**, reutilizando los tokens, imágenes, tipografías, variantes y estados aprobados.
- Comparar desktop/mobile con el diseño original; respetar el enfoque de fácil lectura y acciones explícitas en el dashboard.
- Utilizar **Impeccable** cuando esté disponible para `audit` y `polish`, corrigiendo problemas reales de accesibilidad, responsive, estados y consistencia. **Pulir no equivale a rediseñar.**
- No sustituir fotografías o activos visuales aprobados sin revisión.

## Desarrollo y colaboración

La aplicación Next.js y sus scripts de desarrollo ya existen. El alcance de cada integración debe verificarse mediante pruebas y configuración del entorno antes de considerar operativa la funcionalidad.

Flujo previsto: rama por tarea → Pull Request → validaciones de formato, lint, tipos, tests y build → revisión → merge. Los despliegues de producción requieren aprobación manual. **Nunca publicar credenciales, tokens o datos reales de huéspedes en commits, ejemplos o logs.**

Leé [AGENTS.md](./AGENTS.md) antes de colaborar mediante agentes de IA.

## Próxima evolución

Incorporar feature flags para habilitar funcionalidades progresivamente por entorno y por complejo. Los controles deben aplicarse tanto en la interfaz como en el servidor y conservar los permisos existentes. Esta entrega no incorpora todavía el sistema de flags.

## Referencias

- [Diseño de interfaces aprobado (Figma)](https://www.figma.com/design/QL0scBDlEkjJ1la7bgXb1B/Bah%C3%ADa-Corral---DIse%C3%B1o-de-Interfaces)
- Repositorios previos de referencia visual: [landing](https://github.com/FranJarma/bahia-corral-landing) y [backoffice](https://github.com/FranJarma/bahia-corral-backoffice). **Este repositorio es el canónico para el nuevo desarrollo.**
- Las especificaciones técnicas y los planes de trabajo aprobados en Superpowers deben incorporarse al repositorio mediante revisión, cuidando la información sensible al ser público.

---

**Idioma del producto y documentación:** español. **Zona horaria operativa:** `America/Argentina/Salta`. **Estado:** implementación activa; no confundir Preview navegable con producción lista para cobrar.
