import { supabase } from './supabase';

export const MANAGEABLE_ROLES = ['PLAYER', 'COACH', 'COURT_OWNER', 'COURT_MANAGER', 'ADMIN'] as const;
export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

export type AdminUserStatus = 'Active' | 'Suspended' | 'Pending';
export type AdminUsersTab = 'active' | 'deleted';
export type AdminUsersSort = 'date' | 'name';
export type AdminUsersPageSize = 10 | 25 | 50 | 100;

export interface ManagedUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  activeRole: string;
  roles: string[];
  status: AdminUserStatus;
  avatarUrl: string | null;
  duprRating: number;
  location: string | null;
  phoneVerified: boolean;
  idVerified: boolean;
  skillVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedByName: string | null;
  deletionReason: string | null;
}

export interface AdminUsersQuery {
  page: number;
  pageSize: AdminUsersPageSize;
  search: string;
  role: ManageableRole | 'all';
  status: AdminUserStatus | 'all';
  tab: AdminUsersTab;
  sort: AdminUsersSort;
}

export interface AdminUsersPage {
  items: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUsersSummary {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
  byRole: Record<ManageableRole, number>;
}

export interface AdminUserProfilePatch {
  fullName?: string;
  username?: string;
  location?: string;
  duprRating?: number;
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

  const response = await fetch(`${getServerBaseUrl()}/api/admin/users${path}`, {
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

const encodeId = (id: string) => encodeURIComponent(id);

export const fetchManagedUsers = (query: AdminUsersQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    tab: query.tab,
    sort: query.sort,
  });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.role !== 'all') params.set('role', query.role);
  if (query.status !== 'all') params.set('status', query.status);

  return request<AdminUsersPage>(`?${params.toString()}`);
};

export const fetchManagedUsersSummary = () => request<AdminUsersSummary>('/summary');

export const fetchManagedUser = async (id: string) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}`)).user;

export const updateManagedUserProfile = async (id: string, patch: AdminUserProfilePatch) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })).user;

export const updateManagedUserRoles = async (id: string, roles: ManageableRole[], activeRole: ManageableRole) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roles, activeRole }),
  })).user;

export const setManagedUserStatus = async (id: string, status: 'Active' | 'Suspended') =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })).user;

export const resetManagedUserPassword = (id: string, password: string) =>
  request<{ success: boolean }>(`/${encodeId(id)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const changeManagedUserEmail = async (id: string, email: string) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/change-email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })).user;

export const softDeleteManagedUser = async (id: string, reason?: string) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/delete`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || '' }),
  })).user;

export const restoreManagedUser = async (id: string) =>
  (await request<{ user: ManagedUser }>(`/${encodeId(id)}/restore`, { method: 'POST' })).user;

export const permanentlyDeleteManagedUser = (id: string) =>
  request<{ success: boolean }>(`/${encodeId(id)}`, { method: 'DELETE' });

export const formatRoleLabel = (role: string) =>
  role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
