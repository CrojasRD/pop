// Catálogo de tipos de activos publicitarios/promocionales de Orocash.
// Es referencial (el campo asset_type es texto libre en la base de datos),
// pero estos son los tipos reales que maneja la empresa.
export const ASSET_TYPES = [
  'Inflable',
  'Banner Human',
  'Bicicleta Publicitaria',
  'Lona Rompetráfico',
  'Mano y Anillo',
  'Parlante'
] as const;
