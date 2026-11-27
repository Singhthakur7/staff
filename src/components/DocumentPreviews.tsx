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
   1. OFFICIAL FORMAL SALARY & ADVANCE STATEMENT SLIP (A4 PAPER PREVIEW)
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

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 paper-sheet text-[#0F172A] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-5">
        <div className="space-y-1">
          <p className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
            Official Salary &amp; Advance Statement
          </p>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A]">
            {company.name}
          </h2>
          <p className="text-xs text-slate-600">
            {company.place} {company.phone ? `· Ph: ${company.phone}` : ''}
          </p>
        </div>
        <div className="sm:text-right space-y-1.5">
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${summary.dueBadge.className}`}
            >
              {summary.dueBadge.label}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-600">
            Slip Code: <strong className="text-[#0F172A]">{slipCode}</strong>
          </p>
          <p className="text-xs font-mono text-slate-500">
            Slip Date: {formatDateIN(getTodayISO())}
          </p>
        </div>
      </div>

      {/* Staff & Period Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 text-xs">
        <div className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Staff Name</span>
            <span className="font-bold text-[#0F172A]">{staff.name}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Role / Designation</span>
            <span className="font-semibold text-slate-800">{staff.role}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Phone</span>
            <span className="font-mono text-slate-800">{staff.phone || '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">GPay / UPI ID</span>
            <span className="font-mono font-semibold text-[#1E3A8A]">{staff.upiId || '—'}</span>
          </div>
        </div>
        <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Period Covered</span>
            <span className="font-mono font-semibold text-[#0F172A]">{periodLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Working Days / Duties</span>
            <span className="font-mono font-bold text-[#0F172A]">
              {summary.workingDaysCount} day{summary.workingDaysCount === 1 ? '' : 's'} (
              {summary.dutyPunches.length} duties)
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Salary Due Date</span>
            <span className="font-mono font-semibold text-slate-800">
              {formatDateIN(staff.periodTo)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Base Duty Rate</span>
            <span className="font-mono font-bold text-[#0F172A]">
              {formatINR(staff.dutyWage)} / duty
            </span>
          </div>
        </div>
      </div>

      {/* Earnings & Auto-Deduction Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0F172A] text-white">
              <th className="text-left px-4 py-2.5 font-semibold">Statement Component</th>
              <th className="text-right px-4 py-2.5 font-semibold">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-2.5 text-slate-700">
                Earned Duty Wages ({summary.dutyPunches.length} logged duties)
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                {formatINR(summary.earnedDutyWages)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-slate-700">Approved Staff Expenses</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                {formatINR(summary.approvedExpenses)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-2.5 text-[#0F172A]">Gross Payable (A)</td>
              <td className="px-4 py-2.5 text-right font-mono text-[#0F172A] tabular-nums">
                {formatINR(summary.grossPayable)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-amber-800">Less: Auto-Deducted Advances Taken</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-amber-700 tabular-nums">
                - {formatINR(summary.advancesTaken)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-emerald-800">
                Less: Google Pay / Settled Payments Paid
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                - {formatINR(summary.settledPaid)}
              </td>
            </tr>
            <tr className="bg-blue-50/70 border-t-2 border-[#1E3A8A]">
              <td className="px-4 py-3 text-sm font-extrabold text-[#1E3A8A]">
                Net Balance Payable
              </td>
              <td className="px-4 py-3 text-right text-base font-mono font-extrabold text-[#1E3A8A] tabular-nums">
                {formatINR(summary.netBalancePayable)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words + Verification Stamp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">Net Balance in Words</p>
          <p className="text-xs font-bold text-[#0F172A]">
            {amountToIndianWords(summary.netBalancePayable)}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="inline-flex items-center px-3 py-1 rounded-lg border border-emerald-600/30 bg-emerald-50 text-emerald-800 text-[11px] font-bold">
            ✓ Verified Digital Payroll Statement
          </span>
        </div>
      </div>

      {/* Complete Advance & Payment History Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-[#0F172A]">
          Advance &amp; Payment History ({summary.payments.length})
        </h3>
        {summary.payments.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200/70">
            No advances or settlement payments recorded in this period.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-[11px] min-w-[540px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Time</th>
                  <th className="text-left px-3 py-2 font-semibold">Mode / Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Note / Ref</th>
                  <th className="text-left px-3 py-2 font-semibold">Due Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Confirmation</th>
                  <th className="text-right px-3 py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono">{formatDateIN(p.date)}</td>
                    <td className="px-3 py-2 font-mono">{formatTimeIN(p.time)}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold uppercase">{p.mode}</span> ·{' '}
                      {p.kind === 'settlement' ? 'Settlement' : 'Advance'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {p.note || '—'}
                      {p.utr ? ` (UTR: ${p.utr})` : ''}
                    </td>
                    <td className="px-3 py-2 font-mono">{formatDateIN(p.dueDate)}</td>
                    <td className="px-3 py-2">
                      {p.confirmationStatus === 'confirmed' ? (
                        <span className="text-emerald-700 font-semibold">
                          ✅ Confirmed {p.confirmedAt ? `(${formatDateTimeIN(p.confirmedAt)})` : ''}
                        </span>
                      ) : p.confirmationStatus === 'issue' ? (
                        <span className="text-rose-700 font-semibold">
                          ⚠️ Issue: {p.staffNote || 'Flagged'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">
                          ⏳ Awaiting Confirmation
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Signature */}
      <div className="pt-4 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">{company.name}</p>
          <p>Issued via Staff. Online Payroll Suite</p>
        </div>
        <div className="text-right">
          <div className="w-36 border-b border-slate-300 mb-1" />
          <p>Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   2. FORMAL CUSTOMER BALANCE SLIP (A4 PAPER PREVIEW)
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

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 paper-sheet text-[#0F172A] space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
            Customer Account &amp; Balance Statement
          </p>
          <h2 className="text-xl font-display font-extrabold text-[#0F172A] mt-0.5">
            {company.name}
          </h2>
          <p className="text-xs text-slate-600">
            {company.place} {company.phone ? `· Ph: ${company.phone}` : ''}
          </p>
        </div>
        <div className="sm:text-right text-xs space-y-1">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full font-bold ${
              balanceDue === 0
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
            }`}
          >
            {balanceDue === 0 ? 'Fully Paid' : 'Balance Pending'}
          </span>
          <p className="font-mono text-slate-600">Ref: {slipNo}</p>
          <p className="font-mono text-slate-500">Date: {formatDateIN(getTodayISO())}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
        <div className="space-y-1">
          <p className="text-slate-500">Billed To (Customer / Studio)</p>
          <p className="text-sm font-bold text-[#0F172A]">{customer.name}</p>
          <p className="font-mono text-slate-600">{customer.phone || '—'}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-slate-500">Work / Booking Date</p>
          <p className="font-mono font-bold text-[#0F172A]">{formatDateIN(customer.date)}</p>
          <p className="text-slate-600">Payment Mode: {customer.paymentMode.toUpperCase()}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0F172A] text-white">
              <th className="text-left px-4 py-2.5 font-semibold">Work / Service Description</th>
              <th className="text-right px-4 py-2.5 font-semibold">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 text-slate-800 font-medium">{customer.workDescription}</td>
              <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                {formatINR(customer.workRate)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-emerald-700 font-medium">Amount Received So Far</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700 tabular-nums">
                - {formatINR(customer.received)}
              </td>
            </tr>
            <tr className="bg-rose-50/60 border-t-2 border-[#0F172A]">
              <td className="px-4 py-3 text-sm font-extrabold text-[#0F172A]">
                Balance Payable (ബാലൻസ് തുക)
              </td>
              <td className="px-4 py-3 text-right text-base font-mono font-extrabold text-rose-700 tabular-nums">
                {formatINR(balanceDue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
        <p className="text-[11px] text-slate-500">Balance in Words</p>
        <p className="font-bold text-[#0F172A]">{amountToIndianWords(balanceDue)}</p>
      </div>

      {customer.studioRules && (
        <div className="text-xs text-slate-600 border border-slate-200 rounded-xl p-3.5">
          <p className="font-bold text-[#0F172A] mb-1">Terms / Studio Notes</p>
          <p className="whitespace-pre-wrap">{customer.studioRules}</p>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>{company.name} · {company.place}</span>
        <span>Thank you for your business</span>
      </div>
    </div>
  );
};

/* ============================================================================
   3. QUOTATION / TAX & SERVICE INVOICE SHEET (A4 PAPER PREVIEW)
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

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 paper-sheet text-[#0F172A] space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-5">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#0F172A] text-white text-[11px] font-bold tracking-wider">
            {docType}
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#0F172A] mt-2">
            {company.name}
          </h2>
          <p className="text-xs text-slate-600">
            {company.place} {company.phone ? `· Ph: ${company.phone}` : ''}
          </p>
        </div>
        <div className="sm:text-right text-xs font-mono space-y-1">
          <p className="font-bold text-[#0F172A]">Doc #: {docNumber}</p>
          <p className="text-slate-500">Date: {formatDateIN(docDate)}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <p className="text-slate-500">Prepared For</p>
          <p className="text-sm font-bold text-[#0F172A] mt-0.5">{clientName || 'Client Name'}</p>
          <p className="font-mono text-slate-600">{clientPhone || '—'}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-slate-500">Contact Email</p>
          <p className="font-mono text-slate-700">{company.adminEmail}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0F172A] text-white">
              <th className="text-left px-4 py-2.5 font-semibold">Scope of Work / Items</th>
              <th className="text-right px-4 py-2.5 font-semibold w-36">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-4 align-top">
                {lines.length > 0 ? (
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-800">
                    {lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400">Enter service scope &amp; deliverables...</span>
                )}
              </td>
              <td className="px-4 py-4 text-right align-top font-mono font-bold text-[#0F172A] tabular-nums">
                {formatINR(totalAmount)}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-2.5 font-semibold text-slate-700">Total Value</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                {formatINR(totalAmount)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-medium text-emerald-700">Advance / Received</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                - {formatINR(receivedAmount)}
              </td>
            </tr>
            <tr className="bg-blue-50/70 border-t-2 border-[#1E3A8A]">
              <td className="px-4 py-3 text-sm font-extrabold text-[#1E3A8A]">Balance Payable</td>
              <td className="px-4 py-3 text-right text-base font-mono font-extrabold text-[#1E3A8A] tabular-nums">
                {formatINR(balance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
        <p className="text-[11px] text-slate-500">Total in Words</p>
        <p className="font-bold text-[#0F172A]">{amountToIndianWords(totalAmount)}</p>
      </div>

      <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">{company.name}</p>
          <p>Valid for 15 days from issue date unless specified otherwise.</p>
        </div>
        <div className="text-right">
          <div className="w-36 border-b border-slate-300 mb-1" />
          <p>Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. WEEKLY / MONTHLY / YEARLY P&L STATEMENT SLIP (A4 PAPER PREVIEW)
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

  return (
    <div
      ref={sheetRef}
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 paper-sheet text-[#0F172A] space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#0F172A] pb-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
            Profit &amp; Loss Financial Statement
          </p>
          <h2 className="text-xl font-display font-extrabold text-[#0F172A] mt-0.5">
            {company.name}
          </h2>
          <p className="text-xs text-slate-600">
            {company.place} {company.phone ? `· Ph: ${company.phone}` : ''}
          </p>
        </div>
        <div className="sm:text-right space-y-1">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
              netProfit >= 0
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
            }`}
          >
            {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
          </span>
          <p className="text-xs font-mono text-slate-600">Period: {periodLabel}</p>
          <p className="text-xs font-mono text-slate-500">Generated: {formatDateIN(getTodayISO())}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0F172A] text-white">
              <th className="text-left px-4 py-2.5 font-semibold">Category</th>
              <th className="text-right px-4 py-2.5 font-semibold">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-2.5 text-slate-700">Customer Received Income</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                {formatINR(receivedIncome)}
              </td>
            </tr>
            {manualIncome > 0 && (
              <tr>
                <td className="px-4 py-2.5 text-slate-700">Other / Manual Ledger Income</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatINR(manualIncome)}
                </td>
              </tr>
            )}
            <tr className="bg-emerald-50/50 font-bold">
              <td className="px-4 py-2.5 text-emerald-900">Total Revenue / Income (A)</td>
              <td className="px-4 py-2.5 text-right font-mono text-emerald-800 tabular-nums">
                {formatINR(totalIn)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-slate-700">Staff Duty Wages Earned</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                - {formatINR(staffWages)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-slate-700">Approved Staff Expenses</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                - {formatINR(approvedExpenses)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-slate-700">Subcontract Payments Paid</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                - {formatINR(subcontractPaid)}
              </td>
            </tr>
            {manualExpenses > 0 && (
              <tr>
                <td className="px-4 py-2.5 text-slate-700">Other / Manual Ledger Expenses</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700 tabular-nums">
                  - {formatINR(manualExpenses)}
                </td>
              </tr>
            )}
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-2.5 text-[#0F172A]">Total Operating Outflow (B)</td>
              <td className="px-4 py-2.5 text-right font-mono text-rose-700 tabular-nums">
                - {formatINR(totalOut)}
              </td>
            </tr>
            <tr
              className={`border-t-2 border-[#0F172A] ${
                netProfit >= 0 ? 'bg-emerald-50/70' : 'bg-rose-50/70'
              }`}
            >
              <td className="px-4 py-3 text-sm font-extrabold text-[#0F172A]">
                Net {netProfit >= 0 ? 'Profit' : 'Loss'} (A − B)
              </td>
              <td
                className={`px-4 py-3 text-right text-base font-mono font-extrabold tabular-nums ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatINR(netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
        <p className="text-[11px] text-slate-500">Net Position in Words</p>
        <p className="font-bold text-[#0F172A]">{amountToIndianWords(netProfit)}</p>
      </div>
    </div>
  );
};
