'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { updatePopItemAvailability } from '@/actions/inventory.actions';
import type { PopItem, PopCategory } from '@/lib/types';

export function InventoryTable({
  items,
  categories,
  isAdmin = false
}: {
  items: PopItem[];
  categories: PopCategory[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.internal_code.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'all' || item.category_id === category;
      const matchesAvailability =
        availability === 'all' ||
        (availability === 'available' && item.is_available) ||
        (availability === 'unavailable' && !item.is_available);
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [items, query, category, availability]);

  const exportRows = filtered.map((i) => ({
    Nombre: i.name,
    Categoría: i.category?.name ?? '',
    Código: i.internal_code,
    Estado: i.is_available ? 'Disponible' : 'No disponible'
  }));

  async function handleAvailabilityChange(item: PopItem, value: string) {
    setSavingId(item.id);
    await updatePopItemAvailability(item.id, value === 'available');
    setSavingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Buscar por nombre o código…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64 pl-8" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-44">
            <option value="all">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="unavailable">No disponible</option>
          </Select>
        </div>
        {isAdmin ? <ExportButtons rows={exportRows} fileName="inventario-pop" title="Inventario POP - Orocash" /> : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No se encontraron materiales con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Material</Th>
              <Th>Categoría</Th>
              <Th>Código</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <Link href={`/inventario/${item.id}`} className="font-medium text-brand-700 hover:underline">
                    {item.name}
                  </Link>
                </Td>
                <Td>{item.category?.name ?? '—'}</Td>
                <Td className="font-mono text-xs">{item.internal_code}</Td>
                <Td>
                  {isAdmin ? (
                    <Select
                      value={item.is_available ? 'available' : 'unavailable'}
                      onChange={(e) => handleAvailabilityChange(item, e.target.value)}
                      disabled={savingId === item.id}
                      className="w-40"
                    >
                      <option value="available">Disponible</option>
                      <option value="unavailable">No disponible</option>
                    </Select>
                  ) : (
                    <Badge className={item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                      {item.is_available ? 'Disponible' : 'No disponible'}
                    </Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
