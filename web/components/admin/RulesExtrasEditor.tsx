import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  AGE_BRACKETS,
  DIVISION_FORMATS,
  ELIGIBILITY_OPTIONS,
  EVENT_TYPES,
  GENDER_OPTIONS,
  SKILL_BRACKETS,
  buildCategoryName,
  capacityLabelForEventType,
  createDivisionDraft,
  playersPerEntry,
  type DivisionAgeBracket,
  type DivisionEventType,
  type DivisionGender,
  type DivisionSkillBracket,
  type EligibilityRule,
  type RegistrationRequirements,
} from './create-tournament/schema';
import {
  serializeTournamentExtras,
  type TournamentExtrasV1,
} from '../tournaments/tournamentExtras';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300';

const selectClass = inputClass;

type DivisionDraft = TournamentExtrasV1['divisions'][number] & {
  categoryNameCustomized?: boolean;
};

export type RulesEditorValue = {
  announcement: string;
  extras: TournamentExtrasV1;
};

type Props = {
  value: RulesEditorValue;
  onChange: (next: RulesEditorValue) => void;
};

export function emptyRulesExtras(): TournamentExtrasV1 {
  const div = createDivisionDraft({
    gender: 'open',
    eventType: 'doubles',
    skillBracket: 'open',
    ageBracket: 'open',
    registrationFee: 0,
  });
  return {
    version: 1,
    eligibility: 'open_to_all',
    endDate: '',
    registrationRequirements: {
      requireValidId: false,
      requireProofOfResidency: false,
      requirePaymentReceipt: false,
    },
    divisions: [
      {
        id: div.id,
        categoryName: div.categoryName,
        eventType: div.eventType,
        gender: div.gender,
        skillBracket: div.skillBracket,
        ageBracket: div.ageBracket,
        playersPerEntry: playersPerEntry(div.eventType),
        format: div.format,
        maxTeams: div.maxTeams,
        registrationFee: div.registrationFee,
      },
    ],
  };
}

export function serializeRulesEditorValue(value: RulesEditorValue): { announcement: string; rules: string } {
  return {
    announcement: value.announcement.trim(),
    rules: serializeTournamentExtras({
      ...value.extras,
      divisions: value.extras.divisions.map((d) => ({
        ...d,
        categoryName: d.categoryName.trim(),
        playersPerEntry: playersPerEntry(d.eventType),
        maxTeams: Number(d.maxTeams) || 0,
        registrationFee: Number(d.registrationFee) || 0,
      })),
    }),
  };
}

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({
  label,
  children,
  hint,
}) => (
  <label className="block">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{label}</span>
    {children}
    {hint && <p className="text-[10px] text-slate-400 font-medium mt-1">{hint}</p>}
  </label>
);

