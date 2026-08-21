'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Power, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StoreFormDialog } from './StoreFormDialog';
import { ZoneAssetsMatrix, QUANTITY_CATEGORIES, orderZoneItems } from '@/components/inventario/ZoneAssetsMatrix';
import { toggleStoreStatus } from '@/actions/stores.actions';
import { statusLabel } from '@/lib/utils';
import type { AppUser, InventoryAssignment, PopItem, Store, Zone } from '@/lib/types';

export function JoyeriasPageTabs({
  user,
  stores,
  zones,
  managers,
  zoneItems,
  assignments,
  isAdmin
}: {
  user: AppUser;
  stores: Store[];
  zones: Zone[];
  managers: AppUser[];
  zoneItems: PopItem[];
  assignments: InventoryAssignment[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Store | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Store | null>(null);

  const orderedZoneItems = useMemo(() => orderZoneItems(zoneItems), [zoneItems]);

  const assignmentByKey = useMemo(() => {
    const map = new Map<string, InventoryAssignment>();
    for (const a of assignments) map.set(`${a.store_id}:${a.pop_item_id}`, a);
    return map;
  }, [assignments]);

  const exportRows = stores.map((s) => {
    const materialColumns: Record<string, string | number> = {};
    for (const it of orderedZoneItems) {
      const a = assignmentByKey.get(`${s.id}:${it.id}`);
      const isQuantityItem = QUANTITY_CATEGORIES.has(it.category?.name ?? '');
      materialColumns[it.name] = a
        ? isQuantityItem
          ? a.assigned_quantity
          : statusLabel(a.status)
        : isQuantityItem
          ? 0
          : 'No cuenta';
    }
    return {
      Código: s.code ?? '',
      Nombre: s.name,
      Ciudad: s.city,
      Provincia: s.province,
      Zona: s.zone?.name ?? '',
      'Jefe zonal': s.zonal_manager?.full_name ?? '',
      Correo: s.email ?? '',
      Teléfono: s.phone ?? '',
      Compañía: s.company ?? '',
      Estado: s.status,
      ...materialColumns
    };
  });

  // El PDF no tiene espacio para 26+ columnas legibles: para esa versión se
  // recortan los datos de la joyería a lo esencial y los materiales usan su
  // código corto (ej. ACR-001) en vez del nombre completo, con una leyenda.
  const pdfExportRows = stores.map((s) => {
    const materialColumns: Record<string, string | number> = {};
    for (const it of orderedZoneItems) {
      const a = assignmentByKey.get(`${s.id}:${it.id}`);
      const isQuantityItem = QUANTITY_CATEGORIES.has(it.category?.name ?? '');
      materialColumns[it.internal_code] = a
        ? isQuantityItem
          ? a.assigned_quantity
          : statusLabel(a.status)
        : isQuantityItem
          ? 0
          : 'No cuenta';
    }
    return {
      Código: s.code ?? '',
      Joyería: s.name,
      Zona: s.zone?.name ?? '',
      Estado: s.status,
      ...materialColumns
    };
  });

  const materialsLegend = orderedZoneItems.map((it) => `${it.internal_code}: ${it.name}`).join('   ·   ');

  async function confirmToggle() {
    if (!toggleTarget) return;
    await toggleStoreStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active');
    setToggleTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportButtons
            rows={exportRows}
            pdfRows={pdfExportRows}
            pdfOptions={{ format: 'a3', fontSize: 7, legend: materialsLegend }}
            fileName="joyerias"
            title="Joyerías - Orocash"
          />
          <Link href="/joyerias/carga-masiva">
            <Button size="sm" variant="outline"><Upload size={14} /> Carga masiva</Button>
          </Link>
          <Button size="sm" onClick={() => setEditing(null)}>
            <Plus size={14} /> Nueva joyería
          </Button>
        </div>
      ) : null}

      <ZoneAssetsMatrix
        user={user}
        zones={zones}
        stores={stores}
        items={zoneItems}
        assignments={assignments}
        rowActions={
          isAdmin
            ? (s) => (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}><Pencil size={12} /></Button>
                  <Button size="sm" variant="outline" onClick={() => setToggleTarget(s)}><Power size={12} /></Button>
                </div>
              )
            : undefined
        }
      />

      {editing !== undefined ? (
        <StoreFormDialog open onClose={() => setEditing(undefined)} store={editing} zones={zones} managers={managers} />
      ) : null}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.status === 'active' ? 'Desactivar joyería' : 'Activar joyería'}
        description={`¿Confirmas ${toggleTarget?.status === 'active' ? 'desactivar' : 'activar'} "${toggleTarget?.name}"?`}
        confirmLabel="Confirmar"
      />
    </div>
  );
}
