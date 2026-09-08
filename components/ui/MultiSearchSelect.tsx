'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';

export interface MultiSearchSelectOption {
  value: string;
  label: string;
}

/** Como SearchSelect, pero permite elegir varias opciones (se muestran como chips removibles). */
export function MultiSearchSelect({
  name,
  options,
  defaultValues = [],
  placeholder,
  emptyLabel = 'Sin resultados'
}: {
  name: string;
  options: MultiSearchSelectOption[];
  defaultValues?: string[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = options.filter((o) => !selected.includes(o.value));
    if (!q) return available;
    return available.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, selected]);

  function addOption(value: string) {
    setSelected((prev) => [...prev, value]);
    setQuery('');
  }

  function removeOption(value: string) {
    setSelected((prev) => prev.filter((v) => v !== value));
  }

  return (
    <div className="space-y-2">
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {opt?.label ?? v}
                <button
                  type="button"
                  onClick={() => removeOption(v)}
                  className="text-brand-400 hover:text-brand-700"
                  aria-label={`Quitar ${opt?.label ?? v}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {open ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">{emptyLabel}</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addOption(o.value);
                  }}
                  className="cursor-pointer px-3 py-2 text-slate-700 hover:bg-brand-50"
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
