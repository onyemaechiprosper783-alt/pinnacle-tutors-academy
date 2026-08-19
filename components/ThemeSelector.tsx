'use client';

import { useTheme } from '@/components/ThemeProvider';

const OPTIONS = [
  { value: 'light' as const, icon: '☀️', label: 'Light', description: 'Always use light mode' },
  { value: 'dark' as const, icon: '🌙', label: 'Dark', description: 'Always use dark mode' },
  { value: 'system' as const, icon: '⚙️', label: 'System', description: 'Follow your phone setting' },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={selected}
            className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 ${
              selected
                ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/30'
                : 'border-[var(--border)] bg-[var(--card)] hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{option.icon}</span>
              {selected && <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-black text-white">ACTIVE</span>}
            </div>
            <p className="mt-3 font-black text-[var(--foreground)]">{option.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
