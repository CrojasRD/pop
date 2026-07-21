'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CsvPreviewTable } from '@/components/shared/CsvPreviewTable';
import { parseSpreadsheetFile, validatePopItemRows, type ImportPreview, type PopItemImportRow } from '@/lib/import';
import { downloadCsvTemplate } from '@/lib/export';
import { bulkImportPopItems } from '@/actions/inventory.actions';

export function BulkUploadInventory({
  existingCodes,
  categoryNames
}: {
  existingCodes: string[];
  categoryNames: string[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview<PopItemImportRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const validCategorySet = new Set(categoryNames.map((c) => c.toLowerCase()));
  const existingCodeSet = new Set(existingCodes);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    const raw = await parseSpreadsheetFile(file);
    setPreview(validatePopItemRows(raw, existingCodeSet, validCategorySet));
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
    const validRows = preview.rows.filter((r) => r.valid).map((r) => r.data);
    const result = await bulkImportPopItems(validRows);
    setLoading(false);
    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else {
      setMessage(`Se importaron ${result.imported} materiales correctamente.`);
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Plantilla de carga masiva</p>
            <p className="text-xs text-slate-400">Columnas: nombre, categoria, descripcion, codigo_interno, cantidad_total, stock_minimo</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsvTemplate(['nombre', 'categoria', 'descripcion', 'codigo_interno', 'cantidad_total', 'stock_minimo'], 'plantilla-materiales-pop')}
          >
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
                  {loading ? 'Importando…' : `Confirmar carga (${preview.validCount})`}
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
