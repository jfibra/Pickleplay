import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface UserDialogFrameProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'xl';
  zIndexClass?: string;
}

const UserDialogFrame: React.FC<UserDialogFrameProps> = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  zIndexClass = 'z-[9999]',
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white w-full ${size === 'xl' ? 'max-w-4xl' : 'max-w-md'} max-h-[92vh] flex flex-col rounded-[32px] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-5 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
        {footer ? <div className="flex gap-3 px-8 py-5 border-t border-slate-100">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

export const dialogInputClass =
  'w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-5 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200';

export const dialogLabelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2';

export const DialogCancelButton: React.FC<{ onClick: () => void; disabled?: boolean; children?: React.ReactNode }> = ({
  onClick,
  disabled,
  children = 'Cancel',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex-1 py-3.5 rounded-2xl bg-white text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 disabled:opacity-50"
  >
    {children}
  </button>
);

export const DialogPrimaryButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  tone?: 'dark' | 'danger';
  children: React.ReactNode;
}> = ({ onClick, disabled, tone = 'dark', children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 py-3.5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
      tone === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-slate-900 hover:bg-blue-600'
    }`}
  >
    {children}
  </button>
);

export default UserDialogFrame;
