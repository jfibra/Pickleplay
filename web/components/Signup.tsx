import React, { useState, useEffect, useRef } from 'react';
import useSEO from '../hooks/useSEO';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { canAttemptSignup } from '../services/rateLimiter';
import { getAuthCallbackUrl } from '../services/authRedirects';
import { normalizeAuthError, trackEvent } from '../services/playerEvents';
import {
    Loader2,
    CheckCircle2,
    X,
    Shield,
    LogIn,
    KeyRound,
    Mail,
    UserCheck
} from 'lucide-react';
import {
    AuthLayout,
    AuthPanelHeader,
    AuthStatusIcon,
    AuthAlert,
    AuthDivider,
    AuthField,
    AuthPasswordField,
    GoogleButton,
    authLinkClass,
    authPrimaryButtonClass,
    authSecondaryButtonClass,
} from './auth/AuthLayout';

// ─── Default T&C ──────────────────────────────────────────────────────────────
const DEFAULT_TERMS = `
<h1>Terms and Conditions</h1>
<p><strong>Effective Date:</strong> February 18, 2026</p>
<p>Welcome to PicklePlay Philippines. By creating an account and using our platform, you agree to the following terms and conditions.</p>

<h2>1. Acceptance of Terms</h2>
<p>By registering for and using the PicklePlay platform (&ldquo;Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Service.</p>

<h2>2. Account Registration</h2>
<p>You must provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

<h2>3. User Conduct</h2>
<p>You agree not to:</p>
<ul>
<li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
<li>Impersonate any person or entity, or misrepresent your affiliation</li>
<li>Upload or transmit any harmful, offensive, or inappropriate content</li>
<li>Attempt to gain unauthorized access to any part of the Service</li>
<li>Interfere with or disrupt the Service or servers</li>
</ul>

<h2>4. Court Bookings &amp; Payments</h2>
<p>All court bookings made through the platform are subject to availability and the policies of the respective court owners. Cancellation and refund policies are determined by individual court owners and will be displayed at the time of booking.</p>

<h2>5. Professional Roles</h2>
<p>Users who apply for Coach or Court Owner roles are subject to additional verification and approval. PicklePlay reserves the right to approve or reject applications at its sole discretion.</p>

<h2>6. Privacy &amp; Data</h2>
<p>Your use of the Service is also governed by our Privacy Policy. We collect and process personal data as described therein. By using the Service, you consent to such processing.</p>

<h2>7. Intellectual Property</h2>
<p>All content, trademarks, and intellectual property on the platform are owned by PicklePlay Philippines. You may not copy, reproduce, or distribute any content without prior written permission.</p>

<h2>8. Limitation of Liability</h2>
<p>PicklePlay is provided &ldquo;as is&rdquo; without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

<h2>9. Termination</h2>
<p>We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.</p>

<h2>10. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

<h2>11. Contact</h2>
<p>For questions about these Terms, please contact us through the platform&rsquo;s support channels.</p>
`;

