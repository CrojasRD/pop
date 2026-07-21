import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import type { ImportRowResult } from '@/lib/import';

/** Tabla de vista previa para cargas masivas: muestra fila, estado y errores antes de confirmar. */
export function CsvPreviewTable<T extends Record<string, unknown>>({ rows }: { rows: ImportRowResult<T>[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">Sube un archivo para ver la vista previa.</p>;

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Fila</Th>
          <Th>Estado</Th>
          <Th>Resumen</Th>
          <Th>Errores</Th>
        </tr>
      </Thead>
      <tbody>
        {rows.map((r, idx) => (
          <Tr key={idx}>
            <Td>{r.row}</Td>
            <Td>
              {r.valid ? <Badge className="bg-emerald-100 text-emerald-700">Válida</Badge> : <Badge className="bg-red-100 text-red-700">Con error</Badge>}
            </Td>
            <Td className="max-w-xs truncate text-xs text-slate-500">{JSON.stringify(r.data)}</Td>
            <Td className="text-xs text-red-600">{r.errors.join(' · ')}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
