import React from 'react';
import type { AdminUserStatus, AdminUsersSummary, AdminUsersTab, ManageableRole } from '../../../services/adminUsers';

export interface UsersKpiAction {
  tab: AdminUsersTab;
  role: ManageableRole | 'all';
  status: AdminUserStatus | 'all';
}

export interface UsersKpiActiveFilters extends UsersKpiAction {}

interface KpiCardConfig {
  key: string;
  label: string;
  description: string;
  value: (summary: AdminUsersSummary) => number;
  action: UsersKpiAction;
}

const KPI_CONFIG: KpiCardConfig[] = [
  {
    key: 'total',
    label: 'Total Users',
    description: 'All accounts not deleted',
    value: (s) => s.total,
    action: { tab: 'active', role: 'all', status: 'all' },
  },
  {
    key: 'active',
    label: 'Active',
    description: 'Can sign in and play',
    value: (s) => s.active,
    action: { tab: 'active', role: 'all', status: 'Active' },
  },
  {
    key: 'suspended',
    label: 'Suspended',
    description: 'Blocked from signing in',
    value: (s) => s.suspended,
    action: { tab: 'active', role: 'all', status: 'Suspended' },
  },
  {
    key: 'players',
    label: 'Players',
    description: 'Active role: Player',
    value: (s) => s.byRole.PLAYER ?? 0,
    action: { tab: 'active', role: 'PLAYER', status: 'all' },
  },
  {
    key: 'coaches',
    label: 'Coaches',
    description: 'Active role: Coach',
    value: (s) => s.byRole.COACH ?? 0,
    action: { tab: 'active', role: 'COACH', status: 'all' },
  },
  {
    key: 'owners',
    label: 'Court Owners',
    description: 'Active role: Court Owner',
    value: (s) => s.byRole.COURT_OWNER ?? 0,
    action: { tab: 'active', role: 'COURT_OWNER', status: 'all' },
  },
  {
    key: 'admins',
    label: 'Admins',
    description: 'Platform administrators',
    value: (s) => s.byRole.ADMIN ?? 0,
    action: { tab: 'active', role: 'ADMIN', status: 'all' },
  },
  {
    key: 'deleted',
    label: 'Deleted',
    description: 'Soft-deleted accounts',
    value: (s) => s.deleted,
    action: { tab: 'deleted', role: 'all', status: 'all' },
  },
];

const matchesAction = (action: UsersKpiAction, filters: UsersKpiActiveFilters) => {
  if (action.tab === 'deleted') return filters.tab === 'deleted';
  return filters.tab === 'active' && action.role === filters.role && action.status === filters.status;
};

interface UsersKpiCardsProps {
  summary: AdminUsersSummary | null;
  isLoading: boolean;
  activeFilters: UsersKpiActiveFilters;
  onCardClick: (action: UsersKpiAction) => void;
}

const UsersKpiCards: React.FC<UsersKpiCardsProps> = ({ summary, isLoading, activeFilters, onCardClick }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6" role="group" aria-label="User metrics">
    {KPI_CONFIG.map((card) => {
      const isActive = matchesAction(card.action, activeFilters);
      return (
        <button
          key={card.key}
          type="button"
          onClick={() => onCardClick(card.action)}
          aria-pressed={isActive}
          className={`text-left p-6 md:p-8 rounded-[32px] border transition-all group ${
            isActive
              ? 'bg-slate-900 border-slate-900 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
          {isLoading || !summary ? (
            <div className={`mt-4 h-9 w-20 rounded-xl animate-pulse ${isActive ? 'bg-slate-700' : 'bg-slate-100'}`} />
          ) : (
            <h3
              className={`mt-4 text-3xl md:text-4xl font-black tracking-tighter transition-colors ${
                isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'
              }`}
            >
              {card.value(summary).toLocaleString()}
            </h3>
          )}
          <p className="mt-2 text-[11px] font-medium text-slate-400">{card.description}</p>
        </button>
      );
    })}
  </div>
);

export default UsersKpiCards;
