const PENDING_DIVISION_REG_KEY = 'pickleplay_pending_division_registration';

export type PendingDivisionRegistration = {
  tournamentId: string;
  divisionIds: string[];
  waitlist: boolean;
};

export function savePendingDivisionRegistration(intent: PendingDivisionRegistration) {
  try {
    sessionStorage.setItem(PENDING_DIVISION_REG_KEY, JSON.stringify(intent));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingDivisionRegistration(
  tournamentId?: string,
): PendingDivisionRegistration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_DIVISION_REG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDivisionRegistration;
    if (!parsed?.tournamentId || !Array.isArray(parsed.divisionIds)) return null;
    if (tournamentId && parsed.tournamentId !== tournamentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingDivisionRegistration() {
  try {
    sessionStorage.removeItem(PENDING_DIVISION_REG_KEY);
  } catch {
    /* ignore */
  }
}

export function tournamentLoginRedirectPath(tournamentId: string) {
  return `/tournaments/${tournamentId}`;
}
