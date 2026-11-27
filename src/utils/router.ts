export type AppRoute =
  | { type: 'front_staff'; companySlug?: string }
  | { type: 'company_admin'; companySlug?: string }
  | { type: 'super_admin' }
  | {
      type: 'shared_slip';
      companyId: string;
      staffId: string;
      fromMonth?: string;
      toMonth?: string;
    };

export function parseAppRoute(): AppRoute {
  try {
    const hash = window.location.hash || '';
    if (hash.startsWith('#slip=')) {
      const query = hash.slice('#slip='.length);
      const params = new URLSearchParams(query);
      const companyId = params.get('company') || '';
      const staffId = params.get('staff') || '';
      const fromMonth = params.get('from') || undefined;
      const toMonth = params.get('to') || undefined;
      if (companyId && staffId) {
        return { type: 'shared_slip', companyId, staffId, fromMonth, toMonth };
      }
    }

    const rawPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    const lower = rawPath.toLowerCase();

    if (lower === '/super-admin' || lower === '/master-admin') {
      return { type: 'super_admin' };
    }

    if (lower === '/company-admin') {
      return { type: 'company_admin' };
    }

    const parts = rawPath.split('/').filter(Boolean);
    if (parts[0]?.toLowerCase() === 'c' && parts[1]) {
      const slug = decodeURIComponent(parts[1]).toLowerCase();
      if (parts[2]?.toLowerCase() === 'admin') {
        return { type: 'company_admin', companySlug: slug };
      }
      return { type: 'front_staff', companySlug: slug };
    }

    return { type: 'front_staff' };
  } catch {
    return { type: 'front_staff' };
  }
}

export function navigateToPath(path: string): void {
  try {
    if (window.location.pathname !== path || window.location.hash) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  } catch {
    // ignore
  }
}

export function buildSharedSlipUrl(params: {
  companyId: string;
  staffId: string;
  fromMonth?: string;
  toMonth?: string;
}): string {
  const origin = getSafeOrigin();
  const qs = new URLSearchParams();
  qs.set('company', params.companyId);
  qs.set('staff', params.staffId);
  if (params.fromMonth) qs.set('from', params.fromMonth);
  if (params.toMonth) qs.set('to', params.toMonth);
  return `${origin}/#slip=${qs.toString()}`;
}

export function getSafeOrigin(): string {
  try {
    return window.location.origin || 'https://staff.online';
  } catch {
    return 'https://staff.online';
  }
}
