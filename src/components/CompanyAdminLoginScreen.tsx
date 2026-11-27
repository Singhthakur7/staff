import React, { useState } from 'react';
import { Building2, Globe, ShieldCheck } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { t } from '../i18n';
import { BrandMark } from './BrandMark';
import { FirebaseSetupBanner, RtdbStatusBadge } from './FirebaseSetupBanner';

interface CompanyAdminLoginScreenProps {
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

export const CompanyAdminLoginScreen: React.FC<CompanyAdminLoginScreenProps> = ({
  companySlug,
}) => {
  const { lang, toggleLang, signInWithGoogle, isFirebaseConfigured } = useErp();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formattedSlugTitle = companySlug
    ? companySlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : null;

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    const res = await signInWithGoogle('company_admin', companySlug);
    setSubmitting(false);
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col lg:flex-row">
      {/* Left Executive Panel */}
      <div className="lg:w-[44%] xl:w-[42%] bg-[#0B1120] text-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={40} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-white truncate">
                {formattedSlugTitle || t(lang, 'adminPortal')}
              </h1>
              <p className="text-xs text-[#FBBF24] truncate">
                {t(lang, 'adminPortal')}
              </p>
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
              COMPANY ADMIN CONSOLE · /c/{companySlug}/admin
            </p>
          )}
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            {formattedSlugTitle
              ? `${formattedSlugTitle} — Executive ERP Command`
              : 'Isolated Company Operations, Billing & Payroll Console.'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md">
            Manage your company&apos;s live crew attendance, date-wise work dispatch, P&amp;L
            ledger, Google Pay QR payouts, corporate A4 salary slips, and partner studios CRM from
            your isolated Cloud Firestore workspace.
          </p>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>Dedicated Company Admin Route</span>
          <RtdbStatusBadge dark />
        </div>
      </div>

      {/* Right Company Admin Login Card */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-5">
          <FirebaseSetupBanner />

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[#D97706] inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {formattedSlugTitle || 'Company Administrator'}
                </span>
                <RtdbStatusBadge />
              </div>
              <h2 className="text-xl font-bold text-[#0B1120]">
                {t(lang, 'companyAdminLoginTitle')}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Sign in with the Google account assigned as Administrator for your company.
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#DC2626] leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || !isFirebaseConfigured}
              className="w-full h-12 px-4 rounded-xl bg-[#0B1120] hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-3 transition-colors"
            >
              <GoogleIcon />
              <span>
                {submitting ? 'Verifying Company Access...' : 'Sign in with Google'}
              </span>
            </button>

            <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                Your workspace is strictly isolated in Cloud Firestore. Suspended company accounts
                are blocked automatically.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
