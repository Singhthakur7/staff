import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Megaphone,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { t } from '../../i18n';
import { StaffTab } from '../../types';
import {
  calculateStaffSummary,
  formatINR,
  formatTimeIN,
} from '../../utils/helpers';
import { ShellFrame, ShellNavItem } from '../ShellFrame';
import { StaffDutyTab } from './StaffDutyTab';
import { StaffExpensesTab } from './StaffExpensesTab';
import { StaffSalaryTab } from './StaffSalaryTab';

export const StaffPortal: React.FC = () => {
  const {
    lang,
    session,
    activeCompany,
    activeDb,
    acknowledgeInstruction,
    openLightbox,
  } = useStaffOnline();

  const [activeTab, setActiveTab] = useState<StaffTab>('duty');

  const staff = useMemo(
    () => activeDb.staff.find((s) => s.id === session?.staffId) || null,
    [activeDb.staff, session?.staffId]
  );

  const summary = useMemo(
    () => (staff ? calculateStaffSummary(staff, activeDb) : null),
    [staff, activeDb]
  );

  const unreadInstructions = useMemo(
    () =>
      staff
        ? activeDb.instructions.filter((i) => i.staffId === staff.id && !i.acknowledged)
        : [],
    [activeDb.instructions, staff]
  );

  if (!activeCompany || !staff || !summary) return null;

  const navItems: ShellNavItem[] = [
    {
      id: 'duty',
      label: t(lang, 'staffDuty'),
      shortLabel: 'Duty',
      icon: ClipboardList,
    },
    {
      id: 'salary',
      label: t(lang, 'staffSalary'),
      shortLabel: 'Salary Slip',
      icon: FileSpreadsheet,
      badgeCount: summary.pendingConfirmationCount,
    },
    {
      id: 'expenses',
      label: t(lang, 'staffExpenses'),
      shortLabel: 'Expenses',
      icon: Receipt,
    },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab);

  return (
    <ShellFrame
      roleLabel={staff.role}
      companyName={activeCompany.name}
      companySubtitle={activeCompany.place}
      pageTitle={activeNav?.label || 'Staff Portal'}
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as StaffTab)}
    >
      <div className="space-y-6">
        {/* Verified Live Selfie Profile Header + 3 KPI Cards */}
        <div className="space-y-4 no-print">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => session?.verifiedSelfieUrl && openLightbox(session.verifiedSelfieUrl)}
                className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/70 bg-slate-900 shrink-0 shadow-xs"
                title="Click to zoom verified live selfie"
              >
                {session?.verifiedSelfieUrl ? (
                  <img
                    src={session.verifiedSelfieUrl}
                    alt={`${staff.name} verified selfie`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-display font-extrabold text-[#0F172A] truncate">
                    {staff.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified at {formatTimeIN(session?.verifiedAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {staff.role} · {activeCompany.name} ({activeCompany.place})
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${summary.dueBadge.className}`}
            >
              {summary.dueBadge.label}
            </span>
          </div>

          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-slate-500">
                {t(lang, 'earnedWages')} (ഡ്യൂട്ടി വേതനം)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#0F172A] tabular-nums mt-1">
                {formatINR(summary.earnedDutyWages)}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-amber-800">
                {t(lang, 'advancesPaid')} (അഡ്വാൻസ് / Paid)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-amber-700 tabular-nums mt-1">
                {formatINR(summary.totalDeducted)}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
              <p className="text-xs font-medium text-[#1E3A8A]">
                {t(lang, 'netBalance')} (ബാലൻസ് ലഭിക്കാൻ)
              </p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#1E3A8A] tabular-nums mt-1">
                {formatINR(summary.netBalancePayable)}
              </p>
            </div>
          </div>

          {/* Live Admin Instructions Banner */}
          {unreadInstructions.length > 0 && (
            <div className="space-y-2">
              {unreadInstructions.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#1E3A8A]">Live Admin Instruction</p>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{inst.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void acknowledgeInstruction(inst.id)}
                    className="min-h-[38px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold shrink-0"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Staff Tab */}
        {activeTab === 'duty' && <StaffDutyTab staff={staff} />}
        {activeTab === 'salary' && <StaffSalaryTab staff={staff} />}
        {activeTab === 'expenses' && <StaffExpensesTab staff={staff} />}
      </div>
    </ShellFrame>
  );
};
