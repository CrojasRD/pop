'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CsvPreviewTable } from '@/components/shared/CsvPreviewTable';
import { parseSpreadsheetFile, validateStoreRows, type ImportPreview, type StoreImportRow } from '@/lib/import';
import { downloadCsvTemplate } from '@/lib/export';
import { bulkImportStores } from '@/actions/stores.actions';

const TEMPLATE_HEADERS = ['codigo', 'nombre', 'ciudad', 'provincia', 'direccion', 'zona', 'correo', 'celular', 'compania'];

export function BulkUploadStores({ zoneNames, existingCodes }: { zoneNames: string[]; existingCodes: string[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview<StoreImportRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const zoneSet = new Set(zoneNames.map((z) => z.toLowerCase()));
  const codeSet = new Set(existingCodes.filter(Boolean));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    const raw = await parseSpreadsheetFile(file);
    setPreview(validateStoreRows(raw, zoneSet, codeSet));
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
    const validRows = preview.rows.filter((r) => r.valid).map((r) => r.data);
    const result = await bulkImportStores(validRows);
    setLoading(false);
    if (result.error) setMessage(`Error: ${result.error}`);
    else {
      setMessage(`Se importaron ${result.imported} joyerías correctamente.`);
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Plantilla de carga masiva de joyerías</p>
            <p className="text-xs text-slate-400">Columnas: {TEMPLATE_HEADERS.join(', ')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate(TEMPLATE_HEADERS, 'plantilla-joyerias')}>
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
