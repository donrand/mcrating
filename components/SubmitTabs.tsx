'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type MC = { id: string; name: string };
type Tournament = { id: string; name: string };

type Props = {
  mcs: MC[];
  tournaments: Tournament[];
  singleForm: ReactNode;
  bulkForm: ReactNode;
};

export default function SubmitTabs({ singleForm, bulkForm }: Props) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        <button
          type="button"
          onClick={() => setTab('single')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'single' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          1件投稿
        </button>
        <button
          type="button"
          onClick={() => setTab('bulk')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'bulk' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          まとめて投稿
        </button>
      </div>
      {tab === 'single' ? singleForm : bulkForm}
    </div>
  );
}
