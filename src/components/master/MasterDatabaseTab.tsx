import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { EMPTY_COMPANY_DB } from '../../types';
import { formatINR, getRateModeLabel } from '../../utils/helpers';

type ExplorerSection = 'staff' | 'attendance' | 'payments' | 'pnl';

export const MasterDatabaseTab: React.FC = () => {
  const { companies, allCompanyDatabases, setInspectingCompanyId } = useErp();

  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [section, setSection] = useState<ExplorerSection>('staff');

  const scopedCompanies = useMemo(() => {
    if (companyFilter === 'all') return companies;
    return companies.filter((c) => c.id === companyFilter);
  }, [companies, companyFilter]);

  const combinedStaff = useMemo(
    () =>
      scopedCompanies.flatMap((c) =>
        (allCompanyDatabases[c.id] || EMPTY_COMPANY_DB).staff.map((s) => ({
          company: c,
          staff: s,
        }))
      ),
    [scopedCompanies, allCompanyDatabases]
  );

  const combinedAttendance = useMemo(
    () =>
      scopedCompanies
        .flatMap((c) =>
          (allCompanyDatabases[c.id] || EMPTY_COMPANY_DB).attendance.map((a) => ({
            company: c,
            att: a,
          }))
        )
        .sort((x, y) => (y.att.punchInTime || y.att.date).localeCompare(x.att.punchInTime || x.att.date)),
    [scopedCompanies, allCompanyDatabases]
  );

  const combinedPayments = useMemo(
    () =>
      scopedCompanies
        .flatMap((c) =>
          (allCompanyDatabases[c.id] || EMPTY_COMPANY_DB).payments.map((p) => ({
            company: c,
            payment: p,
          }))
        )
        .sort((x, y) => (y.payment.createdAt || y.payment.date).localeCompare(x.payment.createdAt || x.payment.date)),
    [scopedCompanies, allCompanyDatabases]
  );

  const pnlByCompany = useMemo(
    () =>
      scopedCompanies.map((c) => {
        const db = allCompanyDatabases[c.id] || EMPTY_COMPANY_DB;
        const income =
          db.ledger.filter((l) => l.type === 'income').reduce((s, l) => s + l.amount, 0) +
          db.works.reduce((s, w) => s + w.billReceived, 0);
        const compExp = db.ledger
          .filter((l) => l.type === 'expense')
          .reduce((s, l) => s + l.amount, 0);
        const staffExp = db.expenses
          .filter((e) => e.status === 'approved')
          .reduce((s, e) => s + e.amount, 0);
        const subCost = db.works
          .filter((w) => w.hasSubContract)
          .reduce((s, w) => s + w.subContractTotal, 0);
        const wages = db.attendance.reduce((s, a) => s + a.wageEarned, 0);
        const net = income - (compExp + staffExp + subCost + wages);
        return { company: c, income, compExp, staffExp, subCost, wages, net };
      }),
    [scopedCompanies, allCompanyDatabases]
  );

  return (
    <div className="space-y-5">
      {/* Unified Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'staff', label: `Staff (${combinedStaff.length})` },
              { id: 'attendance', label: `Attendance (${combinedAttendance.length})` },
              { id: 'payments', label: `Payments (${combinedPayments.length})` },
              { id: 'pnl', label: `Financial P&L (${pnlByCompany.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                section === tab.id
                  ? 'bg-[#0B1120] text-white border-[#0B1120]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold min-w-[200px]"
          >
            <option value="all">All Companies ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section Tables */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {section === 'staff' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-4 font-semibold">Staff Name &amp; Role</th>
                  <th className="py-3 px-4 font-semibold">Login / UPI</th>
                  <th className="py-3 px-4 font-semibold text-right">Daily Wage</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No staff records found for selected company filter.
                    </td>
                  </tr>
                ) : (
                  combinedStaff.map(({ company, staff }) => (
                    <tr key={`${company.id}_${staff.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#2563EB] whitespace-nowrap">
                        {company.name}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#0B1120]">{staff.name}</p>
                        <p className="text-[11px] text-slate-500">{staff.role}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>{staff.email}</div>
                        <div className="text-[11px] text-slate-400">{staff.upiId}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {formatINR(staff.dailyWage)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            staff.active ? 'text-[#059669]' : 'text-[#DC2626]'
                          }`}
                        >
                          {staff.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {section === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-4 font-semibold">Date &amp; Staff</th>
                  <th className="py-3 px-4 font-semibold">Venue &amp; Route</th>
                  <th className="py-3 px-4 font-semibold">Rate Mode</th>
                  <th className="py-3 px-4 font-semibold text-right">Wage</th>
                  <th className="py-3 px-4 font-semibold text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  combinedAttendance.map(({ company, att }) => (
                    <tr key={`${company.id}_${att.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#2563EB] whitespace-nowrap">
                        {company.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-[#0B1120]">{att.staffName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{att.date}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{att.venue}</p>
                        <p className="text-[11px] text-slate-500">
                          {att.fromLocation} → {att.toLocation}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getRateModeLabel(att.rateMode)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {formatINR(att.wageEarned)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            att.status === 'working' ? 'text-[#059669]' : 'text-slate-600'
                          }`}
                        >
                          {att.status === 'working' ? 'Live Now' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {section === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-4 font-semibold">Date &amp; Staff</th>
                  <th className="py-3 px-4 font-semibold">Mode / UTR</th>
                  <th className="py-3 px-4 font-semibold">Confirmation</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No salary payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  combinedPayments.map(({ company, payment }) => (
                    <tr key={`${company.id}_${payment.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#2563EB] whitespace-nowrap">
                        {company.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-[#0B1120]">{payment.staffName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{payment.date}</p>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="uppercase font-semibold">{payment.mode}</span>
                        {payment.utr ? ` · ${payment.utr}` : ''}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {payment.confirmationStatus === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#059669]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </span>
                        ) : payment.confirmationStatus === 'issue' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#DC2626]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Issue Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[#D97706]">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Staff
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {formatINR(payment.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {section === 'pnl' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Income</th>
                  <th className="py-3 px-4 font-semibold text-right">Expenses + Sub</th>
                  <th className="py-3 px-4 font-semibold text-right">Staff Wages</th>
                  <th className="py-3 px-4 font-semibold text-right">Net P&amp;L</th>
                  <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pnlByCompany.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No companies to analyze yet.
                    </td>
                  </tr>
                ) : (
                  pnlByCompany.map((row) => (
                    <tr key={row.company.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-[#0B1120] whitespace-nowrap">
                        {row.company.name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669] tabular-nums">
                        {formatINR(row.income)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {formatINR(row.compExp + row.staffExp + row.subCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#2563EB] tabular-nums">
                        {formatINR(row.wages)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-extrabold tabular-nums ${
                          row.net >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
                        }`}
                      >
                        {formatINR(row.net)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingCompanyId(row.company.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B1120] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#FBBF24]" />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
