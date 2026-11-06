import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MANAGEABLE_ROLES, formatRoleLabel, updateManagedUserRoles } from '../../../services/adminUsers';
import type { ManageableRole, ManagedUser } from '../../../services/adminUsers';
import UserDialogFrame, { DialogCancelButton, DialogPrimaryButton, dialogInputClass, dialogLabelClass } from './UserDialogFrame';

interface ChangeRoleDialogProps {
  isOpen: boolean;
  user: ManagedUser;
  onClose: () => void;
  onSaved: (user: ManagedUser) => void;
  onError: (message: string) => void;
}

const isManageableRole = (role: string): role is ManageableRole =>
  (MANAGEABLE_ROLES as readonly string[]).includes(role);

const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({ isOpen, user, onClose, onSaved, onError }) => {
  const [roles, setRoles] = useState<ManageableRole[]>([]);
  const [activeRole, setActiveRole] = useState<ManageableRole>('PLAYER');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initialRoles = user.roles.filter(isManageableRole);
    const initialActive = isManageableRole(user.activeRole) ? user.activeRole : initialRoles[0] || 'PLAYER';
    setRoles(initialRoles.length > 0 ? initialRoles : [initialActive]);
    setActiveRole(initialActive);
  }, [isOpen, user]);

  const toggleRole = (role: ManageableRole, checked: boolean) => {
    const next = checked ? [...new Set([...roles, role])] : roles.filter((r) => r !== role);
    setRoles(next);
    if (!next.includes(activeRole) && next.length > 0) setActiveRole(next[0]);
  };

  const isValid = roles.length > 0 && roles.includes(activeRole);
  const grantsAdmin = roles.includes('ADMIN') && !user.roles.includes('ADMIN');

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      const ordered = MANAGEABLE_ROLES.filter((role) => roles.includes(role));
      onSaved(await updateManagedUserRoles(user.id, ordered, activeRole));
    } catch (err: any) {
      onError(err.message || 'Failed to update roles');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserDialogFrame
      isOpen={isOpen}
      title="Change role"
      description="Choose every role this account holds and which one is active."
      onClose={isSaving ? () => {} : onClose}
      zIndexClass="z-[10000]"
      footer={
        <>
          <DialogCancelButton onClick={onClose} disabled={isSaving} />
          <DialogPrimaryButton onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save roles
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className={dialogLabelClass}>Roles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MANAGEABLE_ROLES.map((role) => {
              const checked = roles.includes(role);
              return (
                <label
                  key={role}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                    checked ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleRole(role, e.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{formatRoleLabel(role)}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label htmlFor="active-role" className={dialogLabelClass}>Active role</label>
          <select
            id="active-role"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as ManageableRole)}
            disabled={roles.length === 0}
            className={dialogInputClass}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        {grantsAdmin ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            This grants full Admin Console access, including user management.
          </p>
        ) : null}
      </div>
    </UserDialogFrame>
  );
};

export default ChangeRoleDialog;
