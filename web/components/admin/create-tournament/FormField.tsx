import React from 'react';

export const labelClass =
  'text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block';

export const inputClass =
  'w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-900 placeholder:text-slate-300';

export const errorClass = 'text-rose-500 text-xs font-bold mt-1.5 ml-1';

type FieldShellProps = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function FieldShell({ label, required, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-0.5">
      <label className={labelClass}>
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 font-medium mt-1.5 ml-1">{hint}</p>}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
