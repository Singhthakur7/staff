export type AppRoute =
  | {
      type: 'shared_slip';
      companyId: string;
      staffId: string;
      fromMonth: string;
      toMonth: string;
    }
  | { type: 'master_admin' }
  | { type: 'company_admin'; companySlug?: string }
  | { type: 'staff'; companySlug?: string };

export function parseSlipHash(hash: string): {
  companyId: string;
  staffId: string;
  fromMonth: string;
  toMonth: string;
} | null {
  if (!hash || !hash.startsWith('#slip=')) return null;
  const raw = hash.slice('#slip='.length);
  const params = new URLSearchParams(raw);
  const companyId = params.get('company') || '';
  const staffId = params.get('staff') || '';
  const fromMonth = params.get('from') || 'all';
  const toMonth = params.get('to') || 'all';
  if (!companyId || !staffId) return null;
  return { companyId, staffId, fromMonth, toMonth };
}

export function parseAppRoute(): AppRoute {
  try {
    if (typeof window === 'undefined') return { type: 'staff' };

    const slip = parseSlipHash(window.location.hash || '');
    if (slip) {
      return { type: 'shared_slip', ...slip };
    }

    const rawPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    const segments = rawPath.split('/').filter(Boolean);

    if (segments[0] === 'master-admin') {
      return { type: 'master_admin' };
    }

    if (segments[0] === 'company-admin') {
      return { type: 'company_admin' };
    }

    if (segments[0] === 'c' && segments[1]) {
      const slug = decodeURIComponent(segments[1]).toLowerCase();
      if (segments[2] === 'admin') {
        return { type: 'company_admin', companySlug: slug };
      }
      return { type: 'staff', companySlug: slug };
    }

    return { type: 'staff' };
  } catch {
    return { type: 'staff' };
  }
}

export function navigatePath(path: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    // Ignore history restrictions
  }
}
