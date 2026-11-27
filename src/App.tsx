import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ErpProvider, useErp } from './context/ErpContext';
import { AdminTab, MasterTab, StaffTab } from './types';
import { AppRoute, navigatePath, parseAppRoute } from './utils/router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StaffLoginScreen } from './components/StaffLoginScreen';
import { CompanyAdminLoginScreen } from './components/CompanyAdminLoginScreen';
import { MasterLoginScreen } from './components/master/MasterLoginScreen';
import { MasterShellLayout } from './components/master/MasterShellLayout';
import { MasterOverviewTab } from './components/master/MasterOverviewTab';
import { MasterCompaniesTab } from './components/master/MasterCompaniesTab';
import { MasterDatabaseTab } from './components/master/MasterDatabaseTab';
import { MasterSettingsTab } from './components/master/MasterSettingsTab';
import { ShellLayout } from './components/ShellLayout';
import { GlobalModals } from './components/GlobalModals';
import { SharedSlipView } from './components/SharedSlipView';
import { AdminTodayTab } from './components/admin/AdminTodayTab';
import { AdminWorksTab } from './components/admin/AdminWorksTab';
import { AdminPnlTab } from './components/admin/AdminPnlTab';
import { AdminPayrollTab } from './components/admin/AdminPayrollTab';
import { AdminCustomersTab } from './components/admin/AdminCustomersTab';
import { AdminStaffTab } from './components/admin/AdminStaffTab';
import { StaffPunchTab } from './components/staff/StaffPunchTab';
import { StaffSalaryTab } from './components/staff/StaffSalaryTab';
import { StaffCustomersTab } from './components/staff/StaffCustomersTab';
import { StaffRequestsTab } from './components/staff/StaffRequestsTab';

