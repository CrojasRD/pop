'use client';

import { useState } from 'react';
import { BulkUploadStores } from './BulkUploadStores';
import { BulkUpdateAssignments } from './BulkUpdateAssignments';

export function JoyeriasBulkTabs({
  zoneNames,
  existingStoreCodes,
  itemCodes
}: {
  zoneNames: string[];
  existingStoreCodes: string[];
  itemCodes: string[];
}) {
  const [tab, setTab] = useState<'nuevas' | 'cambios'>('nuevas');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('nuevas')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'nuevas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          Nuevas joyerías
        </button>
        <button
          onClick={() => setTab('cambios')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'cambios' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          Cambios de inventario
        </button>
      </div>

      {tab === 'nuevas' ? (
        <BulkUploadStores zoneNames={zoneNames} existingCodes={existingStoreCodes} />
      ) : (
        <BulkUpdateAssignments itemCodes={itemCodes} storeCodes={existingStoreCodes} />
      )}
    </div>
  );
}
