export type AccommodationType = 'CABIN' | 'STUDIO' | 'ROOM';
export type PublicUnit = {
  code: string;
  slug: string;
  name: string;
  type: AccommodationType;
  label: string;
  capacityTotal: number;
  fromPrice: string;
  description: string;
};

// Contenido de primera carga: valores comerciales administrables al conectar Neon.
export const PUBLIC_UNITS: readonly PublicUnit[] = [
  { code: '1', slug: 'cabana-1', name: 'Cabaña 1', type: 'CABIN', label: 'Cabaña familiar', capacityTotal: 8, fromPrice: '$140.000', description: 'Espacios amplios para disfrutar del paisaje del Dique Cabra Corral.' },
  { code: '2', slug: 'cabana-2', name: 'Cabaña 2', type: 'CABIN', label: 'Cabaña familiar', capacityTotal: 8, fromPrice: '$140.000', description: 'Confort y descanso en un entorno natural para toda la familia.' },
  { code: '3', slug: 'cabana-3', name: 'Cabaña 3', type: 'CABIN', label: 'Cabaña familiar', capacityTotal: 8, fromPrice: '$140.000', description: 'Una escapada rodeada de naturaleza para compartir momentos únicos.' },
  { code: '4', slug: 'monoambiente-4', name: 'Monoambiente 4', type: 'STUDIO', label: 'Monoambiente', capacityTotal: 4, fromPrice: '$95.000', description: 'Una opción práctica y acogedora para parejas o familias pequeñas.' },
  { code: '5', slug: 'monoambiente-5', name: 'Monoambiente 5', type: 'STUDIO', label: 'Monoambiente', capacityTotal: 4, fromPrice: '$95.000', description: 'Comodidad y privacidad para disfrutar los servicios del complejo.' },
  { code: '6', slug: 'habitacion-6', name: 'Habitación triple', type: 'ROOM', label: 'Habitación', capacityTotal: 3, fromPrice: '$60.000', description: 'Un espacio cómodo para descansar y disfrutar del dique.' },
];