const AppWorkspace: React.FC = () => {
  const {
    isBooting,
    session,
    activeCompany,
    inspectingCompanyId,
    setInspectingCompanyId,
  } = useErp();

  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute());
  const [masterTab, setMasterTab] = useState<MasterTab>('overview');
  const [adminTab, setAdminTab] = useState<AdminTab>('today');
  const [adminHistory, setAdminHistory] = useState<AdminTab[]>([]);
  const [staffTab, setStaffTab] = useState<StaffTab>('punch');
  const [staffHistory, setStaffHistory] = useState<StaffTab[]>([]);

  useEffect(() => {
    const syncRoute = () => setRoute(parseAppRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Reset admin tab to Today whenever Master Admin enters a different company inspection
  useEffect(() => {
    if (inspectingCompanyId) {
      setAdminTab('today');
      setAdminHistory([]);
    }
  }, [inspectingCompanyId]);

  const handleSelectAdminTab = (next: string) => {
    const tab = next as AdminTab;
    if (tab === adminTab) return;
    setAdminHistory((prev) => [...prev.slice(-10), adminTab]);
    setAdminTab(tab);
  };

  const handleAdminBack = () => {
    setAdminHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setAdminTab(last);
      return prev.slice(0, -1);
    });
  };

  const handleSelectStaffTab = (next: string) => {
    const tab = next as StaffTab;
    if (tab === staffTab) return;
    setStaffHistory((prev) => [...prev.slice(-10), staffTab]);
    setStaffTab(tab);
  };

  const handleStaffBack = () => {
    setStaffHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStaffTab(last);
      return prev.slice(0, -1);
    });
  };

  const renderAdminTabs = () => (
    <>
      {adminTab === 'today' && <AdminTodayTab />}
      {adminTab === 'works' && <AdminWorksTab />}
      {adminTab === 'pnl' && <AdminPnlTab />}
      {adminTab === 'payroll' && <AdminPayrollTab />}
      {adminTab === 'customers' && <AdminCustomersTab />}
      {adminTab === 'staff' && <AdminStaffTab />}
    </>
  );

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin text-[#FBBF24]" />
          <span>Connecting to Cloud Firestore...</span>
        </div>
      </div>
    );
  }

  // ============================================================
  // 1. SHAREABLE SALARY SLIP VIEW (#slip=company=...&staff=...)
  // ============================================================
  if (route.type === 'shared_slip') {
    return (
      <>
        <SharedSlipView
          companyId={route.companyId}
          staffId={route.staffId}
          fromMonth={route.fromMonth}
          toMonth={route.toMonth}
          onExit={() => {
            try {
              window.location.hash = '';
            } catch {
              // Ignore
            }
            navigatePath('/');
          }}
        />
        <GlobalModals />
      </>
    );
  }

  // ============================================================
  // 2. MASTER / SUPER ADMIN PORTAL (STRICTLY HIDDEN: /master-admin)
  // ============================================================
  if (route.type === 'master_admin') {
    if (session?.role !== 'master_admin') {
      return (
        <>
          <MasterLoginScreen />
          <GlobalModals />
        </>
      );
    }

    // Master Admin inspecting a specific company's live ERP database
    if (inspectingCompanyId && activeCompany) {
      return (
        <>
          <ShellLayout
            portalMode="admin"
            activeTab={adminTab}
            onSelectTab={handleSelectAdminTab}
            onGoBack={handleAdminBack}
            canGoBack={adminHistory.length > 0}
            onExitMasterInspect={() => setInspectingCompanyId(null)}
          >
            {renderAdminTabs()}
          </ShellLayout>
          <GlobalModals />
        </>
      );
    }

    return (
      <>
        <MasterShellLayout activeTab={masterTab} onSelectTab={setMasterTab}>
          {masterTab === 'overview' && (
            <MasterOverviewTab onGoToCompanies={() => setMasterTab('companies')} />
          )}
          {masterTab === 'companies' && <MasterCompaniesTab />}
          {masterTab === 'database' && <MasterDatabaseTab />}
          {masterTab === 'settings' && <MasterSettingsTab />}
        </MasterShellLayout>
        <GlobalModals />
      </>
    );
  }

  // ============================================================
  // 3. COMPANY ADMIN PORTAL (SEPARATE ROUTE: /company-admin & /c/:slug/admin)
  // ============================================================
  if (route.type === 'company_admin') {
    const slugMismatch =
      Boolean(route.companySlug) &&
      Boolean(activeCompany) &&
      activeCompany!.slug.toLowerCase() !== route.companySlug!.toLowerCase();

    if (session?.role !== 'company_admin' || !activeCompany || slugMismatch) {
      return (
        <>
          <CompanyAdminLoginScreen companySlug={route.companySlug} />
          <GlobalModals />
        </>
      );
    }

    return (
      <>
        <ShellLayout
          portalMode="admin"
          activeTab={adminTab}
          onSelectTab={handleSelectAdminTab}
          onGoBack={handleAdminBack}
          canGoBack={adminHistory.length > 0}
        >
          {renderAdminTabs()}
        </ShellLayout>
        <GlobalModals />
      </>
    );
  }

  // ============================================================
  // 4. STAFF PORTAL (DEFAULT PUBLIC WEBSITE: / & /c/:slug)
  //    ZERO ADMIN OR MASTER LINKS ANYWHERE
  // ============================================================
  const staffSlugMismatch =
    Boolean(route.companySlug) &&
    Boolean(activeCompany) &&
    activeCompany!.slug.toLowerCase() !== route.companySlug!.toLowerCase();

  if (session?.role !== 'staff' || !activeCompany || staffSlugMismatch) {
    return (
      <>
        <StaffLoginScreen companySlug={route.companySlug} />
        <GlobalModals />
      </>
    );
  }

  return (
    <>
      <ShellLayout
        portalMode="staff"
        activeTab={staffTab}
        onSelectTab={handleSelectStaffTab}
        onGoBack={handleStaffBack}
        canGoBack={staffHistory.length > 0}
      >
        {staffTab === 'punch' && <StaffPunchTab />}
        {staffTab === 'salary' && <StaffSalaryTab />}
        {staffTab === 'customers' && <StaffCustomersTab />}
        {staffTab === 'requests' && <StaffRequestsTab />}
      </ShellLayout>
      <GlobalModals />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ErpProvider>
        <AppWorkspace />
      </ErpProvider>
    </ErrorBoundary>
  );
}
