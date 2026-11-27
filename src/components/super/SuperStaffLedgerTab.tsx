import React, { useState } from 'react';
import { Camera, Edit3, Users } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { CompanyDatabase, CompanyRecord, StaffMember } from '../../types';
import {
  calculateStaffSummary,
  formatDateIN,
  formatDateTimeIN,
  formatINR,
  formatTimeIN,
} from '../../utils/helpers';
import { EditStaffModal } from '../EditStaffModal';

interface SuperStaffLedgerTabProps {
  company: CompanyRecord | null;
  db: CompanyDatabase;
}

export const SuperStaffLedgerTab: React.FC<SuperStaffLedgerTabProps> = ({ company, db }) => {
  const { openLightbox, updateStaff } = useStaffOnline();
  const [editingModalStaff, setEditingModalStaff] = useState<StaffMember | null>(null);

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
            const latestSelfie = db.punchLogs.find((p) => p.staffId === st.id && p.selfieUrl);
            return (
              <div
                key={st.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {latestSelfie ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(latestSelfie.selfieUrl)}
                        title={`Last verified: ${formatDateTimeIN(latestSelfie.punchInTime || latestSelfie.createdAt)}`}
                        className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative group"
                      >
                        <img
                          src={latestSelfie.selfieUrl}
                          alt={`${st.name} verified selfie`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-700/85 text-[9px] font-bold text-white text-center py-0.5">
                          Selfie ✓
                        </span>
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                        <Camera className="w-4 h-4" />
                        <span className="text-[9px] font-medium mt-0.5">No Selfie</span>
                      </div>
                    )}
                    <div className="min-w-0">
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
                      {latestSelfie && (
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          Last Selfie Verified:{' '}
                          <span className="font-mono">
                            {formatDateTimeIN(latestSelfie.punchInTime || latestSelfie.createdAt)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingModalStaff(st)}
                      className="min-h-[36px] px-3.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-xs font-bold text-[#1E3A8A] inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Balance Payable</p>
                      <p className="text-xl font-mono font-extrabold text-[#1E3A8A] tabular-nums">
                        {formatINR(sum.netBalancePayable)}
                      </p>
                    </div>
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

      <EditStaffModal
        staff={editingModalStaff}
        onClose={() => setEditingModalStaff(null)}
        onSave={async (staffId, updates) => {
          await updateStaff(staffId, updates, company.id);
        }}
      />
    </div>
  );
};
