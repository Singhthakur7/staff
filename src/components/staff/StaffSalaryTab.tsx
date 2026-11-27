import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { AdvancePaymentRecord, StaffMember } from '../../types';
import {
  formatDateIN,
  formatINR,
  formatTimeIN,
} from '../../utils/helpers';
import { downloadElementAsPdf, triggerDirectPrint } from '../../utils/pdfExport';
import { FormalSalarySlipSheet } from '../DocumentPreviews';

export const StaffSalaryTab: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const {
    activeCompany,
    activeDb,
    confirmStaffPayment,
    reportStaffPaymentIssue,
    openLightbox,
    pushToast,
  } = useStaffOnline();

  const [issueTarget, setIssueTarget] = useState<AdvancePaymentRecord | null>(null);
  const [issueReason, setIssueReason] = useState('');
  const [exporting, setExporting] = useState(false);
  const slipRef = useRef<HTMLDivElement | null>(null);

  if (!activeCompany) return null;

  const pendingConfirmations = activeDb.advances.filter(
    (a) => a.staffId === staff.id && a.confirmationStatus === 'pending'
  );

  const handleDownloadPdf = async () => {
    setExporting(true);
    const ok = await downloadElementAsPdf(
      slipRef.current,
      `Salary-Slip-${staff.name.replace(/\s+/g, '-')}.pdf`
    );
    setExporting(false);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Salary Slip PDF downloaded' : 'PDF export failed',
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending GPay / Salary Confirmation Inbox */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-2xl p-5 card-elevated space-y-4 no-print">
          <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-3">
            <div>
              <h2 className="text-sm font-display font-bold text-[#0F172A]">
                Pending Payment Confirmations ({pendingConfirmations.length})
              </h2>
              <p className="text-xs text-slate-600">
                Confirm receipt once the Google Pay / advance transfer arrives in your account.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingConfirmations.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-amber-50/50 border border-amber-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  {p.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(p.screenshotUrl!)}
                      className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                    >
                      <img
                        src={p.screenshotUrl}
                        alt="Payment proof"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                  <div className="space-y-0.5 text-xs">
                    <p className="text-base font-mono font-extrabold text-[#0F172A] tabular-nums">
                      {formatINR(p.amount)}{' '}
                      <span className="text-xs font-sans font-semibold text-amber-800 uppercase">
                        · {p.mode} ({p.kind})
                      </span>
                    </p>
                    <p className="text-slate-600">
                      {formatDateIN(p.date)} at {formatTimeIN(p.time)}
                      {p.utr ? ` · UTR: ${p.utr}` : ''}
                    </p>
                    {p.note && <p className="text-slate-500">{p.note}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void confirmStaffPayment(p.id)}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ✅ Confirm Payment Received
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIssueTarget(p);
                      setIssueReason('');
                    }}
                    className="min-h-[42px] px-3.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    ⚠️ Report Issue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            My Official Formal Salary &amp; Advance Statement
          </h2>
          <p className="text-xs text-slate-500">
            Auto-updated with your logged duty wages, approved expenses, and deductions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleDownloadPdf()}
            className="min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating PDF...' : '📄 PDF Download'}
          </button>
          <button
            type="button"
            onClick={triggerDirectPrint}
            className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Formal Salary Slip Paper Sheet */}
      <div className="print-only-container">
        <FormalSalarySlipSheet
          company={activeCompany}
          staff={staff}
          db={activeDb}
          sheetRef={slipRef}
        />
      </div>

      {/* Report Payment Issue Modal */}
      {issueTarget && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={() => setIssueTarget(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-700">
                Report Issue — {formatINR(issueTarget.amount)}
              </h3>
              <button
                type="button"
                onClick={() => setIssueTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await reportStaffPaymentIssue(issueTarget.id, issueReason);
                setIssueTarget(null);
              }}
              className="p-5 space-y-3"
            >
              <textarea
                rows={3}
                required
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Describe the issue (e.g. Amount not credited to GPay yet / wrong amount)..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIssueTarget(null)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Send Issue Alert to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
