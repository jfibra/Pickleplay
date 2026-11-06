import React, { useState, useEffect } from 'react';
import useSEO from '../hooks/useSEO';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase, createSession } from '../services/supabase';
import { getCourtManagerLoginState } from '../services/courtManagers';
import { canAttemptLogin, canRequestPasswordReset } from '../services/rateLimiter';
import { bootstrapTwoFactorSession } from '../services/twoFactorAuth';
import { getAuthCallbackUrl } from '../services/authRedirects';
import { normalizeAuthError, trackEvent } from '../services/playerEvents';
import { Loader2, CheckCircle2 } from 'lucide-react';
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

const Login: React.FC = () => {
    useSEO({
        title: 'Log In to PicklePlay',
        description: 'Sign in to your PicklePlay Philippines account to book courts, manage bookings, and connect with the community.',
        canonical: 'https://www.pickleplay.ph/login',
        noIndex: true,
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberSession, setRememberSession] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameFromLogout, setCameFromLogout] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Read the logout flag once on mount, then clear it immediately
    useEffect(() => {
        if (localStorage.getItem('came_from_logout')) {
            setCameFromLogout(true);
            localStorage.removeItem('came_from_logout');
        }
        // Pre-fill email from query param (e.g., guest signup redirect)
        const emailParam = searchParams.get('email');
        if (emailParam && !email) {
            setEmail(decodeURIComponent(emailParam));
        }
        // Show error if redirected from OAuth without email
        const errorParam = searchParams.get('error');
        if (errorParam === 'email_required') {
            setError('Your social account does not have a verified email address. Please sign up with an email and password instead, or use a social account that has an email.');
        } else if (errorParam === 'verify_email_required') {
            setError('Please verify your email before signing in.');
        }
    }, []);
    const redirectUrl = searchParams.get('redirect') || '/';

    const normalizeUsername = (value: string) =>
        value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30);

    const ensureProfileFields = async (user: any) => {
        const { data: existingProfile, error: profileLookupError } = await supabase
            .from('profiles')
            .select('email, full_name, username')
            .eq('id', user.id)
            .maybeSingle();

        if (profileLookupError) {
            if (profileLookupError.code === '42501') {
                console.warn('Skipping profile sync during login because profile permissions are restricted for this session.');
                return;
            }
            console.error('Failed to load profile during login:', profileLookupError);
            return;
        }

        if (!existingProfile) {
            return;
        }

        const resolvedFullName = existingProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
        const resolvedEmail = existingProfile?.email || user?.email || null;
        const baseUsername = normalizeUsername(
            existingProfile?.username || resolvedFullName || user?.email?.split('@')[0] || 'player'
        ) || 'player';

        let candidateUsername = existingProfile?.username || baseUsername;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { error } = await supabase
                .from('profiles')
                .update({ email: resolvedEmail, full_name: resolvedFullName, username: candidateUsername })
                .eq('id', user.id);
            if (!error) return;
            if (error.code === '23505') {
                candidateUsername = `${baseUsername.slice(0, 22)}_${Math.random().toString(36).slice(2, 7)}`;
                continue;
            }
            if (error.code === '42501') {
                console.warn('Skipping profile sync during login because profile permissions are restricted for this session.');
                return;
            }
            console.error('Failed to update profile fields during login:', error);
            return;
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        setError(null);
        try {
            const referralCode = searchParams.get('ref');
            if (referralCode) localStorage.setItem('referral_code', referralCode);
            if (redirectUrl && redirectUrl !== '/dashboard') localStorage.setItem('auth_redirect', redirectUrl);
            const oauthOptions: any = {
                redirectTo: getAuthCallbackUrl({ ref: referralCode }),
            };
            // Keep Google's default OAuth behavior: first-time users may see consent,
            // while previously authorized accounts can return directly without it.
            // Force Facebook to request email permission
            if (provider === 'facebook') {
                oauthOptions.scopes = 'email';
            }
            const { error: authError } = await supabase.auth.signInWithOAuth({ provider, options: oauthOptions });
            if (authError) throw authError;
        } catch (err: any) {
            trackEvent('login_failed', { reason: normalizeAuthError(err?.message), method: provider });
            setError(err.message || `Failed to sign in with ${provider}.`);
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canAttemptLogin()) {
            trackEvent('login_failed', { reason: 'rate_limited', method: 'password' });
            setError('Too many login attempts. Please wait a few minutes before trying again.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            if (data.user) {
                await ensureProfileFields(data.user);

                const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    await createSession(data.user.id, deviceName, ipData.ip);
                } catch { await createSession(data.user.id, deviceName); }

                const twoFactorStatus = await bootstrapTwoFactorSession(data.session?.access_token).catch(async (bootstrapError: any) => {
                    await supabase.auth.signOut();
                    const bootstrapMessage = String(bootstrapError?.message || bootstrapError || '').toLowerCase();
                    if (
                        bootstrapMessage.includes('failed to fetch')
                        || bootstrapMessage.includes('network')
                        || bootstrapMessage.includes('request failed')
                        || bootstrapMessage.includes('supabase admin client')
                        || bootstrapError?.status === 500
                    ) {
                        throw new Error('Login security service is unavailable. Start the API with npm run dev (or npm run dev:server), then try again.');
                    }
                    throw bootstrapError;
                });
                if (twoFactorStatus.pending) {
                    const finalRedirect = localStorage.getItem('auth_redirect') || redirectUrl;
                    if (finalRedirect && finalRedirect !== '/dashboard') {
                        localStorage.setItem('auth_redirect', finalRedirect);
                    }
                    navigate('/verify-2fa');
                } else {
                    const storedRedirect = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');
                    navigate(storedRedirect || redirectUrl);
                }
            }
        } catch (err: any) {
            const message = err.message || 'Failed to sign in. Please check your credentials.';
            const normalizedMessage = message.toLowerCase();
            trackEvent('login_failed', {
                reason: normalizedMessage.includes('banned') ? 'account_blocked' : normalizeAuthError(message),
                method: 'password',
            });
            if (normalizedMessage.includes('email not confirmed') || normalizedMessage.includes('confirm your email')) {
                setError('Please confirm your email before logging in. Check your inbox and spam folder for the PicklePlay confirmation email.');
            } else if (normalizedMessage.includes('banned')) {
                try {
                    const loginState = await getCourtManagerLoginState(email);
                    if (loginState.state === 'pending_invite_registration') {
                        setError('This court manager invite setup is not complete yet. Open your invitation link and finish registration first.');
                    } else if (loginState.state === 'pending_owner_approval') {
                        if (loginState.restoredLoginAccess) {
                            const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                            if (!retryError) {
                                const redirectUrl = searchParams.get('redirect') || '/dashboard';
                                const storedRedirect = localStorage.getItem('auth_redirect');
                                localStorage.removeItem('auth_redirect');
                                navigate(storedRedirect || redirectUrl);
                                return;
                            }
                        }

                        setError('Your Court Manager assignment is still waiting for owner approval. Once approved, Court Manager mode will appear alongside your normal PicklePlay access.');
                    } else {
                        setError('This court manager account is not active yet. If you have not finished the invitation, reopen your invite link. If you already completed registration, wait for owner approval.');
                    }
                } catch {
                    setError('This court manager account is not active yet. If you have not finished the invitation, reopen your invite link. If you already completed registration, wait for owner approval.');
                }
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        if (!canRequestPasswordReset()) {
            setError('Too many password reset requests. Please wait 10 minutes.');
            return;
        }
        setSendingReset(true);
        setError(null);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getAuthCallbackUrl(),
            });
            if (resetError) throw resetError;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setSendingReset(false);
        }
    };

    const signupUrl = `/signup${redirectUrl && redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`;

    return (
        <AuthLayout
            headline={<>Back on<br /><span className="text-[#C6E35A]">the court.</span></>}
            subline="Log in to book courts, log your matches and keep your DUPR rating moving."
            back={{ label: cameFromLogout ? 'Homepage' : 'Back to home', to: '/' }}
        >
            {resetSent ? (
                <div className="flex flex-col gap-5">
                    <AuthStatusIcon><CheckCircle2 size={32} /></AuthStatusIcon>
                    <AuthPanelHeader title="Check your email">
                        We sent a password reset link to <strong className="font-semibold text-white">{email}</strong>. Check your inbox and spam folder.
                    </AuthPanelHeader>
                    <button type="button" onClick={() => setResetSent(false)} className={authSecondaryButtonClass}>
                        Back to log in
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <AuthPanelHeader title="Log in">
                        New to PicklePlay?{' '}
                        <Link to={signupUrl} className={authLinkClass}>Create an account</Link>
                    </AuthPanelHeader>

                    <GoogleButton label="Continue with Google" onClick={() => handleSocialLogin('google')} disabled={loading} />
                    <AuthDivider label="or with email" />

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        {error && <AuthAlert>{error}</AuthAlert>}

                        <AuthField
                            id="login-email"
                            label="Email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                        />
                        <AuthPasswordField
                            id="login-password"
                            label="Password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            labelAction={
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    disabled={sendingReset}
                                    className={`text-sm disabled:opacity-50 ${authLinkClass}`}
                                >
                                    {sendingReset ? 'Sending…' : 'Forgot password?'}
                                </button>
                            }
                        />
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                checked={rememberSession}
                                onChange={(e) => setRememberSession(e.target.checked)}
                                className="h-4.5 w-4.5 accent-[#C6E35A]"
                            />
                            Keep me signed in
                        </label>

                        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                                    <span className="sr-only">Logging in</span>
                                </>
                            ) : 'Log in'}
                        </button>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
};

export default Login;
