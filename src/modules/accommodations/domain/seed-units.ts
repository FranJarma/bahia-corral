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

// Datos editoriales y tarifas base inicialmente provistos por Bahía Corral.
// La cotización final se calcula en el servidor y puede diferir de estas referencias.
export const PUBLIC_UNITS: readonly PublicUnit[] = [
  {
    code: '1',
    slug: 'cabana-1',
    name: 'Cabaña 1',
    type: 'CABIN',
    label: 'Cabaña familiar',
    capacityTotal: 8,
    fromPrice: '$140.000',
    description:
      'Cabaña familiar con dos dormitorios, cocina, living y comedor integrados y quincho individual. Hasta 8 personas.',
  },
  {
    code: '2',
    slug: 'cabana-2',
    name: 'Cabaña 2',
    type: 'CABIN',
    label: 'Cabaña familiar',
    capacityTotal: 8,
    fromPrice: '$140.000',
    description:
      'Cabaña familiar con dos dormitorios, cocina, living comedor y quincho individual con asador.',
  },
  {
    code: '3',
    slug: 'cabana-3',
    name: 'Cabaña 3',
    type: 'CABIN',
    label: 'Cabaña familiar',
    capacityTotal: 8,
    fromPrice: '$140.000',
    description:
      'Cabaña familiar con dos dormitorios, cocina, living comedor y quincho individual con asador.',
  },
  {
    code: '4',
    slug: 'monoambiente-4',
    name: 'Monoambiente 4',
    type: 'STUDIO',
    label: 'Monoambiente',
    capacityTotal: 4,
    fromPrice: '$95.000',
    description:
      'Cocina, living comedor y dormitorio matrimonial independiente. Sofá cama marinero para completar la capacidad.',
  },
  {
    code: '5',
    slug: 'monoambiente-5',
    name: 'Monoambiente 5',
    type: 'STUDIO',
    label: 'Monoambiente',
    capacityTotal: 4,
    fromPrice: '$95.000',
    description:
      'Cocina, living comedor y dormitorio matrimonial independiente. Sofá cama marinero para completar la capacidad.',
  },
  {
    code: '6',
    slug: 'habitacion-6',
    name: 'Habitación 6',
    type: 'ROOM',
    label: 'Habitación triple',
    capacityTotal: 3,
    fromPrice: '$60.000',
    description:
      'Dormitorio independiente, living comedor y sector de refrigerio con frigobar y pava eléctrica. Sin cocina ni vajilla.',
  },
];
