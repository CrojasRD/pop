import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  );
}

export function Thead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-slate-50 text-xs uppercase tracking-wide text-slate-500', className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 font-semibold', className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-slate-700', className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-t border-slate-100 hover:bg-slate-50/60', className)} {...props} />;
}

export function EmptyState({ message = 'No hay registros para mostrar.' }: { message?: string }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-400">{message}</div>;
}