// ─── Terms Modal ──────────────────────────────────────────────────────────────
const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [termsContent, setTermsContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        (async () => {
            try {
                const { data } = await supabase.from('platform_content').select('content').eq('slug', 'terms-and-conditions').maybeSingle();
                setTermsContent(data?.content || DEFAULT_TERMS);
            } catch { setTermsContent(DEFAULT_TERMS); }
            finally { setLoading(false); }
        })();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Shield size={18} className="text-blue-600" /></div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Terms & Conditions</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PicklePlay Philippines</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-700 leading-relaxed">
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
                    ) : (
                        <div className="prose prose-sm prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-h1:text-lg prose-h1:mb-3 prose-h1:mt-4 prose-h2:text-sm prose-h2:mb-2 prose-h2:mt-4 prose-p:mb-2 prose-p:text-slate-600 prose-li:text-slate-600 prose-li:mb-0.5 prose-strong:text-slate-900 prose-ul:my-2 prose-ol:my-2" dangerouslySetInnerHTML={{ __html: termsContent }} />
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                    <button onClick={onClose} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25">
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Signup ──────────────────────────────────────────────────────────────
const Signup: React.FC = () => {
    useSEO({
        title: 'Sign Up – Create Your PicklePlay Account',
        description: 'Create a free PicklePlay Philippines account. Book courts, join tournaments, find coaches, and connect with the PH pickleball community.',
        canonical: 'https://www.pickleplay.ph/signup',
        noIndex: true,
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [highlightTerms, setHighlightTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const termsRef = useRef<HTMLLabelElement>(null);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);
    const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const [verificationActionMessage, setVerificationActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';
    const isGuestFlow = searchParams.get('guest') === 'true';

    // Pre-fill email & name from URL query params (from guest booking email)
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const nameParam = searchParams.get('name');
        if (emailParam) setEmail(decodeURIComponent(emailParam));
        if (nameParam) {
            const decoded = decodeURIComponent(nameParam);
            setGuestName(decoded);
            setFullName(decoded);
        }
    }, [searchParams]);

    // For guest flow: fetch guest info from bookings if name not in URL
    useEffect(() => {
        if (!isGuestFlow || !email || guestName) return;
        setGuestLoading(true);
        (async () => {
            try {
                const { data } = await supabase
                    .from('bookings')
                    .select('guest_name')
                    .eq('guest_email', email)
                    .not('guest_name', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (data?.guest_name) {
                    setGuestName(data.guest_name);
                    setFullName(data.guest_name);
                }
            } catch { /* ignore */ }
            finally { setGuestLoading(false); }
        })();
    }, [isGuestFlow, email, guestName]);

    const normalizeUsername = (value: string) =>
        value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

    const getVerificationRedirectUrl = () => {
        const referralCode = searchParams.get('ref');
        const referralType = searchParams.get('type');

        return getAuthCallbackUrl({
            ref: referralCode,
            type: referralType === 'court-owner' ? 'court-owner' : undefined,
        });
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        if (!agreedToTerms) { setError('You must agree to the Terms & Conditions before signing up.'); return; }
        setLoading(true);
        setError(null);
        try {
            const referralCode = searchParams.get('ref');
            const referralType = searchParams.get('type');
            if (referralCode) localStorage.setItem('referral_code', referralCode);
            if (referralType === 'court-owner') localStorage.setItem('referral_type', 'court-owner');
            if (redirectUrl && redirectUrl !== '/dashboard') localStorage.setItem('auth_redirect', redirectUrl);
            localStorage.setItem('terms_accepted_at', new Date().toISOString());
            const callbackUrl = getAuthCallbackUrl({
                ref: referralCode,
                type: referralType === 'court-owner' ? 'court-owner' : undefined,
            });
            const oauthOptions: any = { redirectTo: callbackUrl };
            // Keep Google's default OAuth behavior: first-time users may see consent,
            // while previously authorized accounts can return directly without it.
            // Force Facebook to request email permission
            if (provider === 'facebook') {
                oauthOptions.scopes = 'email';
            }
            const { error: authError } = await supabase.auth.signInWithOAuth({ provider, options: oauthOptions });
            if (authError) throw authError;
        } catch (err: any) {
            trackEvent('signup_failed', { reason: normalizeAuthError(err?.message), method: provider });
            setError(err.message || `Failed to sign in with ${provider}.`);
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms) { setError('You must agree to the Terms & Conditions before signing up.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
        if (!canAttemptSignup()) {
            setError('Too many signup attempts. Please wait a few minutes before trying again.');
            return;
        }
        setLoading(true);
        setError(null);
        setRequiresEmailConfirmation(false);
        setVerificationActionMessage(null);
        try {
            const referralCode = searchParams.get('ref');
            const referralType = searchParams.get('type');
            if (referralCode) localStorage.setItem('referral_code', referralCode);
            if (referralType === 'court-owner') localStorage.setItem('referral_type', 'court-owner');
            const emailRedirectTo = getVerificationRedirectUrl();

            const { data, error: authError } = await supabase.auth.signUp({
                email, password,
                options: {
                    data: { full_name: fullName, username: fullName.toLowerCase().replace(/\s+/g, '_'), referred_by_code: referralCode },
                    emailRedirectTo,
                }
            });
            if (authError) throw authError;
            if (data.user) {
                // Create/update profile so the DB trigger transfers guest bookings to this user
                const profileData = {
                    id: data.user.id,
                    email: data.user.email || email,
                    full_name: fullName,
                    username: normalizeUsername(fullName || data.user.email?.split('@')[0] || 'player'),
                    terms_accepted_at: new Date().toISOString()
                };

                if (data.session) {
                    // Session available — upsert profile directly
                    const { error: profileError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
                    if (profileError) console.error('Failed to upsert profile fields during signup:', profileError);
                }

                setSuccess(true);
                const emailConfirmationRequired = Boolean(data.user.email) && !data.user.email_confirmed_at;
                setRequiresEmailConfirmation(emailConfirmationRequired);
                if (!emailConfirmationRequired) {
                    const loginUrl = isGuestFlow
                        ? `/login?email=${encodeURIComponent(email)}`
                        : redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login';
                    setTimeout(() => navigate(loginUrl), 3000);
                }
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to create account. Please try again.';
            trackEvent('signup_failed', { reason: normalizeAuthError(msg), method: 'password' });
            if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
                if (isGuestFlow) {
                    // Guest account already exists — update their password via server admin API
                    try {
                        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';
                        const res = await fetch(`${serverUrl}/api/auth/set-guest-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, newPassword: password }),
                        });
                        const result = await res.json();
                        if (res.ok && result.success) {
                            // Password updated successfully — show success screen
                            setSuccess(true);
                            setTimeout(() => navigate(`/login?email=${encodeURIComponent(email)}`), 3000);
                            return;
                        }
                        // Server couldn't update — show error
                        setError(result.error || 'Account already exists. Please try logging in or use a different email.');
                    } catch (serverErr) {
                        console.error('Failed to update guest password via server:', serverErr);
                        setError('Account already exists. Please try logging in or use a different email.');
                    }
                    return;
                }
                setAlreadyRegistered(true);
                setError(null);
            } else {
                setError(msg);
            }
        } finally { setLoading(false); }
    };

    const handleResendVerificationEmail = async () => {
        setIsResendingVerification(true);
        setVerificationActionMessage(null);
        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: getVerificationRedirectUrl(),
                },
            });

            if (resendError) throw resendError;

            setVerificationActionMessage({
                type: 'success',
                text: 'Verification email sent again. Please check your inbox, spam, or promotions folder.',
            });
        } catch (err: any) {
            setVerificationActionMessage({
                type: 'error',
                text: err.message || 'Failed to resend verification email. Please try again in a moment.',
            });
        } finally {
            setIsResendingVerification(false);
        }
    };

    const handleUseDifferentEmail = () => {
        setSuccess(false);
        setRequiresEmailConfirmation(false);
        setVerificationActionMessage(null);
    };

    // Send password reset email for already-registered users
    const handleSendResetEmail = async () => {
        setSendingReset(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getAuthCallbackUrl(),
            });
            if (resetError) throw resetError;
            setResetEmailSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally { setSendingReset(false); }
    };

    // Google sign-up sits above the terms checkbox, so point the user at it when it is still unticked.
    const flashTerms = () => {
        setHighlightTerms(true);
        termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightTerms(false), 2000);
    };

    const passwordsMismatch = Boolean(confirmPassword) && confirmPassword !== password;

    const termsCheckbox = (
        <label
            ref={termsRef}
            className={`flex cursor-pointer items-start gap-3 py-1 text-sm leading-relaxed transition-colors ${highlightTerms ? 'text-rose-200' : 'text-slate-200'}`}
        >
            <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className={`mt-0.5 h-4.5 w-4.5 shrink-0 accent-[#C6E35A] ${highlightTerms ? 'outline-2 outline-offset-2 outline-rose-400' : ''}`}
            />
            <span>
                I agree to the{' '}
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                    className={`underline underline-offset-2 ${authLinkClass}`}
                >
                    Terms & Privacy Policy
                </button>
            </span>
        </label>
    );

    const submitLabel = (label: string) => loading ? (
        <>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            <span className="sr-only">Creating your account</span>
        </>
    ) : label;

    /* ── Success ── */
    if (success) {
        const successTitle = isGuestFlow ? 'Your account is ready' : requiresEmailConfirmation ? 'Check your email' : 'Account created';
        const successDescription = isGuestFlow
            ? 'Taking you to log in…'
            : requiresEmailConfirmation
                ? 'We sent a verification link to your inbox. Open it to confirm your address and activate your PicklePlay account.'
                : "You're all set. Taking you to log in…";

        return (
            <AuthLayout
                headline={<>One step<br /><span className="text-[#C6E35A]">from the court.</span></>}
                subline="Verify your email to unlock bookings, tournaments and the full PicklePlay experience."
            >
                <div className="flex flex-col gap-5">
                    <AuthStatusIcon>{requiresEmailConfirmation ? <Mail size={30} /> : <CheckCircle2 size={32} />}</AuthStatusIcon>
                    <AuthPanelHeader title={successTitle}>{successDescription}</AuthPanelHeader>

                    {requiresEmailConfirmation && (
                        <div className="rounded-xl border border-[#22406A] bg-[#081A33] px-4 py-3">
                            <p className="text-[13px] text-slate-400">Sent to</p>
                            <p className="mt-1 truncate font-semibold text-white">{email}</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                Check your inbox first, then spam or promotions if it doesn't arrive within a minute.
                            </p>
                        </div>
                    )}

                    {requiresEmailConfirmation && verificationActionMessage && (
                        <AuthAlert tone={verificationActionMessage.type}>{verificationActionMessage.text}</AuthAlert>
                    )}

                    {requiresEmailConfirmation ? (
                        <div className="flex flex-col gap-3">
                            <Link to={`/login?email=${encodeURIComponent(email)}`} className={authPrimaryButtonClass}>
                                Back to log in
                            </Link>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleResendVerificationEmail}
                                    disabled={isResendingVerification}
                                    className={`${authSecondaryButtonClass} flex-[1_1_10rem]`}
                                >
                                    {isResendingVerification ? 'Sending…' : 'Resend email'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUseDifferentEmail}
                                    className={`${authSecondaryButtonClass} flex-[1_1_10rem]`}
                                >
                                    Use a different email
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div role="status" className="flex items-center gap-3 text-sm text-slate-300">
                            <Loader2 size={22} className="animate-spin text-[#C6E35A]" aria-hidden="true" />
                            Redirecting…
                        </div>
                    )}
                </div>
            </AuthLayout>
        );
    }

    /* ── Already Registered (guest already has an account) ── */
    if (alreadyRegistered) {
        return (
            <AuthLayout
                headline={<>Already<br /><span className="text-[#C6E35A]">on the team.</span></>}
                back={{ label: 'Back', onClick: () => { setAlreadyRegistered(false); setResetEmailSent(false); setError(null); } }}
            >
                <div className="flex flex-col gap-5">
                    <AuthStatusIcon><UserCheck size={30} /></AuthStatusIcon>
                    <AuthPanelHeader title="Account found">
                        An account with <strong className="font-semibold text-white">{email}</strong> already exists on PicklePlay.
                        Log in or reset your password below. Your guest booking will appear in My Bookings.
                    </AuthPanelHeader>

                    {resetEmailSent ? (
                        <>
                            <AuthAlert tone="success">
                                Password reset email sent to {email}. Open the link to set your password, then log in to see your booking.
                            </AuthAlert>
                            <Link to="/login" className={authPrimaryButtonClass}>
                                <LogIn size={18} aria-hidden="true" />
                                Go to log in
                            </Link>
                        </>
                    ) : (
                        <>
                            {error && <AuthAlert>{error}</AuthAlert>}
                            <Link
                                to={`/login${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                                className={authPrimaryButtonClass}
                            >
                                <LogIn size={18} aria-hidden="true" />
                                Log in to your account
                            </Link>
                            <AuthDivider label="or" />
                            <button type="button" onClick={handleSendResetEmail} disabled={sendingReset} className={authSecondaryButtonClass}>
                                {sendingReset ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
                                {sendingReset ? 'Sending…' : 'Reset password by email'}
                            </button>
                        </>
                    )}
                </div>
            </AuthLayout>
        );
    }

    /* ── Guest Setup Flow — streamlined password-only form ── */
    if (isGuestFlow && email) {
        return (
            <>
                <AuthLayout
                    headline={<>Your booking<br /><span className="text-[#C6E35A]">is waiting.</span></>}
                    subline="Set a password to see your bookings and use everything PicklePlay has to offer."
                >
                    <div className="flex flex-col gap-5">
                        <AuthPanelHeader title="Set up your account">
                            {guestLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                    Loading your info…
                                </span>
                            ) : guestName ? (
                                <>Welcome, <strong className="font-semibold text-white">{guestName}</strong>! Set a password to view your bookings.</>
                            ) : (
                                'Set a password to view your bookings.'
                            )}
                        </AuthPanelHeader>

                        <div className="flex items-center gap-3 rounded-xl border border-[#22406A] bg-[#081A33] p-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6E35A]/15 text-[#C6E35A]">
                                <Mail size={18} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                {guestName && <p className="truncate text-sm font-semibold text-white">{guestName}</p>}
                                <p className="truncate text-[13px] text-slate-300">{email}</p>
                            </div>
                            <span className="ml-auto rounded-full bg-[#C6E35A]/15 px-2.5 py-1 text-xs font-semibold text-[#C6E35A]">Guest</span>
                        </div>

                        <form onSubmit={handleSignup} className="flex flex-col gap-5">
                            {error && <AuthAlert>{error}</AuthAlert>}
                            <AuthPasswordField
                                id="guest-password"
                                label="Password"
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a password"
                                hint="At least 8 characters."
                            />
                            <AuthPasswordField
                                id="guest-confirm-password"
                                label="Confirm password"
                                required
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Type it again"
                                invalid={passwordsMismatch}
                                hint={passwordsMismatch ? "Passwords don't match." : undefined}
                            />
                            {termsCheckbox}
                            <button type="submit" disabled={loading || !agreedToTerms} className={authPrimaryButtonClass}>
                                {submitLabel('Set up account')}
                            </button>
                        </form>

                        <p className="text-center text-[15px] text-slate-300">
                            Already have a password?{' '}
                            <Link to="/login" className={authLinkClass}>Log in</Link>
                        </p>
                    </div>
                </AuthLayout>
                <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
            </>
        );
    }

    /* ── Normal Signup ── */
    return (
        <>
            <AuthLayout
                wide
                headline={<>Your game.<br />Your courts.<br /><span className="text-[#C6E35A]">Your rating.</span></>}
                subline="Join players across the Philippines booking courts, entering tournaments and tracking their DUPR on PicklePlay."
            >
                <div className="flex flex-col gap-5">
                    <AuthPanelHeader title="Create your account">
                        Already a member?{' '}
                        <Link to="/login" className={authLinkClass}>Log in</Link>
                    </AuthPanelHeader>

                    <GoogleButton
                        label="Sign up with Google"
                        disabled={loading}
                        onClick={() => {
                            if (!agreedToTerms) {
                                flashTerms();
                                return;
                            }
                            handleSocialLogin('google');
                        }}
                    />
                    <AuthDivider label="or with email" />

                    <form onSubmit={handleSignup} className="flex flex-col gap-5">
                        {error && <AuthAlert>{error}</AuthAlert>}
                        <AuthField
                            id="signup-name"
                            label="Full name"
                            type="text"
                            required
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Juan Dela Cruz"
                        />
                        <AuthField
                            id="signup-email"
                            label="Email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                        />
                        <div className="grid gap-5 sm:grid-cols-2">
                            <AuthPasswordField
                                id="signup-password"
                                label="Password"
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create one"
                                hint="At least 8 characters."
                            />
                            <AuthPasswordField
                                id="signup-confirm-password"
                                label="Confirm password"
                                required
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Type it again"
                                invalid={passwordsMismatch}
                                hint={passwordsMismatch ? "Passwords don't match." : undefined}
                            />
                        </div>
                        {termsCheckbox}
                        <button type="submit" disabled={loading || !agreedToTerms} className={authPrimaryButtonClass}>
                            {submitLabel('Create account')}
                        </button>
                    </form>
                </div>
            </AuthLayout>
            <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </>
    );
};

export default Signup;
