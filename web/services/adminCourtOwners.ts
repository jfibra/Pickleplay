import { supabase } from './supabase';
import type { CourtStatus, LocationStatus } from '../types';
import type { AdminUserStatus } from './adminUsers';

export type CourtOwnerFilter = 'all' | 'has_courts' | 'no_courts' | 'pending_verification' | 'suspended';
export type CourtOwnerSort = 'revenue' | 'bookings' | 'name' | 'joined';
export type CourtOwnerPageSize = 10 | 25 | 50 | 100;
export type OwnerBookingsRange = 'upcoming' | 'past' | 'all';

export const COURT_STATUS_OPTIONS: CourtStatus[] = ['Available', 'Fully Booked', 'Coming Soon', 'Maintenance', 'Setup Required'];
export const LOCATION_STATUS_OPTIONS: LocationStatus[] = ['Active', 'Closed', 'Maintenance', 'Coming Soon'];
export const PENDING_VERIFICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUESTED', 'READY_FOR_REVIEW', 'PENDING_REVIEW'];

export interface CourtOwnerProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  activeRole: string;
  roles: string[];
  status: AdminUserStatus;
  createdAt: string | null;
  hasOwnerRole: boolean;
}

export interface CourtOwnerListItem extends CourtOwnerProfile {
  verificationStatus: string | null;
  locations: number;
  courts: number;
  activeCourts: number;
  bookings30d: number;
  revenue30d: number;
  upcomingBookings: number;
}

export interface CourtOwnersPage {
  items: CourtOwnerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CourtOwnersSummary {
  total: number;
  withCourts: number;
  noCourts: number;
  pendingVerification: number;
  suspended: number;
  revenue30d: number;
  bookings30d: number;
}

export interface OwnerLocation {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  barangay: string | null;
  phone: string | null;
  status: LocationStatus | string;
  isActive: boolean;
  imageUrl: string | null;
  courtType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OwnerCourt {
  id: string;
  ownerId: string;
  locationId: string | null;
  name: string;
  numCourts: number;
  courtType: string | null;
  surfaceType: string | null;
  basePrice: number;
  status: CourtStatus | string;
  isActive: boolean;
  imageUrl: string | null;
  setupComplete: boolean;
  hasPricing: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  bookings30d?: number;
  revenue30d?: number;
  upcomingBookings?: number;
  averageRating?: number | null;
  reviewCount?: number;
}

export interface OwnerVerification {
  id: string;
  status: string;
  verificationPath: string | null;
  courtLocationName: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
}

export interface OwnerRecentBooking {
  id: string;
  courtId: string;
  courtName: string;
  playerName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalPrice: number;
  status: string;
  paymentStatus: string | null;
  createdAt: string | null;
}

export interface OwnerCourtEvent {
  id: string;
  courtId: string;
  courtName: string;
  title: string;
  description: string | null;
  eventType: string;
  start: string;
  end: string;
  blocksBookings: boolean;
}

export interface OwnerManagerAssignment {
  id: string;
  courtId: string;
  courtName: string;
  managerUserId: string | null;
  managerName: string;
  managerEmail: string | null;
  managerContactNumber: string | null;
  status: string;
  inviteSentAt: string | null;
  approvedAt: string | null;
  removedAt: string | null;
  createdAt: string | null;
}

export interface CourtOwnerDetail {
  owner: CourtOwnerProfile;
  verification: OwnerVerification | null;
  locations: OwnerLocation[];
  courts: OwnerCourt[];
  stats: {
    locations: number;
    courts: number;
    activeCourts: number;
    bookings30d: number;
    revenue30d: number;
    upcomingBookings: number;
    cancellationRate: number;
    averageRating: number | null;
    reviewCount: number;
    activeManagers: number;
  };
  recentBookings: OwnerRecentBooking[];
  upcomingEvents: OwnerCourtEvent[];
  managers: OwnerManagerAssignment[];
}

export interface OwnerBooking extends OwnerRecentBooking {
  playerId: string | null;
  playerEmail: string | null;
  paymentMethod: string | null;
  isCheckedIn: boolean;
  isNoShow: boolean;
  cancelledReason: string | null;
}

export interface OwnerReview {
  id: string;
  courtId: string;
  courtName: string;
  playerName: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VenueStatusPatch {
  status?: string;
  isActive?: boolean;
  reason?: string;
}

const getServerBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '';
  }

  const serverUrl = import.meta.env.VITE_SERVER_URL?.trim();
  return serverUrl || '';
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token || '';

  const response = await fetch(`${getServerBaseUrl()}/api/admin/court-owners${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload as T;
};

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const unlessAll = (value: string) => (value === 'all' ? undefined : value);

export const fetchCourtOwners = (query: {
  page: number;
  pageSize: CourtOwnerPageSize;
  search: string;
  filter: CourtOwnerFilter;
  sort: CourtOwnerSort;
}) =>
  request<CourtOwnersPage>(
    toQuery({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search.trim(),
      filter: unlessAll(query.filter),
      sort: query.sort,
    })
  );

export const fetchCourtOwnersSummary = () => request<CourtOwnersSummary>('/summary');

export const fetchCourtOwnerDetail = (ownerId: string) =>
  request<CourtOwnerDetail>(`/${encodeURIComponent(ownerId)}`);

export const fetchOwnerBookings = (
  ownerId: string,
  query: { page: number; pageSize: CourtOwnerPageSize; range: OwnerBookingsRange; status: string; courtId: string }
) =>
  request<Paged<OwnerBooking>>(
    `/${encodeURIComponent(ownerId)}/bookings${toQuery({
      page: query.page,
      pageSize: query.pageSize,
      range: query.range,
      status: unlessAll(query.status),
      courtId: unlessAll(query.courtId),
    })}`
  );

export type OwnerSeriesRange = '14d' | '30d' | '3m' | '6m' | '12m';

export interface OwnerSeriesPoint {
  key: string;
  label: string;
  bookings: number;
  value: number;
}

export interface OwnerSeries {
  range: OwnerSeriesRange;
  bucket: 'day' | 'week' | 'month';
  points: OwnerSeriesPoint[];
}

export const fetchOwnerBookingSeries = (ownerId: string, range: OwnerSeriesRange) =>
  request<OwnerSeries>(`/${encodeURIComponent(ownerId)}/series${toQuery({ range })}`);

export const fetchOwnerReviews = (ownerId: string, page: number, pageSize: CourtOwnerPageSize) =>
  request<Paged<OwnerReview>>(`/${encodeURIComponent(ownerId)}/reviews${toQuery({ page, pageSize })}`);

export const updateOwnerCourt = async (courtId: string, patch: VenueStatusPatch) =>
  (await request<{ court: OwnerCourt }>(`/courts/${encodeURIComponent(courtId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })).court;

export const updateOwnerLocation = async (locationId: string, patch: VenueStatusPatch) =>
  (await request<{ location: OwnerLocation }>(`/locations/${encodeURIComponent(locationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })).location;

export const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString()}`;
