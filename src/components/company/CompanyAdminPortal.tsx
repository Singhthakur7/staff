import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  FileSpreadsheet,
  FileText,
  Handshake,
  KeyRound,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { t } from '../../i18n';
import { CompanyAdminTab } from '../../types';
import { calculateStaffSummary, formatINR } from '../../utils/helpers';
import { ShellFrame, ShellNavItem } from '../ShellFrame';
import { AdminCustomersTab } from './AdminCustomersTab';
import { AdminExpensesTab } from './AdminExpensesTab';
import { AdminPasswordsTab } from './AdminPasswordsTab';
import { AdminPnlTab } from './AdminPnlTab';
import { AdminPunchesTab } from './AdminPunchesTab';
import { AdminQuotationTab } from './AdminQuotationTab';
import { AdminSalaryTab } from './AdminSalaryTab';
import { AdminSubcontractsTab } from './AdminSubcontractsTab';
import { AdminWorksTab } from './AdminWorksTab';

export const CompanyAdminPortal: React.FC = () => {
  const {
    lang,
    session,
    activeCompany,
    activeDb,
    inspectingCompanyId,
    setInspectingCompanyId,
  } = useStaffOnline();

  const [activeTab, setActiveTab] = useState<CompanyAdminTab>('salary');

  const kpis = useMemo(() => {
    const received = activeDb.customers.reduce((s, c) => s + (Number(c.received) || 0), 0);
    const totalRate = activeDb.customers.reduce((s, c) => s + (Number(c.workRate) || 0), 0);
    const pendingDue = Math.max(0, totalRate - received);
    const staffBalance = activeDb.staff.reduce((s, st) => {
      const sum = calculateStaffSummary(st, activeDb);
      return s + Math.max(0, sum.netBalancePayable);
    }, 0);
    const selfiePunches = activeDb.punchLogs.length;
    const pendingExpenses = activeDb.expenses.filter((e) => e.status === 'pending').length;
    return { received, pendingDue, staffBalance, selfiePunches, pendingExpenses };
  }, [activeDb]);

  if (!activeCompany) return null;

  const navItems: ShellNavItem[] = [
    {
      id: 'salary',
      label: t(lang, 'adminSalary'),
      shortLabel: 'Salary',
      icon: FileSpreadsheet,
    },
    {
      id: 'punches',
      label: t(lang, 'adminPunches'),
      shortLabel: 'Selfies',
      icon: Camera,
      badgeCount: activeDb.punchLogs.filter((p) => p.status === 'active').length,
    },
    {
      id: 'customers',
      label: t(lang, 'adminCustomers'),
      shortLabel: 'Clients',
      icon: Users,
    },
    {
      id: 'works',
      label: t(lang, 'adminWorks'),
      shortLabel: 'Works',
      icon: Briefcase,
    },
    {
      id: 'quotation',
      label: t(lang, 'adminQuotation'),
      shortLabel: 'Invoice',
      icon: FileText,
    },
    {
      id: 'pnl',
      label: t(lang, 'adminPnl'),
      shortLabel: 'P&L',
      icon: TrendingUp,
    },
    {
      id: 'expenses',
      label: t(lang, 'adminExpenses'),
      shortLabel: 'Expenses',
      icon: Receipt,
      badgeCount: kpis.pendingExpenses,
    },
    {
      id: 'subcontracts',
      label: t(lang, 'adminSubcontracts'),
      shortLabel: 'Subcontract',
      icon: Handshake,
    },
    {
      id: 'passwords',
      label: t(lang, 'adminPasswords'),
      shortLabel: 'Passwords',
      icon: KeyRound,
    },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab);

  const planBadgeText =
    activeCompany.planStatus === 'trial'
      ? `Trial ₹0 · ${activeCompany.planYears} Yr`
      : `Annual ₹1,000/Yr · ${activeCompany.planYears} Yr`;

  const inspectorBanner =
    session?.role === 'super_admin' && inspectingCompanyId ? (
      <div className="bg-[#1E3A8A] text-white px-4 lg:px-7 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold">
          Super Admin Inspector Mode — Viewing <strong>{activeCompany.name}</strong> (
          {activeCompany.place})
        </span>
        <button
          type="button"
          onClick={() => setInspectingCompanyId(null)}
          className="px-3 py-1 rounded-lg bg-white text-[#0F172A] font-bold inline-flex items-center gap-1 hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Super Admin
        </button>
      </div>
    ) : null;

  return (
    <ShellFrame
      roleLabel="Company Admin"
      companyName={activeCompany.name}
      companySubtitle={activeCompany.place}
      pageTitle={activeNav?.label || 'Company Admin'}
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as CompanyAdminTab)}
      topBanner={inspectorBanner}
    >
      <div className="space-y-6">
        {/* Executive Company Summary & 4 Bento KPI Cards */}
        <div className="space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-display font-extrabold text-[#0F172A]">
                {activeCompany.name}
              </h2>
              <p className="text-xs text-slate-500">
                {activeCompany.place} {activeCompany.phone ? `· ${activeCompany.phone}` : ''}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeCompany.planStatus === 'trial'
                  ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
              }`}
            >
              {planBadgeText}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-slate-500">
                {t(lang, 'received')} (ലഭിച്ച തുക)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-700 tabular-nums mt-1">
                {formatINR(kpis.received)}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-slate-500">
                {t(lang, 'pendingDue')} (കുടിശ്ശിക)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-amber-700 tabular-nums mt-1">
                {formatINR(kpis.pendingDue)}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-slate-500">
                {t(lang, 'staffBalance')} (സ്റ്റാഫ് ബാലൻസ്)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#1E3A8A] tabular-nums mt-1">
                {formatINR(kpis.staffBalance)}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-slate-500">
                {t(lang, 'selfiePunches')} (സെൽഫി പഞ്ച്)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#0F172A] tabular-nums mt-1">
                {kpis.selfiePunches}
              </p>
            </div>
          </div>
        </div>

        {/* Active Module Viewport */}
        {activeTab === 'salary' && <AdminSalaryTab />}
        {activeTab === 'punches' && <AdminPunchesTab />}
        {activeTab === 'customers' && <AdminCustomersTab />}
        {activeTab === 'quotation' && <AdminQuotationTab />}
        {activeTab === 'pnl' && <AdminPnlTab />}
        {activeTab === 'expenses' && <AdminExpensesTab />}
        {activeTab === 'works' && <AdminWorksTab />}
        {activeTab === 'subcontracts' && <AdminSubcontractsTab />}
        {activeTab === 'passwords' && <AdminPasswordsTab />}
      </div>
    </ShellFrame>
  );
};
