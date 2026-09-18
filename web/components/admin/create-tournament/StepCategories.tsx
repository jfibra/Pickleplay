import React from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { FieldShell, inputClass, errorClass } from './FormField';
import {
  AGE_BRACKETS,
  DIVISION_FORMATS,
  EVENT_TYPES,
  GENDER_OPTIONS,
  SKILL_BRACKETS,
  buildCategoryName,
  capacityLabelForEventType,
  createDivisionDraft,
  playersPerEntry,
  type CreateTournamentFormValues,
  type DivisionAgeBracket,
  type DivisionEventType,
  type DivisionFormValues,
  type DivisionGender,
  type DivisionSkillBracket,
} from './schema';

type AttrKey = 'eventType' | 'gender' | 'skillBracket' | 'ageBracket';

const StepCategories: React.FC = () => {
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<CreateTournamentFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'divisions',
  });

  const divisions = useWatch({ control, name: 'divisions' }) as DivisionFormValues[] | undefined;

  const divisionsError =
    typeof errors.divisions?.message === 'string' ? errors.divisions.message : undefined;

  const applyAttributeChange = (
    index: number,
    key: AttrKey,
    value: DivisionEventType | DivisionGender | DivisionSkillBracket | DivisionAgeBracket,
  ) => {
    const current = getValues(`divisions.${index}`);
    const nextAttrs = {
      eventType: key === 'eventType' ? (value as DivisionEventType) : current.eventType,
      gender: key === 'gender' ? (value as DivisionGender) : current.gender,
      skillBracket: key === 'skillBracket' ? (value as DivisionSkillBracket) : current.skillBracket,
      ageBracket: key === 'ageBracket' ? (value as DivisionAgeBracket) : current.ageBracket,
    };

    setValue(`divisions.${index}.${key}`, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!current.categoryNameCustomized) {
      setValue(`divisions.${index}.categoryName`, buildCategoryName(nextAttrs), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Divisions</p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure event type and brackets. Category name auto-fills and stays editable.
          </p>
        </div>
        <button
          type="button"
          onClick={() => append(createDivisionDraft())}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Add Division
        </button>
      </div>

      {divisionsError && <p className={errorClass}>{divisionsError}</p>}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const divisionErrors = errors.divisions?.[index];
          const eventType = (divisions?.[index]?.eventType ?? 'doubles') as DivisionEventType;
          const capacityLabel = capacityLabelForEventType(eventType);
          const rosterSize = playersPerEntry(eventType);

          return (
            <div
              key={field.id}
              className="rounded-3xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Division {index + 1}
                </p>
                <button
                  type="button"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <FieldShell
                label="Event Type"
                required
                error={divisionErrors?.eventType?.message}
                hint={`${rosterSize} player${rosterSize === 1 ? '' : 's'} per entry`}
              >
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((opt) => {
                    const selected = eventType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => applyAttributeChange(index, 'eventType', opt.value)}
                        className={`rounded-2xl border px-3 py-3 text-center transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <p
                          className={`text-sm font-black ${selected ? 'text-blue-700' : 'text-slate-800'}`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                          {opt.players} player{opt.players === 1 ? '' : 's'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </FieldShell>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldShell label="Gender" required error={divisionErrors?.gender?.message}>
                  <select
                    className={`${inputClass} appearance-none`}
                    value={divisions?.[index]?.gender ?? 'mens'}
                    onChange={(e) =>
                      applyAttributeChange(index, 'gender', e.target.value as DivisionGender)
                    }
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell
                  label="Skill Bracket"
                  required
                  error={divisionErrors?.skillBracket?.message}
                >
                  <select
                    className={`${inputClass} appearance-none`}
                    value={divisions?.[index]?.skillBracket ?? 'open'}
                    onChange={(e) =>
                      applyAttributeChange(
                        index,
                        'skillBracket',
                        e.target.value as DivisionSkillBracket,
                      )
                    }
                  >
                    {SKILL_BRACKETS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell label="Age Bracket" required error={divisionErrors?.ageBracket?.message}>
                  <select
                    className={`${inputClass} appearance-none`}
                    value={divisions?.[index]?.ageBracket ?? 'open'}
                    onChange={(e) =>
                      applyAttributeChange(index, 'ageBracket', e.target.value as DivisionAgeBracket)
                    }
                  >
                    {AGE_BRACKETS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>

              <FieldShell
                label="Category Name"
                required
                error={divisionErrors?.categoryName?.message}
                hint={
                  divisions?.[index]?.categoryNameCustomized
                    ? 'Custom name — attribute changes won’t overwrite it'
                    : 'Auto-filled from attributes — edit anytime'
                }
              >
                <Controller
                  name={`divisions.${index}.categoryName`}
                  control={control}
                  render={({ field: catField }) => (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="e.g. Men's Open Doubles"
                        className={inputClass}
                        value={catField.value}
                        onChange={(e) => {
                          catField.onChange(e.target.value);
                          setValue(`divisions.${index}.categoryNameCustomized`, true, {
                            shouldDirty: true,
                          });
                        }}
                        onBlur={catField.onBlur}
                        name={catField.name}
                        ref={catField.ref}
                      />
                      {divisions?.[index]?.categoryNameCustomized && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = getValues(`divisions.${index}`);
                            setValue(
                              `divisions.${index}.categoryName`,
                              buildCategoryName({
                                gender: current.gender,
                                skillBracket: current.skillBracket,
                                ageBracket: current.ageBracket,
                                eventType: current.eventType,
                              }),
                              { shouldDirty: true, shouldValidate: true },
                            );
                            setValue(`divisions.${index}.categoryNameCustomized`, false, {
                              shouldDirty: true,
                            });
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                        >
                          Reset to auto name
                        </button>
                      )}
                    </div>
                  )}
                />
              </FieldShell>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldShell label="Format" required error={divisionErrors?.format?.message}>
                  <select
                    className={`${inputClass} appearance-none`}
                    {...register(`divisions.${index}.format`)}
                  >
                    {DIVISION_FORMATS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell
                  label={capacityLabel}
                  required
                  error={divisionErrors?.maxTeams?.message}
                >
                  <input
                    type="number"
                    min={2}
                    max={256}
                    placeholder="16"
                    className={inputClass}
                    {...register(`divisions.${index}.maxTeams`, { valueAsNumber: true })}
                  />
                </FieldShell>

                <FieldShell
                  label="Registration Fee (₱)"
                  required
                  error={divisionErrors?.registrationFee?.message}
                >
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="500"
                    className={inputClass}
                    {...register(`divisions.${index}.registrationFee`, { valueAsNumber: true })}
                  />
                </FieldShell>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepCategories;
