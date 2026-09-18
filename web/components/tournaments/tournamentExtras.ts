import type {
  CreateTournamentApiPayload,
  DivisionFormat,
  EligibilityRule,
  RegistrationRequirements,
} from '../admin/create-tournament/schema';
import { DIVISION_FORMATS, ELIGIBILITY_OPTIONS } from '../admin/create-tournament/schema';

export type TournamentExtrasV1 = {
  version: 1;
  eligibility: EligibilityRule;
  endDate: string;
  registrationRequirements: RegistrationRequirements;
  divisions: CreateTournamentApiPayload['divisions'];
};

export function buildTournamentExtras(payload: CreateTournamentApiPayload): TournamentExtrasV1 {
  return {
    version: 1,
    eligibility: payload.eligibility,
    endDate: payload.endDate,
    registrationRequirements: payload.registrationRequirements,
    divisions: payload.divisions,
  };
}

/** Persist structured extras as JSON for the rules column (rendered by TournamentRulesPanel). */
export function serializeTournamentExtras(extras: TournamentExtrasV1): string {
  return JSON.stringify(extras);
}

export function parseTournamentExtras(rules?: string | null): TournamentExtrasV1 | null {
  if (!rules?.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(rules) as Partial<TournamentExtrasV1> & {
      registrationRequirements?: RegistrationRequirements;
      divisions?: Array<Partial<CreateTournamentApiPayload['divisions'][number]> & {
        categoryName?: string;
        format?: string;
        maxTeams?: number;
        registrationFee?: number;
      }>;
      eligibility?: EligibilityRule;
      endDate?: string;
    };
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.divisions || !Array.isArray(parsed.divisions)) return null;
    if (!parsed.registrationRequirements || typeof parsed.registrationRequirements !== 'object') {
      return null;
    }

    const divisions = parsed.divisions
      .filter((d) => d && typeof d.categoryName === 'string')
      .map((d, index) => {
        const eventType = (d.eventType ?? 'doubles') as CreateTournamentApiPayload['divisions'][number]['eventType'];
        return {
          id: (d as { id?: string }).id || `div-${index}-${d.categoryName}`,
          categoryName: d.categoryName!,
          eventType,
          gender: (d.gender ?? 'open') as CreateTournamentApiPayload['divisions'][number]['gender'],
          skillBracket: (d.skillBracket ?? 'open') as CreateTournamentApiPayload['divisions'][number]['skillBracket'],
          ageBracket: (d.ageBracket ?? 'open') as CreateTournamentApiPayload['divisions'][number]['ageBracket'],
          playersPerEntry: d.playersPerEntry ?? (eventType === 'singles' ? 1 : eventType === 'team' ? 4 : 2),
          format: (d.format ?? 'single_elim') as CreateTournamentApiPayload['divisions'][number]['format'],
          maxTeams: Number(d.maxTeams) || 0,
          registrationFee: Number(d.registrationFee) || 0,
        };
      });

    if (divisions.length === 0) return null;

    return {
      version: 1,
      eligibility: parsed.eligibility ?? 'open_to_all',
      endDate: parsed.endDate ?? '',
      registrationRequirements: parsed.registrationRequirements,
      divisions,
    };
  } catch {
    return null;
  }
}

export function formatLabel(format: DivisionFormat | string) {
  return DIVISION_FORMATS.find((f) => f.value === format)?.label ?? format;
}

export function eligibilityLabel(value: EligibilityRule | string) {
  return ELIGIBILITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function formatPhp(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function tournamentPublicUrl(tournamentId: string) {
  if (typeof window === 'undefined') return `/tournaments/${tournamentId}`;
  return `${window.location.origin}/tournaments/${tournamentId}`;
}
