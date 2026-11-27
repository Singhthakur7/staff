import React, { useMemo, useState } from 'react';
import { Building2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useStaffOnline } from '../context/StaffOnlineContext';
import { BrandLogo } from './BrandLogo';

interface CompanyAdminLoginProps {
  companySlug?: string;
}

export const CompanyAdminLogin: React.FC<CompanyAdminLoginProps> = ({ companySlug }) => {
  const { companies, loginCompanyAdmin } = useStaffOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scopedCompany = useMemo(() => {
    if (!companySlug) return null;
    return companies.find((c) => c.slug.toLowerCase() === companySlug.toLowerCase()) || null;
  }, [companies, companySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await loginCompanyAdmin(email.trim(), password.trim(), companySlug);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Unable to sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 card-elevated space-y-6">
        <div className="space-y-3">
          <BrandLogo
            variant="light"
            size="md"
            companyName={scopedCompany ? scopedCompany.name : undefined}
          />
          <div>
            <h1 className="text-xl font-display font-extrabold text-[#0F172A]">
              Company Admin Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {scopedCompany
                ? `${scopedCompany.name} · ${scopedCompany.place}`
                : 'Sign in with your Company Admin email and password to manage staff, payroll, and billing.'}
            </p>
          </div>
        </div>

        {companySlug && !scopedCompany && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900">
            No company found for URL <span className="font-mono font-bold">/c/{companySlug}</span>.
          </div>
        )}

        {scopedCompany && !scopedCompany.active && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700">
            This company account is currently suspended. Please contact Staff. Online support.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Company Admin Email or Phone
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full h-12 pl-3.5 pr-11 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(scopedCompany && !scopedCompany.active)}
            className="w-full min-h-[48px] px-5 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            {loading ? 'Verifying Credentials...' : 'Sign In to Company Admin'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Isolated Company Workspace
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Staff. Online
          </span>
        </div>
      </div>
    </div>
  );
};
