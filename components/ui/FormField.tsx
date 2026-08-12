'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="mb-4">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={clsx(
            'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors',
            'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500',
            error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
