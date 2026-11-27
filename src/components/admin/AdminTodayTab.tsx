import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { AttendanceRecord, RateMode } from '../../types';
import { t } from '../../i18n';
import {
  buildMapsUrl,
  formatDateTimeShort,
  formatDurationHHMMSS,
  formatINR,
  getRateModeLabel,
  getTodayISO,
  isSalaryDueWithin2Days,
} from '../../utils/helpers';

export const AdminTodayTab: React.FC = () => {
  const {
    state,
    session,
    activeCompany,
    lang,
    openGPayModal,
    openWhatsAppModal,
    openLightbox,
    updateAttendance,
    sendInstruction,
    reviewExpense,
    reviewLeave,
    clearNotifications,
  } = useErp();

  // Live 1-second tick for shift duration timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Edit Attendance Modal state
  const [editingAtt, setEditingAtt] = useState<AttendanceRecord | null>(null);
  const [editStudio, setEditStudio] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRateMode, setEditRateMode] = useState<RateMode>('regular');

  // Send Live Instruction Modal state
  const [instTarget, setInstTarget] = useState<{ staffId: string; name: string; phone: string } | null>(null);
  const [instMessage, setInstMessage] = useState('');
  const [instPreset, setInstPreset] = useState<string | undefined>(undefined);

  const todayISO = getTodayISO();
  const activeStaffCount = state.staff.filter((s) => s.active).length;
  const workingToday = state.attendance.filter(
    (a) => a.status === 'working' || a.date === todayISO
  );
  const liveWorkingNow = state.attendance.filter((a) => a.status === 'working');

  // Compute each staff net payable balance
  const getStaffNetPayable = (staffId: string): number => {
    const earned = state.attendance
      .filter((a) => a.staffId === staffId)
      .reduce((sum, a) => sum + a.wageEarned, 0);
    const exp = state.expenses
      .filter((e) => e.staffId === staffId && e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    const paid = state.payments
      .filter((p) => p.staffId === staffId)
      .reduce((sum, p) => sum + p.amount, 0);
    return earned + exp - paid;
  };

  const totalSalaryPayable = state.staff.reduce(
    (sum, s) => sum + Math.max(0, getStaffNetPayable(s.id)),
    0
  );

  // Company Net P&L (All Time)
  const totalIncome =
    state.ledger.filter((l) => l.type === 'income').reduce((s, l) => s + l.amount, 0) +
    state.works.reduce((s, w) => s + w.billReceived, 0);
  const companyExpenses = state.ledger
    .filter((l) => l.type === 'expense')
    .reduce((s, l) => s + l.amount, 0);
  const approvedStaffExp = state.expenses
    .filter((e) => e.status === 'approved')
    .reduce((s, e) => s + e.amount, 0);
  const subContractCosts = state.works
    .filter((w) => w.hasSubContract)
    .reduce((s, w) => s + w.subContractTotal, 0);
  const staffSalaries = state.attendance.reduce((s, a) => s + a.wageEarned, 0);
  const netPnL =
    totalIncome - (companyExpenses + approvedStaffExp + subContractCosts + staffSalaries);

  // 2-Day Advance Salary Due alerts
  const dueStaffAlerts = state.staff
    .filter((s) => s.active)
    .map((s) => ({
      staff: s,
      ...isSalaryDueWithin2Days(s),
      netBalance: getStaffNetPayable(s.id),
    }))
    .filter((x) => x.isDue && x.netBalance > 0);

  const pendingExpenses = state.expenses.filter((e) => e.status === 'pending');
  const pendingLeaves = state.leaves.filter((l) => l.status === 'pending');

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingAtt(rec);
    setEditStudio(rec.studioName);
    setEditVenue(rec.venue);
    setEditFrom(rec.fromLocation);
    setEditTo(rec.toLocation);
    setEditNotes(rec.workNotes);
    setEditRateMode(rec.rateMode);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtt) return;
    updateAttendance(
      editingAtt.id,
      {
        studioName: editStudio,
        venue: editVenue,
        fromLocation: editFrom,
        toLocation: editTo,
        workNotes: editNotes,
        rateMode: editRateMode,
      },
      session?.name || 'Admin'
    );
    setEditingAtt(null);
  };

  const applyPreset = (tag: string, text: string) => {
    setInstPreset(tag);
    setInstMessage(text);
  };

  const handleSendInstruction = (alsoWhatsApp: boolean) => {
    if (!instTarget || !instMessage.trim()) return;
    sendInstruction(instTarget.staffId, instMessage.trim(), instPreset);
    if (alsoWhatsApp) {
      openWhatsAppModal({
        phone: instTarget.phone,
        recipientName: instTarget.name,
        message: `LIVE INSTRUCTION — ${(activeCompany?.name || 'COMPANY').toUpperCase()}\nHi ${instTarget.name},\n${instMessage.trim()}\n\nPlease acknowledge on the Staff Portal.`,
      });
    }
    setInstTarget(null);
    setInstMessage('');
    setInstPreset(undefined);
  };

  return (
    <div className="space-y-6">
      {/* 2-Day Advance Salary Due Alert Banners */}
      {dueStaffAlerts.length > 0 && (
        <div className="space-y-2.5">
          {dueStaffAlerts.map(({ staff, daysUntil, netBalance }) => (
            <div
              key={staff.id}
              className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0B1120]">
                    Salary Due Alert: {staff.name}{' '}
                    <span className="font-mono text-[#D97706]">
                      ({daysUntil === 0 ? 'Due Today' : `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`})
                    </span>
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Salary Day: {staff.salaryDay} · UPI: <span className="font-mono">{staff.upiId}</span> ·
                    Net Payable: <strong className="font-mono tabular-nums">{formatINR(netBalance)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  openGPayModal({
                    staffId: staff.id,
                    staffName: staff.name,
                    upiId: staff.upiId,
                    phone: staff.phone,
                    suggestedAmount: netBalance,
                    defaultNote: `Salary Settlement — ${staff.name}`,
                  })
                }
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <Wallet className="w-4 h-4 text-[#FBBF24]" />
                Pay GPay ({formatINR(netBalance)})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4 Executive Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t(lang, 'activeStaff')}</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {activeStaffCount}
            <span className="text-sm font-normal text-slate-400"> / {state.staff.length}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Broadcast crew active</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t(lang, 'workingToday')}</span>
            <Clock className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#059669] mt-2">
            {liveWorkingNow.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {workingToday.length} total shifts logged today
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t(lang, 'salaryPayable')}</span>
            <Wallet className="w-4 h-4 text-[#D97706]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {formatINR(totalSalaryPayable)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Net balance across crew</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t(lang, 'netProfitLoss')}</span>
            {netPnL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#059669]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
            )}
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-2 ${
              netPnL >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {formatINR(netPnL)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Cumulative operational P&amp;L</p>
        </div>
      </div>

      {/* Main Split: Live Working Crew (Left 8 cols) + Live Feed & Approvals (Right 4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Live Working Crew Cards */}
        <section className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0B1120]">
                Live Working Crew &amp; Today&apos;s Attendance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time ticking timers, route telemetry, selfie verification, and instant dispatch.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">{todayISO}</span>
          </div>

          {workingToday.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-[#0B1120]">No active shifts punched in yet today.</p>
              <p className="text-xs text-slate-500 mt-1">
                When staff punch in from the Crew Field Portal, their live card appears here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workingToday.map((att) => {
                const staffMember = state.staff.find((s) => s.id === att.staffId);
                const isLive = att.status === 'working';
                return (
                  <div
                    key={att.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {att.selfieUrl ? (
                            <button
                              type="button"
                              onClick={() => openLightbox(att.selfieUrl!)}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 hover:opacity-90 transition-opacity"
                              title="Click to zoom selfie"
                            >
                              <img
                                src={att.selfieUrl}
                                alt={`${att.staffName} selfie`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#0B1120] text-white font-bold text-sm flex items-center justify-center shrink-0">
                              {att.staffName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#0B1120] truncate">
                              {att.staffName}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              {staffMember?.role || 'Broadcast Crew'} · {getRateModeLabel(att.rateMode)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-mono font-extrabold tabular-nums ${
                              isLive ? 'text-[#059669]' : 'text-slate-600'
                            }`}
                          >
                            {formatDurationHHMMSS(att.punchInTime, att.punchOutTime)}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {isLive ? 'On Duty Live' : 'Completed'}
                          </p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#0B1120] truncate">
                            {att.studioName || activeCompany?.name || 'Direct Company Unit'}
                          </span>
                          {att.studioPhone && (
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`tel:+${att.studioPhone.replace(/[^0-9]/g, '')}`}
                                className="text-[#2563EB] hover:underline inline-flex items-center gap-1 font-mono"
                              >
                                <Phone className="w-3 h-3" />
                                Call
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  openWhatsAppModal({
                                    phone: att.studioPhone,
                                    recipientName: att.studioName,
                                    message: `Hello ${att.studioName}, checking in regarding ${att.staffName}'s shift at ${att.venue}.`,
                                  })
                                }
                                className="text-[#059669] hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WA
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-slate-600 flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                          <span className="truncate">
                            {att.fromLocation || 'Base'} → {att.toLocation || 'Venue'}
                          </span>
                        </p>

                        <p className="text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                          <span className="truncate">{att.venue || att.gpsLabel}</span>
                        </p>

                        {att.workNotes && (
                          <p className="text-slate-500 bg-[#F4F7FB] rounded-lg px-2.5 py-2 leading-relaxed">
                            {att.workNotes}
                          </p>
                        )}
                      </div>

                      {/* Wage + GPS Row */}
                      <div className="flex items-center justify-between gap-2 text-xs pt-1">
                        <span className="font-mono font-bold text-[#0B1120] tabular-nums">
                          Wage: {formatINR(att.wageEarned)}
                        </span>
                        <a
                          href={buildMapsUrl(att.gpsLat, att.gpsLng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2563EB] hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          GPS Map <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(att)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {t(lang, 'editAttendance')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInstTarget({
                            staffId: att.staffId,
                            name: att.staffName,
                            phone: staffMember?.phone || '',
                          })
                        }
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {t(lang, 'sendInstruction')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Expense & Leave Approvals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Pending Expenses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1120]">
                  Pending Expense Approvals ({pendingExpenses.length})
                </h3>
              </div>
              {pendingExpenses.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No pending staff expense claims.</p>
              ) : (
                <div className="space-y-3">
                  {pendingExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-xl bg-[#F4F7FB] border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#0B1120]">{exp.staffName}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{exp.title}</p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">{exp.date}</p>
                        </div>
                        <span className="text-sm font-mono font-extrabold text-[#0B1120] tabular-nums">
                          {formatINR(exp.amount)}
                        </span>
                      </div>
                      {exp.billPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => openLightbox(exp.billPhotoUrl!)}
                          className="text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          View Bill Photo
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => reviewExpense(exp.id, 'approved')}
                          className="min-h-[38px] rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t(lang, 'approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewExpense(exp.id, 'rejected')}
                          className="min-h-[38px] rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          {t(lang, 'reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Leaves */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1120]">
                  Pending Leave Requests ({pendingLeaves.length})
                </h3>
              </div>
              {pendingLeaves.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No pending leave applications.</p>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((lv) => (
                    <div
                      key={lv.id}
                      className="p-3.5 rounded-xl bg-[#F4F7FB] border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#0B1120]">
                            {lv.staffName} · {lv.leaveType} Leave
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{lv.reason}</p>
                        </div>
                        <span className="text-xs font-mono font-semibold text-[#D97706] flex items-center gap-1 shrink-0">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {lv.date}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => reviewLeave(lv.id, 'approved')}
                          className="min-h-[38px] rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t(lang, 'approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewLeave(lv.id, 'rejected')}
                          className="min-h-[38px] rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          {t(lang, 'reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Rail: Live Admin Notification Feed */}
        <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#0B1120]">
                Live Activity Feed ({state.notifications.length})
              </h2>
            </div>
            {state.notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="text-xs font-semibold text-slate-500 hover:text-[#DC2626] flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {state.notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No activity alerts yet. Staff logins, punch-ins, receipts, and payment
                confirmations stream here live.
              </div>
            ) : (
              state.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 ${
                    n.type === 'payment_confirmed'
                      ? 'bg-emerald-50/40'
                      : n.type === 'payment_issue'
                      ? 'bg-red-50/50'
                      : ''
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      n.type === 'payment_confirmed'
                        ? 'text-[#059669]'
                        : n.type === 'payment_issue'
                        ? 'text-[#DC2626]'
                        : n.type === 'punch_in'
                        ? 'text-[#2563EB]'
                        : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0B1120] leading-snug">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="font-mono text-slate-400">
                        {formatDateTimeShort(n.timestamp)}
                      </span>
                      {n.gpsLat && n.gpsLng && (
                        <a
                          href={buildMapsUrl(n.gpsLat, n.gpsLng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2563EB] hover:underline font-semibold"
                        >
                          GPS Pin
                        </a>
                      )}
                    </div>
                  </div>
                  {n.imageUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(n.imageUrl!)}
                      className="shrink-0"
                    >
                      <img
                        src={n.imageUrl}
                        alt="Notification visual"
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                      />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Edit Attendance Modal */}
      {editingAtt && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingAtt(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B1120]">
                  Edit Attendance — {editingAtt.staffName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{editingAtt.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAtt(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Duty / Rate Mode
                </label>
                <select
                  value={editRateMode}
                  onChange={(e) => setEditRateMode(e.target.value as RateMode)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="regular">Regular Full Day</option>
                  <option value="half">Half Day (50%)</option>
                  <option value="own_camera">With Own Camera (₹3,000)</option>
                  <option value="live_single_cam">Live Only Single Camera (₹6,000)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Studio Name
                  </label>
                  <input
                    type="text"
                    value={editStudio}
                    onChange={(e) => setEditStudio(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Event Venue
                  </label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    From Location
                  </label>
                  <input
                    type="text"
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    To Location
                  </label>
                  <input
                    type="text"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Work Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAtt(null)}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Live Instruction Modal */}
      {instTarget && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInstTarget(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B1120]">
                  Send Live Instruction — {instTarget.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Appears immediately on the crew member&apos;s Duty Portal banner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInstTarget(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Quick Presets</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        'Own Camera ₹3,000',
                        'Approved Own 4K Camera rate (₹3,000) for today’s shoot. Please carry extra batteries & clean SDI out.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#2563EB] text-xs font-semibold text-[#0B1120]"
                  >
                    Own Camera ₹3,000
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        'Live Single Cam ₹6,000',
                        'Confirmed Live Only Work - Single Camera (₹6,000). Verify dual SIM bonding speed before streaming.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#2563EB] text-xs font-semibold text-[#0B1120]"
                  >
                    Live Single Cam ₹6,000
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        'LED Check',
                        'LED Wall Pre-Show Check: Confirm Novastar brightness calibration, truss safety lock, and generator earthing.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#2563EB] text-xs font-semibold text-[#0B1120]"
                  >
                    LED Check
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Instruction Message
                </label>
                <textarea
                  rows={4}
                  value={instMessage}
                  onChange={(e) => setInstMessage(e.target.value)}
                  placeholder="Type urgent broadcast, equipment, or schedule instructions..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSendInstruction(false)}
                  disabled={!instMessage.trim()}
                  className="min-h-[46px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to Staff Portal
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInstruction(true)}
                  disabled={!instMessage.trim()}
                  className="min-h-[46px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Portal + WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
