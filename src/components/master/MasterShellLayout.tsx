import React from 'react';
import {
  Building2,
  Database,
  Globe,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { MasterTab } from '../../types';
import { t } from '../../i18n';
import { BrandMark } from '../BrandMark';
import { RtdbStatusBadge } from '../FirebaseSetupBanner';

interface MasterShellLayoutProps {
  activeTab: MasterTab;
  onSelectTab: (tab: MasterTab) => void;
  children: React.ReactNode;
}

export const MasterShellLayout: React.FC<MasterShellLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const { masterConfig, session, companies, lang, toggleLang, logout } = useErp();

  const navItems: {
    id: MasterTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: t(lang, 'tabMasterOverview'), shortLabel: 'Overview', icon: LayoutDashboard },
    { id: 'companies', label: t(lang, 'tabMasterCompanies'), shortLabel: 'Companies', icon: Building2 },
    { id: 'database', label: t(lang, 'tabMasterDatabase'), shortLabel: 'All DB', icon: Database },
    { id: 'settings', label: t(lang, 'tabMasterSettings'), shortLabel: 'Settings', icon: Settings },
  ];

  const activeObj = navItems.find((i) => i.id === activeTab) || navItems[0];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0B1120] flex">
      {/* Desktop Master Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[272px] lg:fixed lg:inset-y-0 lg:left-0 bg-[#070B14] text-white border-r border-slate-800 z-40 no-print">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <BrandMark size={38} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-white truncate">
                {masterConfig.brandName || 'AuraERP Cloud'}
              </p>
              <p className="text-[11px] text-[#FBBF24] truncate font-semibold">
                {t(lang, 'masterPortal')}
              </p>
            </div>
          </div>

          <div className="mt-4 px-3 py-2.5 rounded-xl bg-white/5 border border-amber-500/20 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FBBF24]" />
                Super Admin
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                {session?.email || masterConfig.supportEmail}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 transition-colors ${
                  active
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'companies' && (
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/15">
                    {companies.length}
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
          <button
            type="button"
            onClick={toggleLang}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#FBBF24]" />
            {lang === 'en' ? 'Switch to മലയാളം' : 'Switch to English'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t(lang, 'signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[272px]">
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lg:hidden shrink-0">
              <BrandMark size={32} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#0B1120] truncate">
                {activeObj.label}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {masterConfig.brandName} · Multi-Tenant SaaS Owner Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <RtdbStatusBadge />
            <button
              type="button"
              onClick={toggleLang}
              className="lg:hidden min-h-[38px] px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0B1120] flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
              {lang === 'en' ? 'ML' : 'EN'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="lg:hidden min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-[#DC2626] flex items-center justify-center"
              aria-label={t(lang, 'signOut')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Master Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070B14]/95 backdrop-blur-md border-t border-slate-800 px-2 pt-1.5 pb-safe no-print"
      >
        <div className="grid grid-cols-4 gap-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
