import React from 'react';
import type { OwnerManagerAssignment } from '../../../services/adminCourtOwners';
import { formatUserDate } from '../users/userDisplay';

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-50 text-green-600',
  pending_invite: 'bg-amber-50 text-amber-600',
  pending_approval: 'bg-blue-50 text-blue-600',
  removed: 'bg-slate-100 text-slate-400',
};

const thClass = 'px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap';

const ManagersTab: React.FC<{ managers: OwnerManagerAssignment[] }> = ({ managers }) => (
  <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="bg-slate-50">
            <th className={`${thClass} pl-8`}>Manager</th>
            <th className={thClass}>Court</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Invited</th>
            <th className={`${thClass} pr-8`}>Approved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {managers.length > 0 ? (
            managers.map((manager) => (
              <tr key={manager.id}>
                <td className="pl-8 pr-4 py-5">
                  <p className="text-sm font-black text-slate-900">{manager.managerName}</p>
                  <p className="text-[11px] text-slate-400">
                    {[manager.managerEmail, manager.managerContactNumber].filter(Boolean).join(' · ') || '—'}
                  </p>
                </td>
                <td className="px-4 py-5 text-sm font-bold text-slate-700">{manager.courtName}</td>
                <td className="px-4 py-5">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_CLASS[manager.status] || 'bg-slate-100 text-slate-500'}`}
                  >
                    {manager.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-5 text-[11px] font-bold text-slate-400">{formatUserDate(manager.inviteSentAt || manager.createdAt)}</td>
                <td className="px-4 pr-8 py-5 text-[11px] font-bold text-slate-400">{formatUserDate(manager.approvedAt)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-8 py-16 text-center text-sm font-medium text-slate-400">
                No court managers have been assigned to this owner's courts.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default ManagersTab;
