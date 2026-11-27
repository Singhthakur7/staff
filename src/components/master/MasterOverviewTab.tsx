import React, { useMemo } from 'react';
import {
  Activity,
  Building2,
  Clock,
  Eye,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { EMPTY_COMPANY_DB } from '../../types';
import { formatDateTimeShort, formatINR } from '../../utils/helpers';

interface MasterOverviewTabProps {
  onGoToCompanies: () => void;
}

export const MasterOverviewTab: React.FC<MasterOverviewTabProps> = ({ onGoToCompanies }) => {
  const { companies, allCompanyDatabases, setInspectingCompanyId } = useErp();

  const stats = useMemo(() => {
    let activeCompanies = 0;
    let suspendedCompanies = 0;
    let totalStaff = 0;
    let liveWorkingToday = 0;
    let combinedRevenue = 0;
    let combinedOutflow = 0;
    let totalPendingPayroll = 0;

    companies.forEach((comp) => {
      if (comp.active) activeCompanies += 1;
      else suspendedCompanies += 1;

      const db = allCompanyDatabases[comp.id] || EMPTY_COMPANY_DB;
      totalStaff += db.staff.length;
      liveWorkingToday += db.attendance.filter((a) => a.status === 'working').length;

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

      combinedRevenue += income;
      combinedOutflow += compExp + staffExp + subCost + wages;

      db.staff.forEach((st) => {
        const stEarned =
          db.attendance.filter((a) => a.staffId === st.id).reduce((s, a) => s + a.wageEarned, 0) +
          db.expenses
            .filter((e) => e.staffId === st.id && e.status === 'approved')
            .reduce((s, e) => s + e.amount, 0);
        const stPaid = db.payments
          .filter((p) => p.staffId === st.id)
          .reduce((s, p) => s + p.amount, 0);
        totalPendingPayroll += Math.max(0, stEarned - stPaid);
      });
    });

    return {
      activeCompanies,
      suspendedCompanies,
      totalStaff,
      liveWorkingToday,
      combinedRevenue,
      combinedNetPnL: combinedRevenue - combinedOutflow,
      totalPendingPayroll,
    };
  }, [companies, allCompanyDatabases]);

  const globalFeed = useMemo(() => {
    const items: {
      id: string;
      companyId: string;
      companyName: string;
      companyBadge: string;
      title: string;
      message: string;
      timestamp: string;
      type: string;
    }[] = [];

    companies.forEach((comp) => {
      const db = allCompanyDatabases[comp.id] || EMPTY_COMPANY_DB;
      db.notifications.forEach((n) => {
        items.push({
          id: `${comp.id}_${n.id}`,
          companyId: comp.id,
          companyName: comp.name,
          companyBadge: comp.badge,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          type: n.type,
        });
      });
    });

    return items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 35);
  }, [companies, allCompanyDatabases]);

  return (
    <div className="space-y-6">
      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Companies</span>
            <Building2 className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {companies.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.activeCompanies} Active · {stats.suspendedCompanies} Suspended
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">All Staff Total</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {stats.totalStaff}
          </p>
          <p className="text-xs text-slate-500 mt-1">Across all companies</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Working Now</span>
            <Clock className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#059669] mt-2">
            {stats.liveWorkingToday}
          </p>
          <p className="text-xs text-slate-500 mt-1">Active field shifts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Combined Net P&amp;L</span>
            {stats.combinedNetPnL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#059669]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
            )}
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-2 ${
              stats.combinedNetPnL >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {formatINR(stats.combinedNetPnL)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Rev {formatINR(stats.combinedRevenue)}
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Payroll</span>
            <Wallet className="w-4 h-4 text-[#D97706]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {formatINR(stats.totalPendingPayroll)}
          </p>
          <p className="text-xs text-slate-500 mt-1">All unpaid staff balances</p>
        </div>
      </div>

      {/* Empty state CTA when zero companies provisioned yet */}
      {companies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <Building2 className="w-10 h-10 text-[#2563EB] mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-[#0B1120]">No Companies Provisioned Yet</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Create your first tenant company to automatically generate its isolated Cloud
              Firestore workspace, Company Admin Panel link, and Staff Portal link.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCompanies}
            className="min-h-[46px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Quick Company Switcher Table */}
          <section className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0B1120]">
                Tenant Companies Live Snapshot ({companies.length})
              </h2>
              <button
                type="button"
                onClick={onGoToCompanies}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Manage All
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {companies.map((comp) => {
                const db = allCompanyDatabases[comp.id] || EMPTY_COMPANY_DB;
                const liveNow = db.attendance.filter((a) => a.status === 'working').length;
                return (
                  <div
                    key={comp.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0B1120] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {comp.badge.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0B1120] truncate">
                          {comp.name}{' '}
                          <span
                            className={`text-xs font-semibold ${
                              comp.active ? 'text-[#059669]' : 'text-[#DC2626]'
                            }`}
                          >
                            · {comp.active ? 'Active' : 'Suspended'}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          /c/{comp.slug} · {db.staff.length} Staff · {liveNow} Live · {db.works.length} Works
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectingCompanyId(comp.id)}
                      className="min-h-[38px] px-3.5 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#FBBF24]" />
                      Inspect Live DB
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real-Time Global Activity Feed */}
          <section className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#0B1120]">
                Global Activity Feed ({globalFeed.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {globalFeed.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Live events across all companies (staff logins, punches, payment confirmations,
                  expenses) will stream here in real time.
                </div>
              ) : (
                globalFeed.map((item) => (
                  <div key={item.id} className="p-4 space-y-1 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[#2563EB] truncate">{item.companyName}</span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {formatDateTimeShort(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#0B1120]">{item.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
