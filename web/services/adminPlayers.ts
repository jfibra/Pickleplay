import { supabase } from './supabase';
import type { AdminUserStatus } from './adminUsers';

export type PlayerSegmentType =
  | 'stuck_unconfirmed'
  | 'stuck_profile'
  | 'stuck_skill'
  | 'stuck_first_activity'
  | 'one_and_done'
  | 'dormant'
  | 'unanswered_requests'
  | 'stale_matches'
  | 'booking_issues'
  | 'registration_issues';

export type PlayerEventsRange = '7d' | '30d' | '90d';
export type PlayerPageSize = 10 | 25 | 50 | 100;

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  dropOff: number;
  dropOffRate: number;
  stuckSegment: PlayerSegmentType | null;
}

export interface PlayerOverview {
  computedAt: string;
  kpis: {
    players: number;
    active7d: number;
    active30d: number;
    dormant90d: number;
    neverSignedIn: number;
    unconfirmed: number;
  };
  funnel: FunnelStage[];
  activityTrend: Array<{ month: string; label: string; signups: number; activeUsers: number }>;
  struggles: Array<{ type: PlayerSegmentType; count: number }>;
}

export interface PlayerSegmentItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  hasProfile: boolean;
  status: AdminUserStatus;
  createdAt: string | null;
  lastSignInAt: string | null;
  activities: number;
  reason: string;
}

export interface PlayerSegmentPage {
  type: PlayerSegmentType;
  items: PlayerSegmentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CountItem {
  key: string;
  count: number;
}

export interface TrackedEvents {
  available: boolean;
  range: PlayerEventsRange;
  message?: string;
  trackingStartedAt?: string | null;
  totalEvents?: number;
  bookingFunnel?: {
    steps: Array<{ id: string; label: string; visitors: number }>;
    abandoned: number;
    abandonRate: number;
  };
  bookingBlockers?: CountItem[];
  bookingFailures?: CountItem[];
  noResultSearches?: Array<{ query: string; surface: string | null; count: number; lastSeen: string | null }>;
  authFailures?: { login: CountItem[]; signup: CountItem[] };
  quiz?: { started: number; completed: number; abandoned: number; completionRate: number; abandonedAt: CountItem[] };
  clientErrors?: Array<{ message: string; source: string | null; count: number; affectedUsers: number; lastSeen: string | null }>;
  dailyStruggles?: Array<{ date: string; label: string; count: number }>;
}

export interface PlayerTimelineItem {
  kind: 'account' | 'onboarding' | 'booking' | 'match' | 'tournament' | 'event';
  at: string;
  title: string;
  detail: string | null;
  struggle?: boolean;
}

export interface PlayerJourney {
  player: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    roles: string[];
    status: AdminUserStatus;
    hasProfile: boolean;
    isDeleted: boolean;
    location: string | null;
    skillRating: string | null;
    duprRating: number;
    createdAt: string | null;
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
    provider: string | null;
  };
  checklist: Array<{ id: string; label: string; done: boolean; optional: boolean }>;
  stuckStage: { id: string; label: string; reason: string | null } | null;
  stats: {
    bookings: number;
    matches: number;
    matchRequestsSent: number;
    matchRequestsReceived: number;
    tournaments: number;
    messagesSent: number;
    achievements: number;
    sessions: number;
    struggles: number;
  };
  recentSessions: Array<{ device: string; lastActivity: string | null }>;
  timeline: PlayerTimelineItem[];
}

export const SEGMENT_LABELS: Record<PlayerSegmentType, { title: string; description: string }> = {
  stuck_unconfirmed: { title: 'Email not confirmed', description: 'Signed up but never confirmed their email.' },
  stuck_profile: { title: 'Profile incomplete', description: 'Confirmed, but no username or avatar yet.' },
  stuck_skill: { title: 'No skill rating', description: 'Never took the skill quiz or set a DUPR rating.' },
  stuck_first_activity: { title: 'Never played', description: 'Profile done, but no booking, match, or tournament.' },
  one_and_done: { title: 'One and done', description: 'Tried once and never came back.' },
  dormant: { title: 'Dormant', description: 'No sign-in for 90+ days, or never signed in.' },
  unanswered_requests: { title: 'Unanswered match requests', description: 'Sent requests still pending after 48 hours.' },
  stale_matches: { title: 'Matches never finished', description: 'Past matches still marked Upcoming.' },
  booking_issues: { title: 'Booking problems', description: 'Cancelled, no-show, or unpaid past bookings.' },
  registration_issues: { title: 'Tournament setbacks', description: 'Rejected, withdrawn, or waitlisted registrations.' },
};

const getServerBaseUrl = () => {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_SERVER_URL?.trim() || '';
};

const request = async <T>(path: string): Promise<T> => {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${getServerBaseUrl()}/api/admin/players${path}`, {
    headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload as T;
};

export const fetchPlayerOverview = () => request<PlayerOverview>('/overview');

export const fetchPlayerSegment = (type: PlayerSegmentType, page: number, pageSize: PlayerPageSize) =>
  request<PlayerSegmentPage>(`/segment?${new URLSearchParams({ type, page: String(page), pageSize: String(pageSize) })}`);

export const fetchTrackedEvents = (range: PlayerEventsRange) => request<TrackedEvents>(`/events?range=${range}`);

export const fetchPlayerJourney = (playerId: string) => request<PlayerJourney>(`/${encodeURIComponent(playerId)}`);

export const formatReason = (value: string) => value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
