import {describe,expect,it} from 'vitest';
import {checkFileSignature} from '@/infrastructure/storage/storage-port';

describe('comprobantes',()=>{
  it('rechaza un PDF falso cuyo Content-Type fue adulterado',()=>{
    expect(checkFileSignature(new TextEncoder().encode('no es un PDF'),'application/pdf')).toBe(false);
    expect(checkFileSignature(new TextEncoder().encode('%PDF-1.7...'),'application/pdf')).toBe(true);
  });
});
