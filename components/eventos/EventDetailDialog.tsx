'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { reviewEvent, deleteEvent } from '@/actions/events.actions';
import type { AppUser, EventRecord } from '@/lib/types';

export function EventDetailDialog({
  event,
  user,
  popItemNames = {},
  onClose
}: {
  event: EventRecord | null;
  user: AppUser;
  popItemNames?: Record<string, string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [comment, setComment] = useState(event?.admin_comment ?? '');
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const canReview = user.role === 'admin' && event.status === 'pending';
  const canEdit = user.role === 'admin' || (event.created_by === user.id && event.status === 'pending');

  async function handleReview(decision: 'approved' | 'rejected') {
    setLoading(true);
    await reviewEvent(event!.id, decision, comment);
    setLoading(false);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este evento definitivamente?')) return;
    await deleteEvent(event!.id);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} title={event.event_name} widthClass="max-w-xl">
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <Badge status={event.status} />
          <span className="text-slate-400">
            {formatDate(event.start_date)} — {formatDate(event.end_date)}
            {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ''}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div><dt className="text-slate-400">Zona</dt><dd className="text-slate-700">{event.zone?.name ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Joyería</dt><dd className="text-slate-700">{event.store?.name ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Ciudad</dt><dd className="text-slate-700">{event.city ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Lugar</dt><dd className="text-slate-700">{event.location ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Tipo</dt><dd className="text-slate-700">{event.event_type ?? '—'}</dd></div>
        </dl>

        {event.description ? (
          <div>
            <p className="text-xs font-medium text-slate-500">Descripción</p>
            <p className="text-slate-700">{event.description}</p>
          </div>
        ) : null}

        {event.justification ? (
          <div>
            <p className="text-xs font-medium text-slate-500">Justificación</p>
            <p className="text-slate-700">{event.justification}</p>
          </div>
        ) : null}

        {event.required_pop_materials?.length ? (
          <div>
            <p className="text-xs font-medium text-slate-500">Material POP requerido</p>
            <ul className="list-disc pl-4 text-slate-700">
              {event.required_pop_materials.map((m, i) => (
                <li key={i}>{m.quantity}x — {popItemNames[m.pop_item_id] ?? m.pop_item_id}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {event.status !== 'pending' && event.admin_comment ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Comentario del administrador</p>
            <p className="text-slate-700">{event.admin_comment}</p>
          </div>
        ) : null}

        {canReview ? (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <Textarea placeholder="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleReview('approved')} disabled={loading}>Aprobar</Button>
              <Button size="sm" variant="danger" onClick={() => handleReview('rejected')} disabled={loading}>Rechazar</Button>
            </div>
          </div>
        ) : null}

        <div className="flex justify-between border-t border-slate-100 pt-3">
          {canEdit ? (
            <Link href={`/eventos/nuevo?edit=${event.id}`}>
              <Button size="sm" variant="outline">Editar</Button>
            </Link>
          ) : <span />}
          {user.role === 'admin' ? (
            <Button size="sm" variant="danger" onClick={handleDelete}>Eliminar</Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
