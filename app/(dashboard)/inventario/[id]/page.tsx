import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import { InventoryActions, ReturnAssignmentButton } from '@/components/inventario/InventoryActions';

export default async function InventoryDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const supabase = createClient();

  const { data: item } = await supabase
    .from('pop_items')
    .select('*, category:pop_categories(*)')
    .eq('id', params.id)
    .single();

  if (!item) notFound();

  const { data: assignments } = await supabase
    .from('inventory_assignments')
    .select('*, store:stores(*)')
    .eq('pop_item_id', params.id)
    .order('created_at', { ascending: false });

  const { data: stores } = user.role === 'admin'
    ? await supabase.from('stores').select('*').eq('status', 'active').order('name')
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400">{item.internal_code}</p>
          <h1 className="text-xl font-semibold text-slate-800">{item.name}</h1>
          <p className="text-sm text-slate-500">{item.category?.name}</p>
        </div>
        <Badge className={item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
          {item.is_available ? 'Disponible' : 'No disponible'}
        </Badge>
      </div>

      {item.description ? (
        <Card>
          <CardContent className="text-sm text-slate-600">{item.description}</CardContent>
        </Card>
      ) : null}

      {user.role === 'admin' ? <InventoryActions item={item as any} stores={(stores as any) ?? []} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Asignaciones por joyería</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!assignments || assignments.length === 0 ? (
            <EmptyState message="Este material aún no ha sido asignado a ninguna joyería." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Joyería</Th>
                  <Th>Cantidad</Th>
                  <Th>Entrega</Th>
                  <Th>Devolución</Th>
                  <Th>Estado</Th>
                  {user.role === 'admin' ? <Th>Acción</Th> : null}
                </tr>
              </Thead>
              <tbody>
                {assignments.map((a: any) => (
                  <Tr key={a.id}>
                    <Td>{a.store?.name ?? '—'}</Td>
                    <Td>{a.assigned_quantity}</Td>
                    <Td>{formatDate(a.delivery_date)}</Td>
                    <Td>{formatDate(a.return_date)}</Td>
                    <Td><Badge status={a.status} /></Td>
                    {user.role === 'admin' ? (
                      <Td>{a.status !== 'returned' && a.assigned_quantity > 0 ? <ReturnAssignmentButton assignment={a} /> : null}</Td>
                    ) : null}
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
