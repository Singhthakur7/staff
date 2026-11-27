import React, { useEffect, useState } from 'react';
import { Copy, Dices, KeyRound, Save, Shield } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { PasswordProfile } from '../../types';
import { generatePassword, safeCopyText } from '../../utils/helpers';

export const SuperPasswordsTab: React.FC<{ defaultCompanyId?: string }> = ({
  defaultCompanyId,
}) => {
  const {
    companies,
    superAdmin,
    updateCompany,
    updateSuperAdminPassword,
    pushToast,
  } = useStaffOnline();

  // Company Admin Password Generator
  const [targetCompanyId, setTargetCompanyId] = useState(defaultCompanyId || companies[0]?.id || '');
  const [compLen, setCompLen] = useState<number>(12);
  const [compProfile, setCompProfile] = useState<PasswordProfile>('strong');
  const [compPass, setCompPass] = useState(() => generatePassword(12, 'strong'));

  // Super Admin Own Password Generator
  const [superEmail, setSuperEmail] = useState(superAdmin.email);
  const [superLen, setSuperLen] = useState<number>(12);
  const [superProfile, setSuperProfile] = useState<PasswordProfile>('strong');
  const [superPass, setSuperPass] = useState(() => generatePassword(12, 'strong'));

  useEffect(() => {
    if (defaultCompanyId) setTargetCompanyId(defaultCompanyId);
    else if (!targetCompanyId && companies[0]) setTargetCompanyId(companies[0].id);
  }, [defaultCompanyId, companies, targetCompanyId]);

  useEffect(() => {
    setSuperEmail(superAdmin.email);
  }, [superAdmin.email]);

  const handleCopy = async (val: string) => {
    const ok = await safeCopyText(val);
    pushToast({ type: ok ? 'success' : 'error', title: ok ? 'Password copied' : 'Copy failed' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Company Admin Password Generator */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 card-elevated space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Company Admin Password Generator</h3>
            <p className="text-xs text-slate-500">Reset and save any company&apos;s admin login password.</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Company</label>
            <select
              value={targetCompanyId}
              onChange={(e) => setTargetCompanyId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
            >
              {companies.length === 0 ? (
                <option value="">No companies registered yet</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.adminEmail})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Length</label>
              <select
                value={compLen}
                onChange={(e) => setCompLen(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value={10}>10 Characters</option>
                <option value={12}>12 Characters</option>
                <option value={16}>16 Characters</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Profile</label>
              <select
                value={compProfile}
                onChange={(e) => setCompProfile(e.target.value as PasswordProfile)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="strong">Strong (A-Z, a-z, 0-9, !@#)</option>
                <option value="alphanumeric">Alphanumeric</option>
                <option value="numeric">Numeric PIN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Generated Password
            </label>
            <input
              type="text"
              value={compPass}
              onChange={(e) => setCompPass(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-mono font-bold text-[#0F172A]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCompPass(generatePassword(compLen, compProfile))}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Dices className="w-4 h-4 text-[#2563EB]" />
              Generate
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(compPass)}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              type="button"
              disabled={!targetCompanyId || compPass.trim().length < 4}
              onClick={() =>
                void updateCompany(targetCompanyId, { adminPassword: compPass.trim() })
              }
              className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Company Admin Password
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Own Password Generator */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 card-elevated space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Super Admin Own Credentials</h3>
            <p className="text-xs text-slate-500">
              Update your Super Admin email or rotate your password safely.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Super Admin Email
            </label>
            <input
              type="email"
              value={superEmail}
              onChange={(e) => setSuperEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Length</label>
              <select
                value={superLen}
                onChange={(e) => setSuperLen(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value={10}>10 Characters</option>
                <option value={12}>12 Characters</option>
                <option value={16}>16 Characters</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Profile</label>
              <select
                value={superProfile}
                onChange={(e) => setSuperProfile(e.target.value as PasswordProfile)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="strong">Strong (A-Z, a-z, 0-9, !@#)</option>
                <option value="alphanumeric">Alphanumeric</option>
                <option value="numeric">Numeric PIN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              New Super Admin Password
            </label>
            <input
              type="text"
              value={superPass}
              onChange={(e) => setSuperPass(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-mono font-bold text-[#0F172A]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSuperPass(generatePassword(superLen, superProfile))}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Dices className="w-4 h-4 text-[#2563EB]" />
              Generate
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(superPass)}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              type="button"
              disabled={!superEmail.trim() || superPass.trim().length < 6}
              onClick={() => void updateSuperAdminPassword(superPass.trim(), superEmail.trim())}
              className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Update Super Admin Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
