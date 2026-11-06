import React from 'react';
import { Trash2, Users } from 'lucide-react';
import type { AdminUsersTab } from '../../../services/adminUsers';

interface UsersWorkspaceTabsProps {
  activeTab: AdminUsersTab;
  usersCount: number | null;
  deletedCount: number | null;
  onChange: (tab: AdminUsersTab) => void;
}

const TABS: Array<{ id: AdminUsersTab; label: string; icon: React.ReactNode }> = [
  { id: 'active', label: 'Users', icon: <Users size={16} /> },
  { id: 'deleted', label: 'Deleted Users', icon: <Trash2 size={16} /> },
];

const UsersWorkspaceTabs: React.FC<UsersWorkspaceTabsProps> = ({ activeTab, usersCount, deletedCount, onChange }) => (
  <div className="flex gap-2 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit" role="tablist">
    {TABS.map((tab) => {
      const isActive = activeTab === tab.id;
      const count = tab.id === 'active' ? usersCount : deletedCount;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
            isActive ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'
          }`}
        >
          {tab.icon}
          {tab.label}
          {count != null ? (
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] ${
                isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count.toLocaleString()}
            </span>
          ) : null}
        </button>
      );
    })}
  </div>
);

export default UsersWorkspaceTabs;
