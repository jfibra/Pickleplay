import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Wand2 } from 'lucide-react';
import { resetManagedUserPassword } from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import UserDialogFrame, { DialogCancelButton, DialogPrimaryButton, dialogInputClass, dialogLabelClass } from './UserDialogFrame';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  user: ManagedUser;
  onClose: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

const generatePassword = (length = 14) => {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join('');
};

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ isOpen, user, onClose, onDone, onError }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setConfirm('');
    setShowPassword(false);
  }, [isOpen]);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const isValid = password.length >= 8 && password.length <= 72 && password === confirm;

  const handleGenerate = () => {
    const next = generatePassword();
    setPassword(next);
    setConfirm(next);
    setShowPassword(true);
  };

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await resetManagedUserPassword(user.id, password);
      onDone();
    } catch (err: any) {
      onError(err.message || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserDialogFrame
      isOpen={isOpen}
      title="Reset password"
      description={`Set a new sign-in password for ${user.email || 'this user'}. Share it with them securely.`}
      onClose={isSaving ? () => {} : onClose}
      zIndexClass="z-[10000]"
      footer={
        <>
          <DialogCancelButton onClick={onClose} disabled={isSaving} />
          <DialogPrimaryButton onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Set password
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="reset-password" className={`${dialogLabelClass} mb-0`}>New password</label>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
            >
              <Wand2 size={12} /> Generate
            </button>
          </div>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${dialogInputClass} pr-12`}
              autoComplete="new-password"
              maxLength={72}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {tooShort ? <p className="mt-2 text-xs font-bold text-rose-500">Use at least 8 characters.</p> : null}
        </div>
        <div>
          <label htmlFor="reset-password-confirm" className={dialogLabelClass}>Confirm password</label>
          <input
            id="reset-password-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={dialogInputClass}
            autoComplete="new-password"
            maxLength={72}
          />
          {mismatch ? <p className="mt-2 text-xs font-bold text-rose-500">Passwords do not match.</p> : null}
        </div>
      </div>
    </UserDialogFrame>
  );
};

export default ResetPasswordDialog;
