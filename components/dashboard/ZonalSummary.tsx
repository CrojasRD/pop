import { Store, Package, Clock, CheckCircle2, XCircle, CalendarDays, AlertTriangle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import type { PopItem } from '@/lib/types';

export interface ZonalSummaryData {
  totalStores: number;
  availableInZone: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  eventsCreated: number;
  eventsApproved: number;
  lowStockItems: PopItem[];
}

export function ZonalSummary({ data }: { data: ZonalSummaryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard label="Joyerías asignadas" value={data.totalStores} icon={Store} />
        <MetricCard label="Inventario POP disponible" value={data.availableInZone} icon={Package} />
        <MetricCard label="Solicitudes pendientes" value={data.pendingRequests} icon={Clock} tone="warning" />
        <MetricCard label="Solicitudes aprobadas" value={data.approvedRequests} icon={CheckCircle2} tone="success" />
        <MetricCard label="Solicitudes rechazadas" value={data.rejectedRequests} icon={XCircle} tone="danger" />
        <MetricCard label="Eventos creados" value={data.eventsCreated} icon={CalendarDays} />
        <MetricCard label="Eventos aprobados" value={data.eventsApproved} icon={CalendarDays} tone="success" />
        <MetricCard label="Materiales con bajo stock" value={data.lowStockItems.length} icon={AlertTriangle} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiales con bajo stock en tu zona</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.lowStockItems.length === 0 ? (
            <EmptyState message="Sin alertas de stock en tu zona." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Material</Th>
                  <Th>Código</Th>
                  <Th>Disponible</Th>
                </tr>
              </Thead>
              <tbody>
                {data.lowStockItems.map((item) => (
                  <Tr key={item.id}>
                    <Td>{item.name}</Td>
                    <Td>{item.internal_code}</Td>
                    <Td>{item.warehouse_quantity}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
