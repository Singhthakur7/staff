import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Globe, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { t } from '../i18n';
import { BrandMark } from './BrandMark';
import { FirebaseSetupBanner, RtdbStatusBadge } from './FirebaseSetupBanner';

interface StaffLoginScreenProps {
  companySlug?: string;
}

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({ companySlug }) => {
  const {
    lang,
    toggleLang,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    isFirebaseConfigured,
  } = useErp();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formattedSlugTitle = companySlug
    ? companySlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setNeedsVerification(false);
    setSubmitting(true);

    if (mode === 'register') {
      const res = await registerWithEmail(email, password);
      setSubmitting(false);
      if (res.ok && res.info) {
        setInfo(res.info);
        setNeedsVerification(Boolean(res.needsVerification));
        setMode('signin');
      } else if (res.error) {
        setError(res.error);
      }
      return;
    }

    const res = await signInWithEmail('staff', email, password, companySlug);
    setSubmitting(false);
    if (!res.ok) {
      if (res.error) setError(res.error);
      if (res.needsVerification) setNeedsVerification(true);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    const res = await sendPasswordReset(email);
    setSubmitting(false);
    if (res.ok && res.info) setInfo(res.info);
    else if (res.error) setError(res.error);
  };

  const handleResendVerification = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    const res = await resendVerificationEmail();
    setSubmitting(false);
    if (res.ok && res.info) setInfo(res.info);
    else if (res.error) setError(res.error);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setInfo('');
    setNeedsVerification(false);
    setSubmitting(true);
    const res = await signInWithGoogle('staff', companySlug);
    setSubmitting(false);
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-[44%] xl:w-[42%] bg-[#0B1120] text-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={40} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-white truncate">
                {formattedSlugTitle || t(lang, 'staffPortal')}
              </h1>
              <p className="text-xs text-slate-400 truncate">{t(lang, 'appSubtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
            {lang === 'en' ? 'മലയാളം' : 'English'}
          </button>
        </div>

        <div className="my-10 lg:my-0 space-y-5">
          {formattedSlugTitle && (
            <p className="text-xs font-semibold tracking-wider text-[#FBBF24]">
              WORKFORCE PORTAL · /c/{companySlug}
            </p>
          )}
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            {formattedSlugTitle
              ? `${formattedSlugTitle} — Field Duty & Salary Portal`
              : 'Crew Attendance, Travel Logs & Verified Salary Slips.'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md">
            Sign in with your registered Email ID &amp; Password or Google account to punch in with
            GPS &amp; live selfie verification, view assigned duties, confirm payouts, and download
            official PDF salary slips.
          </p>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>Field Workforce Access</span>
          <RtdbStatusBadge dark />
        </div>
      </div>

      {/* Right Staff-Only Login Card */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-5">
          <FirebaseSetupBanner />

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[#2563EB]">
                  {formattedSlugTitle || t(lang, 'staffPortal')}
                </span>
                <RtdbStatusBadge />
              </div>
              <h2 className="text-xl font-bold text-[#0B1120]">
                {mode === 'signin' ? t(lang, 'staffLoginTitle') : 'Set Up Staff Password'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {mode === 'signin'
                  ? 'Sign in with your Email ID & Password or Google account.'
                  : 'First-time password login? Create a password for the email registered by your manager.'}
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#DC2626] leading-relaxed space-y-2">
                <p>{error}</p>
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Verification Email
                  </button>
                )}
              </div>
            )}

            {info && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#047857] leading-relaxed">
                {info}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t(lang, 'emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t(lang, 'passwordLabel')}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'signin' ? 'Enter your password' : 'Create password (min 6 chars)'
                    }
                    className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isFirebaseConfigured}
                className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>
                  {submitting
                    ? mode === 'signin'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'signin'
                    ? t(lang, 'signIn')
                    : 'Create Password & Send Verification'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === 'signin' ? 'register' : 'signin'));
                  setError('');
                  setInfo('');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-[#2563EB]"
              >
                {mode === 'signin'
                  ? 'First time using Email/Password? Set up password'
                  : 'Already have a password? Back to Sign In'}
              </button>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Or
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || !isFirebaseConfigured}
              className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 text-[#0B1120] text-sm font-bold flex items-center justify-center gap-3 shadow-xs transition-colors"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <span>
                Your attendance, salary records, and shift history are protected by your verified
                email identity.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
