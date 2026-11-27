import React from 'react';
import {
  CompanyDatabase,
  CompanyRecord,
  CustomerRecord,
  StaffMember,
} from '../types';
import {
  amountToIndianWords,
  calculateStaffSummary,
  formatDateIN,
  formatDateTimeIN,
  formatINR,
  formatTimeIN,
  getTodayISO,
} from '../utils/helpers';

/* ============================================================================
   SHARED EXECUTIVE SEAL & MONOGRAM HELPERS
   ============================================================================ */
function getCompanyMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'SO';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const VerifiedDigitalSeal: React.FC<{ label?: string; sublabel?: string }> = ({
  label = 'VERIFIED',
  sublabel = 'DIGITAL RECORD',
}) => (
  <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[#C8A252]/60 bg-[#0B132B] text-white shrink-0">
    <div className="w-7 h-7 rounded-full border-[1.5px] border-[#C8A252] flex items-center justify-center bg-[#162040] shrink-0">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E5C77E"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
    <div className="leading-tight">
      <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#E5C77E] uppercase">
        {label}
      </p>
      <p className="text-[9px] font-semibold tracking-wider text-slate-300 uppercase">
        {sublabel}
      </p>
    </div>
  </div>
);

/* ============================================================================
   1. OFFICIAL FORMAL SALARY & ADVANCE STATEMENT SLIP (EXECUTIVE A4 EDITION)
   ============================================================================ */
interface FormalSalarySlipProps {
  company: CompanyRecord;
  staff: StaffMember;
  db: CompanyDatabase;
  fromMonth?: string;
  toMonth?: string;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}

export const FormalSalarySlipSheet: React.FC<FormalSalarySlipProps> = ({
  company,
  staff,
  db,
  fromMonth,
  toMonth,
  sheetRef,
}) => {
  const summary = calculateStaffSummary(staff, db, fromMonth, toMonth);
  const slipCode = `SAL-${company.slug.slice(0, 4).toUpperCase()}-${staff.id.slice(-5).toUpperCase()}`;
  const periodLabel =
    fromMonth || toMonth
      ? `${fromMonth || 'Start'} → ${toMonth || 'Present'}`
      : `${formatDateIN(staff.periodFrom)} → ${formatDateIN(staff.periodTo)}`;
  const totalDeducted = summary.advancesTaken + summary.settledPaid;
  const monogram = getCompanyMonogram(company.name);

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden paper-sheet text-[#0F172A]"
    >
      {/* Top Metallic Champagne Gold Bar */}
      <div className="h-1.5 bg-[#C8A252] w-full" />

      {/* Executive Obsidian Letterhead Banner */}
      <div className="bg-[#0B132B] text-white px-6 sm:px-8 py-6 border-b-[3px] border-[#C8A252]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#162040] border border-[#C8A252]/70 flex items-center justify-center shrink-0">
              <span className="font-display font-extrabold text-base tracking-wider text-[#E5C77E]">
                {monogram}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E5C77E]">
                Official Salary &amp; Advance Statement
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">
                {company.name}
              </h2>
              <p className="text-xs text-[#CBD5E1]">
                {company.place}
                {company.phone ? `  •  Ph: ${company.phone}` : ''}
                {company.adminEmail ? `  •  ${company.adminEmail}` : ''}
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-2 shrink-0">
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-[#162040] border border-[#C8A252]/50">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#E5C77E]">
                {summary.dueBadge.label}
              </span>
            </div>
            <div className="text-xs font-mono space-y-0.5 text-[#CBD5E1]">
              <p>
                REF: <strong className="text-white">{slipCode}</strong>
              </p>
              <p>ISSUED: {formatDateIN(getTodayISO())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Body */}
      <div className="p-6 sm:p-8 space-y-6 bg-white">
        {/* Executive Staff & Pay Period Dossier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]">
          <div className="p-4 sm:p-5 space-y-2 border-b sm:border-b-0 sm:border-r border-[#E2E8F0] border-l-4 border-l-[#C8A252]">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B] mb-2">
              Employee Details
            </p>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Staff Name</span>
              <span className="font-bold text-[#0F172A] text-right">{staff.name}</span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Designation</span>
              <span className="font-semibold text-[#1E293B] text-right">{staff.role}</span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Contact Phone</span>
              <span className="font-mono text-[#1E293B] text-right">{staff.phone || '—'}</span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">GPay / UPI ID</span>
              <span className="font-mono font-semibold text-[#1E3A8A] text-right">
                {staff.upiId || '—'}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-2">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B] mb-2">
              Statement Period &amp; Rate
            </p>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Period Covered</span>
              <span className="font-mono font-semibold text-[#0F172A] text-right">
                {periodLabel}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Working Days / Duties</span>
              <span className="font-mono font-bold text-[#0F172A] text-right">
                {summary.workingDaysCount} day{summary.workingDaysCount === 1 ? '' : 's'} (
                {summary.dutyPunches.length} duties)
              </span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Salary Due Date</span>
              <span className="font-mono font-semibold text-[#1E293B] text-right">
                {formatDateIN(staff.periodTo)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Base Duty Rate</span>
              <span className="font-mono font-bold text-[#0F172A] text-right">
                {formatINR(staff.dutyWage)} / duty
              </span>
            </div>
          </div>
        </div>

        {/* 4 Executive Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Gross Payable
            </p>
            <p className="text-sm sm:text-base font-mono font-extrabold text-[#0F172A] tabular-nums mt-1">
              {formatINR(summary.grossPayable)}
            </p>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
              Advances Taken
            </p>
            <p className="text-sm sm:text-base font-mono font-extrabold text-[#B45309] tabular-nums mt-1">
              {formatINR(summary.advancesTaken)}
            </p>
          </div>
          <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#065F46]">
              Settled / GPay Paid
            </p>
            <p className="text-sm sm:text-base font-mono font-extrabold text-[#047857] tabular-nums mt-1">
              {formatINR(summary.settledPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-[#C8A252] bg-[#0B132B] px-3.5 py-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#E5C77E]">
              Net Balance Due
            </p>
            <p className="text-sm sm:text-base font-mono font-extrabold text-white tabular-nums mt-1">
              {formatINR(summary.netBalancePayable)}
            </p>
          </div>
        </div>

        {/* Precision Earnings & Auto-Deductions Ledger Table */}
        <div className="rounded-xl border border-[#CBD5E1] overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B132B] text-white">
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Statement Component
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#94A3B8] hidden sm:table-cell">
                  Category
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Amount (INR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr className="bg-white">
                <td className="px-4 py-3 font-medium text-[#1E293B]">
                  Earned Duty Wages ({summary.dutyPunches.length} logged{' '}
                  {summary.dutyPunches.length === 1 ? 'duty' : 'duties'})
                </td>
                <td className="px-4 py-3 text-[11px] text-[#64748B] hidden sm:table-cell">
                  Earnings
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                  {formatINR(summary.earnedDutyWages)}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium text-[#1E293B]">
                  Approved Staff Reimbursements / Expenses
                </td>
                <td className="px-4 py-3 text-[11px] text-[#64748B] hidden sm:table-cell">
                  Reimbursement
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                  {formatINR(summary.approvedExpenses)}
                </td>
              </tr>
              <tr className="bg-[#F1F5F9] font-bold border-t border-[#CBD5E1]">
                <td className="px-4 py-3 text-[#0F172A]" colSpan={2}>
                  Total Gross Payable (A)
                </td>
                <td className="px-4 py-3 text-right font-mono text-[#0F172A] tabular-nums">
                  {formatINR(summary.grossPayable)}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3 font-medium text-[#92400E]">
                  Less: Auto-Deducted Salary Advances Taken
                </td>
                <td className="px-4 py-3 text-[11px] text-[#B45309] hidden sm:table-cell">
                  Deduction
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#B45309] tabular-nums">
                  − {formatINR(summary.advancesTaken)}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium text-[#065F46]">
                  Less: Google Pay / Bank / Cash Settlements Paid
                </td>
                <td className="px-4 py-3 text-[11px] text-[#047857] hidden sm:table-cell">
                  Settled
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#047857] tabular-nums">
                  − {formatINR(summary.settledPaid)}
                </td>
              </tr>
              <tr className="bg-[#F1F5F9] font-semibold">
                <td className="px-4 py-2.5 text-[#334155]" colSpan={2}>
                  Total Advances &amp; Settlements Deducted (B)
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[#334155] tabular-nums">
                  − {formatINR(totalDeducted)}
                </td>
              </tr>
              <tr className="bg-[#0B132B] text-white border-t-2 border-[#C8A252]">
                <td className="px-4 py-3.5" colSpan={2}>
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#E5C77E] block">
                    Net Balance Payable (A − B)
                  </span>
                  <span className="text-[11px] text-[#CBD5E1]">
                    Final payable balance for the statement period
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-lg font-mono font-extrabold text-white tabular-nums">
                  {formatINR(summary.netBalancePayable)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words + Official Digital Seal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FBF9F5] border border-[#E5D7B8] border-l-4 border-l-[#C8A252] px-4 py-3.5">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#8A6D2F]">
              Net Balance in Words (INR)
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {amountToIndianWords(summary.netBalancePayable)}
            </p>
          </div>
          <VerifiedDigitalSeal label="VERIFIED SLIP" sublabel="PAYROLL RECORD" />
        </div>

        {/* Complete Advance & Payment History Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#0F172A]">
              Advance &amp; Settlement Transaction Log ({summary.payments.length})
            </h3>
            <span className="text-[10px] font-mono text-[#64748B]">CHRONOLOGICAL LEDGER</span>
          </div>

          {summary.payments.length === 0 ? (
            <div className="text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl px-4 py-3.5 border border-[#E2E8F0]">
              No advances or settlement payments recorded in this statement period.
            </div>
          ) : (
            <div className="border border-[#CBD5E1] rounded-xl overflow-x-auto">
              <table className="w-full text-[11px] min-w-[540px] border-collapse">
                <thead>
                  <tr className="bg-[#1C2541] text-white">
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">Date</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">Time</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">
                      Mode / Type
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">
                      Note / UTR Ref
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">Due Date</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[#E5C77E]">Status</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[#E5C77E]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {summary.payments.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                      <td className="px-3 py-2.5 font-mono text-[#0F172A]">
                        {formatDateIN(p.date)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#475569]">
                        {formatTimeIN(p.time)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold uppercase text-[#0F172A]">{p.mode}</span>
                        <span className="text-[#64748B]">
                          {' '}
                          • {p.kind === 'settlement' ? 'Settlement' : 'Advance'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#334155]">
                        {p.note || '—'}
                        {p.utr ? ` (UTR: ${p.utr})` : ''}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#475569]">
                        {formatDateIN(p.dueDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        {p.confirmationStatus === 'confirmed' ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold text-[10px]">
                            CONFIRMED
                            {p.confirmedAt ? ` • ${formatDateTimeIN(p.confirmedAt)}` : ''}
                          </span>
                        ) : p.confirmationStatus === 'issue' ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] font-bold text-[10px]">
                            ISSUE: {p.staffNote || 'Flagged'}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-bold text-[10px]">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-[#0F172A] tabular-nums">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Executive Footer & Authorized Signatory */}
        <div className="pt-5 border-t border-[#CBD5E1] flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-[11px] text-[#64748B]">
          <div className="space-y-0.5">
            <p className="font-display font-bold text-xs text-[#0F172A]">{company.name}</p>
            <p>{company.place || 'Corporate Office'}</p>
            <p className="text-[10px] text-[#94A3B8]">
              Computer-generated statement issued via Staff. Online Payroll Suite.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="w-44 sm:ml-auto border-b border-[#0F172A] mb-1.5 h-6" />
            <p className="font-bold text-[#0F172A] tracking-wide uppercase text-[10px]">
              Authorized Signatory
            </p>
            <p className="text-[10px] text-[#64748B]">{company.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   2. FORMAL CUSTOMER BALANCE SLIP (EXECUTIVE A4 EDITION)
   ============================================================================ */
interface CustomerBalanceSlipProps {
  company: CompanyRecord;
  customer: CustomerRecord;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}

export const CustomerBalanceSlipSheet: React.FC<CustomerBalanceSlipProps> = ({
  company,
  customer,
  sheetRef,
}) => {
  const balanceDue = Math.max(0, (Number(customer.workRate) || 0) - (Number(customer.received) || 0));
  const slipNo = `BAL-${customer.id.slice(-5).toUpperCase()}`;
  const monogram = getCompanyMonogram(company.name);

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden paper-sheet text-[#0F172A]"
    >
      <div className="h-1.5 bg-[#C8A252] w-full" />

      {/* Obsidian Letterhead */}
      <div className="bg-[#0B132B] text-white px-6 sm:px-8 py-6 border-b-[3px] border-[#C8A252]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#162040] border border-[#C8A252]/70 flex items-center justify-center shrink-0">
              <span className="font-display font-extrabold text-base tracking-wider text-[#E5C77E]">
                {monogram}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E5C77E]">
                Customer Account &amp; Balance Statement
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                {company.name}
              </h2>
              <p className="text-xs text-[#CBD5E1]">
                {company.place}
                {company.phone ? `  •  Ph: ${company.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-2 shrink-0">
            <span
              className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase border ${
                balanceDue === 0
                  ? 'bg-[#064E3B] border-[#34D399]/50 text-[#A7F3D0]'
                  : 'bg-[#78350F] border-[#FBBF24]/50 text-[#FDE68A]'
              }`}
            >
              {balanceDue === 0 ? 'FULLY PAID' : 'BALANCE PENDING'}
            </span>
            <div className="text-xs font-mono space-y-0.5 text-[#CBD5E1]">
              <p>
                REF: <strong className="text-white">{slipNo}</strong>
              </p>
              <p>DATE: {formatDateIN(getTodayISO())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 bg-white">
        {/* Billed To Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#C8A252] rounded-xl p-4 sm:p-5 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B]">
              Billed To (Customer / Studio)
            </p>
            <p className="text-base font-display font-bold text-[#0F172A]">{customer.name}</p>
            <p className="font-mono text-[#475569]">{customer.phone || '—'}</p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B]">
              Booking &amp; Mode
            </p>
            <p className="font-mono font-bold text-[#0F172A] text-sm">
              {formatDateIN(customer.date)}
            </p>
            <p className="text-[#475569]">
              Payment Mode:{' '}
              <strong className="text-[#0F172A] uppercase">{customer.paymentMode}</strong>
            </p>
          </div>
        </div>

        {/* Account Breakdown Table */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B132B] text-white">
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Work / Service Description
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Amount (INR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr className="bg-white">
                <td className="px-4 py-3.5 text-[#0F172A] font-semibold">
                  {customer.workDescription}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0F172A] tabular-nums">
                  {formatINR(customer.workRate)}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#065F46] font-medium">
                  Less: Amount Received to Date
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[#047857] tabular-nums">
                  − {formatINR(customer.received)}
                </td>
              </tr>
              <tr className="bg-[#0B132B] text-white border-t-2 border-[#C8A252]">
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#E5C77E] block">
                    Balance Payable (ബാലൻസ് തുക)
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-lg font-mono font-extrabold text-white tabular-nums">
                  {formatINR(balanceDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Receipts History if present */}
        {customer.payments && customer.payments.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-[#64748B]">
              Recorded Payment Receipts ({customer.payments.length})
            </p>
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#475569]">
                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                    <th className="text-left px-3 py-2 font-semibold">Mode</th>
                    <th className="text-left px-3 py-2 font-semibold">Note</th>
                    <th className="text-right px-3 py-2 font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {customer.payments.map((pay) => (
                    <tr key={pay.id} className="bg-white">
                      <td className="px-3 py-2 font-mono">{formatDateIN(pay.date)}</td>
                      <td className="px-3 py-2 uppercase font-semibold">{pay.mode}</td>
                      <td className="px-3 py-2 text-[#475569]">{pay.note || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-[#047857] tabular-nums">
                        {formatINR(pay.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Balance in Words + Seal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FBF9F5] border border-[#E5D7B8] border-l-4 border-l-[#C8A252] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#8A6D2F]">
              Balance Payable in Words
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {amountToIndianWords(balanceDue)}
            </p>
          </div>
          <VerifiedDigitalSeal
            label={balanceDue === 0 ? 'PAID IN FULL' : 'STATEMENT'}
            sublabel="OFFICIAL ACCOUNT"
          />
        </div>

        {customer.studioRules && (
          <div className="text-xs text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-[#0F172A] mb-1.5">
              Terms &amp; Studio Notes
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{customer.studioRules}</p>
          </div>
        )}

        <div className="pt-4 border-t border-[#CBD5E1] flex items-end justify-between text-[11px] text-[#64748B]">
          <div>
            <p className="font-bold text-[#0F172A]">{company.name}</p>
            <p>{company.place} • Thank you for your continued patronage.</p>
          </div>
          <div className="text-right">
            <div className="w-36 border-b border-[#0F172A] mb-1 h-5" />
            <p className="text-[10px] font-bold uppercase text-[#0F172A]">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. QUOTATION / TAX & SERVICE INVOICE SHEET (EXECUTIVE A4 EDITION)
   ============================================================================ */
interface QuotationInvoiceProps {
  company: CompanyRecord;
  docType: 'QUOTATION' | 'TAX / SERVICE INVOICE';
  docNumber: string;
  docDate: string;
  clientName: string;
  clientPhone: string;
  scopeDescription: string;
  totalAmount: number;
  receivedAmount: number;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}

export const QuotationInvoiceSheet: React.FC<QuotationInvoiceProps> = ({
  company,
  docType,
  docNumber,
  docDate,
  clientName,
  clientPhone,
  scopeDescription,
  totalAmount,
  receivedAmount,
  sheetRef,
}) => {
  const balance = Math.max(0, (Number(totalAmount) || 0) - (Number(receivedAmount) || 0));
  const lines = scopeDescription
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const monogram = getCompanyMonogram(company.name);

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden paper-sheet text-[#0F172A]"
    >
      <div className="h-1.5 bg-[#C8A252] w-full" />

      {/* Executive Obsidian Header */}
      <div className="bg-[#0B132B] text-white px-6 sm:px-8 py-6 border-b-[3px] border-[#C8A252]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#162040] border border-[#C8A252]/70 flex items-center justify-center shrink-0">
              <span className="font-display font-extrabold text-base tracking-wider text-[#E5C77E]">
                {monogram}
              </span>
            </div>
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded bg-[#C8A252] text-[#0B132B] text-[10px] font-extrabold tracking-[0.16em] uppercase">
                {docType}
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1">
                {company.name}
              </h2>
              <p className="text-xs text-[#CBD5E1]">
                {company.place}
                {company.phone ? `  •  Ph: ${company.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="sm:text-right text-xs font-mono space-y-1 bg-[#162040] border border-[#C8A252]/40 rounded-xl px-4 py-3 shrink-0">
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#E5C77E] font-sans font-bold">
              Document Reference
            </p>
            <p className="font-bold text-white text-sm">{docNumber}</p>
            <p className="text-[#CBD5E1]">Issued: {formatDateIN(docDate)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 bg-white">
        {/* Prepared For Card */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#C8A252] rounded-xl p-4 sm:p-5 text-xs flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B]">
              Prepared Exclusively For
            </p>
            <p className="text-base font-display font-bold text-[#0F172A]">
              {clientName || 'Valued Client'}
            </p>
            <p className="font-mono text-[#475569]">{clientPhone || '—'}</p>
          </div>
          <div className="sm:text-right space-y-1">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#64748B]">
              Issued By
            </p>
            <p className="font-semibold text-[#0F172A]">{company.name}</p>
            <p className="font-mono text-[#475569]">{company.adminEmail}</p>
          </div>
        </div>

        {/* Scope & Financial Table */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B132B] text-white">
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Scope of Work / Service Deliverables
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E] w-40">
                  Amount (INR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr className="bg-white">
                <td className="px-4 py-5 align-top">
                  {lines.length > 0 ? (
                    <ul className="space-y-2 text-[#1E293B]">
                      {lines.map((line, i) => (
                        <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-mono font-bold text-[#0F172A] flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#94A3B8]">Enter service scope &amp; deliverables...</span>
                  )}
                </td>
                <td className="px-4 py-5 text-right align-top font-mono font-bold text-sm text-[#0F172A] tabular-nums">
                  {formatINR(totalAmount)}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC]">
                <td className="px-4 py-3 font-bold text-[#1E293B]">Gross Total Package Value</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[#0F172A] tabular-nums">
                  {formatINR(totalAmount)}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3 font-medium text-[#065F46]">
                  Less: Advance / Booking Amount Received
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[#047857] tabular-nums">
                  − {formatINR(receivedAmount)}
                </td>
              </tr>
              <tr className="bg-[#0B132B] text-white border-t-2 border-[#C8A252]">
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#E5C77E] block">
                    Net Balance Payable
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-lg font-mono font-extrabold text-white tabular-nums">
                  {formatINR(balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words + Seal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FBF9F5] border border-[#E5D7B8] border-l-4 border-l-[#C8A252] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#8A6D2F]">
              Total Package Value in Words
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {amountToIndianWords(totalAmount)}
            </p>
          </div>
          <VerifiedDigitalSeal
            label={docType === 'QUOTATION' ? 'OFFICIAL QUOTE' : 'OFFICIAL INVOICE'}
            sublabel="AUTHORIZED"
          />
        </div>

        {/* Footer & Signatory */}
        <div className="pt-5 border-t border-[#CBD5E1] flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-[11px] text-[#64748B]">
          <div className="space-y-0.5">
            <p className="font-bold text-[#0F172A]">{company.name}</p>
            <p>Valid for 15 days from issue date unless specified otherwise.</p>
            <p className="text-[10px] text-[#94A3B8]">
              Subject to standard service terms and schedule confirmation.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="w-44 sm:ml-auto border-b border-[#0F172A] mb-1.5 h-6" />
            <p className="font-bold text-[#0F172A] tracking-wide uppercase text-[10px]">
              Authorized Signatory
            </p>
            <p className="text-[10px] text-[#64748B]">{company.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. WEEKLY / MONTHLY / YEARLY P&L STATEMENT SLIP (EXECUTIVE A4 EDITION)
   ============================================================================ */
interface PnlStatementProps {
  company: CompanyRecord;
  periodLabel: string;
  receivedIncome: number;
  manualIncome: number;
  staffWages: number;
  approvedExpenses: number;
  subcontractPaid: number;
  manualExpenses: number;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}

export const PnlStatementSheet: React.FC<PnlStatementProps> = ({
  company,
  periodLabel,
  receivedIncome,
  manualIncome,
  staffWages,
  approvedExpenses,
  subcontractPaid,
  manualExpenses,
  sheetRef,
}) => {
  const totalIn = receivedIncome + manualIncome;
  const totalOut = staffWages + approvedExpenses + subcontractPaid + manualExpenses;
  const netProfit = totalIn - totalOut;
  const marginPct = totalIn > 0 ? Math.round((netProfit / totalIn) * 1000) / 10 : 0;
  const monogram = getCompanyMonogram(company.name);

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden paper-sheet text-[#0F172A]"
    >
      <div className="h-1.5 bg-[#C8A252] w-full" />

      {/* Executive Obsidian Header */}
      <div className="bg-[#0B132B] text-white px-6 sm:px-8 py-6 border-b-[3px] border-[#C8A252]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#162040] border border-[#C8A252]/70 flex items-center justify-center shrink-0">
              <span className="font-display font-extrabold text-base tracking-wider text-[#E5C77E]">
                {monogram}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E5C77E]">
                Executive Profit &amp; Loss Financial Statement
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                {company.name}
              </h2>
              <p className="text-xs text-[#CBD5E1]">
                {company.place}
                {company.phone ? `  •  Ph: ${company.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-2 shrink-0">
            <span
              className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase border ${
                netProfit >= 0
                  ? 'bg-[#064E3B] border-[#34D399]/50 text-[#A7F3D0]'
                  : 'bg-[#7F1D1D] border-[#F87171]/50 text-[#FECACA]'
              }`}
            >
              {netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'} ({marginPct}%)
            </span>
            <div className="text-xs font-mono space-y-0.5 text-[#CBD5E1]">
              <p>
                PERIOD: <strong className="text-white">{periodLabel}</strong>
              </p>
              <p>GENERATED: {formatDateIN(getTodayISO())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 bg-white">
        {/* 3 Executive Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#065F46]">
              Total Revenue Inflow (A)
            </p>
            <p className="text-base font-mono font-extrabold text-[#047857] tabular-nums mt-1">
              {formatINR(totalIn)}
            </p>
          </div>
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B]">
              Total Operating Outflow (B)
            </p>
            <p className="text-base font-mono font-extrabold text-[#B91C1C] tabular-nums mt-1">
              {formatINR(totalOut)}
            </p>
          </div>
          <div className="rounded-xl border border-[#C8A252] bg-[#0B132B] px-4 py-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#E5C77E]">
              Net {netProfit >= 0 ? 'Profit' : 'Loss'} (A − B)
            </p>
            <p className="text-base font-mono font-extrabold text-white tabular-nums mt-1">
              {formatINR(netProfit)}
            </p>
          </div>
        </div>

        {/* Detailed P&L Ledger Table */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B132B] text-white">
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Financial Line Item
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-[#E5C77E]">
                  Amount (INR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              <tr className="bg-white">
                <td className="px-4 py-3 text-[#1E293B] font-medium">Customer Received Income</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#047857] tabular-nums">
                  {formatINR(receivedIncome)}
                </td>
              </tr>
              {manualIncome > 0 && (
                <tr className="bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#1E293B] font-medium">
                    Other / Manual Ledger Income
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-[#047857] tabular-nums">
                    {formatINR(manualIncome)}
                  </td>
                </tr>
              )}
              <tr className="bg-[#ECFDF5] font-bold">
                <td className="px-4 py-3 text-[#065F46]">Total Revenue / Income (A)</td>
                <td className="px-4 py-3 text-right font-mono text-[#047857] tabular-nums">
                  {formatINR(totalIn)}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3 text-[#1E293B] font-medium">Staff Duty Wages Earned</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#B91C1C] tabular-nums">
                  − {formatINR(staffWages)}
                </td>
              </tr>
              <tr className="bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#1E293B] font-medium">Approved Staff Expenses</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#B91C1C] tabular-nums">
                  − {formatINR(approvedExpenses)}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3 text-[#1E293B] font-medium">Subcontract Payments Paid</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#B91C1C] tabular-nums">
                  − {formatINR(subcontractPaid)}
                </td>
              </tr>
              {manualExpenses > 0 && (
                <tr className="bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#1E293B] font-medium">
                    Other / Manual Ledger Expenses
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-[#B91C1C] tabular-nums">
                    − {formatINR(manualExpenses)}
                  </td>
                </tr>
              )}
              <tr className="bg-[#F1F5F9] font-bold">
                <td className="px-4 py-3 text-[#0F172A]">Total Operating Outflow (B)</td>
                <td className="px-4 py-3 text-right font-mono text-[#B91C1C] tabular-nums">
                  − {formatINR(totalOut)}
                </td>
              </tr>
              <tr className="bg-[#0B132B] text-white border-t-2 border-[#C8A252]">
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#E5C77E] block">
                    Net {netProfit >= 0 ? 'Profit' : 'Loss'} (A − B)
                  </span>
                </td>
                <td
                  className={`px-4 py-3.5 text-right text-lg font-mono font-extrabold tabular-nums ${
                    netProfit >= 0 ? 'text-[#6EE7B7]' : 'text-[#FCA5A5]'
                  }`}
                >
                  {formatINR(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words + Seal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FBF9F5] border border-[#E5D7B8] border-l-4 border-l-[#C8A252] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#8A6D2F]">
              Net Financial Position in Words
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {amountToIndianWords(netProfit)}
            </p>
          </div>
          <VerifiedDigitalSeal label="AUDITED P&L" sublabel="FINANCIAL SUMMARY" />
        </div>

        <div className="pt-4 border-t border-[#CBD5E1] flex items-end justify-between text-[11px] text-[#64748B]">
          <div>
            <p className="font-bold text-[#0F172A]">{company.name}</p>
            <p>Prepared via Staff. Online Financial Reporting Engine</p>
          </div>
          <div className="text-right">
            <div className="w-36 border-b border-[#0F172A] mb-1 h-5" />
            <p className="text-[10px] font-bold uppercase text-[#0F172A]">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
