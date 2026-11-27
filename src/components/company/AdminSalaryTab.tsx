import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Copy,
  Dices,
  Download,
  Edit3,
  Link2,
  MessageCircle,
  Plus,
  Power,
  Printer,
  QrCode,
  Save,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { PaymentMode, STAFF_ROLES, StaffMember } from '../../types';
import {
  addDaysISO,
  calculateStaffSummary,
  compressImageFileToBase64,
  formatDateIN,
  formatINR,
  generatePassword,
  generateStaffEmail,
  getCurrentTimeHHMM,
  getTodayISO,
  safeCopyText,
} from '../../utils/helpers';
import { downloadElementAsPdf, triggerDirectPrint } from '../../utils/pdfExport';
import { buildSharedSlipUrl, getSafeOrigin } from '../../utils/router';
import { FormalSalarySlipSheet } from '../DocumentPreviews';

export const AdminSalaryTab: React.FC = () => {
  const {
    activeCompany,
    activeDb,
    addStaff,
    updateStaff,
    toggleStaffActive,
    recordAdvanceOrSettlement,
    sendDueDateNotification,
    openGPayModal,
    openWhatsAppModal,
    pushToast,
  } = useStaffOnline();

  const today = getTodayISO();

  // Add/Edit Staff Form
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [stName, setStName] = useState('');
  const [stRole, setStRole] = useState(STAFF_ROLES[0]);
  const [stWage, setStWage] = useState('1500');
  const [stPhone, setStPhone] = useState('');
  const [stEmail, setStEmail] = useState('');
  const [stPassword, setStPassword] = useState(() => generatePassword(8, 'alphanumeric'));
  const [stUpi, setStUpi] = useState('');
  const [stPeriodFrom, setStPeriodFrom] = useState(today);
  const [stPeriodTo, setStPeriodTo] = useState(addDaysISO(today, 30));

  // Advance / GPay Auto-Sync Form
  const [payStaffId, setPayStaffId] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [payTime, setPayTime] = useState(() => getCurrentTimeHHMM());
  const [payDueDate, setPayDueDate] = useState(addDaysISO(today, 15));
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('gpay');
  const [payNote, setPayNote] = useState('');
  const [payScreenshot, setPayScreenshot] = useState<string | undefined>(undefined);

  // Formal Salary Slip Studio
  const [slipStaffId, setSlipStaffId] = useState('');
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const slipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!payStaffId && activeDb.staff[0]) setPayStaffId(activeDb.staff[0].id);
    if (!slipStaffId && activeDb.staff[0]) setSlipStaffId(activeDb.staff[0].id);
  }, [activeDb.staff, payStaffId, slipStaffId]);

  const selectedSlipStaff = activeDb.staff.find((s) => s.id === slipStaffId) || activeDb.staff[0] || null;
  const selectedPayStaff = activeDb.staff.find((s) => s.id === payStaffId) || null;

  const handleStaffNameChange = (val: string) => {
    setStName(val);
    if (!editingStaffId && activeCompany) {
      setStEmail(val.trim() ? generateStaffEmail(val, activeCompany.slug) : '');
      if (!stUpi && val.trim()) {
        const compact = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'staff';
        setStUpi(`${compact}@okicici`);
      }
    }
  };

  const resetStaffForm = () => {
    setEditingStaffId(null);
    setStName('');
    setStRole(STAFF_ROLES[0]);
    setStWage('1500');
    setStPhone('');
    setStEmail('');
    setStPassword(generatePassword(8, 'alphanumeric'));
    setStUpi('');
    setStPeriodFrom(today);
    setStPeriodTo(addDaysISO(today, 30));
  };

  const loadStaffForEdit = (s: StaffMember) => {
    setEditingStaffId(s.id);
    setStName(s.name);
    setStRole(s.role);
    setStWage(String(s.dutyWage));
    setStPhone(s.phone);
    setStEmail(s.email);
    setStPassword(s.password);
    setStUpi(s.upiId);
    setStPeriodFrom(s.periodFrom);
    setStPeriodTo(s.periodTo);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || !stEmail.trim() || !stPassword.trim()) {
      pushToast({ type: 'error', title: 'Staff Name, Email, and Password are required' });
      return;
    }
    const payload = {
      name: stName.trim(),
      role: stRole,
      dutyWage: Math.max(100, Number(stWage) || 1000),
      phone: stPhone.trim(),
      email: stEmail.trim().toLowerCase(),
      password: stPassword.trim(),
      upiId: stUpi.trim(),
      periodFrom: stPeriodFrom,
      periodTo: stPeriodTo,
    };

    if (editingStaffId) {
      await updateStaff(editingStaffId, payload);
    } else {
      const created = await addStaff(payload);
      if (created) {
        setPayStaffId(created.id);
        setSlipStaffId(created.id);
      }
    }
    resetStaffForm();
  };

  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payStaffId || !amt || amt <= 0) {
      pushToast({ type: 'error', title: 'Select a staff member and enter a valid amount' });
      return;
    }
    await recordAdvanceOrSettlement({
      staffId: payStaffId,
      amount: amt,
      date: payDate,
      time: payTime,
      dueDate: payDueDate,
      mode: payMode,
      kind: 'advance',
      note: payNote.trim() || 'Salary Advance',
      screenshotUrl: payScreenshot,
    });
    setPayAmount('');
    setPayNote('');
    setPayScreenshot(undefined);
    setPayTime(getCurrentTimeHHMM());
  };

  const handleOpenGPaySettlement = () => {
    if (!selectedPayStaff) {
      pushToast({ type: 'error', title: 'Select a staff member first' });
      return;
    }
    const summary = calculateStaffSummary(selectedPayStaff, activeDb);
    const amount = Number(payAmount) > 0 ? Number(payAmount) : Math.max(0, summary.netBalancePayable);
    if (amount <= 0) {
      pushToast({
        type: 'warning',
        title: 'Enter a settlement amount (or balance is already ₹0)',
      });
      return;
    }
    if (!selectedPayStaff.upiId.trim()) {
      pushToast({
        type: 'error',
        title: 'Please add a Google Pay / UPI ID for this staff member first',
      });
      return;
    }
    openGPayModal({
      staffId: selectedPayStaff.id,
      staffName: selectedPayStaff.name,
      upiId: selectedPayStaff.upiId,
      amount,
      date: payDate,
      time: payTime,
      dueDate: payDueDate || selectedPayStaff.periodTo,
      note: payNote.trim() || `Salary Settlement - ${selectedPayStaff.name}`,
      screenshotUrl: payScreenshot,
    });
  };

  const handleDownloadSlipPdf = async () => {
    if (!selectedSlipStaff) return;
    setExportingPdf(true);
    const ok = await downloadElementAsPdf(
      slipRef.current,
      `Salary-Slip-${selectedSlipStaff.name.replace(/\s+/g, '-')}.pdf`
    );
    setExportingPdf(false);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Salary Slip PDF downloaded' : 'PDF export failed',
    });
  };

  const handleCopySlipLink = async () => {
    if (!activeCompany || !selectedSlipStaff) return;
    const url = buildSharedSlipUrl({
      companyId: activeCompany.id,
      staffId: selectedSlipStaff.id,
      fromMonth: fromMonth || undefined,
      toMonth: toMonth || undefined,
    });
    const ok = await safeCopyText(url);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Direct Salary Slip link copied' : 'Copy failed',
    });
  };

  const handleShareSlipWA = () => {
    if (!activeCompany || !selectedSlipStaff) return;
    const summary = calculateStaffSummary(
      selectedSlipStaff,
      activeDb,
      fromMonth || undefined,
      toMonth || undefined
    );
    const slipUrl = buildSharedSlipUrl({
      companyId: activeCompany.id,
      staffId: selectedSlipStaff.id,
      fromMonth: fromMonth || undefined,
      toMonth: toMonth || undefined,
    });
    openWhatsAppModal({
      phone: selectedSlipStaff.phone,
      recipientName: selectedSlipStaff.name,
      message: [
        `*${activeCompany.name}* — Official Salary Statement`,
        `Staff: ${selectedSlipStaff.name} (${selectedSlipStaff.role})`,
        `Earned Wages: ${formatINR(summary.earnedDutyWages)}`,
        `Approved Expenses: ${formatINR(summary.approvedExpenses)}`,
        `Advances Deducted: -${formatINR(summary.advancesTaken)}`,
        `GPay / Settled Paid: -${formatINR(summary.settledPaid)}`,
        `*Net Balance Payable: ${formatINR(summary.netBalancePayable)}*`,
        ``,
        `View / Download Official Slip: ${slipUrl}`,
      ].join('\n'),
    });
  };

  const handleSendStaffCredentialsWA = (s: StaffMember) => {
    if (!activeCompany) return;
    const staffUrl = `${getSafeOrigin()}/c/${activeCompany.slug}`;
    openWhatsAppModal({
      phone: s.phone,
      recipientName: s.name,
      message: [
        `Welcome to *${activeCompany.name}* on Staff. Online!`,
        ``,
        `Staff Portal: ${staffUrl}`,
        `Name: ${s.name} (${s.role})`,
        `Email: ${s.email}`,
        `Password: ${s.password}`,
        `Duty Wage: ${formatINR(s.dutyWage)} · GPay UPI: ${s.upiId || '—'}`,
        ``,
        `Open the link, capture a live front-camera selfie, and log in to punch duties & view salary slips.`,
      ].join('\n'),
    });
  };

  if (!activeCompany) return null;

  return (
    <div className="space-y-6">
      {/* Row 1: Add/Edit Staff Form + Advance & Google Pay Auto-Sync Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">
        {/* Add Staff Form */}
        <form
          onSubmit={handleSaveStaff}
          className="xl:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-display font-bold text-[#0F172A]">
                {editingStaffId ? 'Edit Staff Profile' : 'Add Staff Account'}
              </h2>
              <p className="text-xs text-slate-500">
                Auto-generates Staff Email, Password, and Salary Period.
              </p>
            </div>
            {editingStaffId && (
              <button
                type="button"
                onClick={resetStaffForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Name *</label>
              <input
                type="text"
                required
                value={stName}
                onChange={(e) => handleStaffNameChange(e.target.value)}
                placeholder="e.g. Arun Kumar"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
              <select
                value={stRole}
                onChange={(e) => setStRole(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
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
                Duty Wage (₹) *
              </label>
              <input
                type="number"
                required
                min={100}
                value={stWage}
                onChange={(e) => setStWage(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Phone / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={stPhone}
                onChange={(e) => setStPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Staff Email (Auto) *
              </label>
              <input
                type="email"
                required
                value={stEmail}
                onChange={(e) => setStEmail(e.target.value)}
                placeholder="name@company.staff.online"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Google Pay / UPI ID
              </label>
              <input
                type="text"
                value={stUpi}
                onChange={(e) => setStUpi(e.target.value)}
                placeholder="staff@okicici"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Period From (എത്ര ദിവസം മുതൽ)
              </label>
              <input
                type="date"
                value={stPeriodFrom}
                onChange={(e) => setStPeriodFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Period To / Due Date (എത്ര ദിവസം വരെ)
              </label>
              <input
                type="date"
                value={stPeriodTo}
                onChange={(e) => setStPeriodTo(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Staff Login Password *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={stPassword}
                  onChange={(e) => setStPassword(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setStPassword(generatePassword(8, 'alphanumeric'))}
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1"
                >
                  <Dices className="w-3.5 h-3.5 text-[#2563EB]" />
                  Gen
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            {editingStaffId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {editingStaffId ? 'Update Staff Account' : 'Add Staff Account'}
          </button>
        </form>

        {/* Advance & Google Pay Auto-Sync Card */}
        <form
          onSubmit={handleRecordAdvance}
          className="xl:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              Advance Auto-Deduction &amp; Google Pay Settlement
            </h2>
            <p className="text-xs text-slate-500">
              Auto-deducts from Gross Payable and pushes instant confirmation alert to Staff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Staff *
              </label>
              <select
                value={payStaffId}
                onChange={(e) => {
                  setPayStaffId(e.target.value);
                  const found = activeDb.staff.find((s) => s.id === e.target.value);
                  if (found?.periodTo) setPayDueDate(found.periodTo);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
              >
                {activeDb.staff.length === 0 ? (
                  <option value="">Add a staff member first</option>
                ) : (
                  activeDb.staff.map((s) => {
                    const sum = calculateStaffSummary(s, activeDb);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} — Net Balance: {formatINR(sum.netBalancePayable)}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Payment Date (എന്ന് കൊടുത്തു)
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Payment Time (എപ്പോൾ കൊടുത്തു)
              </label>
              <input
                type="time"
                value={payTime}
                onChange={(e) => setPayTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Due Date (എത്ര ദിവസം വരെ)
              </label>
              <input
                type="date"
                value={payDueDate}
                onChange={(e) => setPayDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Amount Paid (എത്ര രൂപ കൊടുത്തു ₹) *
              </label>
              <input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mode</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
              >
                <option value="gpay">Google Pay UPI</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                GPay Screenshot (Optional)
              </label>
              <label className="w-full h-10 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#2563EB] bg-slate-50 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{payScreenshot ? 'Attached ✓' : 'Attach Proof'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setPayScreenshot(await compressImageFileToBase64(f, 720));
                    } catch {
                      pushToast({ type: 'error', title: 'Could not read image' });
                    }
                  }}
                />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Note / Ref</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. Site advance / Monthly settlement"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="submit"
              disabled={!payStaffId}
              className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + അഡ്വാൻസ് / പേയ്മെന്റ് ചേർക്കുക
            </button>
            <button
              type="button"
              disabled={!payStaffId}
              onClick={handleOpenGPaySettlement}
              className="min-h-[44px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              💳 Google Pay Settlement (Auto-Sync)
            </button>
          </div>

          <button
            type="button"
            disabled={!payStaffId}
            onClick={() => void sendDueDateNotification(payStaffId)}
            className="w-full min-h-[40px] px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
            🔔 Send Due Date / Balance Notification
          </button>
        </form>
      </div>

      {/* Row 2: Split-Screen Official Formal Salary & Advance Statement Slip Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-4 no-print">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              ഔദ്യോഗിക സാലറി &amp; അഡ്വാൻസ് സ്ലിപ്പ്
            </h2>
            <p className="text-xs text-slate-500">
              Select staff and optional month filter to preview, export PDF, or print.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Member</label>
              <select
                value={slipStaffId}
                onChange={(e) => setSlipStaffId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
              >
                {activeDb.staff.length === 0 ? (
                  <option value="">No staff available</option>
                ) : (
                  activeDb.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  From Month
                </label>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">To Month</label>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
            {(fromMonth || toMonth) && (
              <button
                type="button"
                onClick={() => {
                  setFromMonth('');
                  setToMonth('');
                }}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Reset to Full Period
              </button>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={!selectedSlipStaff || exportingPdf}
              onClick={() => void handleDownloadSlipPdf()}
              className="w-full min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportingPdf ? 'Generating PDF...' : 'PDF Download (.pdf)'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!selectedSlipStaff}
                onClick={triggerDirectPrint}
                className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Direct Print
              </button>
              <button
                type="button"
                disabled={activeDb.staff.length === 0}
                onClick={() => setBulkPrintOpen(true)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#2563EB]" />
                Bulk Print All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!selectedSlipStaff}
                onClick={() => void handleCopySlipLink()}
                className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-[#2563EB]" />
                Copy Slip Link
              </button>
              <button
                type="button"
                disabled={!selectedSlipStaff}
                onClick={handleShareSlipWA}
                className="min-h-[40px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Right Live A4 Paper Sheet Preview */}
        <div className="lg:col-span-8 print-only-container">
          {selectedSlipStaff ? (
            <FormalSalarySlipSheet
              company={activeCompany}
              staff={selectedSlipStaff}
              db={activeDb}
              fromMonth={fromMonth || undefined}
              toMonth={toMonth || undefined}
              sheetRef={slipRef}
            />
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-sm text-slate-500 card-elevated">
              Add your first staff member above to preview their Official Formal Salary &amp;
              Advance Statement Slip.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Company Staff Salary & Due Date Roster */}
      <div className="bg-white border border-slate-200/80 rounded-2xl card-elevated overflow-hidden no-print">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-[#0F172A]">
            Company Staff Salary &amp; Due Date Roster ({activeDb.staff.length})
          </h3>
        </div>
        {activeDb.staff.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No crew accounts registered yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeDb.staff.map((s) => {
              const sum = calculateStaffSummary(s, activeDb);
              return (
                <div
                  key={s.id}
                  className={`p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    !s.active ? 'bg-rose-50/30' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#0F172A]">{s.name}</p>
                      <span className="text-xs text-slate-500">· {s.role}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sum.dueBadge.className}`}
                      >
                        {sum.dueBadge.label}
                      </span>
                      {!s.active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-600 break-all">
                      {s.email} · Pass: <strong>{s.password}</strong> · UPI: {s.upiId || '—'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Wage: {formatINR(s.dutyWage)}/duty · Period: {formatDateIN(s.periodFrom)} →{' '}
                      {formatDateIN(s.periodTo)} · Net Balance:{' '}
                      <strong className="text-[#1E3A8A]">{formatINR(sum.netBalancePayable)}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSlipStaffId(s.id);
                        setPayStaffId(s.id);
                      }}
                      className="min-h-[36px] px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] text-xs font-bold"
                    >
                      View Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => loadStaffForEdit(s)}
                      className="min-h-[36px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await safeCopyText(
                          `Staff Portal: ${getSafeOrigin()}/c/${activeCompany.slug}\nEmail: ${s.email}\nPassword: ${s.password}`
                        );
                        pushToast({
                          type: ok ? 'success' : 'error',
                          title: ok ? 'Staff credentials copied' : 'Copy failed',
                        });
                      }}
                      className="min-h-[36px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendStaffCredentialsWA(s)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleStaffActive(s.id)}
                      className={`min-h-[36px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 border ${
                        s.active
                          ? 'border-rose-200 bg-white hover:bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {s.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Print Modal */}
      {bulkPrintOpen && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setBulkPrintOpen(false)}
        >
          <div
            className="bg-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between no-print">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Bulk Print All Staff Salary Slips ({activeDb.staff.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerDirectPrint}
                  className="min-h-[38px] px-4 rounded-xl bg-[#2563EB] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print All Slips
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPrintOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto space-y-6 print-only-container">
              {activeDb.staff.map((st, idx) => (
                <div
                  key={st.id}
                  className={idx < activeDb.staff.length - 1 ? 'print-page-break' : ''}
                >
                  <FormalSalarySlipSheet
                    company={activeCompany}
                    staff={st}
                    db={activeDb}
                    fromMonth={fromMonth || undefined}
                    toMonth={toMonth || undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
