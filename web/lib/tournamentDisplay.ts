import type { Tournament } from '../types';

/** Status shown to players. A tournament still marked UPCOMING after its date has passed is shown as ENDED. */
export type TournamentDisplayStatus = Tournament['status'] | 'ENDED';

const parseEventDate = (date?: string): Date | null => {
  if (!date) return null;
  // Plain YYYY-MM-DD dates are local calendar days; treat them as the end of that day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T23:59:59`) : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isTournamentDatePast = (date?: string, now: Date = new Date()): boolean => {
  const d = parseEventDate(date);
  if (!d) return false;
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < now.getTime();
};

export const getTournamentDisplayStatus = (t: Pick<Tournament, 'status' | 'date'>): TournamentDisplayStatus =>
  t.status === 'UPCOMING' && isTournamentDatePast(t.date) ? 'ENDED' : t.status;

export const isTournamentOpen = (t: Pick<Tournament, 'status' | 'date'>): boolean =>
  getTournamentDisplayStatus(t) === 'UPCOMING';

/**
 * Formats a start / check-in time for display. Accepts either a full timestamp or a Postgres `time`
 * value such as "08:00:00" (which `new Date()` cannot parse). Returns null when it can't be read.
 */
export const formatTournamentTime = (time?: string | null, date?: string): string | null => {
  if (!time) return null;
  const hm = time.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  let d: Date;
  if (hm) {
    const day = date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : '2000-01-01';
    d = new Date(`${day}T${hm[1].padStart(2, '0')}:${hm[2]}:00`);
  } else {
    d = new Date(time);
  }
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
