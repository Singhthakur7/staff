import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Image as ImageIcon,
  Printer,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { AttendanceRecord, RateMode } from '../../types';
import {
  computeStaffSlipData,
  downloadCorporateSalarySlipPdf,
  printSalarySlipsHTML,
} from '../../utils/pdfSlip';
import {
  formatDateTimeShort,
  formatINR,
  getCurrentMonthYM,
  getRateModeLabel,
  shiftMonthYM,
} from '../../utils/helpers';
import { SalarySlipPreview } from '../SalarySlipPreview';

type PresetId = '1m' | '2m' | '3m' | '6m' | '12m' | 'all';

export const AdminPayrollTab: React.FC = () => {
  const {
    state,
    session,
    activeCompany,
    openGPayModal,
    openLightbox,
    updateAttendance,
    pushToast,
  } = useErp();

  const currentYM = getCurrentMonthYM();
  const [selectedStaffId, setSelectedStaffId] = useState(state.staff[0]?.id || '');
  useEffect(() => {
    if ((!selectedStaffId || !state.staff.some((s) => s.id === selectedStaffId)) && state.staff[0]) {
      setSelectedStaffId(state.staff[0].id);
    }
  }, [selectedStaffId, state.staff]);
  const [preset, setPreset] = useState<PresetId>('all');
  const [fromMonth, setFromMonth] = useState<string>('all');
  const [toMonth, setToMonth] = useState<string>('all');

  // Inline Timesheet Edit Modal
  const [editingRow, setEditingRow] = useState<AttendanceRecord | null>(null);
  const [editRateMode, setEditRateMode] = useState<RateMode>('regular');
  const [editStudio, setEditStudio] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editFromLoc, setEditFromLoc] = useState('');
  const [editToLoc, setEditToLoc] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const applyPreset = (id: PresetId) => {
    setPreset(id);
    if (id === 'all') {
      setFromMonth('all');
      setToMonth('all');
      return;
    }
    const monthsMap: Record<Exclude<PresetId, 'all'>, number> = {
      '1m': 0,
      '2m': -1,
      '3m': -2,
      '6m': -5,
      '12m': -11,
    };
    setFromMonth(shiftMonthYM(currentYM, monthsMap[id]));
    setToMonth(currentYM);
  };

  // Summary per staff (All-time cumulative)
  const staffSummaries = useMemo(() => {
    if (!activeCompany) return [];
    return state.staff.map((member) => {
      const slipAll = computeStaffSlipData(activeCompany, state, member, 'all', 'all');
      return { member, slipAll };
    });
  }, [activeCompany, state]);

  const selectedStaff =
    state.staff.find((s) => s.id === selectedStaffId) || state.staff[0];

  const activeSlip = useMemo(
    () =>
      activeCompany && selectedStaff
        ? computeStaffSlipData(activeCompany, state, selectedStaff, fromMonth, toMonth)
        : null,
    [activeCompany, state, selectedStaff, fromMonth, toMonth]
  );

  const allStaffSlipsForPeriod = useMemo(() => {
    if (!activeCompany) return [];
    return state.staff.map((s) => computeStaffSlipData(activeCompany, state, s, fromMonth, toMonth));
  }, [activeCompany, state, fromMonth, toMonth]);

  const openEditRow = (row: AttendanceRecord) => {
    setEditingRow(row);
    setEditRateMode(row.rateMode);
    setEditStudio(row.studioName);
    setEditVenue(row.venue);
    setEditFromLoc(row.fromLocation);
    setEditToLoc(row.toLocation);
    setEditNotes(row.workNotes);
  };

  const handleSaveRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    updateAttendance(
      editingRow.id,
      {
        rateMode: editRateMode,
        studioName: editStudio,
        venue: editVenue,
        fromLocation: editFromLoc,
        toLocation: editToLoc,
        workNotes: editNotes,
      },
      session?.name || 'Admin'
    );
    setEditingRow(null);
  };

  return (
    <div className="space-y-8">
      {/* 1. Staff Payroll Summary Cards */}
      <section className="space-y-3.5">
        <div>
          <h2 className="text-base font-bold text-[#0B1120]">
            Crew Payroll Balances &amp; Instant Google Pay Payout
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Own Camera ₹3,000 · Live Single Cam ₹6,000 · Click Pay via Google Pay for Desktop QR or Mobile One-Tap Launch.
          </p>
        </div>

        {staffSummaries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No staff accounts registered yet. Create staff accounts in the Staff Accounts tab to begin payroll tracking.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {staffSummaries.map(({ member, slipAll }) => (
            <div
              key={member.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0B1120] truncate">{member.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{member.role}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-600 whitespace-nowrap">
                    {formatINR(member.dailyWage)}/d
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-mono truncate">
                  UPI: {member.upiId} · OwnCam ₹3k · Live ₹6k
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#F4F7FB] rounded-xl p-2.5 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500">Shifts</p>
                    <p className="text-xs font-mono font-bold text-[#0B1120] tabular-nums">
                      {slipAll.attendanceRows.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Earned</p>
                    <p className="text-xs font-mono font-bold text-[#059669] tabular-nums">
                      {formatINR(slipAll.grossEarnings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Paid</p>
                    <p className="text-xs font-mono font-bold text-[#2563EB] tabular-nums">
                      {formatINR(slipAll.totalPaid)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-slate-600">Net Balance</span>
                  <span
                    className={`text-base font-mono font-extrabold tabular-nums ${
                      slipAll.netPayable > 0 ? 'text-[#0B1120]' : 'text-[#059669]'
                    }`}
                  >
                    {formatINR(slipAll.netPayable)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    openGPayModal({
                      staffId: member.id,
                      staffName: member.name,
                      upiId: member.upiId,
                      phone: member.phone,
                      suggestedAmount: Math.max(member.dailyWage, slipAll.netPayable),
                      defaultNote: `Salary Payout — ${member.name}`,
                    })
                  }
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Pay via Google Pay
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadCorporateSalarySlipPdf(slipAll);
                      pushToast({ type: 'success', title: `Downloaded PDF for ${member.name}` });
                    }}
                    className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => printSalarySlipsHTML([slipAll])}
                    className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* 2. 2-Way Payment Confirmation Tracking History */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0B1120]">
              2-Way Payment Confirmation Ledger ({state.payments.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time staff receipt acknowledgements and flagged payment alerts.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Date &amp; Staff</th>
                <th className="py-3 px-4 font-semibold">Mode / UTR</th>
                <th className="py-3 px-4 font-semibold">Category &amp; Note</th>
                <th className="py-3 px-4 font-semibold">Confirmation Status</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No salary payments recorded yet.
                  </td>
                </tr>
              ) : (
                state.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-[#0B1120]">{p.staffName}</p>
                      <p className="text-[11px] font-mono text-slate-500">{p.date}</p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-800 uppercase">{p.mode}</p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {p.utr ? `UTR: ${p.utr}` : p.upiIdUsed}
                      </p>
                      {p.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => openLightbox(p.screenshotUrl!)}
                          className="text-[11px] font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <ImageIcon className="w-3 h-3" />
                          View Proof
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800">
                        {p.category === 'salary' ? 'Salary Payment' : 'Advance / Petty Cash'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{p.note}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.confirmationStatus === 'confirmed' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Confirmed Received by Staff
                          </span>
                          {p.confirmedAt && (
                            <p className="text-[11px] font-mono text-slate-500">
                              {formatDateTimeShort(p.confirmedAt)}
                            </p>
                          )}
                          {p.staffNote && (
                            <p className="text-[11px] text-slate-600 italic">&ldquo;{p.staffNote}&rdquo;</p>
                          )}
                        </div>
                      ) : p.confirmationStatus === 'issue' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Issue Reported by Staff
                          </span>
                          {p.issueReason && (
                            <p className="text-[11px] text-[#DC2626]">{p.issueReason}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706]">
                          <Clock className="w-4 h-4 shrink-0" />
                          Awaiting Staff Confirmation
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#0B1120] tabular-nums whitespace-nowrap">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Split-Screen Executive Corporate Salary Slip Studio */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0B1120]">
            Split-Screen Corporate Salary Slip Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure employee &amp; multi-month period on the left; preview, download PDF, or bulk print A4 slips on the right.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel (Left 4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 lg:sticky lg:top-20">
            <div>
              <label className="block text-xs font-bold text-[#0B1120] mb-1.5">
                Select Staff Member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
              >
                {state.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1120] mb-2">
                Duration Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '1m', label: '1 Month' },
                    { id: '2m', label: '2 Months' },
                    { id: '3m', label: '3 Months' },
                    { id: '6m', label: '6 Months' },
                    { id: '12m', label: '12 Months' },
                    { id: 'all', label: 'All Records' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyPreset(item.id)}
                    className={`min-h-[38px] px-2 rounded-xl text-xs font-bold border transition-colors ${
                      preset === item.id
                        ? 'bg-[#0B1120] text-white border-[#0B1120]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  From Month
                </label>
                <input
                  type="month"
                  value={fromMonth === 'all' ? '' : fromMonth}
                  onChange={(e) => {
                    setPreset('all');
                    setFromMonth(e.target.value || 'all');
                  }}
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">To Month</label>
                <input
                  type="month"
                  value={toMonth === 'all' ? '' : toMonth}
                  onChange={(e) => {
                    setPreset('all');
                    setToMonth(e.target.value || 'all');
                  }}
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            {activeSlip && (
              <div className="bg-[#F4F7FB] border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shifts in Range</span>
                  <strong className="font-mono">{activeSlip.attendanceRows.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Earnings</span>
                  <strong className="font-mono text-[#059669]">
                    {formatINR(activeSlip.grossEarnings)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid / Advance</span>
                  <strong className="font-mono text-[#2563EB]">
                    {formatINR(activeSlip.totalPaid)}
                  </strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-[#0B1120]">Net Payable</span>
                  <strong className="font-mono text-[#0B1120]">
                    {formatINR(activeSlip.netPayable)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Live A4 Corporate Slip Preview (Right 8 cols on desktop) */}
          <div className="lg:col-span-8">
            {activeSlip ? (
              <SalarySlipPreview
                slip={activeSlip}
                allSlipsForBulkPrint={allStaffSlipsForPeriod}
                showBulkPrint
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
                Add at least one staff member to generate live A4 Corporate Salary Slips.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Editable Timesheet & Travel Log */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-[#0B1120]">
            Complete Editable Timesheet &amp; Travel Log ({state.attendance.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Date &amp; Staff</th>
                <th className="py-3 px-4 font-semibold">Studio / Venue</th>
                <th className="py-3 px-4 font-semibold">Travel Route</th>
                <th className="py-3 px-4 font-semibold">Rate Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Wage</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.attendance.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <p className="font-bold text-[#0B1120]">{row.staffName}</p>
                    <p className="text-[11px] font-mono text-slate-500">{row.date}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{row.studioName || '-'}</p>
                    <p className="text-[11px] text-slate-500">{row.venue || '-'}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {row.fromLocation || '-'} → {row.toLocation || '-'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                    {getRateModeLabel(row.rateMode)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#0B1120] tabular-nums whitespace-nowrap">
                    {formatINR(row.wageEarned)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditRow(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Timesheet Modal */}
      {editingRow && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingRow(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B1120]">
                  Edit Shift — {editingRow.staffName}
                </h3>
                <p className="text-xs font-mono text-slate-500">{editingRow.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRow} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rate Mode</label>
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
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editStudio}
                  onChange={(e) => setEditStudio(e.target.value)}
                  placeholder="Studio Name"
                  className="h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="Venue"
                  className="h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={editFromLoc}
                  onChange={(e) => setEditFromLoc(e.target.value)}
                  placeholder="From Location"
                  className="h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={editToLoc}
                  onChange={(e) => setEditToLoc(e.target.value)}
                  placeholder="To Location"
                  className="h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Work notes..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                >
                  Update Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
