import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { t } from '../../i18n';
import { computeStaffSlipData } from '../../utils/pdfSlip';
import {
  formatDateTimeShort,
  formatINR,
  getCurrentMonthYM,
  shiftMonthYM,
} from '../../utils/helpers';
import { SalarySlipPreview } from '../SalarySlipPreview';

type PresetId = '1m' | '2m' | '3m' | '6m' | '12m' | 'all';

export const StaffSalaryTab: React.FC = () => {
  const {
    state,
    session,
    activeCompany,
    lang,
    confirmPaymentReceived,
    reportPaymentIssue,
    openLightbox,
    openWhatsAppModal,
  } = useErp();

  const staffMember = state.staff.find((s) => s.id === session?.userId);
  const currentYM = getCurrentMonthYM();

  const [preset, setPreset] = useState<PresetId>('all');
  const [fromMonth, setFromMonth] = useState<string>('all');
  const [toMonth, setToMonth] = useState<string>('all');

  // Confirmation & Issue inline states keyed by payment ID
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [issueOpenId, setIssueOpenId] = useState<string | null>(null);
  const [issueText, setIssueText] = useState('');

  const applyPreset = (id: PresetId) => {
    setPreset(id);
    if (id === 'all') {
      setFromMonth('all');
      setToMonth('all');
      return;
    }
    const deltaMap: Record<Exclude<PresetId, 'all'>, number> = {
      '1m': 0,
      '2m': -1,
      '3m': -2,
      '6m': -5,
      '12m': -11,
    };
    setFromMonth(shiftMonthYM(currentYM, deltaMap[id]));
    setToMonth(currentYM);
  };

  const allTimeSlip = useMemo(
    () =>
      activeCompany && staffMember
        ? computeStaffSlipData(activeCompany, state, staffMember, 'all', 'all')
        : null,
    [activeCompany, state, staffMember]
  );

  const periodSlip = useMemo(
    () =>
      activeCompany && staffMember
        ? computeStaffSlipData(activeCompany, state, staffMember, fromMonth, toMonth)
        : null,
    [activeCompany, state, staffMember, fromMonth, toMonth]
  );

  if (!staffMember || !allTimeSlip || !periodSlip) return null;

  const myPayments = state.payments.filter((p) => p.staffId === staffMember.id);
  const pendingCount = myPayments.filter((p) => p.confirmationStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 4 Staff KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">{t(lang, 'baseDailyRate')}</p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {formatINR(staffMember.dailyWage)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">OwnCam ₹3k · Live ₹6k</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">{t(lang, 'totalEarned')}</p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-[#059669] mt-2">
            {formatINR(allTimeSlip.grossEarnings)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {allTimeSlip.attendanceRows.length} shifts + approved expenses
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">{t(lang, 'totalPaid')}</p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-[#2563EB] mt-2">
            {formatINR(allTimeSlip.totalPaid)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{myPayments.length} payout record(s)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">{t(lang, 'netBalance')}</p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {formatINR(allTimeSlip.netPayable)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Salary Day: {staffMember.salaryDay}</p>
        </div>
      </div>

      {/* NEW: Admin Payments Received & 1-Click Confirmation Inbox */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              Admin Payments Received &amp; 1-Click Confirmation Inbox
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify incoming Google Pay / Bank transfers to notify Admin immediately.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="text-xs font-bold text-[#D97706]">
              {pendingCount} Awaiting Your Confirmation
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {myPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No payouts sent by Admin yet. When Admin sends salary via Google Pay or Bank, it will
              appear here for your 1-click confirmation.
            </div>
          ) : (
            myPayments.map((p) => {
              const isPending = p.confirmationStatus === 'pending';
              const isConfirmed = p.confirmationStatus === 'confirmed';
              const isIssue = p.confirmationStatus === 'issue';

              return (
                <div
                  key={p.id}
                  className={`p-5 space-y-3.5 ${
                    isPending ? 'bg-amber-50/40' : isIssue ? 'bg-red-50/40' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-extrabold font-mono tabular-nums text-[#0B1120]">
                          {formatINR(p.amount)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 uppercase">
                          · {p.mode}
                        </span>
                        <span className="text-xs text-slate-500">
                          · {p.category === 'salary' ? 'Salary' : 'Advance'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Date: <span className="font-mono">{p.date}</span>
                        {p.utr ? (
                          <>
                            {' '}
                            · UTR: <span className="font-mono font-semibold">{p.utr}</span>
                          </>
                        ) : null}
                      </p>
                      {p.note && <p className="text-xs text-slate-700">{p.note}</p>}
                      {p.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => openLightbox(p.screenshotUrl!)}
                          className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 pt-0.5"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          View Admin GPay Screenshot
                        </button>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="shrink-0">
                      {isConfirmed ? (
                        <div className="text-left sm:text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669]">
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmed Received
                          </span>
                          {p.confirmedAt && (
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {formatDateTimeShort(p.confirmedAt)}
                            </p>
                          )}
                          {p.staffNote && (
                            <p className="text-xs text-slate-600 mt-0.5 italic">
                              &ldquo;{p.staffNote}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : isIssue ? (
                        <div className="text-left sm:text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
                            <AlertTriangle className="w-4 h-4" />
                            Issue Reported to Admin
                          </span>
                          {p.issueReason && (
                            <p className="text-xs text-[#DC2626] mt-0.5">{p.issueReason}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706]">
                          <Clock className="w-4 h-4" />
                          Awaiting Your Confirmation
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Confirmation Actions for Pending or Issue payments */}
                  {(isPending || isIssue) && (
                    <div className="space-y-3 pt-2 border-t border-slate-200/70">
                      <input
                        type="text"
                        value={notesById[p.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="Optional note (e.g. Received in SBI / GPay)"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                      />

                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => confirmPaymentReceived(p.id, notesById[p.id] || '')}
                          className="min-h-[46px] px-5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          ✅ पैसा मिल गया / Confirm Payment Received
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIssueOpenId(issueOpenId === p.id ? null : p.id);
                            setIssueText('');
                          }}
                          className="min-h-[46px] px-4 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-[#DC2626] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Report Issue
                        </button>
                      </div>

                      {issueOpenId === p.id && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <input
                            type="text"
                            value={issueText}
                            onChange={(e) => setIssueText(e.target.value)}
                            placeholder="Explain mismatch or not received yet..."
                            className="flex-1 h-11 px-3.5 rounded-xl border border-red-300 bg-white text-xs sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              reportPaymentIssue(p.id, issueText);
                              setIssueOpenId(null);
                              setIssueText('');
                            }}
                            className="min-h-[44px] px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold whitespace-nowrap"
                          >
                            Send Alert to Admin
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional WhatsApp Receipt Confirmation after confirming */}
                  {isConfirmed && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          openWhatsAppModal({
                            phone: activeCompany?.phone || '',
                            recipientName: `${activeCompany?.name || 'Company'} Admin`,
                            message: `Hi Sir, ${staffMember.name} here. Confirmed receiving ${formatINR(
                              p.amount
                            )} via ${p.mode.toUpperCase()}${p.utr ? ` (UTR: ${p.utr})` : ''}. Thank you!`,
                          })
                        }
                        className="text-xs font-semibold text-[#059669] hover:underline inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Send WhatsApp Receipt Confirmation to Admin
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Multi-Month Upgraded Corporate Salary Slip Viewer */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              My Corporate Multi-Month Salary Slip
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a preset duration or custom From/To month range, then download PDF or print.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                  preset === item.id
                    ? 'bg-[#0B1120] text-white border-[#0B1120]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:max-w-md gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">From Month</label>
              <input
                type="month"
                value={fromMonth === 'all' ? '' : fromMonth}
                onChange={(e) => {
                  setPreset('all');
                  setFromMonth(e.target.value || 'all');
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
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
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <SalarySlipPreview slip={periodSlip} />
      </section>
    </div>
  );
};
