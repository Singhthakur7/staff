import React, { useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  MessageCircle,
  Power,
  RefreshCw,
  Save,
  UserPlus,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { STAFF_ROLES, StaffAccount } from '../../types';
import { formatINR, generateStaffCredentials, getAppOrigin } from '../../utils/helpers';

export const AdminStaffTab: React.FC = () => {
  const {
    state,
    activeCompany,
    addStaffAccount,
    updateStaffAccount,
    toggleStaffActive,
    openWhatsAppModal,
    pushToast,
  } = useErp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState(STAFF_ROLES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [dailyWage, setDailyWage] = useState('1500');
  const [salaryDay, setSalaryDay] = useState('5');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [kycLast4, setKycLast4] = useState('');

  const companySlug = activeCompany?.slug || 'company';
  const companyName = activeCompany?.name || 'Company';
  const staffPortalUrl = activeCompany?.slug
    ? `${getAppOrigin()}/c/${activeCompany.slug}`
    : `${getAppOrigin()}/`;

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    if (!editingId) {
      const creds = generateStaffCredentials(nextName, companySlug, false);
      if (!upiId) {
        setUpiId(nextName.trim() ? creds.upiId : '');
      }
    }
  };

  const handleGenerateUpi = () => {
    const creds = generateStaffCredentials(name || 'crew', companySlug, true);
    setUpiId(creds.upiId);
    pushToast({ type: 'info', title: 'GPay UPI Suggestion Generated' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRole(STAFF_ROLES[0]);
    setPhone('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setUpiId('');
    setDailyWage('1500');
    setSalaryDay('5');
    setEmergencyContact('');
    setKycLast4('');
  };

  const loadEdit = (s: StaffAccount) => {
    setEditingId(s.id);
    setName(s.name);
    setRole(s.role);
    setPhone(s.phone);
    setEmail(s.email);
    setPassword('');
    setShowPassword(false);
    setUpiId(s.upiId);
    setDailyWage(String(s.dailyWage));
    setSalaryDay(String(s.salaryDay));
    setEmergencyContact(s.emergencyContact);
    setKycLast4(s.kycLast4);
  };

  const saveAccount = async (andSendWhatsApp: boolean) => {
    if (!name.trim() || !email.trim()) {
      pushToast({ type: 'error', title: 'Staff Name and Email are required' });
      return;
    }

    const cleanPassword = !editingId ? password.trim() : '';
    if (cleanPassword && cleanPassword.length < 6) {
      pushToast({
        type: 'error',
        title: 'Initial password must be at least 6 characters (or leave blank)',
      });
      return;
    }

    const payload = {
      name: name.trim(),
      role,
      phone: phone.trim() || '919847000000',
      email: email.trim().toLowerCase(),
      ...(cleanPassword ? { password: cleanPassword } : {}),
      upiId: upiId.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@okicici`,
      dailyWage: Math.max(100, Number(dailyWage) || 1000),
      salaryDay: Math.min(31, Math.max(1, Number(salaryDay) || 5)),
      emergencyContact: emergencyContact.trim(),
      kycLast4: kycLast4.replace(/[^0-9]/g, '').slice(0, 4),
      active: true,
    };

    if (editingId) {
      await updateStaffAccount(editingId, payload);
    } else {
      const created = await addStaffAccount(payload);
      if (!created) return;
    }

    if (andSendWhatsApp) {
      const lines = [
        `Welcome to *${companyName}*!`,
        `Your Staff Portal is Ready:`,
        `Portal Link: ${staffPortalUrl}`,
        `Name: ${payload.name} (${payload.role})`,
        `Registered Email: ${payload.email}`,
      ];
      if (cleanPassword) {
        lines.push(`Initial Password: ${cleanPassword}`);
      }
      lines.push(
        `GPay UPI: ${payload.upiId}`,
        `Base Daily Wage: ${formatINR(payload.dailyWage)} (Salary Day: ${payload.salaryDay})`,
        ``
      );
      if (cleanPassword) {
        lines.push(
          `Open your inbox to verify your email link once, then sign in with Email & Password (or tap "Continue with Google" using ${payload.email}) to punch in with GPS + Selfie and confirm salary payouts.`
        );
      } else {
        lines.push(
          `Open the link and sign in with Email & Password (tap "Set up password" on first visit) or tap "Continue with Google" using ${payload.email}.`
        );
      }
      openWhatsAppModal({
        phone: payload.phone,
        recipientName: payload.name,
        message: lines.join('\n'),
      });
    }

    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Staff Account Creator */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveAccount(false);
        }}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              {editingId ? 'Edit Staff Account' : 'Add New Crew Member'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the staff member&apos;s email address (and optional initial password) so they
              can sign in at <span className="font-mono">/c/{companySlug}</span> with Email &amp;
              Password or Google Sign-In.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateUpi}
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#0B1120] inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
              Suggest UPI
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Arun Kumar"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              WhatsApp Phone
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="919847..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Staff Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staffmember@company.com"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">GPay UPI ID</label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="name@okicici"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Base Daily Wage (₹)
            </label>
            <input
              type="number"
              required
              min={100}
              value={dailyWage}
              onChange={(e) => setDailyWage(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Salary Day (1–31)
            </label>
            <input
              type="number"
              required
              min={1}
              max={31}
              value={salaryDay}
              onChange={(e) => setSalaryDay(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              KYC ID Last 4 Digits (Optional)
            </label>
            <input
              type="text"
              maxLength={4}
              value={kycLast4}
              onChange={(e) => setKycLast4(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="e.g. 4821"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          {!editingId && (
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Initial Login Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars (optional)"
                  autoComplete="new-password"
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Stored only in Firebase Auth (never in Firestore). Staff can also set up a password
                later or sign in with Google.
              </p>
            </div>
          )}

          <div className={editingId ? 'sm:col-span-2 lg:col-span-4' : 'sm:col-span-1 lg:col-span-2'}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Emergency Contact
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+91 ..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <button
            type="submit"
            className="min-h-[46px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
          >
            {editingId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {editingId ? 'Save Changes' : 'Save Staff Account'}
          </button>
          <button
            type="button"
            onClick={() => void saveAccount(true)}
            className="min-h-[46px] px-5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Save &amp; Send Portal Invite via WhatsApp
          </button>
        </div>
      </form>

      {/* Staff Accounts Roster */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-[#0B1120]">
            Registered Crew Accounts ({state.staff.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {state.staff.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No staff accounts created yet. Add your first staff member&apos;s email above.
            </div>
          ) : null}
          {state.staff.map((s) => (
            <div
              key={s.id}
              className={`p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                !s.active ? 'bg-red-50/40' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[#0B1120]">{s.name}</p>
                  <span className="text-xs text-slate-500">· {s.role}</span>
                  <span
                    className={`text-xs font-bold ${
                      s.active ? 'text-[#059669]' : 'text-[#DC2626]'
                    }`}
                  >
                    · {s.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 break-all">
                  Email: {s.email} · UPI: {s.upiId}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Wage: {formatINR(s.dailyWage)}/day · Salary Day: {s.salaryDay} · Ph: +{s.phone}
                  {s.kycLast4 ? ` · KYC ****${s.kycLast4}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadEdit(s)}
                  className="min-h-[38px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppModal({
                      phone: s.phone,
                      recipientName: s.name,
                      message: `${companyName} Staff Portal Invite for ${s.name}:\nPortal: ${staffPortalUrl}\nEmail: ${s.email}\nSign in using Email & Password (or tap "Set up password" on first visit) or Continue with Google.\nGPay UPI: ${s.upiId}`,
                    })
                  }
                  className="min-h-[38px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#047857] text-xs font-semibold inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => toggleStaffActive(s.id)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 border transition-colors ${
                    s.active
                      ? 'border-red-200 bg-white hover:bg-red-50 text-[#DC2626]'
                      : 'border-emerald-200 bg-[#059669] hover:bg-[#047857] text-white'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {s.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
