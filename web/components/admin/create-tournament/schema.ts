import { z } from 'zod';

export const DIVISION_FORMATS = [
  { value: 'single_elim', label: 'Single Elimination' },
  { value: 'double_elim', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
] as const;

export const EVENT_TYPES = [
  { value: 'singles', label: 'Singles', players: 1, capacityLabel: 'Max Players' },
  { value: 'doubles', label: 'Doubles', players: 2, capacityLabel: 'Max Teams' },
  { value: 'team', label: 'Team', players: 4, capacityLabel: 'Max Teams' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'mens', label: "Men's" },
  { value: 'womens', label: "Women's" },
  { value: 'mixed', label: 'Mixed' },
  { value: 'open', label: 'Open' },
] as const;

export const SKILL_BRACKETS = [
  { value: 'open', label: 'Open' },
  { value: '2.5', label: '2.5' },
  { value: '3.0', label: '3.0' },
  { value: '3.5', label: '3.5' },
  { value: '4.0', label: '4.0' },
  { value: '4.5+', label: '4.5+' },
] as const;

export const AGE_BRACKETS = [
  { value: 'open', label: 'Open' },
  { value: 'juniors', label: 'Juniors' },
  { value: '50+', label: '50+' },
  { value: '60+', label: '60+' },
] as const;

export const ELIGIBILITY_OPTIONS = [
  {
    value: 'city_exclusive',
    label: 'City-Exclusive',
    description: 'Only residents of the host city may register (proof of residency recommended).',
  },
  {
    value: 'open_to_all',
    label: 'Open to All',
    description: 'Any player may register regardless of city or region.',
  },
  {
    value: 'invite_only',
    label: 'Invite Only',
    description: 'Registration is limited to invited or pre-approved players.',
  },
] as const;

const MAX_BANNER_BYTES = 10 * 1024 * 1024;
const ACCEPTED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const divisionFormatSchema = z.enum(['single_elim', 'double_elim', 'round_robin']);
export const eventTypeSchema = z.enum(['singles', 'doubles', 'team']);
export const genderSchema = z.enum(['mens', 'womens', 'mixed', 'open']);
export const skillBracketSchema = z.enum(['open', '2.5', '3.0', '3.5', '4.0', '4.5+']);
export const ageBracketSchema = z.enum(['open', 'juniors', '50+', '60+']);
export const eligibilitySchema = z.enum(['city_exclusive', 'open_to_all', 'invite_only']);

export const bannerFileSchema = z.union([
  z.null(),
  z
    .instanceof(File)
    .refine((file) => ACCEPTED_BANNER_TYPES.includes(file.type), {
      message: 'Banner must be JPEG, PNG, WebP, or GIF',
    })
    .refine((file) => file.size <= MAX_BANNER_BYTES, {
      message: 'Banner must be 10MB or smaller',
    }),
]);

export type DivisionEventType = z.infer<typeof eventTypeSchema>;
export type DivisionGender = z.infer<typeof genderSchema>;
export type DivisionSkillBracket = z.infer<typeof skillBracketSchema>;
export type DivisionAgeBracket = z.infer<typeof ageBracketSchema>;

export function buildCategoryName(attrs: {
  gender: DivisionGender;
  skillBracket: DivisionSkillBracket;
  ageBracket: DivisionAgeBracket;
  eventType: DivisionEventType;
}): string {
  const parts: string[] = [];

  if (attrs.gender === 'mens') parts.push("Men's");
  else if (attrs.gender === 'womens') parts.push("Women's");
  else if (attrs.gender === 'mixed') parts.push('Mixed');

  if (attrs.skillBracket !== 'open') {
    parts.push(attrs.skillBracket);
  } else if (attrs.ageBracket === 'open') {
    parts.push('Open');
  }

  if (attrs.ageBracket === 'juniors') parts.push('Juniors');
  else if (attrs.ageBracket === '50+') parts.push('50+');
  else if (attrs.ageBracket === '60+') parts.push('60+');

  const eventLabel = EVENT_TYPES.find((e) => e.value === attrs.eventType)?.label ?? 'Doubles';
  parts.push(eventLabel);

  return parts.join(' ');
}

export function capacityLabelForEventType(eventType: DivisionEventType): string {
  return EVENT_TYPES.find((e) => e.value === eventType)?.capacityLabel ?? 'Max Teams';
}

export function playersPerEntry(eventType: DivisionEventType): number {
  return EVENT_TYPES.find((e) => e.value === eventType)?.players ?? 2;
}

export const divisionSchema = z.object({
  id: z.string().min(1),
  eventType: eventTypeSchema,
  gender: genderSchema,
  skillBracket: skillBracketSchema,
  ageBracket: ageBracketSchema,
  categoryName: z.string().trim().min(2, 'Category name is required'),
  /** When true, attribute changes will not overwrite categoryName. */
  categoryNameCustomized: z.boolean(),
  format: divisionFormatSchema,
  maxTeams: z
    .number({ error: 'Capacity is required' })
    .int('Must be a whole number')
    .min(2, 'At least 2')
    .max(256, 'Cap cannot exceed 256'),
  registrationFee: z
    .number({ error: 'Registration fee is required' })
    .min(0, 'Fee cannot be negative'),
});

export const registrationRequirementsSchema = z.object({
  requireValidId: z.boolean(),
  requireProofOfResidency: z.boolean(),
  requirePaymentReceipt: z.boolean(),
});

export const createTournamentFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Tournament name must be at least 3 characters'),
    bannerFile: bannerFileSchema,
    location: z.string().trim().min(2, 'Venue / location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    eligibility: eligibilitySchema,
    divisions: z.array(divisionSchema).min(1, 'Add at least one division'),
    registrationRequirements: registrationRequirementsSchema,
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type DivisionFormat = z.infer<typeof divisionFormatSchema>;
export type EligibilityRule = z.infer<typeof eligibilitySchema>;
export type DivisionFormValues = z.infer<typeof divisionSchema>;
export type RegistrationRequirements = z.infer<typeof registrationRequirementsSchema>;
export type CreateTournamentFormValues = z.infer<typeof createTournamentFormSchema>;

/** Clean JSON payload for backend APIs (banner metadata only — File sent separately). */
export type CreateTournamentApiPayload = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  eligibility: EligibilityRule;
  banner: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null;
  divisions: Array<{
    id: string;
    categoryName: string;
    eventType: DivisionEventType;
    gender: DivisionGender;
    skillBracket: DivisionSkillBracket;
    ageBracket: DivisionAgeBracket;
    playersPerEntry: number;
    format: DivisionFormat;
    maxTeams: number;
    registrationFee: number;
  }>;
  registrationRequirements: RegistrationRequirements;
};

export type CreateTournamentSubmitResult = {
  payload: CreateTournamentApiPayload;
  files: { banner: File | null };
};

export function createDivisionDraft(
  overrides?: Partial<DivisionFormValues>,
): DivisionFormValues {
  const eventType = overrides?.eventType ?? 'doubles';
  const gender = overrides?.gender ?? 'mens';
  const skillBracket = overrides?.skillBracket ?? 'open';
  const ageBracket = overrides?.ageBracket ?? 'open';
  const autoName = buildCategoryName({ gender, skillBracket, ageBracket, eventType });

  return {
    id: overrides?.id ?? crypto.randomUUID(),
    eventType,
    gender,
    skillBracket,
    ageBracket,
    categoryName: overrides?.categoryName ?? autoName,
    categoryNameCustomized: overrides?.categoryNameCustomized ?? false,
    format: overrides?.format ?? 'single_elim',
    maxTeams: overrides?.maxTeams ?? 16,
    registrationFee: overrides?.registrationFee ?? 0,
  };
}

export function getDefaultFormValues(): CreateTournamentFormValues {
  return {
    name: '',
    bannerFile: null,
    location: '',
    startDate: '',
    endDate: '',
    eligibility: 'open_to_all',
    divisions: [createDivisionDraft()],
    registrationRequirements: {
      requireValidId: true,
      requireProofOfResidency: false,
      requirePaymentReceipt: true,
    },
  };
}

/** @deprecated Prefer getDefaultFormValues() so each instance gets fresh division IDs. */
export const DEFAULT_FORM_VALUES: CreateTournamentFormValues = getDefaultFormValues();

export function toApiPayload(values: CreateTournamentFormValues): CreateTournamentSubmitResult {
  const banner = values.bannerFile;
  return {
    payload: {
      name: values.name.trim(),
      location: values.location.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      eligibility: values.eligibility,
      banner: banner
        ? {
            fileName: banner.name,
            mimeType: banner.type,
            sizeBytes: banner.size,
          }
        : null,
      divisions: values.divisions.map((div) => ({
        id: div.id,
        categoryName: div.categoryName.trim(),
        eventType: div.eventType,
        gender: div.gender,
        skillBracket: div.skillBracket,
        ageBracket: div.ageBracket,
        playersPerEntry: playersPerEntry(div.eventType),
        format: div.format,
        maxTeams: div.maxTeams,
        registrationFee: div.registrationFee,
      })),
      registrationRequirements: { ...values.registrationRequirements },
    },
    files: { banner },
  };
}

export const STEP_FIELD_GROUPS = [
  ['name', 'bannerFile', 'location', 'startDate', 'endDate', 'eligibility'],
  ['divisions'],
  ['registrationRequirements'],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof CreateTournamentFormValues>>;

export const STEP_META = [
  { id: 1, title: 'Tournament Basics', subtitle: 'Name, venue, dates, and eligibility' },
  { id: 2, title: 'Categories & Divisions', subtitle: 'Formats, caps, and fees per division' },
  { id: 3, title: 'Requirements & Review', subtitle: 'Uploads required and final summary' },
] as const;

/** @deprecated Kept for any leftover imports; prefer attribute selectors. */
export const CATEGORY_SUGGESTIONS = [
  "Men's Open Doubles",
  "Women's Open Doubles",
  'Mixed Open Doubles',
  '60+ Doubles',
] as const;
