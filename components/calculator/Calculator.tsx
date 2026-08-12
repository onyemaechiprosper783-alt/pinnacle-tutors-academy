'use client';

import { useState } from 'react';

const BUTTONS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

export function Calculator({ onClose }: { onClose?: () => void }) {
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');

  function press(btn: string) {
    if (btn === 'C') { setExpression(''); setDisplay('0'); return; }
    if (btn === '⌫') {
      const next = expression.slice(0, -1);
      setExpression(next);
      setDisplay(next || '0');
      return;
    }
    if (btn === '=') {
      try {
        const sanitized = expression
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-')
          .replace(/%/g, '/100');
        if (!/^[0-9+\-*/.() ]+$/.test(sanitized)) throw new Error('invalid');
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (!isFinite(result)) throw new Error('invalid');
        const rounded = Math.round(result * 1e8) / 1e8;
        setDisplay(String(rounded));
        setExpression(String(rounded));
      } catch {
        setDisplay('Error');
        setExpression('');
      }
      return;
    }

    const next = expression + btn;
    setExpression(next);
    setDisplay(next);
  }

  return (
    <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">Calculator</span>
        {onClose && (
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700">✕</button>
        )}
      </div>
      <div className="mb-3 overflow-x-auto rounded-lg bg-slate-900 px-4 py-4 text-right text-2xl font-semibold text-white">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {BUTTONS.flat().map((btn, i) => (
          <button
            key={`${btn}-${i}`}
            onClick={() => press(btn)}
            className={`rounded-xl py-3.5 text-lg font-medium active:scale-95 ${
              btn === '=' ? 'col-span-2 bg-emerald-600 text-white' :
              ['÷', '×', '−', '+'].includes(btn) ? 'bg-emerald-50 text-emerald-700' :
              btn === 'C' ? 'bg-red-50 text-red-600' :
              'bg-slate-100 text-slate-800'
            }`}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
