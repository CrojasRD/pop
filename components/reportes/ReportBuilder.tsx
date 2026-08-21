'use client';

import { useState, useTransition } from 'react';
import { FileBarChart } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { getReportData } from '@/actions/reports.actions';
import { REPORT_OPTIONS, type ReportType } from '@/lib/reports';

export function ReportBuilder() {
  const [type, setType] = useState<ReportType>('inventory_general');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, startTransition] = useTransition();
  const [hasRun, setHasRun] = useState(false);

  function runReport() {
    startTransition(async () => {
      const data = await getReportData(type);
      setRows(data);
      setHasRun(true);
    });
  }

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const label = REPORT_OPTIONS.find((o) => o.value === type)?.label ?? '';

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de reporte</label>
            <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
              {REPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <Button onClick={runReport} disabled={loading}>
            <FileBarChart size={14} /> {loading ? 'Generando…' : 'Generar reporte'}
          </Button>
          {rows.length > 0 ? <ExportButtons rows={rows} fileName={type} title={label} /> : null}
        </div>
      </Card>

      {hasRun && rows.length === 0 ? (
        <EmptyState message="El reporte no arrojó resultados para tu alcance actual." />
      ) : rows.length > 0 ? (
        <Table>
          <Thead>
            <tr>{headers.map((h) => <Th key={h}>{h}</Th>)}</tr>
          </Thead>
          <tbody>
            {rows.map((row, idx) => (
              <Tr key={idx}>
                {headers.map((h) => <Td key={h}>{String(row[h] ?? '—')}</Td>)}
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}
