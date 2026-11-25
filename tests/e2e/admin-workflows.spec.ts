import { randomUUID } from 'node:crypto';

import { type APIRequestContext, expect, test } from '@playwright/test';

test.setTimeout(120_000);

test.skip(process.env.E2E_TEST_DATABASE !== '1', 'Sólo modifica la base descartable de CI');
async function createUnit(request: APIRequestContext) {
  const suffix = randomUUID().slice(0, 8);
  const body = {
    code: 'TEST-' + suffix,
    slug: 'prueba-' + suffix,
    name: 'Prueba ' + suffix,
    type: 'CABIN',
    capacityTotal: 4,
    description: 'Alojamiento ficticio',
    published: true,
    operationalStatus: 'ACTIVE',
    imageUrl: '/images/cabana-1.jpg',
    bands: [{ minGuests: 1, maxGuests: 4, amountCents: '12000000' }],
  };
  const r = await request.post('/api/admin/units', { data: body });
  expect(r.status()).toBe(201);
  return { ...body, id: (await r.json()).unit.id as string };
}
test.beforeEach(async ({ page, baseURL }) => {
  await page.context().setExtraHTTPHeaders({ Origin: baseURL! });
  const r = await page.request.post('/api/auth/sign-in/username', {
    headers: { Origin: baseURL! },
    data: { username: process.env.E2E_USERNAME, password: process.env.E2E_PASSWORD },
  });
  if (!r.ok()) throw new Error('Login de prueba: ' + r.status() + ' ' + (await r.text()));
});
test('altas y ediciones reales con control de permisos', async ({ page, baseURL }) => {
  const request = page.request,
    unit = await createUnit(request);
  expect(
    (
      await request.patch('/api/admin/units', { data: { ...unit, name: unit.name + ' editada' } })
    ).status(),
  ).toBe(200);
  const g = await request.post('/api/admin/guests', {
    data: { firstName: 'Persona', lastName: 'Prueba', phone: '3870000000', email: '' },
  });
  expect(g.status()).toBe(201);
  const guest = (await g.json()).guest;
  expect(
    (
      await request.patch('/api/admin/guests', {
        data: {
          id: guest.id,
          firstName: 'Persona',
          lastName: 'Actualizada',
          phone: '3870000000',
          email: '',
        },
      })
    ).status(),
  ).toBe(200);
  const guests = (await (await request.get('/api/admin/guests')).json()).guests;
  expect(guests.find((x: { id: string }) => x.id === guest.id).last_name).toBe('Actualizada');
  const body = {
    contactName: 'Evento de prueba',
    email: 'event@example.com',
    phone: '3870000000',
    eventType: 'Corporativo',
    preferredDate: '2027-05-20',
    guestsCount: 20,
    notes: 'Inicial',
    status: 'NEW',
  };
  const e = await request.post('/api/admin/events', { data: body });
  expect(e.status()).toBe(201);
  const event = (await e.json()).event;
  expect(
    (
      await request.patch('/api/admin/events', {
        data: { ...body, id: event.id, guestsCount: 25, status: 'CONTACTED' },
      })
    ).status(),
  ).toBe(200);
  const events = (await (await request.get('/api/admin/events')).json()).events;
  expect(events.find((x: { id: string }) => x.id === event.id).guests_count).toBe(25);
  await request.post('/api/auth/sign-out', { headers: { Origin: baseURL! } });
  expect(
    (
      await request.post('/api/auth/sign-in/username', {
        headers: { Origin: baseURL! },
        data: { username: process.env.E2E_USERNAME + '_staff', password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await request.patch('/api/admin/units', { data: { ...unit, name: 'Sin permiso' } })).status(),
  ).toBe(403);
});
for (const width of [1280, 390]) {
  test.describe('Panel a ' + width + 'px', () => {
    test.use({ viewport: { width, height: 900 } });
    test('búsqueda, edición, fotos, tarifas y configuración', async ({ page }, info) => {
      await page.goto('/admin/huespedes');
      const search = page.getByRole('searchbox', { name: 'Buscar', exact: true });
      await expect(search).toBeVisible();
      expect(
        await search.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)),
      ).toBeGreaterThanOrEqual(38);
      await page.getByRole('button', { name: 'Nuevo huésped', exact: true }).click();
      const d = page.getByRole('dialog', { name: 'Nuevo huésped', exact: true });
      await d.getByLabel('Nombre', { exact: false }).fill('Huésped UI');
      await d.getByLabel('Apellido', { exact: false }).fill('Prueba ' + width);
      await d.getByLabel('Teléfono', { exact: false }).fill('3870000000');
      await d.getByRole('button', { name: 'Crear huésped', exact: true }).click();
      await expect(d).not.toBeVisible();
      await search.fill('Huésped UI');
      await page
        .getByRole('button', { name: 'Editar Huésped UI Prueba ' + width, exact: true })
        .click();
      const edit = page.getByRole('dialog', { name: 'Editar huésped', exact: true });
      await edit.getByLabel('Apellido', { exact: false }).fill('Editado ' + width);
      await edit.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      await expect(edit).not.toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'Huésped UI Editado ' + width, exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath('huespedes.png'), fullPage: true });
      const unit = await createUnit(page.request);
      await page.goto('/admin/cabanas');
      await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill(unit.name);
      await expect(
        page.getByRole('img', { name: 'Foto de ' + unit.name, exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Editar ' + unit.name, exact: true }).click();
      const ud = page.getByRole('dialog', { name: 'Editar alojamiento', exact: true });
      await ud.getByLabel('Nombre', { exact: false }).fill(unit.name + ' actualizada');
      await ud.getByRole('button', { name: 'Guardar alojamiento', exact: true }).click();
      await expect(ud).not.toBeVisible();
      await page
        .getByRole('button', {
          name: 'Administrar tarifas de ' + unit.name + ' actualizada',
          exact: true,
        })
        .click();
      const rd = page.getByRole('dialog', {
        name: 'Tarifas de ' + unit.name + ' actualizada',
        exact: true,
      });
      await rd.getByLabel('Tarifa 1 (ARS por noche)', { exact: false }).fill('125000');
      await rd.getByRole('button', { name: 'Guardar tarifas', exact: true }).click();
      await expect(rd).not.toBeVisible();
      await page.screenshot({ path: info.outputPath('alojamientos.png'), fullPage: true });
      await page.goto('/admin/tarifas');
      await expect(page).toHaveURL(/\/admin\/cabanas$/);
      await page.goto('/admin/configuracion');
      await expect(page.getByText('OWNER', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('cell', { name: 'Administrador', exact: true })).toBeVisible();
      const f = page.getByRole('form', { name: 'Invitar al equipo' });
      const a = await f.getByLabel('Correo de la persona', { exact: false }).boundingBox();
      const b = await f.getByRole('button', { name: 'Invitar', exact: true }).boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a!.x + a!.width <= b!.x || a!.y + a!.height <= b!.y).toBeTruthy();
      await page.screenshot({ path: info.outputPath('configuracion.png'), fullPage: true });
    });
    test('alta de alojamiento y seguimiento de eventos desde sus modales',async({page},info)=>{
      const name='Cabaña UI '+randomUUID().slice(0,8);
      await page.goto('/admin/cabanas');
      await page.getByRole('button',{name:'Nuevo alojamiento',exact:true}).click();
      const unit=page.getByRole('dialog',{name:'Nuevo alojamiento',exact:true});
      await unit.getByLabel('Nombre',{exact:false}).fill(name);
      await unit.getByLabel('Código',{exact:false}).fill('UI-'+randomUUID().slice(0,8));
      await unit.getByLabel('Tarifa 1 (ARS por noche)',{exact:false}).fill('95000.50');
      await page.screenshot({path:info.outputPath('nuevo-alojamiento.png'),fullPage:true});
      await unit.getByRole('button',{name:'Guardar alojamiento',exact:true}).click();
      await expect(unit).not.toBeVisible();
      await page.getByRole('searchbox',{name:'Buscar',exact:true}).fill(name);
      await expect(page.getByRole('cell',{name,exact:true})).toBeVisible();
      await page.goto('/admin/eventos');
      await page.getByRole('button',{name:'Nueva consulta de evento',exact:true}).click();
      const event=page.getByRole('dialog',{name:'Nueva consulta de evento',exact:true});
      const contact='Contacto '+width+' '+randomUUID().slice(0,8);
      await event.getByLabel('Nombre de contacto',{exact:false}).fill(contact);
      await event.getByLabel('Correo electrónico',{exact:false}).fill('contact@example.com');
      await event.getByLabel('Teléfono',{exact:false}).fill('3870000000');
      await event.getByLabel('Tipo de evento',{exact:false}).fill('Reunión');
      await event.getByLabel('Cantidad de personas',{exact:false}).fill('12');
      await event.getByRole('button',{name:'Crear consulta',exact:true}).click();
      await expect(event).not.toBeVisible();
      await page.getByRole('searchbox',{name:'Buscar',exact:true}).fill(contact);
      await page.getByRole('button',{name:'Editar '+contact,exact:true}).click();
      const edit=page.getByRole('dialog',{name:'Editar consulta de evento',exact:true});
      await edit.getByLabel('Estado',{exact:true}).selectOption('CONTACTED');
      await edit.getByLabel('Observaciones',{exact:true}).fill('Se contactó a la persona.');
      await page.screenshot({path:info.outputPath('editar-evento.png'),fullPage:true});
      await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();
      await expect(edit).not.toBeVisible();
      await expect(page.getByRole('cell',{name:'Contactada',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    });
    test('reserva en modal, selector de pagos y calendario', async ({ page }, info) => {
      const unit = await createUnit(page.request);
      await page.goto('/admin/reservas');
      await page.getByRole('button', { name: 'Nueva reserva', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/reservas$/);
      const d = page.getByRole('dialog', { name: 'Nueva reserva', exact: true });
      await d.getByLabel('Alojamiento', { exact: false }).selectOption(unit.id);
      await d.getByLabel('Ingreso', { exact: false }).fill('2027-04-10');
      await d.getByLabel('Salida', { exact: false }).fill('2027-04-11');
      await d.getByLabel('Nombre', { exact: false }).fill('Reserva');
      await d.getByLabel('Apellido', { exact: false }).fill('Modal ' + width);
      await d.getByLabel('Teléfono', { exact: false }).fill('3870000000');
      await page.screenshot({path:info.outputPath('nueva-reserva.png'),fullPage:true});
      await d.getByRole('button', { name: 'Crear reserva', exact: true }).click();
      await expect(d).not.toBeVisible();
      await expect(page).toHaveURL(/\/admin\/reservas$/);
      const rows = (await (await page.request.get('/api/admin/reservations')).json()).reservations;
      const reservation = rows.find((r: { unit_name: string }) => r.unit_name === unit.name);
      expect(reservation).toBeTruthy();
      await page.goto('/admin/pagos');
      await expect(page.getByPlaceholder('UUID de la reserva')).toHaveCount(0);
      await page.getByLabel('Reserva', { exact: false }).selectOption(reservation.id);
      await page.getByLabel('Importe recibido (ARS)', { exact: false }).fill('100');
      await page.getByRole('button', { name: 'Registrar pago', exact: true }).click();
      await expect(page.getByText('Pago registrado correctamente.', { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('pagos.png'), fullPage: true });
      const today = new Date().toISOString().slice(0, 10),
        tomorrow = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10);
      expect(
        (
          await page.request.post('/api/admin/blocks', {
            data: {
              unitId: unit.id,
              checkin: today,
              checkout: tomorrow,
              reason: 'Prueba de alineación',
            },
          })
        ).status(),
      ).toBe(201);
      await page.goto('/admin/calendario');
      const bar = page.locator('[data-unit-id="' + unit.id + '"] [data-calendar-entry]');
      await expect(bar).toBeVisible();
      const a = await page.locator('[data-calendar-date="' + today + '"]').boundingBox(),
        b = await bar.boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Math.abs(b!.x - a!.x - 3)).toBeLessThan(2);
      expect(Math.abs(b!.width - a!.width + 6)).toBeLessThan(2);
      await page.screenshot({ path: info.outputPath('calendario.png'), fullPage: true });
    });
  });
}
