import React, { useEffect, useState } from 'react';
import { Copy, Dices, KeyRound, Save, UserCheck } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { PasswordProfile } from '../../types';
import { generatePassword, safeCopyText } from '../../utils/helpers';

export const AdminPasswordsTab: React.FC = () => {
  const { activeCompany, activeDb, updateCompany, updateStaff, pushToast } = useStaffOnline();

  // Company Admin Own Password Generator
  const [adminLen, setAdminLen] = useState(12);
  const [adminProfile, setAdminProfile] = useState<PasswordProfile>('strong');
  const [adminPass, setAdminPass] = useState(() => generatePassword(12, 'strong'));

  // Staff Account Password Generator
  const [staffId, setStaffId] = useState(activeDb.staff[0]?.id || '');
  const [staffLen, setStaffLen] = useState(10);
  const [staffProfile, setStaffProfile] = useState<PasswordProfile>('alphanumeric');
  const [staffPass, setStaffPass] = useState(() => generatePassword(10, 'alphanumeric'));

  useEffect(() => {
    if (!staffId && activeDb.staff[0]) setStaffId(activeDb.staff[0].id);
  }, [activeDb.staff, staffId]);

  if (!activeCompany) return null;

  const copyVal = async (val: string) => {
    const ok = await safeCopyText(val);
    pushToast({ type: ok ? 'success' : 'error', title: ok ? 'Password copied' : 'Copy failed' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Company Admin Own Password Generator */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 card-elevated space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Company Admin Own Password</h3>
            <p className="text-xs font-mono text-slate-500">{activeCompany.adminEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Length</label>
            <select
              value={adminLen}
              onChange={(e) => setAdminLen(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
            >
              <option value={10}>10 Characters</option>
              <option value={12}>12 Characters</option>
              <option value={16}>16 Characters</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Profile</label>
            <select
              value={adminProfile}
              onChange={(e) => setAdminProfile(e.target.value as PasswordProfile)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
            >
              <option value="strong">Strong (A-Z, a-z, 0-9, !@#)</option>
              <option value="alphanumeric">Alphanumeric</option>
              <option value="numeric">Numeric PIN</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Generated Admin Password
          </label>
          <input
            type="text"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-mono font-bold text-[#0F172A]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdminPass(generatePassword(adminLen, adminProfile))}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Dices className="w-4 h-4 text-[#2563EB]" />
            Generate
          </button>
          <button
            type="button"
            onClick={() => void copyVal(adminPass)}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            type="button"
            disabled={adminPass.trim().length < 6}
            onClick={() =>
              void updateCompany(activeCompany.id, { adminPassword: adminPass.trim() })
            }
            className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Admin Password
          </button>
        </div>
      </div>

      {/* Staff Account Password Generator */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 card-elevated space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Staff Account Password Generator</h3>
            <p className="text-xs text-slate-500">Rotate login password for any crew member.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Staff</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
          >
            {activeDb.staff.length === 0 ? (
              <option value="">No staff registered yet</option>
            ) : (
              activeDb.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Length</label>
            <select
              value={staffLen}
              onChange={(e) => setStaffLen(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
            >
              <option value={8}>8 Characters</option>
              <option value={10}>10 Characters</option>
              <option value={12}>12 Characters</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Profile</label>
            <select
              value={staffProfile}
              onChange={(e) => setStaffProfile(e.target.value as PasswordProfile)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
            >
              <option value="strong">Strong</option>
              <option value="alphanumeric">Alphanumeric</option>
              <option value="numeric">Numeric PIN</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Generated Staff Password
          </label>
          <input
            type="text"
            value={staffPass}
            onChange={(e) => setStaffPass(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-mono font-bold text-[#0F172A]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStaffPass(generatePassword(staffLen, staffProfile))}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Dices className="w-4 h-4 text-[#2563EB]" />
            Generate
          </button>
          <button
            type="button"
            onClick={() => void copyVal(staffPass)}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            type="button"
            disabled={!staffId || staffPass.trim().length < 4}
            onClick={() => void updateStaff(staffId, { password: staffPass.trim() })}
            className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Staff Password
          </button>
        </div>
      </div>
    </div>
  );
};
