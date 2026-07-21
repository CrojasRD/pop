import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { statusColor, statusLabel } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: string;
}

export function Badge({ status, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        status ? statusColor(status) : 'bg-slate-100 text-slate-700',
        className
      )}
      {...props}
    >
      {children ?? (status ? statusLabel(status) : null)}
    </span>
  );
}
