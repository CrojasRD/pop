import { z } from 'zod';

export const popItemSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  category_id: z.string().uuid('Selecciona una categoría'),
  description: z.string().optional(),
  internal_code: z.string().min(2, 'El código interno es obligatorio'),
  image_url: z.string().url().optional().or(z.literal('')),
  total_quantity: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5)
});
export type PopItemInput = z.infer<typeof popItemSchema>;

export const popAvailabilitySchema = z.object({
  is_available: z.boolean()
});
export type PopAvailabilityInput = z.infer<typeof popAvailabilitySchema>;

export const storeSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'El nombre es obligatorio'),
  city: z.string().min(2, 'La ciudad es obligatoria'),
  province: z.string().min(2, 'La provincia es obligatoria'),
  address: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  zone_id: z.string().uuid('Selecciona una zona'),
  zonal_manager_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active')
});
export type StoreInput = z.infer<typeof storeSchema>;

// Nota: el objeto base se define sin `.refine()` para poder usar `.partial()`
// en las actualizaciones parciales (ZodEffects, lo que devuelve `.refine()`,
// no expone `.partial()`).
export const eventBaseSchema = z.object({
  event_name: z.string().min(2, 'El nombre del evento es obligatorio'),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().min(1, 'Fecha de fin requerida'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  location: z.string().optional(),
  store_id: z.string().uuid().optional().or(z.literal('')),
  zone_id: z.string().uuid('Selecciona una zona'),
  event_type: z.string().optional(),
  description: z.string().optional(),
  justification: z.string().optional(),
  required_pop_materials: z
    .array(z.object({ pop_item_id: z.string().uuid(), quantity: z.coerce.number().int().min(1) }))
    .default([])
});
export const eventSchema = eventBaseSchema.refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
  path: ['end_date']
});
export type EventInput = z.infer<typeof eventSchema>;

export const truckStopBaseSchema = z.object({
  zone_id: z.string().uuid('Selecciona una zona'),
  activity_name: z.string().min(2, 'Describe la actividad'),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().min(1, 'Fecha de fin requerida'),
  notes: z.string().optional()
});
export const truckStopSchema = truckStopBaseSchema.refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
  path: ['end_date']
});
export type TruckStopInput = z.infer<typeof truckStopSchema>;

export const assetSchema = z.object({
  asset_type: z.string().min(2, 'Selecciona o escribe el tipo de activo'),
  zone_id: z.string().uuid('Selecciona una zona'),
  store_id: z.string().uuid().optional().or(z.literal('')),
  location: z.string().optional(),
  responsible_name: z.string().optional(),
  status: z.enum(['good', 'damaged', 'maintenance']).default('good'),
  notes: z.string().optional()
});
export type AssetInput = z.infer<typeof assetSchema>;

export const supplierSchema = z.object({
  name: z.string().min(2, 'El nombre del proveedor es obligatorio'),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'alternative', 'pending_validation']).default('active'),
  zone_id: z.string().uuid().optional().or(z.literal('')),
  zone_city: z.string().optional(),
  business_name: z.string().optional(),
  ruc: z.string().optional(),
  provider_type: z.string().optional(),
  services: z.string().optional(),
  coverage: z.string().optional(),
  payment_method: z.string().optional(),
  delivery_time: z.string().optional(),
  issues_invoice: z
    .enum(['true', 'false', ''])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined))
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Fecha requerida'),
  category: z
    .enum(['material_pop', 'logistica', 'camion', 'mantenimiento', 'personal', 'proveedores', 'otros'])
    .default('otros'),
  description: z.string().min(2, 'Describe el gasto'),
  amount: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  zone_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional()
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// El jefe zonal solo solicita el material (sin cantidad). El administrador
// define la cantidad exclusivamente al momento de aprobar la solicitud
// (ver `replenishmentApprovalSchema`).
export const replenishmentSchema = z.object({
  zone_id: z.string().uuid('Selecciona una zona'),
  store_id: z.string().uuid('Selecciona una joyería'),
  pop_item_id: z.string().uuid('Selecciona un material'),
  reason: z.string().min(3, 'Describe el motivo'),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  zonal_comment: z.string().optional()
});
export type ReplenishmentInput = z.infer<typeof replenishmentSchema>;

export const replenishmentApprovalSchema = z.object({
  requested_quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0')
});
export type ReplenishmentApprovalInput = z.infer<typeof replenishmentApprovalSchema>;

export const acquisitionSchema = z.object({
  zone_id: z.string().uuid('Selecciona una zona'),
  store_id: z.string().uuid().optional().or(z.literal('')),
  product_name: z.string().min(2, 'El nombre del producto es obligatorio'),
  category_id: z.string().uuid('Selecciona una categoría'),
  requested_quantity: z.coerce.number().int().min(1),
  justification: z.string().min(3, 'Describe la justificación'),
  related_event_id: z.string().uuid().optional().or(z.literal('')),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  attachment_url: z.string().url().optional().or(z.literal(''))
});
export type AcquisitionInput = z.infer<typeof acquisitionSchema>;

export const userSchema = z.object({
  full_name: z.string().min(2, 'Nombre completo requerido'),
  email: z.string().email('Correo inválido'),
  username: z.string().min(3, 'Usuario requerido'),
  role: z.enum(['admin', 'zonal_manager']),
  zone_id: z.string().uuid().optional().or(z.literal('')),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  status: z.enum(['active', 'inactive']).default('active')
});
export type UserInput = z.infer<typeof userSchema>;

export const zoneSchema = z.object({
  name: z.string().min(2, 'Nombre de zona requerido'),
  description: z.string().optional(),
  manager_id: z.string().uuid().optional().or(z.literal(''))
});
export type ZoneInput = z.infer<typeof zoneSchema>;
