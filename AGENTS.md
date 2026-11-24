# AGENTS.md — Reglas de trabajo para Bahía Corral

Este archivo aplica a todos los agentes y colaboradores de este repositorio. Leer primero `README.md`. El diseño validado en [Figma](https://www.figma.com/design/QL0scBDlEkjJ1la7bgXb1B/Bah%C3%ADa-Corral---DIse%C3%B1o-de-Interfaces) es la **única fuente de verdad visual**; la especificación arquitectónica aprobada es la fuente de verdad funcional.

## 1. Objetivo y alcance

- Implementar **el MVP Base + M1 + M2** en un monolito modular Next.js, respetando el plan aprobado de **36 tareas**.
- Entregar primero una Preview funcional en Vercel y después un MVP operable tras las pruebas y controles de producción.
- **No implementar M3–M6**, billing SaaS, CMS general, promociones, MFA, Redis, WebSockets o nuevas integraciones sin decisión y presupuesto adicionales.
- No sumar features por anticipación: futura extensibilidad mediante fronteras claras, **sin código, endpoints, tablas ni abstracciones vacías**.
- Todo el contenido orientado a usuarios se escribe en **español**.

## 2. Diseño aprobado: fidelidad antes que rediseño

1. Consultar la pantalla y los componentes correspondientes en Figma antes de implementarlos. Comparar desktop y mobile.
2. Conservar identidad, tipografías, paleta, composición, jerarquía, espaciado, iconografía, imágenes y UX copy aprobado. No sustituir activos sin autorización.
3. Priorizar accesibilidad, legibilidad y acciones explícitas en el dashboard, pensado también para personas mayores.
4. Implementar estados de carga, vacío, error, éxito, deshabilitado y permisos cuando correspondan a cada flujo.
5. Usar **Impeccable** cuando esté disponible para auditoría y pulido final de la UI; corregir defectos comprobados **sin modificar el concepto visual aprobado**.
6. Si Figma y las reglas de negocio difieren, registrar el conflicto antes de inventar un comportamiento. Los textos o números ilustrativos de prototipos no sustituyen las reglas de negocio.
7. Evitar screenshots estáticas como sustituto de componentes funcionales. Los assets se descargan y utilizan respetando sus licencias.

## 3. Arquitectura y separación de responsabilidades

- Next.js App Router, React, TypeScript `strict`, Tailwind CSS 4, primitives Radix/Shadcn cuando aporten accesibilidad.
- **Monolito modular, Screaming Architecture**: los módulos se organizan por negocio, bajo `src/modules/`.
- Cada módulo puede contener `domain/`, `application/`, `data/`, `ui/`, `integrations/` únicamente si tiene contenido real.
- **Domain** contiene reglas puras y tipos del negocio; no importa Next.js, Drizzle, Mercado Pago ni SDKs.
- **Application** implementa casos de uso, autorización y coordinación. **Data/integrations** resuelve infraestructura. **UI** presenta y captura interacciones.
- `src/app/` contiene rutas, layouts y entradas del framework; deben delegar en casos de uso y consultas autorizadas.
- Server Components por defecto. `"use client"` sólo en piezas interactivas. `server-only` donde se manejan secretos y acceso a datos.
- Cada módulo exporta una superficie pública pequeña. Evitar importar implementaciones internas de otro módulo, especialmente sus archivos `data/`.
- Compartir código sólo cuando de verdad se reutiliza; evitar una carpeta `utils` global que mezcle funciones de negocio y UI.
- Priorizar SOLID, Clean Code, KISS, DRY y YAGNI. Rechazar Clean Architecture ceremonial, HOCs y factories sin necesidad demostrable.

## 4. Convenciones de código

- Funciones y archivos con nombres claros y una responsabilidad explícita.
- Importaciones ordenadas: terceros, alias internos y rutas relativas; separar `import type` según las reglas automáticas.
- No `any` injustificado, `@ts-ignore` silencioso, `eslint-disable` sin explicación, casts que oculten errores o dependencias innecesarias.
- Tipos de dominio dentro de su módulo; globales sólo cuando comparten identidad y semántica.
- Preferir composición, funciones pequeñas, validación de inputs con Zod donde corresponde, early returns y errores explícitos.
- Usar Prettier como formateador; ESLint para reglas, imports sin uso, lint de React/Next y fronteras de módulos. No duplicar reglas entre herramientas.
- Hooks de Git con Husky + lint-staged para archivos tocados. CI debe ejecutar, al menos, formato, lint, `tsc --noEmit`, tests y build.
- No convertir convenciones estilísticas en capas innecesarias. Un componente sencillo puede ser un archivo sencillo.
- **No subir artefactos locales**: `.env*` con secretos, `node_modules`, `.next`, cobertura, logs, binarios accidentales o datos privados.

## 5. Seguridad, datos e invariantes

- Neon PostgreSQL + Drizzle. Toda operación sobre datos del complejo debe tener contexto `tenant_id` fiable y aplicar RLS, junto con autorización del caso de uso.
- `PLATFORM_ADMIN` es global; `OWNER`, `STAFF`, `CLEANING` usan Membership por tenant; huésped no es Membership.
- Sesiones administrativas de 30 días fijos; Better Auth sin MFA en el MVP. Invitación obligatoria para el personal. OTP por email para acceso limitado a una reserva concreta.
- Una reserva ocupa una sola unidad física. Las transacciones y restricciones de PostgreSQL deben impedir dobles asignaciones con rangos solapados.
- Hold temporal de 10 min y extensión limitada para pago efectivamente iniciado. Nunca liberar una asignación confirmada por expiración de un hold.
- Dinero exacto (no usar `float` para importes); snapshots históricos de precio; tarifas válidas, ocupación física separada de ocupación tarifaria.
- Seña es una condición financiera; pagos recibidos pueden ser múltiples y combinar medios. Comprobante adjunto no equivale a ingreso acreditado.
- En Mercado Pago, confirmar cobros con evidencia del servidor. Webhooks idempotentes y conciliación de resultados inciertos.
- Las tareas de Trigger.dev, emails de Resend y almacenamiento en R2 utilizan adaptadores acotados, idempotencia y contexto tenant.
- Nunca registrar contraseñas, OTP, cookies, tokens, secretos o comprobantes completos en logs. No incluir datos reales de huéspedes en tests ni demos.

## 6. Pruebas y criterios de aceptación

- Vitest para dominio, Testcontainers con PostgreSQL real para RLS/concurrencia, Playwright para flujos completos.
- Para cada nueva regla, agregar tests que cubran caso correcto, caso inválido y regresión relevante. **TDD cuando se implemente una tarea del plan**.
- Prioridad a: doble booking, precio histórico, pagos y devoluciones, permisos entre tenants, idempotencia, expiración de holds y recuperación de jobs.
- Cada PR debe estar acotada a una tarea coherente, con pruebas y verificación local de los comandos disponibles.
- Comparar visualmente los cambios de UI con Figma en desktop y mobile; usar Impeccable audit/polish como comprobación de calidad, no para rediseñar.
- Nunca describir una funcionalidad como lista si faltan pruebas o dependencias de producción.

## 7. Entornos y flujo Git

- Trabajar en ramas enfocadas, Pull Requests revisables y commits descriptivos.
- La rama principal debe mantenerse estable; no integrar PR con checks fallidos.
- Usar ambientes separados local, preview/staging y producción.
- Las migraciones se versionan y revisan; se ejecutan separadamente del build. Usar migraciones compatibles con versiones consecutivas.
- Producción requiere **aprobación manual**. No publicar versiones, cambiar DNS, ejecutar cobros reales ni usar secretos de producción sin autorización explícita.
- Si el repositorio está vacío o solo tiene documentación, no inventar que hay comandos, dependencias, tests o deploy que todavía no existen.

## 8. Proceso para agentes

1. Leer `README.md`, los documentos de arquitectura y el plan de Superpowers de la tarea.
2. Inspeccionar el código existente **antes** de cambiarlo; conservar patrones válidos y evitar refactors no relacionados.
3. Confirmar entradas/salidas y dependencias. No cambiar decisiones aprobadas sin señalarlo.
4. Implementar cambios mínimos, ejecutar tests, lint, tipos y build disponibles.
5. Verificar UI contra Figma y reportar cualquier discrepancia. Documentar limitaciones externas.
6. Mostrar el resultado verificable, archivos cambiados, pruebas realizadas y pendientes reales.
7. Nunca afirmar que un workflow pasó, que una URL funciona o que un despliegue ocurrió sin comprobarlo.

La prioridad es **código legible y funcional, experiencia fiel a Figma, seguridad de reservas/pagos, y entrega terminada**, no cantidad de abstracciones ni métricas artificiales.
