import type { AdminUserStatus, ManagedUser } from '../../../services/adminUsers';

export const getDisplayName = (user: Pick<ManagedUser, 'fullName' | 'username' | 'email'>) =>
  user.fullName || user.username || user.email || 'No name';

export const getSecondaryLine = (user: Pick<ManagedUser, 'email' | 'username'>) =>
  user.email || (user.username ? `@${user.username}` : '—');

export const getInitials = (user: Pick<ManagedUser, 'fullName' | 'email'>) => {
  const source = user.fullName?.trim() || user.email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

export const formatUserDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ROLE_BADGE_CLASS: Record<string, string> = {
  ADMIN: 'bg-slate-900 text-white',
  COACH: 'bg-blue-50 text-blue-600 border border-blue-100',
  COURT_OWNER: 'bg-amber-50 text-amber-700 border border-amber-100',
  COURT_MANAGER: 'bg-violet-50 text-violet-600 border border-violet-100',
  PLAYER: 'bg-slate-100 text-slate-500',
};

export const getRoleBadgeClass = (role: string) => ROLE_BADGE_CLASS[role] || ROLE_BADGE_CLASS.PLAYER;

export const STATUS_BADGE_CLASS: Record<AdminUserStatus, string> = {
  Active: 'bg-green-50 text-green-600',
  Suspended: 'bg-rose-50 text-rose-600',
  Pending: 'bg-amber-50 text-amber-600',
};
