'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} widthClass="max-w-md">
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Dialog>
  );
}
