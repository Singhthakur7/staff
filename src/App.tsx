import React, { useEffect, useState } from 'react';
import { CompanyAdminLogin } from './components/CompanyAdminLogin';
import { CompanyAdminPortal } from './components/company/CompanyAdminPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FrontStaffPortal } from './components/FrontStaffPortal';
import { GlobalOverlays } from './components/GlobalOverlays';
import { SharedSlipView } from './components/SharedSlipView';
import { StaffPortal } from './components/staff/StaffPortal';
import { SuperAdminLogin } from './components/SuperAdminLogin';
import { SuperAdminPortal } from './components/super/SuperAdminPortal';
import { StaffOnlineProvider, useStaffOnline } from './context/StaffOnlineContext';
import { AppRoute, parseAppRoute } from './utils/router';

const AppRouterView: React.FC = () => {
  const { isReady, session, inspectingCompanyId, activeCompany } = useStaffOnline();
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute());

  useEffect(() => {
    const syncRoute = () => setRoute(parseAppRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // 1. Standalone Shareable Salary Slip Route (#slip=company=...&staff=...)
  if (route.type === 'shared_slip') {
    return (
      <SharedSlipView
        companyId={route.companyId}
        staffId={route.staffId}
        fromMonth={route.fromMonth}
        toMonth={route.toMonth}
      />
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 2. Hidden Super Admin Exclusive Route (/super-admin or /master-admin)
  if (route.type === 'super_admin') {
    if (session?.role === 'super_admin') {
      if (inspectingCompanyId && activeCompany) {
        return <CompanyAdminPortal />;
      }
      return <SuperAdminPortal />;
    }
    return <SuperAdminLogin />;
  }

  // 3. Dedicated Company Admin Route (/company-admin or /c/:slug/admin)
  if (route.type === 'company_admin') {
    if (session?.role === 'company_admin' && activeCompany) {
      if (
        !route.companySlug ||
        activeCompany.slug.toLowerCase() === route.companySlug.toLowerCase()
      ) {
        return <CompanyAdminPortal />;
      }
    }
    return <CompanyAdminLogin companySlug={route.companySlug} />;
  }

  // 4. Front Website & Staff Portal (/ or /c/:slug) — STRICTLY ZERO ADMIN LINKS
  if (session?.role === 'staff' && activeCompany) {
    if (
      !route.companySlug ||
      activeCompany.slug.toLowerCase() === route.companySlug.toLowerCase()
    ) {
      return <StaffPortal />;
    }
  }

  return <FrontStaffPortal companySlug={route.companySlug} />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <StaffOnlineProvider>
        <AppRouterView />
        <GlobalOverlays />
      </StaffOnlineProvider>
    </ErrorBoundary>
  );
}
