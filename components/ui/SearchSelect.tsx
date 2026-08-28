'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  value: string;
  label: string;
}

/** Combo de texto con autocompletado: se puede escribir para filtrar y también elegir de la lista. */
export function SearchSelect({
  name,
  options,
  defaultValue = '',
  placeholder,
  required,
  disabled,
  emptyLabel = 'Sin resultados'
}: {
  name: string;
  options: SearchSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(() => options.find((o) => o.value === defaultValue)?.label ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(defaultValue);
    setQuery(options.find((o) => o.value === defaultValue)?.label ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <Input
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setValue('');
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
                  setValue(o.value);
                  setQuery(o.label);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 hover:bg-brand-50',
                  o.value === value ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                )}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
