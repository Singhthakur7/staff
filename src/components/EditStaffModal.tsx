import React, { useEffect, useState } from 'react';
import { Dices, Edit3, Save, X } from 'lucide-react';
import { STAFF_ROLES, StaffMember } from '../types';
import { generatePassword } from '../utils/helpers';

interface EditStaffModalProps {
  staff: StaffMember | null;
  onClose: () => void;
  onSave: (staffId: string, updates: Partial<StaffMember>) => Promise<void>;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  staff,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState(STAFF_ROLES[0]);
  const [dutyWage, setDutyWage] = useState('1500');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!staff) return;
    setName(staff.name || '');
    setRole(staff.role || STAFF_ROLES[0]);
    setDutyWage(String(staff.dutyWage ?? 0));
    setPhone(staff.phone || '');
    setEmail(staff.email || '');
    setPassword(staff.password || '');
    setUpiId(staff.upiId || '');
    setPeriodFrom(staff.periodFrom || '');
    setPeriodTo(staff.periodTo || '');
    setActive(staff.active !== false);
    setError('');
  }, [staff]);

  if (!staff) return null;

  const roleOptions = STAFF_ROLES.includes(role) ? STAFF_ROLES : [role, ...STAFF_ROLES];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Full Name, Login Email, and Password are required.');
      return;
    }
    const parsedWage = Number(dutyWage);
    if (!Number.isFinite(parsedWage) || parsedWage < 0) {
      setError('Please enter a valid Salary / Duty Wage amount.');
      return;
    }

    setSaving(true);
    try {
      await onSave(staff.id, {
        name: name.trim(),
        role: role.trim() || STAFF_ROLES[0],
        dutyWage: Math.round(parsedWage),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        upiId: upiId.trim(),
        periodFrom,
        periodTo,
        active,
      });
      onClose();
    } catch {
      setError('Could not save staff changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#0B1120] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-sky-300 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-display font-bold truncate">
                Edit Staff Details — {staff.name}
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                Updates live in place without affecting attendance or payment history
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:bg-white/10 shrink-0"
            aria-label="Close edit staff modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Role / Designation *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-[#0F172A]"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Salary / Duty Wage (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={dutyWage}
                onChange={(e) => setDutyWage(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-blue-300 bg-blue-50/30 text-sm font-mono font-bold text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Phone / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Login Email / ID *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Google Pay / UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="staff@okicici"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Salary Period From
              </label>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Salary Period To / Due Date
              </label>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono text-[#0F172A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Login Password *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword(8, 'alphanumeric'))}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                >
                  <Dices className="w-4 h-4 text-[#2563EB]" />
                  Generate
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Account Active Status</p>
                  <p className="text-[11px] text-slate-500">
                    Disabled staff cannot log in, while all historical records remain preserved.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-5 h-5 accent-[#2563EB] rounded"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
