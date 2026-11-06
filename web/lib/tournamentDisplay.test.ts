import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatTournamentTime,
  getTournamentDisplayStatus,
  isTournamentDatePast,
  isTournamentOpen,
} from './tournamentDisplay';

// Pin "now" to 6 Nov 2026, 10:00 local time.
const NOW = new Date(2026, 10, 6, 10, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('isTournamentDatePast', () => {
  it('treats a plain date as lasting until the end of that day', () => {
    expect(isTournamentDatePast('2026-11-06')).toBe(false); // today is not past yet
    expect(isTournamentDatePast('2026-11-05')).toBe(true);
    expect(isTournamentDatePast('2026-11-07')).toBe(false);
  });

  it('handles full timestamps', () => {
    expect(isTournamentDatePast('2026-10-18T08:00:00')).toBe(true);
    expect(isTournamentDatePast('2026-12-01T08:00:00')).toBe(false);
  });

  it('never reports missing or unreadable dates as past', () => {
    expect(isTournamentDatePast(undefined)).toBe(false);
    expect(isTournamentDatePast('')).toBe(false);
    expect(isTournamentDatePast('not a date')).toBe(false);
  });
});

describe('getTournamentDisplayStatus', () => {
  it('shows a past UPCOMING tournament as ENDED', () => {
    expect(getTournamentDisplayStatus({ status: 'UPCOMING', date: '2026-10-18' })).toBe('ENDED');
  });

  it('keeps UPCOMING for future and same-day events', () => {
    expect(getTournamentDisplayStatus({ status: 'UPCOMING', date: '2026-12-01' })).toBe('UPCOMING');
    expect(getTournamentDisplayStatus({ status: 'UPCOMING', date: '2026-11-06' })).toBe('UPCOMING');
  });

  it('never rewrites other statuses', () => {
    expect(getTournamentDisplayStatus({ status: 'LIVE', date: '2026-10-18' })).toBe('LIVE');
    expect(getTournamentDisplayStatus({ status: 'COMPLETED', date: '2026-10-18' })).toBe('COMPLETED');
    expect(getTournamentDisplayStatus({ status: 'CANCELLED', date: '2026-10-18' })).toBe('CANCELLED');
  });
});

describe('isTournamentOpen', () => {
  it('is only true for upcoming events that have not passed', () => {
    expect(isTournamentOpen({ status: 'UPCOMING', date: '2026-12-01' })).toBe(true);
    expect(isTournamentOpen({ status: 'UPCOMING', date: '2026-10-18' })).toBe(false);
    expect(isTournamentOpen({ status: 'LIVE', date: '2026-11-06' })).toBe(false);
  });
});

describe('formatTournamentTime', () => {
  const format = (h: number, m: number) =>
    new Date(2026, 9, 18, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  it('formats Postgres time values that new Date() cannot parse', () => {
    expect(new Date('08:00:00').toString()).toBe('Invalid Date'); // the original bug
    expect(formatTournamentTime('08:00:00', '2026-10-18')).toBe(format(8, 0));
    expect(formatTournamentTime('14:30', '2026-10-18')).toBe(format(14, 30));
    expect(formatTournamentTime('7:05:00.000', '2026-10-18')).toBe(format(7, 5));
  });

  it('formats full timestamps', () => {
    expect(formatTournamentTime('2026-10-18T09:15:00', '2026-10-18')).toBe(format(9, 15));
  });

  it('returns null for empty or unreadable values instead of "Invalid Date"', () => {
    expect(formatTournamentTime(undefined)).toBeNull();
    expect(formatTournamentTime(null)).toBeNull();
    expect(formatTournamentTime('')).toBeNull();
    expect(formatTournamentTime('garbage')).toBeNull();
  });
});
