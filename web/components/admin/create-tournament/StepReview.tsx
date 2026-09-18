import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Check, IdCard, Home, Receipt } from 'lucide-react';
import {
  DIVISION_FORMATS,
  ELIGIBILITY_OPTIONS,
  type CreateTournamentFormValues,
  type RegistrationRequirements,
} from './schema';

const TOGGLE_ITEMS: Array<{
  key: keyof RegistrationRequirements;
  label: string;
  description: string;
  icon: typeof IdCard;
}> = [
  {
    key: 'requireValidId',
    label: 'Require Valid ID',
    description: 'Players must upload a government-issued ID photo.',
    icon: IdCard,
  },
  {
    key: 'requireProofOfResidency',
    label: 'Require Proof of Residency',
    description: 'Useful for city-exclusive events (barangay cert, utility bill, etc.).',
    icon: Home,
  },
  {
    key: 'requirePaymentReceipt',
    label: 'Require Payment Receipt',
    description: 'Players must upload proof of registration fee payment.',
    icon: Receipt,
  },
];

function formatLabel(format: string) {
  return DIVISION_FORMATS.find((f) => f.value === format)?.label ?? format;
}

function eligibilityLabel(value: string) {
  return ELIGIBILITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const StepReview: React.FC = () => {
  const { watch, setValue } = useFormContext<CreateTournamentFormValues>();
  const values = watch();
  const requirements = values.registrationRequirements;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <div>
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
          Registration Requirements
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Toggle which uploads players must provide when registering.
        </p>
      </div>

      <div className="space-y-3">
        {TOGGLE_ITEMS.map((item) => {
          const enabled = Boolean(requirements?.[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setValue(`registrationRequirements.${item.key}`, !enabled, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className={`w-full flex items-start gap-4 text-left rounded-2xl border px-5 py-4 transition-all ${
                enabled
                  ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div
                className={`mt-0.5 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  enabled ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}
              >
                <item.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black ${enabled ? 'text-blue-700' : 'text-slate-800'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{item.description}</p>
              </div>
              <div
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  enabled ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white'
                }`}
              >
                {enabled && <Check size={14} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 md:p-8 space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Form Summary
          </p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            {values.name?.trim() || 'Untitled Tournament'}
          </h3>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <SummaryItem label="Venue" value={values.location || '—'} />
          <SummaryItem
            label="Dates"
            value={
              values.startDate && values.endDate
                ? `${values.startDate} → ${values.endDate}`
                : '—'
            }
          />
          <SummaryItem label="Eligibility" value={eligibilityLabel(values.eligibility)} />
          <SummaryItem
            label="Banner"
            value={values.bannerFile ? values.bannerFile.name : 'None uploaded'}
          />
        </dl>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Divisions ({values.divisions?.length ?? 0})
          </p>
          <ul className="space-y-2">
            {(values.divisions ?? []).map((div, i) => (
              <li
                key={div.id || i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-2xl bg-white border border-slate-100 px-4 py-3"
              >
                <span className="font-bold text-slate-800 text-sm">
                  {div.categoryName || `Division ${i + 1}`}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {formatLabel(div.format)} ·{' '}
                  {div.eventType === 'singles' ? 'Max Players' : 'Max Teams'} {div.maxTeams} ·{' '}
                  {formatPhp(Number(div.registrationFee))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Required Uploads
          </p>
          <div className="flex flex-wrap gap-2">
            {TOGGLE_ITEMS.filter((t) => requirements?.[t.key]).map((t) => (
              <span
                key={t.key}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                <Check size={12} /> {t.label.replace('Require ', '')}
              </span>
            ))}
            {!TOGGLE_ITEMS.some((t) => requirements?.[t.key]) && (
              <span className="text-xs text-slate-400 font-medium">No uploads required</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3">
      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="text-sm font-bold text-slate-800 mt-1 break-words">{value}</dd>
    </div>
  );
}

export default StepReview;
