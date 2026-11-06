import React from 'react';
import { MANAGEABLE_ROLES, formatRoleLabel } from '../../../services/adminUsers';
import type { AdminUsersSummary, ManageableRole } from '../../../services/adminUsers';

interface UsersRoleChipsProps {
  activeRole: ManageableRole | 'all';
  summary: AdminUsersSummary | null;
  disabled?: boolean;
  onChange: (role: ManageableRole | 'all') => void;
}

const UsersRoleChips: React.FC<UsersRoleChipsProps> = ({ activeRole, summary, disabled, onChange }) => {
  const chips: Array<{ id: ManageableRole | 'all'; label: string; count: number | null }> = [
    { id: 'all', label: 'All', count: summary?.total ?? null },
    ...MANAGEABLE_ROLES.map((role) => ({
      id: role,
      label: formatRoleLabel(role),
      count: summary?.byRole[role] ?? null,
    })),
  ];

  return (
    <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by role">
      {chips.map((chip) => {
        const isActive = activeRole === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(chip.id)}
            aria-pressed={isActive}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 disabled:opacity-60 ${
              isActive
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-600'
            }`}
          >
            {chip.label}
            {chip.count != null ? (
              <span className={isActive ? 'text-slate-400' : 'text-slate-300'}>{chip.count.toLocaleString()}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default UsersRoleChips;
