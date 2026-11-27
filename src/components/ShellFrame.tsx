import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Languages,
  LogOut,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../context/StaffOnlineContext';
import { t } from '../i18n';
import { BrandLogo } from './BrandLogo';

export interface ShellNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

interface ShellFrameProps {
  roleLabel: string;
  companyName?: string;
  companySubtitle?: string;
  pageTitle: string;
  navItems: ShellNavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  showNotifications?: boolean;
  topBanner?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const ShellFrame: React.FC<ShellFrameProps> = ({
  roleLabel,
  companyName,
  companySubtitle,
  pageTitle,
  navItems,
  activeTab,
  onSelectTab,
  showNotifications = true,
  topBanner,
  headerExtra,
  children,
}) => {
  const {
    lang,
    toggleLang,
    session,
    activeDb,
    logout,
    setNotificationsOpen,
  } = useStaffOnline();

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const unreadCount = activeDb.notifications.filter((n) => {
    if (n.read || !session) return false;
    if (session.role === 'staff') {
      return n.targetRole === 'all' || (n.targetRole === 'staff' && n.targetStaffId === session.staffId);
    }
    return n.targetRole === 'company_admin' || n.targetRole === 'all';
  }).length;

  const hasOverflowMobileTabs = navItems.length > 5;
  const mobilePrimaryTabs = hasOverflowMobileTabs ? navItems.slice(0, 4) : navItems;
  const mobileSecondaryTabs = hasOverflowMobileTabs ? navItems.slice(4) : [];
  const activeInSecondary = mobileSecondaryTabs.some((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Desktop Command Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col w-[264px] shrink-0 bg-[#0B1120] text-white sticky top-0 h-screen border-r border-slate-800/80 no-print">
        <div className="px-5 py-5 border-b border-white/10">
          <BrandLogo variant="dark" size="md" companyName={companyName} />
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-sky-300 truncate">{roleLabel}</span>
            {companySubtitle && <span className="truncate text-slate-400">{companySubtitle}</span>}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl flex items-center justify-between gap-2.5 text-left text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-[0_6px_18px_-6px_rgba(37,99,235,0.75)]'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-white/10 space-y-2.5">
          <div className="px-2.5 py-2 rounded-xl bg-white/5 text-xs">
            <p className="font-semibold text-white truncate">{session?.name}</p>
            <p className="text-[11px] font-mono text-slate-400 truncate">{session?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[40px] px-3.5 rounded-xl bg-white/8 hover:bg-rose-500/20 text-slate-200 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t(lang, 'logout')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {topBanner && <div className="no-print">{topBanner}</div>}

        {/* Sticky Frosted Header (Desktop + Mobile) */}
        <header className="sticky top-0 z-40 bg-white/88 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-7 h-15 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <BrandLogo variant="light" size="sm" showWordmark={false} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-display font-bold text-[#0F172A] truncate">
                {pageTitle}
              </h1>
              {companyName && (
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                  {companyName} {companySubtitle ? `· ${companySubtitle}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}

            <button
              type="button"
              onClick={toggleLang}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Toggle Malayalam / English"
            >
              <Languages className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{lang === 'en' ? 'മലയാളം' : 'English'}</span>
            </button>

            {showNotifications && (
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-7 py-5 lg:py-6 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Native Mobile Floating Bottom Navigation (< 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 pb-[env(safe-area-inset-bottom)] no-print"
      >
        <div className="grid grid-cols-5 gap-1 py-1.5" style={{ gridTemplateColumns: `repeat(${hasOverflowMobileTabs ? 5 : mobilePrimaryTabs.length}, minmax(0, 1fr))` }}>
          {mobilePrimaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMoreOpen(false);
                }}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 transition-colors relative ${
                  isActive ? 'text-[#2563EB] bg-blue-50/80 font-bold' : 'text-slate-500 font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] leading-tight truncate max-w-full">
                  {item.shortLabel || item.label}
                </span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute top-1 right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          {hasOverflowMobileTabs && (
            <button
              type="button"
              onClick={() => setMobileMoreOpen(true)}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                activeInSecondary || mobileMoreOpen
                  ? 'text-[#2563EB] bg-blue-50/80 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <MoreHorizontal className="w-4 h-4 shrink-0" />
              <span className="text-[10px] leading-tight">{t(lang, 'more')}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile "More" Slide-Up Bottom Sheet Drawer */}
      {mobileMoreOpen && hasOverflowMobileTabs && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end no-print"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 pb-8 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <p className="text-sm font-bold text-[#0F172A]">More Modules</p>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {mobileSecondaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMoreOpen(false);
                    }}
                    className={`w-full min-h-[48px] px-4 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#2563EB]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
