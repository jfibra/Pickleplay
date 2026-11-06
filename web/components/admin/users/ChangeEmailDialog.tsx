import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { changeManagedUserEmail } from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import UserDialogFrame, { DialogCancelButton, DialogPrimaryButton, dialogInputClass, dialogLabelClass } from './UserDialogFrame';

interface ChangeEmailDialogProps {
  isOpen: boolean;
  user: ManagedUser;
  onClose: () => void;
  onSaved: (user: ManagedUser) => void;
  onError: (message: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ChangeEmailDialog: React.FC<ChangeEmailDialogProps> = ({ isOpen, user, onClose, onSaved, onError }) => {
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setEmail('');
  }, [isOpen]);

  const normalized = email.trim().toLowerCase();
  const isValid = EMAIL_PATTERN.test(normalized) && normalized !== (user.email || '').toLowerCase();

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      onSaved(await changeManagedUserEmail(user.id, normalized));
    } catch (err: any) {
      onError(err.message || 'Failed to change email');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserDialogFrame
      isOpen={isOpen}
      title="Change email"
      description="The user must sign in with the new address. It is marked as confirmed."
      onClose={isSaving ? () => {} : onClose}
      zIndexClass="z-[10000]"
      footer={
        <>
          <DialogCancelButton onClick={onClose} disabled={isSaving} />
          <DialogPrimaryButton onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Change email
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className={dialogLabelClass}>Current email</p>
          <p className="text-sm font-bold text-slate-700">{user.email || '—'}</p>
        </div>
        <div>
          <label htmlFor="change-email" className={dialogLabelClass}>New email</label>
          <input
            id="change-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={dialogInputClass}
            autoComplete="off"
          />
        </div>
      </div>
    </UserDialogFrame>
  );
};

export default ChangeEmailDialog;
