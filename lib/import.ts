import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ImportRowResult<T> {
  row: number;
  data: T;
  errors: string[];
  valid: boolean;
}

export interface ImportPreview<T> {
  rows: ImportRowResult<T>[];
  validCount: number;
  errorCount: number;
}

/** Lee un archivo CSV o Excel (.xlsx/.xls) y devuelve un arreglo de objetos crudos (sin validar). */
export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const isCsv = file.name.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const text = await file.text();
    const { data } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
    return data;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
}

const REQUIRED_MSG = (field: string) => `Falta el campo obligatorio "${field}"`;
const NUMBER_MSG = (field: string) => `"${field}" debe ser numérico`;
const DATE_MSG = (field: string) => `"${field}" debe tener formato de fecha válido (AAAA-MM-DD)`;

function isValidDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

// -------------------------------------------------------------------
// MATERIALES POP — columnas esperadas del CSV/Excel
// nombre, categoria, descripcion, codigo_interno, cantidad_total, stock_minimo
// -------------------------------------------------------------------
export interface PopItemImportRow {
  name: string;
  category: string;
  description: string;
  internal_code: string;
  total_quantity: number;
  low_stock_threshold: number;
}

export function validatePopItemRows(
  raw: Record<string, string>[],
  existingCodes: Set<string>,
  validCategories: Set<string>
): ImportPreview<PopItemImportRow> {
  const seenCodes = new Set<string>();
  const rows: ImportRowResult<PopItemImportRow>[] = raw.map((r, idx) => {
    const errors: string[] = [];
    const name = (r.nombre ?? r.name ?? '').trim();
    const category = (r.categoria ?? r.category ?? '').trim();
    const description = (r.descripcion ?? r.description ?? '').trim();
    const internal_code = (r.codigo_interno ?? r.internal_code ?? '').trim();
    const totalRaw = r.cantidad_total ?? r.total_quantity ?? '';
    const thresholdRaw = r.stock_minimo ?? r.low_stock_threshold ?? '5';

    if (!name) errors.push(REQUIRED_MSG('nombre'));
    if (!category) errors.push(REQUIRED_MSG('categoria'));
    else if (!validCategories.has(category.toLowerCase())) errors.push(`Categoría "${category}" no existe`);
    if (!internal_code) errors.push(REQUIRED_MSG('codigo_interno'));
    else if (existingCodes.has(internal_code) || seenCodes.has(internal_code)) {
      errors.push(`Código interno "${internal_code}" duplicado`);
    } else {
      seenCodes.add(internal_code);
    }
    if (totalRaw === '' || Number.isNaN(Number(totalRaw))) errors.push(NUMBER_MSG('cantidad_total'));
    if (thresholdRaw !== '' && Number.isNaN(Number(thresholdRaw))) errors.push(NUMBER_MSG('stock_minimo'));

    return {
      row: idx + 2, // +2 = encabezado + índice base 1
      data: {
        name,
        category,
        description,
        internal_code,
        total_quantity: Number(totalRaw) || 0,
        low_stock_threshold: Number(thresholdRaw) || 5
      },
      errors,
      valid: errors.length === 0
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length
  };
}

// -------------------------------------------------------------------
// EVENTOS — columnas esperadas
// nombre_evento, fecha_inicio, fecha_fin, hora_inicio, hora_fin, ciudad,
// provincia, lugar, joyeria, zona, tipo_evento, descripcion, justificacion
// -------------------------------------------------------------------
export interface EventImportRow {
  event_name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  city: string;
  province: string;
  location: string;
  store_name: string;
  zone_name: string;
  event_type: string;
  description: string;
  justification: string;
}

export function validateEventRows(
  raw: Record<string, string>[],
  validStoreNames: Set<string>,
  validZoneNames: Set<string>
): ImportPreview<EventImportRow> {
  const rows: ImportRowResult<EventImportRow>[] = raw.map((r, idx) => {
    const errors: string[] = [];
    const event_name = (r.nombre_evento ?? r.event_name ?? '').trim();
    const start_date = (r.fecha_inicio ?? r.start_date ?? '').trim();
    const end_date = (r.fecha_fin ?? r.end_date ?? '').trim();
    const store_name = (r.joyeria ?? r.store_name ?? '').trim();
    const zone_name = (r.zona ?? r.zone_name ?? '').trim();

    if (!event_name) errors.push(REQUIRED_MSG('nombre_evento'));
    if (!start_date) errors.push(REQUIRED_MSG('fecha_inicio'));
    else if (!isValidDate(start_date)) errors.push(DATE_MSG('fecha_inicio'));
    if (!end_date) errors.push(REQUIRED_MSG('fecha_fin'));
    else if (!isValidDate(end_date)) errors.push(DATE_MSG('fecha_fin'));
    if (start_date && end_date && isValidDate(start_date) && isValidDate(end_date) && end_date < start_date) {
      errors.push('fecha_fin no puede ser anterior a fecha_inicio');
    }
    if (!zone_name) errors.push(REQUIRED_MSG('zona'));
    else if (!validZoneNames.has(zone_name.toLowerCase())) errors.push(`Zona "${zone_name}" no existe`);
    if (store_name && !validStoreNames.has(store_name.toLowerCase())) errors.push(`Joyería "${store_name}" no existe`);

    return {
      row: idx + 2,
      data: {
        event_name,
        start_date,
        end_date,
        start_time: (r.hora_inicio ?? r.start_time ?? '').trim(),
        end_time: (r.hora_fin ?? r.end_time ?? '').trim(),
        city: (r.ciudad ?? r.city ?? '').trim(),
        province: (r.provincia ?? r.province ?? '').trim(),
        location: (r.lugar ?? r.location ?? '').trim(),
        store_name,
        zone_name,
        event_type: (r.tipo_evento ?? r.event_type ?? '').trim(),
        description: (r.descripcion ?? r.description ?? '').trim(),
        justification: (r.justificacion ?? r.justification ?? '').trim()
      },
      errors,
      valid: errors.length === 0
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length
  };
}

// -------------------------------------------------------------------
// JOYERÍAS — columnas esperadas: nombre, ciudad, provincia, direccion, zona
// -------------------------------------------------------------------
export interface StoreImportRow {
  code: string;
  name: string;
  city: string;
  province: string;
  address: string;
  email: string;
  phone: string;
  company: string;
  zone_name: string;
}

export function validateStoreRows(
  raw: Record<string, string>[],
  validZoneNames: Set<string>,
  existingCodes: Set<string> = new Set()
): ImportPreview<StoreImportRow> {
  const seenCodes = new Set<string>();
  const rows: ImportRowResult<StoreImportRow>[] = raw.map((r, idx) => {
    const errors: string[] = [];
    const code = (r.codigo ?? r.code ?? '').trim();
    const name = (r.nombre ?? r.name ?? '').trim();
    const city = (r.ciudad ?? r.city ?? '').trim();
    const province = (r.provincia ?? r.province ?? '').trim();
    const zone_name = (r.zona ?? r.zone_name ?? '').trim();
    const email = (r.correo ?? r.email ?? '').trim();

    if (!name) errors.push(REQUIRED_MSG('nombre'));
    if (!city) errors.push(REQUIRED_MSG('ciudad'));
    if (!province) errors.push(REQUIRED_MSG('provincia'));
    if (!zone_name) errors.push(REQUIRED_MSG('zona'));
    else if (!validZoneNames.has(zone_name.toLowerCase())) errors.push(`Zona "${zone_name}" no existe`);
    if (code) {
      if (existingCodes.has(code) || seenCodes.has(code)) errors.push(`Código "${code}" duplicado`);
      else seenCodes.add(code);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Correo con formato inválido');

    return {
      row: idx + 2,
      data: {
        code,
        name,
        city,
        province,
        address: (r.direccion ?? r.address ?? '').trim(),
        email,
        phone: (r.celular ?? r.telefono ?? r.phone ?? '').trim(),
        company: (r.compania ?? r.company ?? '').trim(),
        zone_name
      },
      errors,
      valid: errors.length === 0
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length
  };
}

// -------------------------------------------------------------------
// ASIGNACIONES / DISTRIBUCIÓN DE INVENTARIO — columnas esperadas
// codigo_material, codigo_joyeria, cantidad, fecha_entrega, notas
// -------------------------------------------------------------------
export interface AssignmentImportRow {
  item_code: string;
  store_code: string;
  quantity: number;
  delivery_date: string;
  notes: string;
}

export function validateAssignmentRows(
  raw: Record<string, string>[],
  validItemCodes: Set<string>,
  validStoreCodes: Set<string>
): ImportPreview<AssignmentImportRow> {
  const rows: ImportRowResult<AssignmentImportRow>[] = raw.map((r, idx) => {
    const errors: string[] = [];
    const item_code = (r.codigo_material ?? r.item_code ?? '').trim();
    const store_code = (r.codigo_joyeria ?? r.store_code ?? '').trim();
    const quantityRaw = r.cantidad ?? r.quantity ?? '';
    const delivery_date = (r.fecha_entrega ?? r.delivery_date ?? '').trim();

    if (!item_code) errors.push(REQUIRED_MSG('codigo_material'));
    else if (!validItemCodes.has(item_code)) errors.push(`Material "${item_code}" no existe`);
    if (!store_code) errors.push(REQUIRED_MSG('codigo_joyeria'));
    else if (!validStoreCodes.has(store_code)) errors.push(`Joyería con código "${store_code}" no existe`);
    if (quantityRaw === '' || Number.isNaN(Number(quantityRaw)) || Number(quantityRaw) <= 0) {
      errors.push(NUMBER_MSG('cantidad'));
    }
    if (delivery_date && !isValidDate(delivery_date)) errors.push(DATE_MSG('fecha_entrega'));

    return {
      row: idx + 2,
      data: {
        item_code,
        store_code,
        quantity: Number(quantityRaw) || 0,
        delivery_date: delivery_date || new Date().toISOString().slice(0, 10),
        notes: (r.notas ?? r.notes ?? '').trim()
      },
      errors,
      valid: errors.length === 0
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length
  };
}

// -------------------------------------------------------------------
// CAMBIOS DE INVENTARIO POR JOYERÍA — actualiza asignaciones ya
// existentes (estado y/o cantidad), no crea movimientos de bodega.
// columnas esperadas: codigo_joyeria, codigo_material, cantidad, estado
// -------------------------------------------------------------------
const VALID_ASSIGNMENT_STATUSES = new Set(['good', 'damaged', 'maintenance', 'in_stock', 'out_of_stock']);
const STATUS_ALIASES: Record<string, string> = {
  'buen estado': 'good',
  bueno: 'good',
  dañado: 'damaged',
  danado: 'damaged',
  mantenimiento: 'maintenance',
  'en mantenimiento': 'maintenance',
  'en stock': 'in_stock',
  'sin stock': 'out_of_stock'
};

function normalizeStatus(value: string): string {
  const v = value.trim().toLowerCase();
  return STATUS_ALIASES[v] ?? v;
}

export interface AssignmentUpdateImportRow {
  store_code: string;
  item_code: string;
  quantity: number;
  status: string;
}

export function validateAssignmentUpdateRows(
  raw: Record<string, string>[],
  validItemCodes: Set<string>,
  validStoreCodes: Set<string>
): ImportPreview<AssignmentUpdateImportRow> {
  const rows: ImportRowResult<AssignmentUpdateImportRow>[] = raw.map((r, idx) => {
    const errors: string[] = [];
    const store_code = (r.codigo_joyeria ?? r.store_code ?? '').trim();
    const item_code = (r.codigo_material ?? r.item_code ?? '').trim();
    const quantityRaw = r.cantidad ?? r.quantity ?? '';
    const status = normalizeStatus(r.estado ?? r.status ?? '');

    if (!store_code) errors.push(REQUIRED_MSG('codigo_joyeria'));
    else if (!validStoreCodes.has(store_code)) errors.push(`Joyería con código "${store_code}" no existe`);
    if (!item_code) errors.push(REQUIRED_MSG('codigo_material'));
    else if (!validItemCodes.has(item_code)) errors.push(`Material "${item_code}" no existe`);
    if (quantityRaw === '' || Number.isNaN(Number(quantityRaw)) || Number(quantityRaw) < 0) {
      errors.push(NUMBER_MSG('cantidad'));
    }
    if (!status) errors.push(REQUIRED_MSG('estado'));
    else if (!VALID_ASSIGNMENT_STATUSES.has(status)) {
      errors.push('"estado" debe ser: buen estado, dañado, mantenimiento, en stock o sin stock');
    }

    return {
      row: idx + 2,
      data: { store_code, item_code, quantity: Number(quantityRaw) || 0, status },
      errors,
      valid: errors.length === 0
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length
  };
}
