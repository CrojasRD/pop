import { requireAdmin } from '@/lib/auth';
import { ReportBuilder } from '@/components/reportes/ReportBuilder';

export default async function ReportesPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Reportes</h1>
        <p className="text-sm text-slate-500">Genera y exporta reportes de todas las zonas. Este módulo es exclusivo del administrador.</p>
      </div>
      <ReportBuilder />
    </div>
  );
}
