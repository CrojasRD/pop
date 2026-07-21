'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { statusColor } from '@/lib/utils';
import type { EventRecord } from '@/lib/types';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Calendario visual mensual. Navegación mes/año; los eventos se muestran como chips por día. */
export function EventCalendar({ events, onSelect }: { events: EventRecord[]; onSelect: (e: EventRecord) => void }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
    const gridStart = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const ev of events) {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toISODate(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    }
    return map;
  }, [events]);

  const currentMonth = cursor.getMonth();
  const todayKey = toISODate(new Date());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {MONTHS[currentMonth]} {cursor.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft size={14} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-100 text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-1.5 text-center font-medium text-slate-500">{d}</div>
        ))}
        {days.map((date) => {
          const key = toISODate(date);
          const dayEvents = eventsByDate.get(key) ?? [];
          const inMonth = date.getMonth() === currentMonth;
          return (
            <div
              key={key}
              className={`min-h-[90px] bg-white p-1.5 ${inMonth ? '' : 'bg-slate-50/50 text-slate-300'} ${key === todayKey ? 'ring-1 ring-inset ring-brand-400' : ''}`}
            >
              <p className={`mb-1 text-[11px] font-medium ${inMonth ? 'text-slate-500' : 'text-slate-300'}`}>{date.getDate()}</p>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium ${statusColor(ev.status)}`}
                    title={ev.event_name}
                  >
                    {ev.event_name}
                  </button>
                ))}
                {dayEvents.length > 3 ? <p className="text-[10px] text-slate-400">+{dayEvents.length - 3} más</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
