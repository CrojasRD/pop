'use client';

import { useState } from 'react';
import { BulkUploadInventory } from './BulkUploadInventory';
import { BulkUploadAssignments } from './BulkUploadAssignments';

export function InventoryBulkTabs({
  existingCodes,
  categoryNames,
  storeCodes
}: {
  existingCodes: string[];
  categoryNames: string[];
  storeCodes: string[];
}) {
  const [tab, setTab] = useState<'catalogo' | 'distribucion'>('catalogo');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('catalogo')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'catalogo' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          Materiales nuevos
        </button>
        <button
          onClick={() => setTab('distribucion')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'distribucion' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          Distribución a joyerías
        </button>
      </div>

      {tab === 'catalogo' ? (
        <BulkUploadInventory existingCodes={existingCodes} categoryNames={categoryNames} />
      ) : (
        <BulkUploadAssignments itemCodes={existingCodes} storeCodes={storeCodes} />
      )}
    </div>
  );
}
