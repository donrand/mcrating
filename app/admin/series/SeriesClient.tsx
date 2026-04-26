'use client';

import { useState, useTransition } from 'react';
import { addSeries, deleteSeries } from './actions';

type Props = { series: string[] };

export default function SeriesClient({ series }: Props) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError('');
    startTransition(async () => {
      const res = await addSeries(newName);
      if (res.error) {
        setError(res.error);
      } else {
        setNewName('');
      }
    });
  }

  function handleDelete(name: string) {
    setDeleteError(prev => ({ ...prev, [name]: '' }));
    startTransition(async () => {
      const res = await deleteSeries(name);
      if (res.error) {
        setDeleteError(prev => ({ ...prev, [name]: res.error! }));
      }
    });
  }

  return (
    <div className="space-y-6 max-w-md">
      {/* 追加フォーム */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">シリーズを追加</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="例: SWAG RAP"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim() || isPending}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold text-sm rounded-lg transition-colors shrink-0"
          >
            追加
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* 一覧 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          シリーズ一覧 <span className="text-gray-600 font-normal ml-2">{series.length}件</span>
        </h2>
        <ul className="space-y-1">
          {series.map(name => (
            <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <span className="text-sm text-white">{name}</span>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDelete(name)}
                  disabled={isPending}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  削除
                </button>
                {deleteError[name] && (
                  <span className="text-xs text-red-400 max-w-xs text-right">{deleteError[name]}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
