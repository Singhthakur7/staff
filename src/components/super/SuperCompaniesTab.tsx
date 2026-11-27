import React, { useState } from 'react';
import {
  CalendarPlus,
  Copy,
  Dices,
  Eye,
  EyeOff,
  MessageCircle,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { CompanyRecord, EMPTY_COMPANY_DB, PlanStatus } from '../../types';
import {
  calculateStaffSummary,
  formatDateIN,
  formatINR,
  generatePassword,
  safeCopyText,
  slugifyCompany,
} from '../../utils/helpers';
import { getSafeOrigin } from '../../utils/router';

interface SuperCompaniesTabProps {
  selectedCompany: CompanyRecord | null;
  onSelectCompanyId: (id: string) => void;
}

export const SuperCompaniesTab: React.FC<SuperCompaniesTabProps> = ({
  selectedCompany,
  onSelectCompanyId,
}) => {
  const {
    companies,
    companyDataMap,
    registerCompany,
    extendCompanyPlanYear,
    setCompanyPlanStatus,
    toggleCompanyActive,
    deleteCompany,
    setInspectingCompanyId,
    openWhatsAppModal,
    pushToast,
  } = useStaffOnline();

  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [phone, setPhone] = useState('');
  const [planYears, setPlanYears] = useState<number>(1);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('trial');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CompanyRecord | null>(null);

  const origin = getSafeOrigin();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      pushToast({ type: 'error', title: 'Fill Company Name, Admin Email, and Password' });
      return;
    }
    setSubmitting(true);
    const res = await registerCompany({
      name: name.trim(),
      place: place.trim() || 'India',
      phone: phone.trim(),
      planYears,
      planStatus,
      adminEmail: adminEmail.trim().toLowerCase(),
      adminPassword: adminPassword.trim(),
    });
    setSubmitting(false);
    if (!res.ok || !res.company) {
      pushToast({ type: 'error', title: res.error || 'Could not register company' });
      return;
    }
    onSelectCompanyId(res.company.id);
    setName('');
    setPlace('');
    setPhone('');
    setPlanYears(1);
    setPlanStatus('trial');
    setAdminEmail('');
    setAdminPassword('');
  };

  const selectedDb = selectedCompany
    ? companyDataMap[selectedCompany.id] || EMPTY_COMPANY_DB
    : EMPTY_COMPANY_DB;

  const totalWorkRate = selectedDb.customers.reduce((s, c) => s + (Number(c.workRate) || 0), 0);
  const totalCustomerPaid = selectedDb.customers.reduce((s, c) => s + (Number(c.received) || 0), 0);
  const totalCustomerDue = Math.max(0, totalWorkRate - totalCustomerPaid);
  const totalStaffSalaryDue = selectedDb.staff.reduce((s, st) => {
    const sum = calculateStaffSummary(st, selectedDb);
    return s + Math.max(0, sum.netBalancePayable);
  }, 0);

  const handleCopyUrl = async (url: string, label: string) => {
    const ok = await safeCopyText(url);
    pushToast({ type: ok ? 'success' : 'error', title: ok ? `${label} copied` : 'Copy failed' });
  };

  const handleShareCompanyWA = (c: CompanyRecord) => {
    openWhatsAppModal({
      phone: c.phone,
      recipientName: c.name,
      message: [
        `Welcome to *${c.name}* on Staff. Online!`,
        ``,
        `*Company Admin Panel:* ${origin}/c/${c.slug}/admin`,
        `Admin Email: ${c.adminEmail}`,
        `Admin Password: ${c.adminPassword}`,
        ``,
        `*Staff Portal (Share with Crew):* ${origin}/c/${c.slug}`,
        `Plan: ${c.planStatus === 'trial' ? '30-Day Free Trial (₹0)' : `₹1,000 / Year Active (${c.planYears} Yr)`}`,
        `Valid: ${formatDateIN(c.planStartDate)} → ${formatDateIN(c.planEndDate)}`,
      ].join('\n'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Register New Company Form */}
      <form
        onSubmit={handleRegister}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="border-b border-slate-100 pb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-display font-bold text-[#0F172A]">
              Register New Company
            </h2>
            <p className="text-xs text-slate-500">
              Auto-creates isolated Company Admin Panel (`/c/slug/admin`) and Staff Portal (`/c/slug`).
            </p>
          </div>
          {name.trim() && (
            <span className="text-xs font-mono text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-lg">
              Slug: /c/{slugifyCompany(name)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company / Studio Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Media Works"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Place / City *</label>
            <input
              type="text"
              required
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Kottayam, Kerala"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Plan Duration</label>
            <select
              value={planYears}
              onChange={(e) => setPlanYears(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
            >
              <option value={1}>1 Year (₹1,000)</option>
              <option value={2}>2 Years (₹2,000)</option>
              <option value={3}>3 Years (₹3,000)</option>
              <option value={5}>5 Years (₹5,000)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Plan Status</label>
            <select
              value={planStatus}
              onChange={(e) => setPlanStatus(e.target.value as PlanStatus)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
            >
              <option value="trial">30 ദിവസത്തെ സൗജന്യ ട്രയൽ പീരീഡ് (₹0)</option>
              <option value="annual">₹1,000 / Year Plan Active</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company Admin Email *
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Admin Password *
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 pl-3 pr-9 rounded-xl border border-slate-300 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminPassword(generatePassword(10, 'strong'));
                  setShowPass(true);
                }}
                className="h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1 shrink-0"
              >
                <Dices className="w-3.5 h-3.5 text-[#2563EB]" />
                Gen
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'Registering...' : 'Register Company & Generate Portals'}
        </button>
      </form>

      {/* Selected Company Full Details Card */}
      {selectedCompany && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-display font-extrabold text-[#0F172A]">
                  {selectedCompany.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    !selectedCompany.active
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                      : selectedCompany.planStatus === 'trial'
                        ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                  }`}
                >
                  {!selectedCompany.active
                    ? 'Suspended'
                    : selectedCompany.planStatus === 'trial'
                      ? '30-Day Free Trial (₹0)'
                      : `₹1,000 / Year Active · ${selectedCompany.planYears} Yr`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCompany.place} · {selectedCompany.phone || 'No phone'} · Valid:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {formatDateIN(selectedCompany.planStartDate)} →{' '}
                  {formatDateIN(selectedCompany.planEndDate)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInspectingCompanyId(selectedCompany.id)}
              className="min-h-[40px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              Open Company Admin View
            </button>
          </div>

          {/* Financial Snapshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-500">Total Work Rate</p>
              <p className="text-lg font-mono font-extrabold text-[#0F172A] tabular-nums mt-0.5">
                {formatINR(totalWorkRate)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/70 p-3.5">
              <p className="text-[11px] font-medium text-emerald-700">Customer Paid</p>
              <p className="text-lg font-mono font-extrabold text-emerald-800 tabular-nums mt-0.5">
                {formatINR(totalCustomerPaid)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50/60 border border-amber-200/70 p-3.5">
              <p className="text-[11px] font-medium text-amber-800">Customer Due</p>
              <p className="text-lg font-mono font-extrabold text-amber-900 tabular-nums mt-0.5">
                {formatINR(totalCustomerDue)}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50/60 border border-blue-200/70 p-3.5">
              <p className="text-[11px] font-medium text-[#1E3A8A]">Staff Salary Due</p>
              <p className="text-lg font-mono font-extrabold text-[#1E3A8A] tabular-nums mt-0.5">
                {formatINR(totalStaffSalaryDue)}
              </p>
            </div>
          </div>

          {/* Credentials & Direct Portal URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
              <p className="font-bold text-[#0F172A]">Admin Credentials</p>
              <p className="font-mono text-slate-700">
                Email: <strong>{selectedCompany.adminEmail}</strong>
              </p>
              <p className="font-mono text-slate-700">
                Password: <strong>{selectedCompany.adminPassword}</strong>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-[#1E3A8A] truncate">
                  Admin: {origin}/c/{selectedCompany.slug}/admin
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyUrl(`${origin}/c/${selectedCompany.slug}/admin`, 'Admin URL')
                  }
                  className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0 inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-emerald-700 truncate">
                  Staff: {origin}/c/{selectedCompany.slug}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyUrl(`${origin}/c/${selectedCompany.slug}`, 'Staff URL')
                  }
                  className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Quick Plan & Lifecycle Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void extendCompanyPlanYear(selectedCompany.id)}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              +1 വർഷം പ്ലാൻ കൂട്ടുക (+1 Year)
            </button>
            <button
              type="button"
              onClick={() => void setCompanyPlanStatus(selectedCompany.id, 'trial')}
              className="min-h-[38px] px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold"
            >
              30-Day Free Trial (₹0)
            </button>
            <button
              type="button"
              onClick={() => void setCompanyPlanStatus(selectedCompany.id, 'annual')}
              className="min-h-[38px] px-3.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              ₹1,000 / Year Active
            </button>
            <button
              type="button"
              onClick={() => handleShareCompanyWA(selectedCompany)}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Credentials
            </button>
            <button
              type="button"
              onClick={() => void toggleCompanyActive(selectedCompany.id)}
              className="min-h-[38px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
            >
              {selectedCompany.active ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" /> Suspend
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" /> Activate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(selectedCompany)}
              className="min-h-[38px] px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Company
            </button>
          </div>
        </div>
      )}

      {/* All Registered Companies Overview Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F172A]">
            All Registered Companies ({companies.length})
          </h3>
        </div>
        {companies.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No companies registered yet. Use the form above to create the first company workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold">Company &amp; Place</th>
                  <th className="text-left px-4 py-3 font-semibold">Phone &amp; Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Password</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan Duration (Start → End)</th>
                  <th className="text-left px-4 py-3 font-semibold">Status &amp; Rate</th>
                  <th className="text-right px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCompanyId(c.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedCompany?.id === c.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#0F172A]">{c.name}</p>
                      <p className="text-slate-500">{c.place}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <p className="text-slate-700">{c.phone || '—'}</p>
                      <p className="text-slate-500">{c.adminEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {c.adminPassword}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      <p className="font-semibold text-[#0F172A]">{c.planYears} Year(s)</p>
                      <p>
                        {formatDateIN(c.planStartDate)} → {formatDateIN(c.planEndDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          !c.active
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                            : c.planStatus === 'trial'
                              ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        }`}
                      >
                        {!c.active
                          ? 'Suspended'
                          : c.planStatus === 'trial'
                            ? 'Trial ₹0'
                            : '₹1,000 / Yr'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingCompanyId(c.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-[11px] font-bold"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white max-w-md w-full rounded-2xl border border-rose-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-rose-700">
              Permanently Delete {confirmDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This removes the company profile and all isolated staff, punch logs, advances,
              customers, works, and billing records permanently.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteCompany(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
