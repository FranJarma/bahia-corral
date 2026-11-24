import {createHmac} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {verifyMercadoPagoWebhook} from '@/modules/payments/integrations/mercadopago';

describe('webhook Mercado Pago',()=>{
  it('valida HMAC en tiempo constante con manifest de order',()=>{
    const dataId='ORD123';const requestId='req-2';const ts='1742505638683';const secret='test-webhook';
    const mac=createHmac('sha256',secret).update(`id:ord123;request-id:${requestId};ts:${ts};`).digest('hex');
    expect(verifyMercadoPagoWebhook({signature:`ts=${ts},v1=${mac}`,requestId,dataId,secret})).toBe(true);
    expect(verifyMercadoPagoWebhook({signature:`ts=${ts},v1=${mac}`,requestId:'wrong',dataId,secret})).toBe(false);
    expect(verifyMercadoPagoWebhook({signature:'wrong',requestId,dataId,secret})).toBe(false);
  });
});
