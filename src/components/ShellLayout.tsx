import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  LogOut,
  MessageCircle,
  ReceiptIndianRupee,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { AdminTab, StaffTab } from '../types';
import { t } from '../i18n';
import { BrandMark } from './BrandMark';
import { RtdbStatusBadge } from './FirebaseSetupBanner';
import { formatDateTimeShort } from '../utils/helpers';

interface ShellLayoutProps {
  portalMode: 'admin' | 'staff';
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  onExitMasterInspect?: () => void;
  children: React.ReactNode;
}

export const ShellLayout: React.FC<ShellLayoutProps> = ({
  portalMode,
  activeTab,
  onSelectTab,
  onGoBack,
  canGoBack = false,
  onExitMasterInspect,
  children,
}) => {
  const {
    state,
    session,
    activeCompany,
    lang,
    toggleLang,
    logout,
    openWhatsAppModal,
    openGPayModal,
    markAllNotificationsRead,
    clearNotifications,
    openLightbox,
  } = useErp();

  const [notifOpen, setNotifOpen] = useState(false);

  const isAdminView = portalMode === 'admin';
  const isMasterInspecting = session?.role === 'master_admin' && Boolean(onExitMasterInspect);
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const adminNav: {
    id: AdminTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'today', label: t(lang, 'tabToday'), shortLabel: 'Today', icon: Users },
    { id: 'works', label: t(lang, 'tabWorks'), shortLabel: 'Works', icon: Briefcase },
    { id: 'pnl', label: t(lang, 'tabPnl'), shortLabel: 'P&L', icon: TrendingUp },
    { id: 'payroll', label: t(lang, 'tabPayroll'), shortLabel: 'Payroll', icon: Wallet },
    { id: 'customers', label: t(lang, 'tabCustomers'), shortLabel: 'Studios', icon: Building2 },
    { id: 'staff', label: t(lang, 'tabStaff'), shortLabel: 'Staff', icon: UserCog },
  ];

  const staffNav: {
    id: StaffTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'punch', label: t(lang, 'tabPunch'), shortLabel: 'Punch', icon: CalendarClock },
    { id: 'salary', label: t(lang, 'tabSalary'), shortLabel: 'Salary', icon: ReceiptIndianRupee },
    { id: 'customers', label: t(lang, 'tabStaffCustomers'), shortLabel: 'Studios', icon: Building2 },
    { id: 'requests', label: t(lang, 'tabRequests'), shortLabel: 'Claims', icon: FileSpreadsheet },
  ];

  const navItems = isAdminView ? adminNav : staffNav;
  const activeNavObj = navItems.find((item) => item.id === activeTab) || navItems[0];

  const pendingConfirmationsCount = !isAdminView
    ? state.payments.filter(
        (p) => p.staffId === session?.userId && p.confirmationStatus === 'pending'
      ).length
    : state.payments.filter((p) => p.confirmationStatus === 'pending').length;

  const companyName = activeCompany?.name || 'Workspace';
  const companyBadge = activeCompany?.badge || 'CO';
  const companyAddress = activeCompany?.address || activeCompany?.tagline || '';
  const companyPhone = activeCompany?.phone || '';

  const handleToggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && unreadCount > 0) {
      markAllNotificationsRead();
    }
  };

  const handleQuickGPay = () => {
    const firstStaff = state.staff.find((s) => s.active) || state.staff[0];
    if (!firstStaff) return;
    openGPayModal({
      staffId: firstStaff.id,
      staffName: firstStaff.name,
      upiId: firstStaff.upiId,
      phone: firstStaff.phone,
      suggestedAmount: firstStaff.dailyWage,
      defaultNote: `Quick Payout — ${firstStaff.name}`,
    });
  };

  const handleQuickWhatsApp = () => {
    openWhatsAppModal({
      phone: companyPhone,
      recipientName: companyName,
      message: `Hello ${companyName} Team,\n`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0B1120] flex">
      {/* ============================================================
          DEDICATED DESKTOP COMMAND SIDEBAR (lg: >= 1024px)
      ============================================================ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 lg:left-0 bg-[#0B1120] text-white border-r border-slate-800/80 z-40 no-print">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {activeCompany?.badge ? (
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-400/30">
                {companyBadge.slice(0, 3).toUpperCase()}
              </div>
            ) : (
              <BrandMark size={38} className="shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-white truncate">
                {companyName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {activeCompany?.tagline || (isAdminView ? t(lang, 'adminPortal') : t(lang, 'staffPortal'))}
              </p>
            </div>
          </div>

          <div className="mt-4 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs font-bold text-white truncate">
              {isMasterInspecting ? 'Master Admin Inspection' : session?.name}
            </p>
            <p className="text-[11px] text-[#FBBF24] truncate">
              {isAdminView ? t(lang, 'adminPortal') : t(lang, 'staffPortal')}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const showBadge =
              (item.id === 'salary' || item.id === 'payroll') && pendingConfirmationsCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 transition-colors ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {showBadge && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      active ? 'bg-white/20 text-white' : 'bg-[#D97706] text-white'
                    }`}
                  >
                    {pendingConfirmationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2.5">
          <div className="px-2 py-1">
            <RtdbStatusBadge dark />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickWhatsApp}
              className="min-h-[38px] px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            {isAdminView && state.staff.length > 0 ? (
              <button
                type="button"
                onClick={handleQuickGPay}
                className="min-h-[38px] px-2.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Wallet className="w-3.5 h-3.5" />
                Quick GPay
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleLang}
                className="min-h-[38px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
                {lang === 'en' ? 'മലയാളം' : 'EN'}
              </button>
            )}
          </div>

          {isAdminView && (
            <button
              type="button"
              onClick={toggleLang}
              className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
              {lang === 'en' ? 'Switch to മലയാളം' : 'Switch to English'}
            </button>
          )}

          {isMasterInspecting && onExitMasterInspect ? (
            <button
              type="button"
              onClick={onExitMasterInspect}
              className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-[#FBBF24] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Companies
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t(lang, 'signOut')}
            </button>
          )}
        </div>
      </aside>

      {/* ============================================================
          MAIN VIEWPORT COLUMN
      ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[264px]">
        {/* Master Admin Inspection Banner (ONLY visible when Master Admin opens a Company View) */}
        {isMasterInspecting && onExitMasterInspect && (
          <div className="bg-[#070B14] text-white px-4 sm:px-6 py-2.5 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#FBBF24] shrink-0" />
              <span className="text-slate-300">Viewing Company:</span>
              <strong className="text-white">{companyName}</strong>
              <span className="hidden sm:inline font-mono text-slate-400">
                (/c/{activeCompany?.slug})
              </span>
            </div>
            <button
              type="button"
              onClick={onExitMasterInspect}
              className="min-h-[34px] px-3 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Companies
            </button>
          </div>
        )}

        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            {canGoBack && onGoBack ? (
              <button
                type="button"
                onClick={onGoBack}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 transition-colors"
                aria-label={t(lang, 'back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="lg:hidden w-8 h-8 rounded-lg bg-[#0B1120] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {companyBadge.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#0B1120] truncate">
                {activeNavObj.label}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {companyName}
                {companyAddress ? ` · ${companyAddress}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:block pr-2">
              <RtdbStatusBadge />
            </div>

            <button
              type="button"
              onClick={toggleLang}
              className="lg:hidden min-h-[40px] px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0B1120] flex items-center gap-1 whitespace-nowrap"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{lang === 'en' ? 'ML' : 'EN'}</span>
            </button>

            {/* Notification Bell (Only for Admin view or relevant notifications) */}
            {isAdminView && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className="relative min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
                  aria-label={t(lang, 'notifications')}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-[320px] sm:w-[380px] max-h-[70vh] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0B1120]">
                          {t(lang, 'notifications')} ({state.notifications.length})
                        </span>
                        <div className="flex items-center gap-2">
                          {state.notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={clearNotifications}
                              className="text-[11px] font-semibold text-slate-500 hover:text-[#DC2626] flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              {t(lang, 'clearAll')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setNotifOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            aria-label="Close notifications"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto divide-y divide-slate-100">
                        {state.notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            {t(lang, 'noNotifications')}
                          </div>
                        ) : (
                          state.notifications.slice(0, 20).map((n) => (
                            <div
                              key={n.id}
                              className="p-3.5 hover:bg-slate-50 flex items-start gap-3"
                            >
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  n.type === 'payment_confirmed'
                                    ? 'text-[#059669]'
                                    : n.type === 'payment_issue'
                                    ? 'text-[#DC2626]'
                                    : 'text-[#2563EB]'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[#0B1120] leading-snug">
                                  {n.title}
                                </p>
                                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">
                                  {formatDateTimeShort(n.timestamp)}
                                </p>
                              </div>
                              {n.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => openLightbox(n.imageUrl!)}
                                  className="shrink-0"
                                >
                                  <img
                                    src={n.imageUrl}
                                    alt="Attachment"
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                  />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isMasterInspecting && (
              <button
                type="button"
                onClick={logout}
                className="lg:hidden min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-700 hover:text-[#DC2626] flex items-center justify-center transition-colors"
                aria-label={t(lang, 'signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom App Nav Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-safe shadow-[0_-4px_20px_rgba(11,17,32,0.06)] no-print"
      >
        <div
          className={`grid gap-1 max-w-lg mx-auto ${
            navItems.length === 6 ? 'grid-cols-6' : 'grid-cols-4'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge =
              (item.id === 'salary' || item.id === 'payroll') && pendingConfirmationsCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'text-slate-500 hover:text-[#0B1120]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-tight truncate max-w-full px-0.5">
                  {item.shortLabel}
                </span>
                {badge && (
                  <span className="absolute top-1 right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-[#D97706] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                    {pendingConfirmationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
