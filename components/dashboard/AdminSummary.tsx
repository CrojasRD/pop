import { Package, Store, Map, Users, ClipboardList, CalendarCheck, AlertTriangle, Truck } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { PopItem, InventoryMovement } from '@/lib/types';

export interface AdminSummaryData {
  totalPopItems: number;
  totalStores: number;
  totalZones: number;
  totalZonalManagers: number;
  pendingReplenishment: number;
  pendingAcquisition: number;
  pendingEvents: number;
  approvedEventsThisMonth: number;
  lowStockItems: PopItem[];
  recentMovements: InventoryMovement[];
}

export function AdminSummary({ data }: { data: AdminSummaryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard label="Materiales POP" value={data.totalPopItems} icon={Package} />
        <MetricCard label="Joyerías" value={data.totalStores} icon={Store} />
        <MetricCard label="Zonas" value={data.totalZones} icon={Map} />
        <MetricCard label="Jefes zonales" value={data.totalZonalManagers} icon={Users} />
        <MetricCard
          label="Solicitudes pendientes"
          value={data.pendingReplenishment + data.pendingAcquisition}
          icon={ClipboardList}
          tone="warning"
          hint={`${data.pendingReplenishment} reposición · ${data.pendingAcquisition} adquisición`}
        />
        <MetricCard label="Eventos pendientes" value={data.pendingEvents} icon={CalendarCheck} tone="warning" />
        <MetricCard label="Eventos aprobados (mes)" value={data.approvedEventsThisMonth} icon={CalendarCheck} tone="success" />
        <MetricCard label="Materiales con bajo stock" value={data.lowStockItems.length} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Materiales con bajo stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.lowStockItems.length === 0 ? (
              <EmptyState message="Sin alertas de stock por el momento." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Material</Th>
                    <Th>Código</Th>
                    <Th>En bodega</Th>
                    <Th>Mínimo</Th>
                  </tr>
                </Thead>
                <tbody>
                  {data.lowStockItems.map((item) => (
                    <Tr key={item.id}>
                      <Td>{item.name}</Td>
                      <Td>{item.internal_code}</Td>
                      <Td>{item.warehouse_quantity}</Td>
                      <Td>{item.low_stock_threshold}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos movimientos de inventario</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentMovements.length === 0 ? (
              <EmptyState message="Aún no hay movimientos registrados." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Material</Th>
                    <Th>Tipo</Th>
                    <Th>Cantidad</Th>
                    <Th>Fecha</Th>
                  </tr>
                </Thead>
                <tbody>
                  {data.recentMovements.map((m) => (
                    <Tr key={m.id}>
                      <Td>{m.pop_item?.name ?? '—'}</Td>
                      <Td><Badge status={m.movement_type} /></Td>
                      <Td>{m.quantity}</Td>
                      <Td>{formatDateTime(m.created_at)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
