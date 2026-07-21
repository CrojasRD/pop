import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-brand-50 text-brand-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    success: 'bg-emerald-50 text-emerald-700'
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
