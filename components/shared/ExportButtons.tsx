'use client';

import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportToExcel, exportToCsv, exportToPdf } from '@/lib/export';

export function ExportButtons({
  rows,
  fileName,
  title
}: {
  rows: Record<string, unknown>[];
  fileName: string;
  title: string;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, fileName)}>
        <FileSpreadsheet size={14} /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportToCsv(rows, fileName)}>
        <FileDown size={14} /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportToPdf(rows, fileName, title)}>
        <FileText size={14} /> PDF
      </Button>
    </div>
  );
}
