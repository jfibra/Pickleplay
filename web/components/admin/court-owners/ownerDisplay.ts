import { PENDING_VERIFICATION_STATUSES } from '../../../services/adminCourtOwners';

export const formatVerificationLabel = (status: string | null) => {
  if (!status) return 'Not submitted';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getVerificationBadgeClass = (status: string | null) => {
  if (!status) return 'bg-slate-100 text-slate-400';
  if (status === 'APPROVED' || status === 'VERIFIED') return 'bg-green-50 text-green-600';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-600';
  if (PENDING_VERIFICATION_STATUSES.includes(status)) return 'bg-amber-50 text-amber-600';
  return 'bg-slate-100 text-slate-500';
};

const OPEN_STATUSES = ['Available', 'Active'];

export const getVenueStatusBadgeClass = (status: string, isActive: boolean) => {
  if (!isActive) return 'bg-slate-900 text-white';
  if (OPEN_STATUSES.includes(status)) return 'bg-green-50 text-green-600';
  if (status === 'Maintenance' || status === 'Closed') return 'bg-rose-50 text-rose-600';
  if (status === 'Fully Booked') return 'bg-blue-50 text-blue-600';
  return 'bg-amber-50 text-amber-600';
};

export const isVenueOpen = (status: string, isActive: boolean) => isActive && OPEN_STATUSES.includes(status);

export const formatTime = (value: string | null) => {
  if (!value) return '';
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${((hour + 11) % 12) + 1}:${minute} ${suffix}`;
};

export const formatBookingDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const BOOKING_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-rose-50 text-rose-600',
  no_show: 'bg-slate-900 text-white',
};

export const getBookingStatusBadge = (status: string) =>
  BOOKING_STATUS_BADGE[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-500';
