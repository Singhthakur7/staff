import React from 'react';
import { Users } from 'lucide-react';
import { CompanyDatabase, CompanyRecord } from '../../types';
import {
  calculateStaffSummary,
  formatDateIN,
  formatINR,
  formatTimeIN,
} from '../../utils/helpers';

interface SuperStaffLedgerTabProps {
  company: CompanyRecord | null;
  db: CompanyDatabase;
}

export const SuperStaffLedgerTab: React.FC<SuperStaffLedgerTabProps> = ({ company, db }) => {
  if (!company) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-sm text-slate-500">
        Select or register a company to inspect its Staff &amp; Salary Ledger.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-display font-bold text-[#0F172A]">
            Staff &amp; Salary Ledger — {company.name}
          </h2>
          <p className="text-xs text-slate-500">
            {db.staff.length} registered staff member{db.staff.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {db.staff.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2 card-elevated">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No staff added in {company.name} yet</p>
          <p className="text-xs text-slate-500">
            Open the Company Admin View to add crew members and record advances or GPay settlements.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {db.staff.map((st) => {
            const sum = calculateStaffSummary(st, db);
            return (
              <div
                key={st.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-[#0F172A]">{st.name}</h3>
                      <span className="text-xs text-slate-500">· {st.role}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sum.dueBadge.className}`}
                      >
                        {sum.dueBadge.label}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-1">
                      Ph: {st.phone || '—'} · GPay UPI: {st.upiId || '—'} · Period:{' '}
                      {formatDateIN(st.periodFrom)} → {formatDateIN(st.periodTo)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">Balance Payable</p>
                    <p className="text-xl font-mono font-extrabold text-[#1E3A8A] tabular-nums">
                      {formatINR(sum.netBalancePayable)}
                    </p>
                  </div>
                </div>

                {/* 4 Breakdown Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                    <p className="text-slate-500">Earned Duty Wages</p>
                    <p className="text-sm font-mono font-bold text-[#0F172A] tabular-nums mt-0.5">
                      {formatINR(sum.earnedDutyWages)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                    <p className="text-slate-500">Approved Expenses</p>
                    <p className="text-sm font-mono font-bold text-[#0F172A] tabular-nums mt-0.5">
                      {formatINR(sum.approvedExpenses)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-3">
                    <p className="text-amber-800">Advances Taken</p>
                    <p className="text-sm font-mono font-bold text-amber-900 tabular-nums mt-0.5">
                      {formatINR(sum.advancesTaken)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-3">
                    <p className="text-emerald-700">GPay / Settled Paid</p>
                    <p className="text-sm font-mono font-bold text-emerald-800 tabular-nums mt-0.5">
                      {formatINR(sum.settledPaid)}
                    </p>
                  </div>
                </div>

                {/* Payment / Advance Log */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    Complete Payment &amp; Advance Log ({sum.payments.length})
                  </p>
                  {sum.payments.length === 0 ? (
                    <p className="text-xs text-slate-400">No payments or advances logged yet.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                      <table className="w-full text-[11px] min-w-[620px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="text-left px-3 py-2 font-semibold">Amount</th>
                            <th className="text-left px-3 py-2 font-semibold">Mode / Type</th>
                            <th className="text-left px-3 py-2 font-semibold">
                              Date Taken (എന്ന് കൊടുത്തു)
                            </th>
                            <th className="text-left px-3 py-2 font-semibold">
                              Time Taken (എപ്പോൾ)
                            </th>
                            <th className="text-left px-3 py-2 font-semibold">Due Date</th>
                            <th className="text-left px-3 py-2 font-semibold">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sum.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 font-mono font-bold text-[#0F172A] tabular-nums">
                                {formatINR(p.amount)}
                              </td>
                              <td className="px-3 py-2 uppercase font-semibold text-slate-700">
                                {p.mode} · {p.kind}
                              </td>
                              <td className="px-3 py-2 font-mono">{formatDateIN(p.date)}</td>
                              <td className="px-3 py-2 font-mono">{formatTimeIN(p.time)}</td>
                              <td className="px-3 py-2 font-mono">{formatDateIN(p.dueDate)}</td>
                              <td className="px-3 py-2 text-slate-600">{p.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
