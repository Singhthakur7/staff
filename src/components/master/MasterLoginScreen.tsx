import React, { useState } from 'react';
import { Globe, ShieldCheck } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { t } from '../../i18n';
import { BrandMark } from '../BrandMark';
import { FirebaseSetupBanner, RtdbStatusBadge } from '../FirebaseSetupBanner';

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

export const MasterLoginScreen: React.FC = () => {
  const { masterConfig, lang, toggleLang, signInWithGoogle, isFirebaseConfigured } = useErp();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    const res = await signInWithGoogle('master_admin');
    setSubmitting(false);
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-center items-center p-5 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={38} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-white truncate">
                {masterConfig.brandName || 'AuraERP Cloud Suite'}
              </p>
              <p className="text-xs text-[#FBBF24] truncate">{t(lang, 'masterPortal')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
            {lang === 'en' ? 'മലയാളം' : 'EN'}
          </button>
        </div>

        <FirebaseSetupBanner />

        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FBBF24]">
                <ShieldCheck className="w-4 h-4" />
                Restricted Owner Route
              </span>
              <RtdbStatusBadge dark />
            </div>
            <h1 className="text-xl font-extrabold text-white">{t(lang, 'masterLoginTitle')}</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Authenticate with your authorized Master Administrator Google account to provision
              companies, manage tenant access, and inspect live Cloud Firestore databases.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-200 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting || !isFirebaseConfigured}
            className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-[#0B1120] text-sm font-bold flex items-center justify-center gap-3 transition-colors"
          >
            <GoogleIcon />
            <span>
              {submitting ? 'Authenticating...' : 'Continue with Google (Master Admin)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
