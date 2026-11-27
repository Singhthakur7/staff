import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Link2,
  MessageCircle,
  Printer,
} from 'lucide-react';
import {
  StaffSlipData,
  downloadCorporateSalarySlipPdf,
  printSalarySlipsHTML,
} from '../utils/pdfSlip';
import {
  buildSlipShareUrl,
  formatDateTimeShort,
  formatINR,
  getRateModeLabel,
  numberToIndianWords,
  safeCopyText,
} from '../utils/helpers';
import { useErp } from '../context/ErpContext';

interface SalarySlipPreviewProps {
  slip: StaffSlipData;
  allSlipsForBulkPrint?: StaffSlipData[];
  showBulkPrint?: boolean;
  compactActions?: boolean;
}

export const SalarySlipPreview: React.FC<SalarySlipPreviewProps> = ({
  slip,
  allSlipsForBulkPrint,
  showBulkPrint = false,
  compactActions = false,
}) => {
  const { pushToast, openWhatsAppModal } = useErp();

  const handleDownloadPdf = () => {
    try {
      downloadCorporateSalarySlipPdf(slip);
      pushToast({
        type: 'success',
        title: 'PDF Salary Slip Downloaded',
        description: `${slip.staff.name} (${slip.periodLabel})`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'PDF generation failed',
        description: 'Please try Direct Print as an alternative.',
      });
    }
  };

  const handleDirectPrint = () => {
    const ok = printSalarySlipsHTML([slip]);
    if (!ok) {
      pushToast({ type: 'error', title: 'Print dialog blocked by browser' });
    }
  };

  const handleBulkPrint = () => {
    if (!allSlipsForBulkPrint || allSlipsForBulkPrint.length === 0) return;
    const ok = printSalarySlipsHTML(allSlipsForBulkPrint);
    if (ok) {
      pushToast({
        type: 'info',
        title: `Preparing ${allSlipsForBulkPrint.length} Staff Slips for A4 Print`,
      });
    }
  };

  const handleCopyLink = async () => {
    const url = buildSlipShareUrl(slip.company.id, slip.staff.id, slip.fromMonth, slip.toMonth);
    const ok = await safeCopyText(url);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Direct Slip Link Copied' : 'Could not copy link',
      description: ok
        ? 'Anyone with this link can view, download PDF, or print this live slip.'
        : undefined,
    });
  };

  const handleShareWhatsApp = () => {
    const url = buildSlipShareUrl(slip.company.id, slip.staff.id, slip.fromMonth, slip.toMonth);
    const msg = [
      `*${slip.company.name}*`,
      `Corporate Salary Slip · Ref: ${slip.slipRefNo}`,
      `Staff: *${slip.staff.name}* (${slip.staff.role})`,
      `Period: ${slip.periodLabel}`,
      `Shifts Worked: ${slip.attendanceRows.length}`,
      `Gross Earnings: ${formatINR(slip.grossEarnings)}`,
      `Total Paid / Advance: ${formatINR(slip.totalPaid)}`,
      `*Net Payable Balance: ${formatINR(slip.netPayable)}*`,
      `Status: ${slip.verificationStatus}`,
      ``,
      `View / Download PDF Slip:`,
      url,
    ].join('\n');

    openWhatsAppModal({
      phone: slip.staff.phone,
      recipientName: slip.staff.name,
      message: msg,
    });
  };

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center gap-2 no-print ${
          compactActions ? '' : 'bg-white border border-slate-200 rounded-2xl p-3'
        }`}
      >
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Download PDF (.pdf)
        </button>

        <button
          type="button"
          onClick={handleDirectPrint}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          Direct Print Slip
        </button>

        {showBulkPrint && allSlipsForBulkPrint && allSlipsForBulkPrint.length > 0 && (
          <button
            type="button"
            onClick={handleBulkPrint}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0B1120] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-[#D97706]" />
            Print All {allSlipsForBulkPrint.length} Staff Slips
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyLink}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Link2 className="w-3.5 h-3.5" />
          Copy Direct Slip Link
        </button>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Share on WhatsApp
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[#0B1120] text-white px-5 sm:px-7 py-5 border-b-4 border-[#D97706]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {slip.company.name}
              </h3>
              {slip.company.address && (
                <p className="text-xs text-slate-300 mt-1">{slip.company.address}</p>
              )}
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {slip.company.phone ? `Ph: ${slip.company.phone}` : ''}
                {slip.company.phone && slip.company.upi ? ' · ' : ''}
                {slip.company.upi ? `UPI: ${slip.company.upi}` : ''}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-xs font-extrabold tracking-wider text-[#FBBF24]">
                CORPORATE SALARY SLIP
              </p>
              <p className="text-xs font-mono text-slate-200 mt-1">Ref: {slip.slipRefNo}</p>
              <p className="text-xs text-slate-300 mt-0.5">Period: {slip.periodLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#F4F7FB] border border-slate-200 rounded-xl p-4">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Employee Name</p>
              <p className="text-sm font-bold text-[#0B1120] mt-0.5">{slip.staff.name}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Designation</p>
              <p className="text-sm font-semibold text-[#0B1120] mt-0.5">{slip.staff.role}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Phone / WhatsApp</p>
              <p className="text-sm font-mono font-semibold text-[#0B1120] mt-0.5">
                +{slip.staff.phone}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">GPay / UPI ID</p>
              <p className="text-sm font-mono font-semibold text-[#2563EB] mt-0.5 truncate">
                {slip.staff.upiId}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Base Daily Wage</p>
              <p className="text-sm font-mono font-bold text-[#0B1120] tabular-nums mt-0.5">
                {formatINR(slip.staff.dailyWage)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Working Entries</p>
              <p className="text-sm font-mono font-bold text-[#0B1120] tabular-nums mt-0.5">
                {slip.attendanceRows.length} Shift(s)
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#0B1120] tracking-wide mb-2.5">
              Shift &amp; Travel Log
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0B1120] text-white">
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Studio / Venue</th>
                    <th className="py-2.5 px-3 font-semibold">Travel Route</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Rate Mode</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {slip.attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No working shifts recorded in this pay period.
                      </td>
                    </tr>
                  ) : (
                    slip.attendanceRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-700">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#0B1120]">
                            {row.studioName || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500">{row.venue || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {row.fromLocation || '-'} → {row.toLocation || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {getRateModeLabel(row.rateMode)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0B1120] tabular-nums whitespace-nowrap">
                          {formatINR(row.wageEarned)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5">
                  <h4 className="text-xs font-bold text-[#059669]">Earnings &amp; Reimbursements</h4>
                </div>
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      Attendance Wages ({slip.attendanceRows.length} shifts)
                    </span>
                    <span className="font-mono font-bold text-[#0B1120] tabular-nums">
                      {formatINR(slip.attendanceEarned)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      Approved Expenses ({slip.approvedExpenses.length})
                    </span>
                    <span className="font-mono font-bold text-[#0B1120] tabular-nums">
                      {formatINR(slip.expensesTotal)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="text-[#0B1120]">Gross Earnings</span>
                <span className="font-mono text-sm text-[#059669] tabular-nums">
                  {formatINR(slip.grossEarnings)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5">
                  <h4 className="text-xs font-bold text-[#2563EB]">
                    GPay / Bank Payouts &amp; Advances
                  </h4>
                </div>
                <div className="p-4 space-y-2.5 text-xs">
                  {slip.paymentRows.length === 0 ? (
                    <p className="text-slate-500">No payouts recorded in this period.</p>
                  ) : (
                    slip.paymentRows.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0B1120]">
                            {p.date} · {p.mode.toUpperCase()}{' '}
                            {p.utr ? (
                              <span className="font-mono text-slate-500">UTR:{p.utr}</span>
                            ) : null}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                            {p.confirmationStatus === 'confirmed' ? (
                              <span className="text-[#059669] font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed
                                {p.confirmedAt ? ` (${formatDateTimeShort(p.confirmedAt)})` : ''}
                              </span>
                            ) : p.confirmationStatus === 'issue' ? (
                              <span className="text-[#DC2626] font-semibold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Issue Flagged
                              </span>
                            ) : (
                              <span className="text-[#D97706] font-semibold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Awaiting Staff Confirmation
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#0B1120] tabular-nums whitespace-nowrap">
                          {formatINR(p.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="text-[#0B1120]">Total Paid / Advance</span>
                <span className="font-mono text-sm text-[#2563EB] tabular-nums">
                  {formatINR(slip.totalPaid)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0B1120] text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wide">
                NET PAYABLE BALANCE
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-1">
                {formatINR(slip.netPayable)}
              </p>
              <p className="text-xs text-[#FBBF24] mt-1.5">
                In Words: {numberToIndianWords(slip.netPayable)}
              </p>
            </div>
            <div className="border border-[#D97706] rounded-lg px-4 py-2.5 text-left sm:text-center shrink-0 bg-white/5">
              <p className="text-[10px] font-bold tracking-wider text-[#FBBF24]">
                PAYMENT VERIFICATION STAMP
              </p>
              <p className="text-xs font-extrabold text-white mt-1">{slip.verificationStatus}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="border-t border-slate-300 pt-2">
              <p className="text-xs font-bold text-[#0B1120]">Employee Signature</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {slip.staff.name} · {slip.staff.role}
              </p>
            </div>
            <div className="border-t border-slate-300 pt-2 text-right">
              <p className="text-xs font-bold text-[#0B1120]">Authorized Signatory</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{slip.company.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
