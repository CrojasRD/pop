import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Exporta un arreglo de objetos a un archivo Excel (.xlsx) y dispara la descarga en el navegador. */
export function exportToExcel(rows: Record<string, unknown>[], fileName: string, sheetName = 'Datos') {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/** Exporta un arreglo de objetos a CSV y dispara la descarga. */
export function exportToCsv(rows: Record<string, unknown>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Exporta un arreglo de objetos a PDF tabular (encabezados = llaves del primer objeto). */
export function exportToPdf(
  rows: Record<string, unknown>[],
  fileName: string,
  title: string,
  options?: { format?: 'a4' | 'a3'; fontSize?: number; legend?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape', format: options?.format ?? 'a4' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, 14, 21);

  let startY = 26;
  if (options?.legend) {
    doc.setFontSize(7);
    const legendLines = doc.splitTextToSize(options.legend, doc.internal.pageSize.getWidth() - 28);
    doc.text(legendLines, 14, startY);
    startY += legendLines.length * 3.2 + 3;
  }

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '')));

  autoTable(doc, {
    startY,
    head: [headers],
    body,
    styles: { fontSize: options?.fontSize ?? 8, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 82, 144] }
  });

  doc.save(`${fileName}.pdf`);
}

/** Plantilla CSV descargable para carga masiva. */
export function downloadCsvTemplate(headers: string[], fileName: string) {
  const csv = headers.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
