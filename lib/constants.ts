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

// Categorías de material de consumo: en el panel de Joyerías/Inventario POP
// no tienen un "estado" físico como dañado/en mantenimiento — lo que importa
// es cuánto se entregó, y por eso se registran como cantidad. Vive aquí (no
// solo en ZoneAssetsMatrix) porque también lo usa confirmShipmentDelivery
// del lado del servidor para sumar la entrega al inventario de la joyería.
export const QUANTITY_CATEGORIES = new Set(['Certificados', 'Dípticos', 'Sobres', 'Tarjetas', 'Volantes']);