const ChipSelect: React.FC<{
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            active
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
      checked ? 'bg-white border-amber-200' : 'bg-white/60 border-slate-100 hover:border-slate-200'
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{description}</p>
      </div>
      <span
        className={`shrink-0 w-10 h-6 rounded-full relative transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '1.25rem' : '0.125rem' }}
        />
      </span>
    </div>
  </button>
);

const RulesExtrasEditor: React.FC<Props> = ({ value, onChange }) => {
  const { extras, announcement } = value;
  const divisions = extras.divisions as DivisionDraft[];

  const setExtras = (partial: Partial<TournamentExtrasV1>) => {
    onChange({ announcement, extras: { ...extras, ...partial } });
  };

  const setRequirements = (key: keyof RegistrationRequirements, checked: boolean) => {
    setExtras({
      registrationRequirements: {
        ...extras.registrationRequirements,
        [key]: checked,
      },
    });
  };

  const updateDivision = (index: number, patch: Partial<DivisionDraft>) => {
    const next = divisions.map((d, i) => {
      if (i !== index) return d;
      const merged = { ...d, ...patch };
      const attrsChanged =
        patch.eventType !== undefined ||
        patch.gender !== undefined ||
        patch.skillBracket !== undefined ||
        patch.ageBracket !== undefined;

      if (attrsChanged && !merged.categoryNameCustomized) {
        merged.categoryName = buildCategoryName({
          gender: merged.gender,
          skillBracket: merged.skillBracket,
          ageBracket: merged.ageBracket,
          eventType: merged.eventType,
        });
      }
      if (patch.eventType !== undefined) {
        merged.playersPerEntry = playersPerEntry(patch.eventType);
      }
      return merged;
    });
    setExtras({ divisions: next });
  };

  const addDivision = () => {
    const draft = createDivisionDraft({ registrationFee: 0 });
    setExtras({
      divisions: [
        ...divisions,
        {
          id: draft.id,
          categoryName: draft.categoryName,
          eventType: draft.eventType,
          gender: draft.gender,
          skillBracket: draft.skillBracket,
          ageBracket: draft.ageBracket,
          playersPerEntry: playersPerEntry(draft.eventType),
          format: draft.format,
          maxTeams: draft.maxTeams,
          registrationFee: draft.registrationFee,
          categoryNameCustomized: false,
        },
      ],
    });
  };

  const removeDivision = (index: number) => {
    if (divisions.length <= 1) return;
    setExtras({ divisions: divisions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      <Field label="Announcement" hint="Short message players see on the tournament page.">
        <textarea
          rows={2}
          className={`${inputClass} resize-y`}
          value={announcement}
          onChange={(e) => onChange({ extras, announcement: e.target.value })}
          placeholder="e.g. Open registration — pick a division and join us!"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Who can join">
          <select
            className={selectClass}
            value={extras.eligibility}
            onChange={(e) => setExtras({ eligibility: e.target.value as EligibilityRule })}
          >
            {ELIGIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="End date" hint="Optional.">
          <input
            type="date"
            className={inputClass}
            value={extras.endDate || ''}
            onChange={(e) => setExtras({ endDate: e.target.value })}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploads required</p>
        <div className="space-y-2">
          <ToggleRow
            label="Valid ID"
            description="Ask players to upload a government ID."
            checked={extras.registrationRequirements.requireValidId}
            onChange={(v) => setRequirements('requireValidId', v)}
          />
          <ToggleRow
            label="Proof of residency"
            description="Ask for a bill or ID showing home address."
            checked={extras.registrationRequirements.requireProofOfResidency}
            onChange={(v) => setRequirements('requireProofOfResidency', v)}
          />
          <ToggleRow
            label="Payment receipt"
            description="Ask for proof of fee payment."
            checked={extras.registrationRequirements.requirePaymentReceipt}
            onChange={(v) => setRequirements('requirePaymentReceipt', v)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Divisions</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Add or tweak categories players can register for.
            </p>
          </div>
          <button
            type="button"
            onClick={addDivision}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="space-y-3">
          {divisions.map((div, index) => {
            const capacityLabel = capacityLabelForEventType(div.eventType);
            return (
              <div
                key={div.id}
                className="rounded-2xl border border-amber-100/80 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Field label="Division name">
                    <input
                      className={inputClass}
                      value={div.categoryName}
                      onChange={(e) =>
                        updateDivision(index, {
                          categoryName: e.target.value,
                          categoryNameCustomized: true,
                        })
                      }
                    />
                  </Field>
                  {divisions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDivision(index)}
                      className="mt-5 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      aria-label="Remove division"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Event type</p>
                  <ChipSelect
                    options={EVENT_TYPES}
                    value={div.eventType}
                    onChange={(v) => updateDivision(index, { eventType: v as DivisionEventType })}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</p>
                  <ChipSelect
                    options={GENDER_OPTIONS}
                    value={div.gender}
                    onChange={(v) => updateDivision(index, { gender: v as DivisionGender })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Skill</p>
                    <ChipSelect
                      options={SKILL_BRACKETS}
                      value={div.skillBracket}
                      onChange={(v) => updateDivision(index, { skillBracket: v as DivisionSkillBracket })}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                    <ChipSelect
                      options={AGE_BRACKETS}
                      value={div.ageBracket}
                      onChange={(v) => updateDivision(index, { ageBracket: v as DivisionAgeBracket })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Format">
                    <select
                      className={selectClass}
                      value={div.format}
                      onChange={(e) =>
                        updateDivision(index, {
                          format: e.target.value as DivisionDraft['format'],
                        })
                      }
                    >
                      {DIVISION_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={capacityLabel}>
                    <input
                      type="number"
                      min={2}
                      max={256}
                      className={inputClass}
                      value={div.maxTeams}
                      onChange={(e) => updateDivision(index, { maxTeams: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Fee (₱)">
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={div.registrationFee}
                      onChange={(e) =>
                        updateDivision(index, { registrationFee: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RulesExtrasEditor;
