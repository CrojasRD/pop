'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CsvPreviewTable } from '@/components/shared/CsvPreviewTable';
import { parseSpreadsheetFile, validateAssignmentRows, type ImportPreview, type AssignmentImportRow } from '@/lib/import';
import { downloadCsvTemplate } from '@/lib/export';
import { bulkImportAssignments } from '@/actions/inventory.actions';

const TEMPLATE_HEADERS = ['codigo_material', 'codigo_joyeria', 'cantidad', 'fecha_entrega', 'notas'];

export function BulkUploadAssignments({ itemCodes, storeCodes }: { itemCodes: string[]; storeCodes: string[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview<AssignmentImportRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const itemSet = new Set(itemCodes);
  const storeSet = new Set(storeCodes);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    const raw = await parseSpreadsheetFile(file);
    setPreview(validateAssignmentRows(raw, itemSet, storeSet));
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
    const validRows = preview.rows.filter((r) => r.valid).map((r) => r.data);
    const result = await bulkImportAssignments(validRows);
    setLoading(false);
    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else {
      const failedMsg = result.failed?.length ? ` · ${result.failed.length} fallaron (revisa stock disponible en bodega)` : '';
      setMessage(`Se distribuyeron ${result.imported} registros correctamente${failedMsg}.`);
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Plantilla de distribución a joyerías</p>
            <p className="text-xs text-slate-400">
              Columnas: {TEMPLATE_HEADERS.join(', ')}. Usa el código interno del material (ej. VOL-001) y el código de la agencia (ej. E-01). Descuenta de bodega automáticamente.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate(TEMPLATE_HEADERS, 'plantilla-distribucion-inventario')}>
            <Download size={14} /> Descargar plantilla
          </Button>
        </CardContent>
      </Card>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-brand-400">
        <UploadCloud className="text-slate-400" size={28} />
        <span className="text-sm font-medium text-slate-600">Haz clic para subir un archivo CSV o Excel</span>
        <span className="text-xs text-slate-400">.csv, .xlsx, .xls</span>
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </label>

      {preview ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-600">{preview.validCount} válidas</span>
                {' · '}
                <span className="font-semibold text-red-600">{preview.errorCount} con error</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
                <Button onClick={confirmImport} disabled={loading || preview.validCount === 0}>
                  {loading ? 'Distribuyendo…' : `Confirmar distribución (${preview.validCount})`}
                </Button>
              </div>
            </div>
            <CsvPreviewTable rows={preview.rows} />
          </CardContent>
        </Card>
      ) : null}

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
