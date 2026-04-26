import Link from 'next/link';

type Tab = 'review' | 'register' | 'battles' | 'coefficients' | 'corrections' | 'series' | 'guide';

type Props = { active: Tab };

const tabs = [
  { key: 'review' as Tab,       label: '投稿レビュー', href: '/admin' },
  { key: 'register' as Tab,     label: '一括登録',     href: '/admin/register' },
  { key: 'battles' as Tab,      label: 'バトル管理',   href: '/admin/battles' },
  { key: 'coefficients' as Tab, label: '格係数管理',   href: '/admin/coefficients' },
  { key: 'corrections' as Tab,  label: '誤り報告',     href: '/admin/corrections' },
  { key: 'series' as Tab,       label: 'シリーズ',     href: '/admin/series' },
  { key: 'guide' as Tab,        label: '使い方',       href: '/admin/guide' },
];

export default function AdminNav({ active }: Props) {
  return (
    <div className="flex gap-1 border-b border-gray-800 mb-8">
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.key
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
