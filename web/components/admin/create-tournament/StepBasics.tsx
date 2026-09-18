import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Upload, ImageIcon, X } from 'lucide-react';
import { FieldShell, inputClass } from './FormField';
import { ELIGIBILITY_OPTIONS, type CreateTournamentFormValues } from './schema';

const StepBasics: React.FC = () => {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateTournamentFormValues>();

  const bannerFile = watch('bannerFile');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!bannerFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <FieldShell label="Tournament Name" required error={errors.name?.message}>
        <input
          type="text"
          placeholder="e.g. Iligan City Exclusive Open Pickleball 2026"
          className={inputClass}
          {...register('name')}
        />
      </FieldShell>

      <FieldShell
        label="Banner Image"
        error={errors.bannerFile?.message as string | undefined}
        hint="JPEG, PNG, WebP, or GIF · max 10MB"
      >
        <Controller
          name="bannerFile"
          control={control}
          render={({ field: { onChange, value } }) => (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onChange(file);
                }}
              />
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <img
                    src={previewUrl}
                    alt="Tournament banner preview"
                    className="h-40 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-slate-600 hover:text-rose-600 shadow-sm"
                    aria-label="Remove banner"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 py-3">
                    <p className="text-white text-xs font-bold truncate">{value?.name}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-slate-400 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon size={20} />
                    <Upload size={18} />
                  </div>
                  <span className="text-sm font-bold">Upload tournament banner</span>
                </button>
              )}
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                >
                  Replace image
                </button>
              )}
            </div>
          )}
        />
      </FieldShell>

      <FieldShell label="Location / Venue" required error={errors.location?.message}>
        <input
          type="text"
          placeholder="e.g. Iligan City Sports Complex"
          className={inputClass}
          {...register('location')}
        />
      </FieldShell>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldShell label="Start Date" required error={errors.startDate?.message}>
          <input type="date" className={inputClass} {...register('startDate')} />
        </FieldShell>
        <FieldShell label="End Date" required error={errors.endDate?.message}>
          <input type="date" className={inputClass} {...register('endDate')} />
        </FieldShell>
      </div>

      <FieldShell label="Eligibility Rules" required error={errors.eligibility?.message}>
        <div className="grid gap-3">
          {ELIGIBILITY_OPTIONS.map((opt) => {
            const selected = watch('eligibility') === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('eligibility', opt.value, { shouldValidate: true, shouldDirty: true })}
                className={`text-left rounded-2xl border px-5 py-4 transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                <p className={`text-sm font-black ${selected ? 'text-blue-700' : 'text-slate-800'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </FieldShell>
    </div>
  );
};

export default StepBasics;
