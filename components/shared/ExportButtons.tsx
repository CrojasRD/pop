'use client';

import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportToExcel, exportToCsv, exportToPdf } from '@/lib/export';

export function ExportButtons({
  rows,
  fileName,
  title,
  pdfRows,
  pdfOptions
}: {
  rows: Record<string, unknown>[];
  fileName: string;
  title: string;
  /** Filas alternativas solo para el PDF (por defecto usa `rows`). Útil cuando la tabla tiene demasiadas columnas para caber legible en una página. */
  pdfRows?: Record<string, unknown>[];
  pdfOptions?: { format?: 'a4' | 'a3'; fontSize?: number; legend?: string };
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, fileName)}>
        <FileSpreadsheet size={14} /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportToCsv(rows, fileName)}>
        <FileDown size={14} /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportToPdf(pdfRows ?? rows, fileName, title, pdfOptions)}>
        <FileText size={14} /> PDF
      </Button>
    </div>
  );
}
