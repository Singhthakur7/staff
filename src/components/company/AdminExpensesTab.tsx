import React from 'react';
import { CheckCircle2, Receipt, XCircle } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { formatDateIN, formatINR } from '../../utils/helpers';

export const AdminExpensesTab: React.FC = () => {
  const { activeDb, reviewExpense, openLightbox } = useStaffOnline();

  const pending = activeDb.expenses.filter((e) => e.status === 'pending');
  const history = activeDb.expenses.filter((e) => e.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Approval Queue */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              Pending Staff Expenses ({pending.length})
            </h2>
            <p className="text-xs text-slate-500">
              Approved expenses automatically credit into the staff member&apos;s Formal Salary
              Slip.
            </p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-500">No pending expense claims.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((exp) => (
              <div
                key={exp.id}
                className="border border-amber-200/80 bg-amber-50/30 rounded-2xl p-4 flex flex-col sm:flex-row gap-4"
              >
                {exp.billPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => openLightbox(exp.billPhotoUrl!)}
                    className="w-full sm:w-24 h-36 sm:h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0"
                  >
                    <img
                      src={exp.billPhotoUrl}
                      alt={`Bill by ${exp.staffName}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{exp.staffName}</p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {formatDateIN(exp.date)}
                      </p>
                    </div>
                    <p className="text-base font-mono font-extrabold text-[#0F172A] tabular-nums">
                      {formatINR(exp.amount)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-700">{exp.description}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void reviewExpense(exp.id, 'approved')}
                      className="flex-1 min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewExpense(exp.id, 'rejected')}
                      className="flex-1 min-h-[38px] px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Expense History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F172A]">
            Reviewed Expense History ({history.length})
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No reviewed expense claims yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((exp) => (
              <div
                key={exp.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {exp.billPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(exp.billPhotoUrl!)}
                      className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                    >
                      <img
                        src={exp.billPhotoUrl}
                        alt="Bill thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">
                      {exp.staffName} — {exp.description}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {formatDateIN(exp.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs font-mono font-bold text-[#0F172A] tabular-nums">
                    {formatINR(exp.amount)}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      exp.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                    }`}
                  >
                    {exp.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
