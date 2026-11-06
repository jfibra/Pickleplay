import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// "Night court" look shared by the log in and sign up pages: dark navy, faint court lines, lime accents.

export const authLinkClass = 'font-bold text-[#C6E35A] transition-colors hover:text-[#DDF08F]';

export const authPrimaryButtonClass =
    'flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#C6E35A] text-base font-extrabold text-[#07152B] transition-colors hover:bg-[#D4EC78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6E35A] disabled:cursor-not-allowed disabled:opacity-50';

export const authSecondaryButtonClass =
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#3B5578] text-[15px] font-semibold text-white transition-colors hover:border-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const inputBaseClass =
    'h-12 w-full rounded-xl border bg-[#081A33] px-4 text-[15px] text-white outline-none transition placeholder:text-slate-400 focus:ring-2';

const inputStateClass = (invalid?: boolean) =>
    invalid
        ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/25'
        : 'border-[#3B5578] focus:border-[#C6E35A] focus:ring-[#C6E35A]/25';

/** A pickleball court seen from above, drawn faintly behind the page. */
const CourtLines: React.FC = () => (
    <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-56 top-12 grid h-[240px] w-[520px] -rotate-[10deg] grid-cols-[15fr_7fr_7fr_15fr] grid-rows-2 border-2 border-white/[0.12] lg:-right-36 lg:top-28 lg:h-[410px] lg:w-[900px] lg:-rotate-[8deg] lg:border-[3px]"
    >
        <div className="border-b-2 border-r-2 border-white/10" />
        <div className="row-span-2 border-r-[3px] border-[#C6E35A]/35 bg-white/[0.02]" />
        <div className="row-span-2 border-r-2 border-white/10 bg-white/[0.02]" />
        <div className="border-b-2 border-white/10" />
        <div className="border-r-2 border-white/10" />
        <div />
    </div>
);

/** The top-right link. Pass `onClick` instead of `to` for an in-page step back. */
type BackAction = { label: string; to?: string; onClick?: () => void };

const BACK_TO_HOME: BackAction = { label: 'Back to home', to: '/' };

interface AuthLayoutProps {
    /** Big slanted headline beside the form; wrap the accent words in a lime span. */
    headline: React.ReactNode;
    subline?: string;
    back?: BackAction;
    /** Gives the form panel room for two inputs side by side. */
    wide?: boolean;
    children: React.ReactNode;
}

/** Full-page frame: headline on the left and the form panel on the right, stacked on phones. */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
    headline,
    subline,
    back = BACK_TO_HOME,
    wide = false,
    children,
}) => {
    const backClass = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white';
    const backContent = (
        <>
            <ArrowLeft size={18} aria-hidden="true" />
            {back.label}
        </>
    );

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#07152B] text-white">
            <CourtLines />
            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-4 sm:px-8 sm:py-7">
                <header className="flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/images/pickleplay-logo-256.png" alt="" className="h-11 w-11 rounded-full" />
                        <span className="text-lg font-extrabold tracking-tight">PicklePlay</span>
                    </Link>
                    {back.to ? (
                        <Link to={back.to} className={backClass}>{backContent}</Link>
                    ) : (
                        <button type="button" onClick={back.onClick} className={backClass}>{backContent}</button>
                    )}
                </header>

                <div className="flex flex-1 flex-col justify-center gap-7 py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
                    <div className="w-full sm:mx-auto sm:max-w-115 lg:mx-0 lg:max-w-none lg:flex-1">
                        <h2 className="text-[2.75rem] font-black uppercase italic leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                            {headline}
                        </h2>
                        {subline && (
                            <p className="mt-5 hidden max-w-md text-[17px] leading-relaxed text-slate-300 sm:block">{subline}</p>
                        )}
                    </div>
                    <section
                        className={`w-full sm:mx-auto sm:max-w-115 sm:rounded-[20px] sm:border sm:border-[#22406A] sm:bg-[#0D2140] sm:p-8 lg:mx-0 ${wide ? 'lg:max-w-115' : 'lg:max-w-105'}`}
                    >
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
};

/** Panel title with an optional line under it (for example the "Already a member? Log in" link). */
export const AuthPanelHeader: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="flex flex-col gap-2">
        <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
        {children && <p className="text-[15px] leading-relaxed text-slate-300">{children}</p>}
    </div>
);

/** Lime circle around an icon, shown above "check your email" style messages. */
export const AuthStatusIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C6E35A] text-[#07152B]" aria-hidden="true">
        {children}
    </div>
);

export const AuthAlert: React.FC<{ tone?: 'error' | 'success'; children: React.ReactNode }> = ({ tone = 'error', children }) =>
    tone === 'error' ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
            <AlertCircle size={18} className="mt-px shrink-0 text-rose-300" aria-hidden="true" />
            <p>{children}</p>
        </div>
    ) : (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-300" aria-hidden="true" />
            <p>{children}</p>
        </div>
    );

export const AuthDivider: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center gap-3 text-[13px] text-slate-400">
        <span className="h-px flex-1 bg-[#22406A]" aria-hidden="true" />
        {label}
        <span className="h-px flex-1 bg-[#22406A]" aria-hidden="true" />
    </div>
);

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export const GoogleButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-[#0B1B33] transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
        <GoogleIcon />
        {label}
    </button>
);

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    /** Shown at the right end of the label row, e.g. "Forgot password?". */
    labelAction?: React.ReactNode;
    invalid?: boolean;
    hint?: React.ReactNode;
}

const FieldLabelRow: React.FC<{ id: string; label: string; action?: React.ReactNode }> = ({ id, label, action }) => (
    <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-200">{label}</label>
        {action}
    </div>
);

const FieldHint: React.FC<{ id: string; invalid?: boolean; children: React.ReactNode }> = ({ id, invalid, children }) => (
    <p id={id} className={`text-[13px] ${invalid ? 'text-rose-300' : 'text-slate-400'}`}>{children}</p>
);

export const AuthField: React.FC<AuthFieldProps> = ({ id, label, labelAction, invalid, hint, ...inputProps }) => (
    <div className="flex flex-col gap-2">
        <FieldLabelRow id={id} label={label} action={labelAction} />
        <input
            {...inputProps}
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={hint ? `${id}-hint` : undefined}
            className={`${inputBaseClass} ${inputStateClass(invalid)}`}
        />
        {hint && <FieldHint id={`${id}-hint`} invalid={invalid}>{hint}</FieldHint>}
    </div>
);

/** Password input with its own show/hide toggle. */
export const AuthPasswordField: React.FC<AuthFieldProps> = ({ id, label, labelAction, invalid, hint, ...inputProps }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            <FieldLabelRow id={id} label={label} action={labelAction} />
            <div className="relative">
                <input
                    {...inputProps}
                    id={id}
                    type={visible ? 'text' : 'password'}
                    aria-invalid={invalid || undefined}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    className={`${inputBaseClass} pr-12 ${inputStateClass(invalid)}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-[10px] text-slate-300 transition-colors hover:text-white"
                >
                    {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
            </div>
            {hint && <FieldHint id={`${id}-hint`} invalid={invalid}>{hint}</FieldHint>}
        </div>
    );
};
