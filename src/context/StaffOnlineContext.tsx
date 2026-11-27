import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  dbRemovePath,
  dbSetPath,
  dbUpdatePath,
  DEFAULT_SUPER_ADMIN,
  refreshCloudSnapshotOnce,
  subscribeStaffOnlineRoot,
} from '../firebase';
import {
  AdvancePaymentRecord,
  AppNotification,
  AuthSession,
  CompanyDatabase,
  CompanyRecord,
  CustomerRecord,
  EMPTY_COMPANY_DB,
  ExpenseRecord,
  GPayModalPayload,
  GpsStamp,
  Language,
  LiveInstruction,
  ManualLedgerEntry,
  MultiCrewWork,
  PaymentMode,
  PlanStatus,
  PunchLogRecord,
  StaffMember,
  StaffOnlineRootState,
  SubcontractRecord,
  SuperAdminConfig,
  ToastMessage,
  WhatsAppModalPayload,
} from '../types';
import {
  addDaysISO,
  addYearsISO,
  formatINR,
  formatShiftDuration,
  formatTimeIN,
  getCurrentTimeHHMM,
  getTodayISO,
  slugifyCompany,
  uid,
} from '../utils/helpers';
import { uploadToCloudinary } from '../utils/cloudinary';

const SESSION_KEY = 'staff_online_session_v1';
const LANG_KEY = 'staff_online_lang_v1';

interface StaffOnlineContextValue {
  isReady: boolean;
  superAdmin: SuperAdminConfig;
  companies: CompanyRecord[];
  companiesMap: Record<string, CompanyRecord>;
  companyDataMap: Record<string, CompanyDatabase>;
  session: AuthSession | null;
  inspectingCompanyId: string | null;
  setInspectingCompanyId: (companyId: string | null) => void;
  activeCompany: CompanyRecord | null;
  activeDb: CompanyDatabase;
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
  // Overlays
  toasts: ToastMessage[];
  pushToast: (t: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  gpayModal: GPayModalPayload | null;
  openGPayModal: (payload: GPayModalPayload) => void;
  closeGPayModal: () => void;
  whatsappModal: WhatsAppModalPayload | null;
  openWhatsAppModal: (payload: WhatsAppModalPayload) => void;
  closeWhatsAppModal: () => void;
  lightboxUrl: string | null;
  openLightbox: (url: string) => void;
  closeLightbox: () => void;
  // Auth
  loginSuperAdmin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginCompanyAdmin: (
    email: string,
    password: string,
    companySlug?: string
  ) => Promise<{ ok: boolean; error?: string; company?: CompanyRecord }>;
  loginStaffWithSelfie: (params: {
    companyId?: string;
    lockedCompanyId?: string;
    identifier: string;
    password: string;
    selfieUrl?: string;
    allowWithoutSelfie?: boolean;
    gpsLat?: number;
    gpsLng?: number;
    gpsLabel?: string;
  }) => Promise<{ ok: boolean; error?: string; redirectPath?: string }>;
  punchOutStaffWithSelfie: (params: {
    companyId?: string;
    lockedCompanyId?: string;
    identifier: string;
    password: string;
    selfieUrl: string;
    workCompleted?: boolean;
    workCompletionNote?: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsLabel?: string;
  }) => Promise<{
    ok: boolean;
    error?: string;
    staffName?: string;
    workTitle?: string;
    durationText?: string;
    dutyWage?: number;
    punchOutTime?: string;
    workCompletionNote?: string;
  }>;
  submitFrontSelfieStage: (params: {
    companyId?: string;
    lockedCompanyId?: string;
    identifier: string;
    password: string;
    selfieUrl?: string;
    stage: 'office_departure' | 'site_arrival' | 'punch_out' | 'portal_login';
    workTitle?: string;
    fromLocation?: string;
    toLocation?: string;
    workCompleted?: boolean;
    workCompletionNote?: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsLabel?: string;
  }) => Promise<{
    ok: boolean;
    error?: string;
    redirectPath?: string;
    stage?: 'office_departure' | 'site_arrival' | 'punch_out' | 'portal_login';
    staffName?: string;
    workTitle?: string;
    durationText?: string;
    dutyWage?: number;
    timestamp?: string;
    workCompletionNote?: string;
  }>;
  logout: () => void;
  // Super Admin & Public Trial Registration
  registerCompany: (input: {
    name: string;
    place: string;
    phone: string;
    planYears: number;
    planStatus: PlanStatus;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<{ ok: boolean; company?: CompanyRecord; error?: string }>;
  updateCompany: (companyId: string, updates: Partial<CompanyRecord>) => Promise<void>;
  extendCompanyPlanYear: (companyId: string) => Promise<void>;
  setCompanyPlanStatus: (companyId: string, status: PlanStatus) => Promise<void>;
  toggleCompanyActive: (companyId: string) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  updateSuperAdminPassword: (newPassword: string, newEmail?: string) => Promise<void>;
  // Company Scoped Operations
  addStaff: (
    input: Omit<StaffMember, 'id' | 'createdAt' | 'active'>,
    companyIdOverride?: string
  ) => Promise<StaffMember | null>;
  updateStaff: (
    staffId: string,
    updates: Partial<StaffMember>,
    companyIdOverride?: string
  ) => Promise<void>;
  toggleStaffActive: (staffId: string, companyIdOverride?: string) => Promise<void>;
  recordAdvanceOrSettlement: (
    input: {
      staffId: string;
      amount: number;
      date: string;
      time: string;
      dueDate: string;
      mode: PaymentMode;
      kind: 'advance' | 'settlement';
      note: string;
      utr?: string;
      screenshotUrl?: string;
    },
    companyIdOverride?: string
  ) => Promise<void>;
  confirmStaffPayment: (paymentId: string, staffNote?: string) => Promise<void>;
  reportStaffPaymentIssue: (paymentId: string, issueReason: string) => Promise<void>;
  sendDueDateNotification: (staffId: string, customNote?: string) => Promise<void>;
  // Punch & Attendance
  addDutyPunchIn: (input: {
    workTitle: string;
    date: string;
    mode: string;
    fromLocation: string;
    toLocation: string;
    dutyWage: number;
    selfieUrl?: string;
    asOfficeDeparture?: boolean;
    gpsLat?: number;
    gpsLng?: number;
    gpsLabel?: string;
  }) => Promise<void>;
  recordDutyMilestone: (
    punchId: string,
    milestone: 'departed' | 'arrived' | 'work_completed' | 'punched_out',
    options?:
      | GpsStamp
      | {
          gps?: GpsStamp;
          selfieUrl?: string;
          workCompleted?: boolean;
          workCompletionNote?: string;
        }
  ) => Promise<boolean>;
  punchOutDuty: (punchId: string, gps?: GpsStamp) => Promise<void>;
  updatePunchLog: (punchId: string, updates: Partial<PunchLogRecord>) => Promise<void>;
  // Live Instructions
  sendLiveInstruction: (staffId: string, message: string) => Promise<void>;
  acknowledgeInstruction: (instructionId: string) => Promise<void>;
  // Customers
  addCustomer: (input: Omit<CustomerRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (customerId: string, updates: Partial<CustomerRecord>) => Promise<void>;
  collectCustomerDue: (
    customerId: string,
    amount: number,
    mode: PaymentMode,
    note: string
  ) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  // Multi-Crew Works
  addWork: (input: Omit<MultiCrewWork, 'id' | 'createdAt'>) => Promise<void>;
  updateWork: (workId: string, updates: Partial<MultiCrewWork>) => Promise<void>;
  deleteWork: (workId: string) => Promise<void>;
  // Subcontracts
  addSubcontract: (input: Omit<SubcontractRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateSubcontract: (subId: string, updates: Partial<SubcontractRecord>) => Promise<void>;
  deleteSubcontract: (subId: string) => Promise<void>;
  // Expenses
  submitStaffExpense: (input: {
    description: string;
    amount: number;
    date: string;
    billPhotoUrl?: string;
  }) => Promise<void>;
  reviewExpense: (expenseId: string, status: 'approved' | 'rejected') => Promise<void>;
  // Manual P&L Ledger
  addManualLedger: (input: Omit<ManualLedgerEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteManualLedger: (entryId: string) => Promise<void>;
  // Notifications
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const StaffOnlineContext = createContext<StaffOnlineContextValue | null>(null);

function loadStoredSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: AuthSession | null): void {
  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    const serialized = JSON.stringify(session);
    window.sessionStorage.setItem(SESSION_KEY, serialized);
    window.localStorage.setItem(SESSION_KEY, serialized);
  } catch {
    // ignore
  }
}

function loadStoredLang(): Language {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === 'ml' ? 'ml' : 'en';
  } catch {
    return 'en';
  }
}

function normalizePhoneDigits(val: string): string {
  return (val || '').replace(/[^0-9]/g, '');
}

function matchesAccountIdentifier(
  rawIdentifier: string,
  accountEmail: string,
  accountPhone?: string,
  accountId?: string
): boolean {
  const trimmed = rawIdentifier.trim();
  const ident = trimmed.toLowerCase();
  if (!ident) return false;
  if (accountEmail.trim().toLowerCase() === ident) return true;
  if (accountId && accountId === trimmed) return true;

  // Only perform phone-number matching when input is NOT an email address
  if (!ident.includes('@')) {
    const cleanDigits = normalizePhoneDigits(ident);
    const phoneDigits = normalizePhoneDigits(accountPhone || '');
    if (cleanDigits.length >= 6 && phoneDigits.length >= 6) {
      if (phoneDigits === cleanDigits) return true;
      if (cleanDigits.length >= 10 && phoneDigits.slice(-10) === cleanDigits.slice(-10)) {
        return true;
      }
      if (phoneDigits.endsWith(cleanDigits)) return true;
    }
  }
  return false;
}

type CredentialLookupResult =
  | { kind: 'staff'; company: CompanyRecord; staff: StaffMember }
  | { kind: 'company_admin'; company: CompanyRecord }
  | { kind: 'super_admin' }
  | { kind: 'error'; error: string; retryFromCloud?: boolean };

function resolveFrontCredentials(
  state: StaffOnlineRootState,
  params: {
    companyId?: string;
    lockedCompanyId?: string;
    identifier: string;
    password: string;
  }
): CredentialLookupResult {
  const cleanIdent = params.identifier.trim();
  const cleanPass = params.password.trim();
  if (!cleanIdent || !cleanPass) {
    return { kind: 'error', error: 'Please enter your Email/Phone and Password.' };
  }

  const allCompanies = Object.values(state.companies);
  const searchCompanies: CompanyRecord[] = [];
  if (params.lockedCompanyId) {
    const locked = state.companies[params.lockedCompanyId];
    if (locked) searchCompanies.push(locked);
  } else {
    if (params.companyId && state.companies[params.companyId]) {
      searchCompanies.push(state.companies[params.companyId]);
    }
    allCompanies.forEach((c) => {
      if (!searchCompanies.some((existing) => existing.id === c.id)) {
        searchCompanies.push(c);
      }
    });
  }

  let matchedStaffWrongPassword = false;
  let disabledStaffName = '';
  let suspendedCompanyName = '';

  // 1. Check Staff Accounts first (selected company first, then all companies if unlocked)
  for (const company of searchCompanies) {
    const db = state.companyData[company.id] || EMPTY_COMPANY_DB;
    for (const s of db.staff) {
      if (matchesAccountIdentifier(cleanIdent, s.email, s.phone, s.id)) {
        if ((s.password || '').trim() === cleanPass) {
          if (!company.active) {
            suspendedCompanyName = company.name;
            continue;
          }
          if (!s.active) {
            disabledStaffName = s.name;
            continue;
          }
          return { kind: 'staff', company, staff: s };
        }
        matchedStaffWrongPassword = true;
      }
    }
  }

  if (suspendedCompanyName) {
    return {
      kind: 'error',
      error: `${suspendedCompanyName} account is currently suspended. Please contact support.`,
    };
  }
  if (disabledStaffName) {
    return {
      kind: 'error',
      error: 'Your staff account is currently disabled by Company Admin.',
    };
  }

  // 2. Check if user entered Company Admin credentials on the Front Page login form
  let matchedAdminWrongPassword = false;
  for (const company of searchCompanies) {
    if (matchesAccountIdentifier(cleanIdent, company.adminEmail, company.phone)) {
      if ((company.adminPassword || '').trim() === cleanPass) {
        if (!company.active) {
          return {
            kind: 'error',
            error: 'This company account is currently suspended. Please contact Staff. Online support.',
          };
        }
        return { kind: 'company_admin', company };
      }
      matchedAdminWrongPassword = true;
    }
  }

  // 3. Check if user entered Super Admin credentials
  if (
    !params.lockedCompanyId &&
    cleanIdent.toLowerCase() === state.superAdmin.email.trim().toLowerCase() &&
    cleanPass === (state.superAdmin.password || '').trim()
  ) {
    return { kind: 'super_admin' };
  }

  if (matchedStaffWrongPassword || matchedAdminWrongPassword) {
    return {
      kind: 'error',
      error: 'Incorrect password for this account. Please check your password and try again.',
      retryFromCloud: true,
    };
  }

  return {
    kind: 'error',
    error: 'No account found with this Email/Phone and Password. Please check your credentials.',
    retryFromCloud: true,
  };
}

export const StaffOnlineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [root, setRoot] = useState<StaffOnlineRootState>({
    superAdmin: DEFAULT_SUPER_ADMIN,
    companies: {},
    companyData: {},
  });
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [inspectingCompanyId, setInspectingCompanyId] = useState<string | null>(null);
  const [lang, setLangState] = useState<Language>(() => loadStoredLang());

  // Overlays
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [gpayModal, setGPayModal] = useState<GPayModalPayload | null>(null);
  const [whatsappModal, setWhatsappModal] = useState<WhatsAppModalPayload | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeStaffOnlineRoot(
      (nextState) => {
        setRoot(nextState);
        setIsReady(true);
      },
      () => {
        setIsReady(true);
      }
    );
    return unsub;
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = uid('toast');
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'ml' : 'en');
  }, [lang, setLang]);

  const companies = useMemo(
    () =>
      Object.values(root.companies).sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      ),
    [root.companies]
  );

  const activeCompanyId = useMemo(() => {
    if (session?.role === 'super_admin') return inspectingCompanyId || null;
    return session?.companyId || null;
  }, [session, inspectingCompanyId]);

  const activeCompany = useMemo(
    () => (activeCompanyId ? root.companies[activeCompanyId] || null : null),
    [activeCompanyId, root.companies]
  );

  const activeDb = useMemo(
    () => (activeCompanyId ? root.companyData[activeCompanyId] || EMPTY_COMPANY_DB : EMPTY_COMPANY_DB),
    [activeCompanyId, root.companyData]
  );

  const resolveCompanyId = useCallback(
    (override?: string): string | null => override || activeCompanyId,
    [activeCompanyId]
  );

  const pushNotification = useCallback(
    async (
      companyId: string,
      payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
    ) => {
      const id = uid('ntf');
      const item: AppNotification = {
        ...payload,
        id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${companyId}/notifications/${id}`, item);
    },
    []
  );

  // Auth Handlers
  const loginSuperAdmin = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();
      const checkConfig = (cfg: SuperAdminConfig) =>
        cleanEmail === cfg.email.trim().toLowerCase() && cleanPass === (cfg.password || '').trim();

      let activeConfig = root.superAdmin;
      if (!checkConfig(activeConfig)) {
        const fresh = await refreshCloudSnapshotOnce();
        activeConfig = fresh.superAdmin;
      }

      if (checkConfig(activeConfig)) {
        const nextSession: AuthSession = {
          role: 'super_admin',
          name: 'Super Administrator',
          email: activeConfig.email,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({ type: 'success', title: 'Signed in to Super Admin Console' });
        return { ok: true };
      }
      return { ok: false, error: 'Invalid Super Admin email or password.' };
    },
    [root.superAdmin, pushToast]
  );

  const loginCompanyAdmin = useCallback(
    async (email: string, password: string, companySlug?: string) => {
      const cleanIdent = email.trim();
      const cleanPass = password.trim();
      if (!cleanIdent || !cleanPass) {
        return { ok: false, error: 'Please enter your Company Admin email and password.' };
      }

      const tryMatch = (list: CompanyRecord[]) => {
        const scoped = companySlug
          ? list.filter((c) => c.slug.toLowerCase() === companySlug.toLowerCase())
          : list;
        const matched = scoped.find(
          (c) =>
            matchesAccountIdentifier(cleanIdent, c.adminEmail, c.phone) &&
            (c.adminPassword || '').trim() === cleanPass
        );
        const emailExists = scoped.some((c) =>
          matchesAccountIdentifier(cleanIdent, c.adminEmail, c.phone)
        );
        return { scoped, matched, emailExists };
      };

      let result = tryMatch(companies);
      if (!result.matched) {
        const fresh = await refreshCloudSnapshotOnce();
        result = tryMatch(Object.values(fresh.companies));
      }

      if (!result.matched) {
        if (companySlug && result.scoped.length === 0) {
          return {
            ok: false,
            error: `No company found for URL /c/${companySlug}. Please check the link.`,
          };
        }
        if (result.emailExists) {
          return {
            ok: false,
            error: 'Incorrect password for this Company Admin account. Please check and try again.',
          };
        }
        return {
          ok: false,
          error: companySlug
            ? 'Invalid Company Admin email or password for this company.'
            : 'No Company Admin account found with this email. Register via Free Trial or verify your email.',
        };
      }

      const matched = result.matched;
      if (!matched.active) {
        return {
          ok: false,
          error: 'This company account is currently suspended. Please contact Staff. Online support.',
        };
      }

      const nextSession: AuthSession = {
        role: 'company_admin',
        companyId: matched.id,
        name: `${matched.name} Admin`,
        email: matched.adminEmail,
      };
      setSession(nextSession);
      saveStoredSession(nextSession);
      pushToast({ type: 'success', title: `Welcome to ${matched.name}` });
      return { ok: true, company: matched };
    },
    [companies, pushToast]
  );

  const authenticateFrontAccount = useCallback(
    async (params: {
      companyId?: string;
      lockedCompanyId?: string;
      identifier: string;
      password: string;
    }): Promise<{
      state: StaffOnlineRootState;
      lookup: CredentialLookupResult;
    }> => {
      let currentState = root;
      let lookup = resolveFrontCredentials(currentState, params);
      if (lookup.kind === 'error' && lookup.retryFromCloud) {
        currentState = await refreshCloudSnapshotOnce();
        lookup = resolveFrontCredentials(currentState, params);
      }
      return { state: currentState, lookup };
    },
    [root]
  );

  const loginStaffWithSelfie = useCallback(
    async (params: {
      companyId?: string;
      lockedCompanyId?: string;
      identifier: string;
      password: string;
      selfieUrl?: string;
      allowWithoutSelfie?: boolean;
      gpsLat?: number;
      gpsLng?: number;
      gpsLabel?: string;
    }) => {
      const { lookup } = await authenticateFrontAccount({
        companyId: params.companyId,
        lockedCompanyId: params.lockedCompanyId,
        identifier: params.identifier,
        password: params.password,
      });

      if (lookup.kind === 'company_admin') {
        const nextSession: AuthSession = {
          role: 'company_admin',
          companyId: lookup.company.id,
          name: `${lookup.company.name} Admin`,
          email: lookup.company.adminEmail,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({ type: 'success', title: `Welcome to ${lookup.company.name} Admin Panel` });
        return { ok: true, redirectPath: `/c/${lookup.company.slug}/admin` };
      }

      if (lookup.kind === 'super_admin') {
        const nextSession: AuthSession = {
          role: 'super_admin',
          name: 'Super Administrator',
          email: root.superAdmin.email,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({ type: 'success', title: 'Signed in to Super Admin Console' });
        return { ok: true, redirectPath: '/super-admin' };
      }

      if (lookup.kind === 'error') {
        return { ok: false, error: lookup.error };
      }

      const { company, staff: matchedStaff } = lookup;

      if (!params.selfieUrl && !params.allowWithoutSelfie) {
        return {
          ok: false,
          error:
            'Live front-camera selfie capture is required for attendance check-in. Capture a selfie or switch to "Email & Password Login".',
        };
      }

      const nowIso = new Date().toISOString();
      const todayIso = getTodayISO();
      const currentHHMM = getCurrentTimeHHMM();
      let hostedSelfieUrl = '';

      if (params.selfieUrl) {
        const uploadRes = await uploadToCloudinary(params.selfieUrl);
        hostedSelfieUrl = uploadRes.url || params.selfieUrl;

        const punchId = uid('punch');
        const loginPunch: PunchLogRecord = {
          id: punchId,
          staffId: matchedStaff.id,
          staffName: matchedStaff.name,
          staffRole: matchedStaff.role,
          type: 'login_selfie',
          workTitle: 'Live Selfie Login Check-In',
          date: todayIso,
          mode: 'Live Selfie Check-In',
          fromLocation: company.place || 'Field',
          toLocation: company.place || 'Field',
          workTime: currentHHMM,
          departTime: currentHHMM,
          arriveTime: currentHHMM,
          punchInTime: nowIso,
          punchOutTime: nowIso,
          status: 'completed',
          dutyWage: 0,
          selfieUrl: hostedSelfieUrl,
          gpsLat: params.gpsLat,
          gpsLng: params.gpsLng,
          gpsLabel: params.gpsLabel || 'GPS Captured',
          createdAt: nowIso,
        };

        await dbSetPath(
          `staff_online/company_data/${company.id}/punchLogs/${punchId}`,
          loginPunch
        );
        await pushNotification(company.id, {
          targetRole: 'company_admin',
          title: `Live Selfie Check-In: ${matchedStaff.name}`,
          message: `${matchedStaff.name} (${matchedStaff.role}) verified live selfie login at ${currentHHMM}.`,
          category: 'punch',
        });
      }

      const nextSession: AuthSession = {
        role: 'staff',
        companyId: company.id,
        staffId: matchedStaff.id,
        name: matchedStaff.name,
        email: matchedStaff.email,
        verifiedSelfieUrl: hostedSelfieUrl || undefined,
        verifiedAt: nowIso,
      };
      setSession(nextSession);
      saveStoredSession(nextSession);
      pushToast({
        type: 'success',
        title: hostedSelfieUrl
          ? `Live Selfie Verified — Welcome, ${matchedStaff.name}`
          : `Signed in — Welcome, ${matchedStaff.name}`,
      });
      return { ok: true };
    },
    [authenticateFrontAccount, root.superAdmin.email, pushNotification, pushToast]
  );

  const punchOutStaffWithSelfie = useCallback(
    async (params: {
      companyId?: string;
      lockedCompanyId?: string;
      identifier: string;
      password: string;
      selfieUrl: string;
      workCompleted?: boolean;
      workCompletionNote?: string;
      gpsLat?: number;
      gpsLng?: number;
      gpsLabel?: string;
    }) => {
      if (!params.selfieUrl) {
        return {
          ok: false,
          error: 'Live front-camera selfie capture is mandatory before Punch-Out.',
        };
      }
      if (params.workCompleted === false) {
        return {
          ok: false,
          error: 'Please check "Work Completed" before confirming Punch-Out.',
        };
      }

      const { state: latestState, lookup } = await authenticateFrontAccount({
        companyId: params.companyId,
        lockedCompanyId: params.lockedCompanyId,
        identifier: params.identifier,
        password: params.password,
      });

      if (lookup.kind !== 'staff') {
        return {
          ok: false,
          error:
            lookup.kind === 'error'
              ? lookup.error
              : 'Punch-Out is only available for Staff accounts. Switch to Email & Password Login to open your Admin Panel.',
        };
      }

      const { company, staff: matchedStaff } = lookup;
      const db = latestState.companyData[company.id] || EMPTY_COMPANY_DB;

      const activeDuty = db.punchLogs.find(
        (p) => p.staffId === matchedStaff.id && p.type === 'duty_punch' && p.status === 'active'
      );
      if (!activeDuty) {
        return {
          ok: false,
          error:
            'No open/active duty shift found to Punch-Out. Choose "Office Departure" to start a shift.',
        };
      }

      const uploadRes = await uploadToCloudinary(params.selfieUrl);
      const hostedSelfieUrl = uploadRes.url || params.selfieUrl;
      const nowIso = new Date().toISOString();
      const durationText = formatShiftDuration(activeDuty.punchInTime, nowIso);
      const note = params.workCompletionNote?.trim() || '';
      const punchOutGps: GpsStamp = {
        lat: params.gpsLat,
        lng: params.gpsLng,
        label: params.gpsLabel || 'GPS Captured',
      };

      await dbUpdatePath(
        `staff_online/company_data/${company.id}/punchLogs/${activeDuty.id}`,
        {
          workCompleted: true,
          workCompletedTime: activeDuty.workCompletedTime || nowIso,
          workCompletionNote: note || activeDuty.workCompletionNote || '',
          punchOutTime: nowIso,
          punchOutGps,
          punchOutSelfieUrl: hostedSelfieUrl,
          dutyStage: 'punched_out',
          status: 'completed',
          totalDurationText: durationText,
        }
      );

      await pushNotification(company.id, {
        targetRole: 'company_admin',
        title: `✅ Work Completed & Punch-Out: ${matchedStaff.name}`,
        message: `${matchedStaff.name} completed "${activeDuty.workTitle}" and punched out at ${formatTimeIN(nowIso)} (Duration: ${durationText} · Wage: ${formatINR(activeDuty.dutyWage)})${note ? ` · Note: ${note}` : ''}.`,
        category: 'punch',
      });

      pushToast({
        type: 'success',
        title: `Work Completed & Punch-Out recorded at ${formatTimeIN(nowIso)}`,
        detail: `Shift completed (${durationText}) · ${formatINR(activeDuty.dutyWage)} credited`,
      });

      return {
        ok: true,
        staffName: matchedStaff.name,
        workTitle: activeDuty.workTitle,
        durationText,
        dutyWage: activeDuty.dutyWage,
        punchOutTime: nowIso,
        workCompletionNote: note || undefined,
      };
    },
    [authenticateFrontAccount, pushNotification, pushToast]
  );

  const submitFrontSelfieStage = useCallback(
    async (params: {
      companyId?: string;
      lockedCompanyId?: string;
      identifier: string;
      password: string;
      selfieUrl?: string;
      stage: 'office_departure' | 'site_arrival' | 'punch_out' | 'portal_login';
      workTitle?: string;
      fromLocation?: string;
      toLocation?: string;
      workCompleted?: boolean;
      workCompletionNote?: string;
      gpsLat?: number;
      gpsLng?: number;
      gpsLabel?: string;
    }) => {
      if (params.stage === 'portal_login') {
        const res = await loginStaffWithSelfie({
          ...params,
          allowWithoutSelfie: true,
        });
        return { ...res, stage: 'portal_login' as const };
      }

      // First verify credentials (so if a Company Admin / Super Admin enters their ID on the Front Page,
      // they are routed straight to their Admin Panel even before camera capture!)
      const { state: latestState, lookup } = await authenticateFrontAccount({
        companyId: params.companyId,
        lockedCompanyId: params.lockedCompanyId,
        identifier: params.identifier,
        password: params.password,
      });

      if (lookup.kind === 'company_admin') {
        const nextSession: AuthSession = {
          role: 'company_admin',
          companyId: lookup.company.id,
          name: `${lookup.company.name} Admin`,
          email: lookup.company.adminEmail,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({ type: 'success', title: `Welcome to ${lookup.company.name} Admin Panel` });
        return {
          ok: true,
          redirectPath: `/c/${lookup.company.slug}/admin`,
          stage: 'portal_login' as const,
        };
      }

      if (lookup.kind === 'super_admin') {
        const nextSession: AuthSession = {
          role: 'super_admin',
          name: 'Super Administrator',
          email: latestState.superAdmin.email,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({ type: 'success', title: 'Signed in to Super Admin Console' });
        return {
          ok: true,
          redirectPath: '/super-admin',
          stage: 'portal_login' as const,
        };
      }

      if (lookup.kind === 'error') {
        return { ok: false, error: lookup.error };
      }

      if (params.stage === 'punch_out') {
        if (!params.selfieUrl) {
          return {
            ok: false,
            error: 'Live front-camera selfie capture is mandatory before Punch-Out.',
          };
        }
        if (!params.workCompleted) {
          return {
            ok: false,
            error: 'Please confirm "Work Completed" before submitting Punch-Out.',
          };
        }
        const res = await punchOutStaffWithSelfie({
          ...params,
          selfieUrl: params.selfieUrl,
          workCompleted: true,
          workCompletionNote: params.workCompletionNote,
        });
        return {
          ...res,
          stage: 'punch_out' as const,
          timestamp: res.punchOutTime,
        };
      }

      if (!params.selfieUrl) {
        return {
          ok: false,
          error:
            'Please capture your live front-camera selfie first (or click "Email & Password Login" to open your Staff Portal directly).',
        };
      }

      const { company, staff: matchedStaff } = lookup;
      const db = latestState.companyData[company.id] || EMPTY_COMPANY_DB;

      const uploadRes = await uploadToCloudinary(params.selfieUrl);
      const hostedSelfieUrl = uploadRes.url || params.selfieUrl;
      const nowIso = new Date().toISOString();
      const todayIso = getTodayISO();
      const currentHHMM = getCurrentTimeHHMM();
      const gpsStamp: GpsStamp = {
        lat: params.gpsLat,
        lng: params.gpsLng,
        label: params.gpsLabel || 'GPS Captured',
      };

      const existingActive = db.punchLogs.find(
        (p) => p.staffId === matchedStaff.id && p.type === 'duty_punch' && p.status === 'active'
      );

      if (params.stage === 'office_departure') {
        if (existingActive && !existingActive.departTime) {
          await dbUpdatePath(
            `staff_online/company_data/${company.id}/punchLogs/${existingActive.id}`,
            {
              departTime: nowIso,
              departGps: gpsStamp,
              departSelfieUrl: hostedSelfieUrl,
              selfieUrl: existingActive.selfieUrl || hostedSelfieUrl,
              dutyStage: 'departed',
            }
          );
        } else if (!existingActive) {
          const punchId = uid('punch');
          const record: PunchLogRecord = {
            id: punchId,
            staffId: matchedStaff.id,
            staffName: matchedStaff.name,
            staffRole: matchedStaff.role,
            type: 'duty_punch',
            workTitle: params.workTitle?.trim() || 'Field Site Duty',
            date: todayIso,
            mode: 'On-Site Duty',
            fromLocation: params.fromLocation?.trim() || company.place || 'Office',
            toLocation: params.toLocation?.trim() || 'Work Site',
            workTime: currentHHMM,
            departTime: nowIso,
            arriveTime: '',
            punchInTime: nowIso,
            dutyStage: 'departed',
            status: 'active',
            dutyWage: matchedStaff.dutyWage,
            selfieUrl: hostedSelfieUrl,
            departSelfieUrl: hostedSelfieUrl,
            gpsLat: params.gpsLat,
            gpsLng: params.gpsLng,
            gpsLabel: gpsStamp.label,
            departGps: gpsStamp,
            createdAt: nowIso,
          };
          await dbSetPath(
            `staff_online/company_data/${company.id}/punchLogs/${punchId}`,
            record
          );
        }

        await pushNotification(company.id, {
          targetRole: 'company_admin',
          title: `🚀 Office Departure: ${matchedStaff.name}`,
          message: `${matchedStaff.name} (${matchedStaff.role}) logged Office Departure with live selfie at ${formatTimeIN(nowIso)}.`,
          category: 'punch',
        });

        const nextSession: AuthSession = {
          role: 'staff',
          companyId: company.id,
          staffId: matchedStaff.id,
          name: matchedStaff.name,
          email: matchedStaff.email,
          verifiedSelfieUrl: hostedSelfieUrl,
          verifiedAt: nowIso,
        };
        setSession(nextSession);
        saveStoredSession(nextSession);
        pushToast({
          type: 'success',
          title: `Office Departure recorded at ${formatTimeIN(nowIso)}`,
          detail: 'Next step: Capture Site Arrival selfie when you reach the work site.',
        });
        return {
          ok: true,
          stage: 'office_departure' as const,
          staffName: matchedStaff.name,
          timestamp: nowIso,
        };
      }

      // params.stage === 'site_arrival'
      if (existingActive) {
        await dbUpdatePath(
          `staff_online/company_data/${company.id}/punchLogs/${existingActive.id}`,
          {
            arriveTime: nowIso,
            arriveGps: gpsStamp,
            arriveSelfieUrl: hostedSelfieUrl,
            dutyStage: 'arrived',
            ...(params.toLocation?.trim() ? { toLocation: params.toLocation.trim() } : {}),
          }
        );
      } else {
        const punchId = uid('punch');
        const record: PunchLogRecord = {
          id: punchId,
          staffId: matchedStaff.id,
          staffName: matchedStaff.name,
          staffRole: matchedStaff.role,
          type: 'duty_punch',
          workTitle: params.workTitle?.trim() || 'Field Site Duty',
          date: todayIso,
          mode: 'On-Site Duty',
          fromLocation: params.fromLocation?.trim() || company.place || 'Office',
          toLocation: params.toLocation?.trim() || 'Work Site',
          workTime: currentHHMM,
          departTime: '',
          arriveTime: nowIso,
          punchInTime: nowIso,
          dutyStage: 'arrived',
          status: 'active',
          dutyWage: matchedStaff.dutyWage,
          selfieUrl: hostedSelfieUrl,
          arriveSelfieUrl: hostedSelfieUrl,
          gpsLat: params.gpsLat,
          gpsLng: params.gpsLng,
          gpsLabel: gpsStamp.label,
          arriveGps: gpsStamp,
          createdAt: nowIso,
        };
        await dbSetPath(
          `staff_online/company_data/${company.id}/punchLogs/${punchId}`,
          record
        );
      }

      await pushNotification(company.id, {
        targetRole: 'company_admin',
        title: `📍 Site Arrival: ${matchedStaff.name}`,
        message: `${matchedStaff.name} (${matchedStaff.role}) reached the work site with live selfie at ${formatTimeIN(nowIso)}.`,
        category: 'punch',
      });

      const nextSession: AuthSession = {
        role: 'staff',
        companyId: company.id,
        staffId: matchedStaff.id,
        name: matchedStaff.name,
        email: matchedStaff.email,
        verifiedSelfieUrl: hostedSelfieUrl,
        verifiedAt: nowIso,
      };
      setSession(nextSession);
      saveStoredSession(nextSession);
      pushToast({
        type: 'success',
        title: `Site Arrival recorded at ${formatTimeIN(nowIso)}`,
        detail: 'Next step: Confirm Work Completed & Punch-Out when the job is done.',
      });
      return {
        ok: true,
        stage: 'site_arrival' as const,
        staffName: matchedStaff.name,
        timestamp: nowIso,
      };
    },
    [
      authenticateFrontAccount,
      loginStaffWithSelfie,
      punchOutStaffWithSelfie,
      pushNotification,
      pushToast,
    ]
  );

  const logout = useCallback(() => {
    setSession(null);
    setInspectingCompanyId(null);
    saveStoredSession(null);
    pushToast({ type: 'info', title: 'Signed out cleanly' });
  }, [pushToast]);

  // Company Registration & Management
  const registerCompany = useCallback(
    async (input: {
      name: string;
      place: string;
      phone: string;
      planYears: number;
      planStatus: PlanStatus;
      adminEmail: string;
      adminPassword: string;
    }) => {
      const cleanName = input.name.trim();
      const cleanEmail = input.adminEmail.trim().toLowerCase();
      if (!cleanName || !cleanEmail || !input.adminPassword.trim()) {
        return { ok: false, error: 'Company Name, Admin Email, and Password are required.' };
      }

      const duplicateEmail = companies.find(
        (c) => c.adminEmail.trim().toLowerCase() === cleanEmail
      );
      if (duplicateEmail) {
        return {
          ok: false,
          error: 'A company is already registered with this Admin Email.',
        };
      }

      const baseSlug = slugifyCompany(cleanName);
      let finalSlug = baseSlug;
      let counter = 2;
      while (companies.some((c) => c.slug === finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter += 1;
      }

      const today = getTodayISO();
      const years = Math.max(1, Number(input.planYears) || 1);
      const planEndDate =
        input.planStatus === 'trial' ? addDaysISO(today, 30) : addYearsISO(today, years);

      const id = uid('comp');
      const record: CompanyRecord = {
        id,
        name: cleanName,
        slug: finalSlug,
        place: input.place.trim(),
        phone: input.phone.trim(),
        adminEmail: cleanEmail,
        adminPassword: input.adminPassword.trim(),
        planYears: years,
        planStatus: input.planStatus,
        planRatePerYear: 1000,
        planStartDate: today,
        planEndDate,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await dbSetPath(`staff_online/companies/${id}`, record);
      pushToast({
        type: 'success',
        title: `${cleanName} registered successfully`,
      });
      return { ok: true, company: record };
    },
    [companies, pushToast]
  );

  const updateCompany = useCallback(
    async (companyId: string, updates: Partial<CompanyRecord>) => {
      const normalized: Partial<CompanyRecord> = { ...updates };
      if (typeof normalized.adminEmail === 'string') {
        normalized.adminEmail = normalized.adminEmail.trim().toLowerCase();
      }
      if (typeof normalized.adminPassword === 'string') {
        normalized.adminPassword = normalized.adminPassword.trim();
      }
      await dbUpdatePath(
        `staff_online/companies/${companyId}`,
        normalized as Record<string, unknown>
      );
      pushToast({ type: 'success', title: 'Company details updated' });
    },
    [pushToast]
  );

  const extendCompanyPlanYear = useCallback(
    async (companyId: string) => {
      const comp = root.companies[companyId];
      if (!comp) return;
      const baseEnd = comp.planEndDate > getTodayISO() ? comp.planEndDate : getTodayISO();
      await dbUpdatePath(`staff_online/companies/${companyId}`, {
        planYears: (comp.planYears || 1) + 1,
        planStatus: 'annual',
        planEndDate: addYearsISO(baseEnd, 1),
      });
      pushToast({ type: 'success', title: 'Plan extended by +1 Year' });
    },
    [root.companies, pushToast]
  );

  const setCompanyPlanStatus = useCallback(
    async (companyId: string, status: PlanStatus) => {
      const comp = root.companies[companyId];
      if (!comp) return;
      const today = getTodayISO();
      const planEndDate =
        status === 'trial'
          ? addDaysISO(today, 30)
          : addYearsISO(today, Math.max(1, comp.planYears || 1));
      await dbUpdatePath(`staff_online/companies/${companyId}`, {
        planStatus: status,
        planStartDate: today,
        planEndDate,
      });
      pushToast({
        type: 'success',
        title:
          status === 'trial'
            ? '30-Day Free Trial (₹0) Activated'
            : '₹1,000 / Year Annual Plan Activated',
      });
    },
    [root.companies, pushToast]
  );

  const toggleCompanyActive = useCallback(
    async (companyId: string) => {
      const comp = root.companies[companyId];
      if (!comp) return;
      const next = !comp.active;
      await dbUpdatePath(`staff_online/companies/${companyId}`, { active: next });
      pushToast({
        type: next ? 'success' : 'warning',
        title: next ? `${comp.name} activated` : `${comp.name} suspended`,
      });
    },
    [root.companies, pushToast]
  );

  const deleteCompany = useCallback(
    async (companyId: string) => {
      const comp = root.companies[companyId];
      await dbRemovePath(`staff_online/companies/${companyId}`);
      await dbRemovePath(`staff_online/company_data/${companyId}`);
      if (inspectingCompanyId === companyId) setInspectingCompanyId(null);
      pushToast({
        type: 'info',
        title: `${comp?.name || 'Company'} permanently deleted`,
      });
    },
    [root.companies, inspectingCompanyId, pushToast]
  );

  const updateSuperAdminPassword = useCallback(
    async (newPassword: string, newEmail?: string) => {
      const next: SuperAdminConfig = {
        email: (newEmail || root.superAdmin.email).trim().toLowerCase(),
        password: newPassword.trim(),
        updatedAt: new Date().toISOString(),
      };
      await dbSetPath('staff_online/super_admin', next);
      pushToast({ type: 'success', title: 'Super Admin credentials updated' });
    },
    [root.superAdmin.email, pushToast]
  );

  // Staff CRUD
  const addStaff = useCallback(
    async (
      input: Omit<StaffMember, 'id' | 'createdAt' | 'active'>,
      companyIdOverride?: string
    ) => {
      const cid = resolveCompanyId(companyIdOverride);
      if (!cid) return null;
      const cleanEmail = input.email.trim().toLowerCase();
      const existingDb = root.companyData[cid] || EMPTY_COMPANY_DB;
      const duplicate = existingDb.staff.find(
        (s) => s.email.trim().toLowerCase() === cleanEmail
      );
      if (duplicate) {
        pushToast({
          type: 'error',
          title: `Staff email already exists (${duplicate.name})`,
          detail: 'Use a unique login email or edit the existing staff member.',
        });
        return null;
      }
      const id = uid('stf');
      const staff: StaffMember = {
        ...input,
        id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: cleanEmail,
        password: input.password.trim(),
        upiId: (input.upiId || '').trim(),
        active: true,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${cid}/staff/${id}`, staff);
      pushToast({ type: 'success', title: `Staff added: ${staff.name}` });
      return staff;
    },
    [resolveCompanyId, root.companyData, pushToast]
  );

  const updateStaff = useCallback(
    async (
      staffId: string,
      updates: Partial<StaffMember>,
      companyIdOverride?: string
    ) => {
      const cid = resolveCompanyId(companyIdOverride);
      if (!cid) return;
      const normalizedUpdates: Partial<StaffMember> = { ...updates };
      if (typeof normalizedUpdates.email === 'string') {
        normalizedUpdates.email = normalizedUpdates.email.trim().toLowerCase();
      }
      if (typeof normalizedUpdates.password === 'string') {
        normalizedUpdates.password = normalizedUpdates.password.trim();
      }
      if (typeof normalizedUpdates.name === 'string') {
        normalizedUpdates.name = normalizedUpdates.name.trim();
      }
      if (typeof normalizedUpdates.phone === 'string') {
        normalizedUpdates.phone = normalizedUpdates.phone.trim();
      }
      if (typeof normalizedUpdates.upiId === 'string') {
        normalizedUpdates.upiId = normalizedUpdates.upiId.trim();
      }
      await dbUpdatePath(
        `staff_online/company_data/${cid}/staff/${staffId}`,
        normalizedUpdates as Record<string, unknown>
      );
      pushToast({ type: 'success', title: 'Staff details updated successfully' });
    },
    [resolveCompanyId, pushToast]
  );

  const toggleStaffActive = useCallback(
    async (staffId: string, companyIdOverride?: string) => {
      const cid = resolveCompanyId(companyIdOverride);
      if (!cid) return;
      const db = root.companyData[cid] || EMPTY_COMPANY_DB;
      const target = db.staff.find((s) => s.id === staffId);
      if (!target) return;
      const next = !target.active;
      await dbUpdatePath(`staff_online/company_data/${cid}/staff/${staffId}`, { active: next });
      pushToast({
        type: next ? 'success' : 'warning',
        title: `${target.name} ${next ? 'enabled' : 'disabled'}`,
      });
    },
    [resolveCompanyId, root.companyData, pushToast]
  );

  // Advances & Google Pay Settlements
  const recordAdvanceOrSettlement = useCallback(
    async (
      input: {
        staffId: string;
        amount: number;
        date: string;
        time: string;
        dueDate: string;
        mode: PaymentMode;
        kind: 'advance' | 'settlement';
        note: string;
        utr?: string;
        screenshotUrl?: string;
      },
      companyIdOverride?: string
    ) => {
      const cid = resolveCompanyId(companyIdOverride);
      if (!cid) return;
      const db = root.companyData[cid] || EMPTY_COMPANY_DB;
      const staff = db.staff.find((s) => s.id === input.staffId);
      if (!staff) return;

      const id = uid('adv');
      const record: AdvancePaymentRecord = {
        id,
        staffId: staff.id,
        staffName: staff.name,
        amount: Math.max(0, Number(input.amount) || 0),
        date: input.date || getTodayISO(),
        time: input.time || getCurrentTimeHHMM(),
        dueDate: input.dueDate || staff.periodTo || getTodayISO(),
        mode: input.mode,
        kind: input.kind,
        note: input.note.trim(),
        utr: input.utr?.trim() || undefined,
        screenshotUrl: input.screenshotUrl || undefined,
        confirmationStatus: 'pending',
        createdAt: new Date().toISOString(),
      };

      await dbSetPath(`staff_online/company_data/${cid}/advances/${id}`, record);
      await pushNotification(cid, {
        targetRole: 'staff',
        targetStaffId: staff.id,
        title:
          input.kind === 'settlement'
            ? `Google Pay Settlement Sent: ${formatINR(record.amount)}`
            : `Advance Auto-Deducted: ${formatINR(record.amount)}`,
        message: `${formatINR(record.amount)} recorded via ${input.mode.toUpperCase()} on ${record.date} at ${record.time}. Please confirm receipt in your Salary Slip.`,
        category: input.kind === 'settlement' ? 'gpay' : 'advance',
      });
      pushToast({
        type: 'success',
        title:
          input.kind === 'settlement'
            ? `GPay Settlement synced (${formatINR(record.amount)})`
            : `Advance auto-deducted (${formatINR(record.amount)})`,
        detail: 'Awaiting staff confirmation',
      });
    },
    [resolveCompanyId, root.companyData, pushNotification, pushToast]
  );

  const confirmStaffPayment = useCallback(
    async (paymentId: string, staffNote?: string) => {
      if (!activeCompanyId) return;
      const target = activeDb.advances.find((a) => a.id === paymentId);
      if (!target) return;
      const nowIso = new Date().toISOString();
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/advances/${paymentId}`, {
        confirmationStatus: 'confirmed',
        confirmedAt: nowIso,
        staffNote: staffNote?.trim() || 'Received and confirmed',
      });
      await pushNotification(activeCompanyId, {
        targetRole: 'company_admin',
        title: `Payment Confirmed by ${target.staffName}`,
        message: `${target.staffName} confirmed receipt of ${formatINR(target.amount)} (${target.mode.toUpperCase()}).`,
        category: 'confirm',
      });
      pushToast({
        type: 'success',
        title: 'Payment receipt confirmed',
      });
    },
    [activeCompanyId, activeDb.advances, pushNotification, pushToast]
  );

  const reportStaffPaymentIssue = useCallback(
    async (paymentId: string, issueReason: string) => {
      if (!activeCompanyId) return;
      const target = activeDb.advances.find((a) => a.id === paymentId);
      if (!target) return;
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/advances/${paymentId}`, {
        confirmationStatus: 'issue',
        staffNote: issueReason.trim() || 'Payment not received / discrepancy reported',
      });
      await pushNotification(activeCompanyId, {
        targetRole: 'company_admin',
        title: `Payment Issue Flagged: ${target.staffName}`,
        message: `${target.staffName} flagged ${formatINR(target.amount)}: "${issueReason.trim() || 'Not received'}"`,
        category: 'confirm',
      });
      pushToast({
        type: 'warning',
        title: 'Issue reported to Company Admin',
      });
    },
    [activeCompanyId, activeDb.advances, pushNotification, pushToast]
  );

  const sendDueDateNotification = useCallback(
    async (staffId: string, customNote?: string) => {
      if (!activeCompanyId) return;
      const staff = activeDb.staff.find((s) => s.id === staffId);
      if (!staff) return;
      await pushNotification(activeCompanyId, {
        targetRole: 'staff',
        targetStaffId: staff.id,
        title: `Salary Due Date Reminder (${staff.periodTo || 'Scheduled'})`,
        message:
          customNote?.trim() ||
          `Salary statement for period ${staff.periodFrom} → ${staff.periodTo} is ready. Check your Formal Salary Slip.`,
        category: 'due',
      });
      pushToast({
        type: 'success',
        title: `Due date notification sent to ${staff.name}`,
      });
    },
    [activeCompanyId, activeDb.staff, pushNotification, pushToast]
  );

  // Duty Punching (3-Stage Site Tracking with Live Selfies & Automatic Timestamps)
  const addDutyPunchIn = useCallback(
    async (input: {
      workTitle: string;
      date: string;
      mode: string;
      fromLocation: string;
      toLocation: string;
      dutyWage: number;
      selfieUrl?: string;
      asOfficeDeparture?: boolean;
      gpsLat?: number;
      gpsLng?: number;
      gpsLabel?: string;
    }) => {
      if (!activeCompanyId || !session?.staffId) return;
      const staff = activeDb.staff.find((s) => s.id === session.staffId);
      if (!staff) return;

      const rawSelfie = input.selfieUrl || session.verifiedSelfieUrl || '';
      const hostedSelfie = rawSelfie
        ? (await uploadToCloudinary(rawSelfie)).url || rawSelfie
        : '';

      const id = uid('punch');
      const nowIso = new Date().toISOString();
      const markDeparted = input.asOfficeDeparture !== false;
      const departGps: GpsStamp = {
        lat: input.gpsLat,
        lng: input.gpsLng,
        label: input.gpsLabel || 'GPS Captured',
      };

      const record: PunchLogRecord = {
        id,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        type: 'duty_punch',
        workTitle: input.workTitle.trim() || 'Field Site Duty',
        date: input.date || getTodayISO(),
        mode: input.mode || 'On-Site Duty',
        fromLocation: input.fromLocation.trim(),
        toLocation: input.toLocation.trim(),
        workTime: getCurrentTimeHHMM(),
        departTime: markDeparted ? nowIso : '',
        arriveTime: '',
        punchInTime: nowIso,
        dutyStage: markDeparted ? 'departed' : 'punched_in',
        status: 'active',
        dutyWage: Math.max(0, Number(input.dutyWage) || staff.dutyWage),
        selfieUrl: hostedSelfie,
        departSelfieUrl: markDeparted ? hostedSelfie : undefined,
        gpsLat: input.gpsLat,
        gpsLng: input.gpsLng,
        gpsLabel: input.gpsLabel || 'GPS Captured',
        departGps: markDeparted ? departGps : undefined,
        createdAt: nowIso,
      };

      await dbSetPath(`staff_online/company_data/${activeCompanyId}/punchLogs/${id}`, record);
      await pushNotification(activeCompanyId, {
        targetRole: 'company_admin',
        title: markDeparted
          ? `🚀 Office Departure: ${staff.name}`
          : `▶️ Punch-In: ${staff.name}`,
        message: `${staff.name} ${markDeparted ? 'left office for' : 'started'} "${record.workTitle}" at ${formatTimeIN(nowIso)} (${record.fromLocation || 'Office'} → ${record.toLocation || 'Site'}) • ${formatINR(record.dutyWage)}`,
        category: 'punch',
      });
      pushToast({
        type: 'success',
        title: markDeparted
          ? `Office Departure logged: ${formatTimeIN(nowIso)}`
          : `Punch-In recorded: ${formatTimeIN(nowIso)}`,
        detail: markDeparted
          ? 'Next step: Capture live selfie for Site Arrival when you reach the site.'
          : 'Continue through Site Arrival and Work Completed & Punch-Out.',
      });
    },
    [activeCompanyId, activeDb.staff, session, pushNotification, pushToast]
  );

  const recordDutyMilestone = useCallback(
    async (
      punchId: string,
      milestone: 'departed' | 'arrived' | 'work_completed' | 'punched_out',
      options?:
        | GpsStamp
        | {
            gps?: GpsStamp;
            selfieUrl?: string;
            workCompleted?: boolean;
            workCompletionNote?: string;
          }
    ): Promise<boolean> => {
      if (!activeCompanyId) return false;
      const target = activeDb.punchLogs.find((p) => p.id === punchId);
      if (!target) return false;

      const isWrapped =
        options &&
        typeof options === 'object' &&
        ('gps' in options ||
          'selfieUrl' in options ||
          'workCompleted' in options ||
          'workCompletionNote' in options);

      const gps: GpsStamp | undefined = isWrapped
        ? (options as { gps?: GpsStamp }).gps
        : (options as GpsStamp | undefined);
      const rawSelfie = isWrapped ? (options as { selfieUrl?: string }).selfieUrl : undefined;
      const workCompletedFlag = isWrapped
        ? (options as { workCompleted?: boolean }).workCompleted
        : undefined;
      const workCompletionNote = isWrapped
        ? (options as { workCompletionNote?: string }).workCompletionNote?.trim() || ''
        : '';

      const hostedSelfie = rawSelfie
        ? (await uploadToCloudinary(rawSelfie)).url || rawSelfie
        : undefined;

      const nowIso = new Date().toISOString();
      const gpsPayload: GpsStamp = {
        lat: gps?.lat,
        lng: gps?.lng,
        label: gps?.label || 'GPS Captured',
      };

      if (milestone === 'departed') {
        if (target.departTime) return false;
        await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/punchLogs/${punchId}`, {
          departTime: nowIso,
          departGps: gpsPayload,
          ...(hostedSelfie
            ? { departSelfieUrl: hostedSelfie, selfieUrl: target.selfieUrl || hostedSelfie }
            : {}),
          dutyStage: 'departed',
        });
        await pushNotification(activeCompanyId, {
          targetRole: 'company_admin',
          title: `🚀 Office Departure: ${target.staffName}`,
          message: `${target.staffName} left office for "${target.workTitle}" (${target.fromLocation || 'Office'} → ${target.toLocation || 'Site'}) at ${formatTimeIN(nowIso)}.`,
          category: 'punch',
        });
        pushToast({
          type: 'success',
          title: `Office Departure recorded: ${formatTimeIN(nowIso)}`,
          detail: 'Next step: Log Site Arrival when you reach the work site.',
        });
        return true;
      }

      if (milestone === 'arrived') {
        if (target.arriveTime) return false;
        await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/punchLogs/${punchId}`, {
          arriveTime: nowIso,
          arriveGps: gpsPayload,
          ...(hostedSelfie ? { arriveSelfieUrl: hostedSelfie } : {}),
          dutyStage: 'arrived',
        });
        await pushNotification(activeCompanyId, {
          targetRole: 'company_admin',
          title: `📍 Site Arrival: ${target.staffName}`,
          message: `${target.staffName} reached work site (${target.toLocation || 'Site'}) for "${target.workTitle}" at ${formatTimeIN(nowIso)}.`,
          category: 'punch',
        });
        pushToast({
          type: 'success',
          title: `Site Arrival recorded: ${formatTimeIN(nowIso)}`,
          detail: 'Next step: Confirm Work Completed & Punch-Out after finishing work.',
        });
        return true;
      }

      if (milestone === 'work_completed') {
        if (target.workCompletedTime) return false;
        await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/punchLogs/${punchId}`, {
          workCompleted: true,
          workCompletedTime: nowIso,
          ...(workCompletionNote ? { workCompletionNote } : {}),
          workCompletedGps: gpsPayload,
          dutyStage: 'work_completed',
        });
        await pushNotification(activeCompanyId, {
          targetRole: 'company_admin',
          title: `✅ Work Completed: ${target.staffName}`,
          message: `${target.staffName} marked "${target.workTitle}" completed at ${formatTimeIN(nowIso)}${workCompletionNote ? ` · Note: ${workCompletionNote}` : ''}.`,
          category: 'punch',
        });
        pushToast({
          type: 'success',
          title: `Work Completed recorded: ${formatTimeIN(nowIso)}`,
        });
        return true;
      }

      // milestone === 'punched_out'
      if (workCompletedFlag === false) {
        pushToast({
          type: 'error',
          title: 'Please confirm "Work Completed" before Punch-Out',
        });
        return false;
      }
      const durationText = formatShiftDuration(target.punchInTime, nowIso);
      const finalNote = workCompletionNote || target.workCompletionNote || '';
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/punchLogs/${punchId}`, {
        workCompleted: true,
        workCompletedTime: target.workCompletedTime || nowIso,
        workCompletionNote: finalNote,
        punchOutTime: nowIso,
        punchOutGps: gpsPayload,
        ...(hostedSelfie ? { punchOutSelfieUrl: hostedSelfie } : {}),
        dutyStage: 'punched_out',
        status: 'completed',
        totalDurationText: durationText,
      });
      await pushNotification(activeCompanyId, {
        targetRole: 'company_admin',
        title: `✅ Work Completed & Punch-Out: ${target.staffName}`,
        message: `${target.staffName} finished "${target.workTitle}" & punched out at ${formatTimeIN(nowIso)} · Duration: ${durationText} · Wage credited: ${formatINR(target.dutyWage)}${finalNote ? ` · Note: ${finalNote}` : ''}.`,
        category: 'punch',
      });
      pushToast({
        type: 'success',
        title: `Work Completed & Punch-Out recorded: ${formatTimeIN(nowIso)}`,
        detail: `Total Shift: ${durationText} · ${formatINR(target.dutyWage)} added to Salary Ledger`,
      });
      return true;
    },
    [activeCompanyId, activeDb.punchLogs, pushNotification, pushToast]
  );

  const punchOutDuty = useCallback(
    async (punchId: string, gps?: GpsStamp) => {
      await recordDutyMilestone(punchId, 'punched_out', { gps, workCompleted: true });
    },
    [recordDutyMilestone]
  );

  const updatePunchLog = useCallback(
    async (punchId: string, updates: Partial<PunchLogRecord>) => {
      if (!activeCompanyId) return;
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/punchLogs/${punchId}`, {
        ...updates,
        editedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      pushToast({ type: 'success', title: 'Punch log updated' });
    },
    [activeCompanyId, pushToast]
  );

  // Live Instructions
  const sendLiveInstruction = useCallback(
    async (staffId: string, message: string) => {
      if (!activeCompanyId || !message.trim()) return;
      const staff = activeDb.staff.find((s) => s.id === staffId);
      if (!staff) return;
      const id = uid('inst');
      const item: LiveInstruction = {
        id,
        staffId: staff.id,
        staffName: staff.name,
        message: message.trim(),
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/instructions/${id}`, item);
      await pushNotification(activeCompanyId, {
        targetRole: 'staff',
        targetStaffId: staff.id,
        title: 'New Live Admin Instruction',
        message: message.trim(),
        category: 'system',
      });
      pushToast({ type: 'success', title: `Instruction sent to ${staff.name}` });
    },
    [activeCompanyId, activeDb.staff, pushNotification, pushToast]
  );

  const acknowledgeInstruction = useCallback(
    async (instructionId: string) => {
      if (!activeCompanyId) return;
      await dbUpdatePath(
        `staff_online/company_data/${activeCompanyId}/instructions/${instructionId}`,
        {
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
        }
      );
      pushToast({ type: 'success', title: 'Instruction acknowledged' });
    },
    [activeCompanyId, pushToast]
  );

  // Customers
  const addCustomer = useCallback(
    async (input: Omit<CustomerRecord, 'id' | 'createdAt'>) => {
      if (!activeCompanyId) return;
      const id = uid('cust');
      const initialPayments =
        input.received > 0
          ? [
              {
                id: uid('cpay'),
                amount: input.received,
                date: input.date || getTodayISO(),
                mode: input.paymentMode,
                note: 'Initial payment',
              },
            ]
          : [];
      const record: CustomerRecord = {
        ...input,
        id,
        payments: input.payments || initialPayments,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/customers/${id}`, record);
      pushToast({ type: 'success', title: `Customer added: ${record.name}` });
    },
    [activeCompanyId, pushToast]
  );

  const updateCustomer = useCallback(
    async (customerId: string, updates: Partial<CustomerRecord>) => {
      if (!activeCompanyId) return;
      await dbUpdatePath(
        `staff_online/company_data/${activeCompanyId}/customers/${customerId}`,
        updates as Record<string, unknown>
      );
      pushToast({ type: 'success', title: 'Customer updated' });
    },
    [activeCompanyId, pushToast]
  );

  const collectCustomerDue = useCallback(
    async (customerId: string, amount: number, mode: PaymentMode, note: string) => {
      if (!activeCompanyId) return;
      const cust = activeDb.customers.find((c) => c.id === customerId);
      if (!cust || amount <= 0) return;
      const nextReceived = (Number(cust.received) || 0) + amount;
      const nextPayments = [
        ...(cust.payments || []),
        {
          id: uid('cpay'),
          amount,
          date: getTodayISO(),
          mode,
          note: note.trim() || 'Due payment collected',
        },
      ];
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/customers/${customerId}`, {
        received: nextReceived,
        paymentMode: mode,
        payments: nextPayments,
      });
      pushToast({
        type: 'success',
        title: `Collected ${formatINR(amount)} from ${cust.name}`,
      });
    },
    [activeCompanyId, activeDb.customers, pushToast]
  );

  const deleteCustomer = useCallback(
    async (customerId: string) => {
      if (!activeCompanyId) return;
      await dbRemovePath(`staff_online/company_data/${activeCompanyId}/customers/${customerId}`);
      pushToast({ type: 'info', title: 'Customer record deleted' });
    },
    [activeCompanyId, pushToast]
  );

  // Multi-Crew Works
  const addWork = useCallback(
    async (input: Omit<MultiCrewWork, 'id' | 'createdAt'>) => {
      if (!activeCompanyId) return;
      const id = uid('wrk');
      const record: MultiCrewWork = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/works/${id}`, record);
      for (const sid of record.assignedStaffIds) {
        await pushNotification(activeCompanyId, {
          targetRole: 'staff',
          targetStaffId: sid,
          title: `New Duty Assigned: ${record.title}`,
          message: `${record.clientVenue} on ${record.date} at ${record.time} (${record.fromLocation} → ${record.toLocation})`,
          category: 'system',
        });
      }
      pushToast({ type: 'success', title: `Work assigned: ${record.title}` });
    },
    [activeCompanyId, pushNotification, pushToast]
  );

  const updateWork = useCallback(
    async (workId: string, updates: Partial<MultiCrewWork>) => {
      if (!activeCompanyId) return;
      await dbUpdatePath(
        `staff_online/company_data/${activeCompanyId}/works/${workId}`,
        updates as Record<string, unknown>
      );
      pushToast({ type: 'success', title: 'Work updated' });
    },
    [activeCompanyId, pushToast]
  );

  const deleteWork = useCallback(
    async (workId: string) => {
      if (!activeCompanyId) return;
      await dbRemovePath(`staff_online/company_data/${activeCompanyId}/works/${workId}`);
      pushToast({ type: 'info', title: 'Work removed' });
    },
    [activeCompanyId, pushToast]
  );

  // Subcontracts
  const addSubcontract = useCallback(
    async (input: Omit<SubcontractRecord, 'id' | 'createdAt'>) => {
      if (!activeCompanyId) return;
      const id = uid('sub');
      const record: SubcontractRecord = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/subcontracts/${id}`, record);
      pushToast({ type: 'success', title: `Subcontract saved: ${record.vendorName}` });
    },
    [activeCompanyId, pushToast]
  );

  const updateSubcontract = useCallback(
    async (subId: string, updates: Partial<SubcontractRecord>) => {
      if (!activeCompanyId) return;
      await dbUpdatePath(
        `staff_online/company_data/${activeCompanyId}/subcontracts/${subId}`,
        updates as Record<string, unknown>
      );
      pushToast({ type: 'success', title: 'Subcontract updated' });
    },
    [activeCompanyId, pushToast]
  );

  const deleteSubcontract = useCallback(
    async (subId: string) => {
      if (!activeCompanyId) return;
      await dbRemovePath(`staff_online/company_data/${activeCompanyId}/subcontracts/${subId}`);
      pushToast({ type: 'info', title: 'Subcontract deleted' });
    },
    [activeCompanyId, pushToast]
  );

  // Expenses
  const submitStaffExpense = useCallback(
    async (input: {
      description: string;
      amount: number;
      date: string;
      billPhotoUrl?: string;
    }) => {
      if (!activeCompanyId || !session?.staffId) return;
      const staff = activeDb.staff.find((s) => s.id === session.staffId);
      if (!staff) return;
      const id = uid('exp');
      const record: ExpenseRecord = {
        id,
        staffId: staff.id,
        staffName: staff.name,
        description: input.description.trim(),
        amount: Math.max(0, Number(input.amount) || 0),
        date: input.date || getTodayISO(),
        billPhotoUrl: input.billPhotoUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/expenses/${id}`, record);
      await pushNotification(activeCompanyId, {
        targetRole: 'company_admin',
        title: `New Expense Claim: ${staff.name}`,
        message: `${staff.name} submitted ${formatINR(record.amount)} for "${record.description}".`,
        category: 'expense',
      });
      pushToast({ type: 'success', title: 'Expense claim submitted for approval' });
    },
    [activeCompanyId, activeDb.staff, session, pushNotification, pushToast]
  );

  const reviewExpense = useCallback(
    async (expenseId: string, status: 'approved' | 'rejected') => {
      if (!activeCompanyId) return;
      const exp = activeDb.expenses.find((e) => e.id === expenseId);
      if (!exp) return;
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/expenses/${expenseId}`, {
        status,
        reviewedAt: new Date().toISOString(),
      });
      await pushNotification(activeCompanyId, {
        targetRole: 'staff',
        targetStaffId: exp.staffId,
        title:
          status === 'approved'
            ? `Expense Approved: ${formatINR(exp.amount)}`
            : `Expense Rejected: ${formatINR(exp.amount)}`,
        message:
          status === 'approved'
            ? `"${exp.description}" (${formatINR(exp.amount)}) has been approved and added to your Salary Slip.`
            : `"${exp.description}" (${formatINR(exp.amount)}) was not approved.`,
        category: 'expense',
      });
      pushToast({
        type: status === 'approved' ? 'success' : 'info',
        title:
          status === 'approved'
            ? 'Expense approved & added to Salary Slip'
            : 'Expense rejected',
      });
    },
    [activeCompanyId, activeDb.expenses, pushNotification, pushToast]
  );

  // Manual Ledger
  const addManualLedger = useCallback(
    async (input: Omit<ManualLedgerEntry, 'id' | 'createdAt'>) => {
      if (!activeCompanyId) return;
      const id = uid('ldg');
      const record: ManualLedgerEntry = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      await dbSetPath(`staff_online/company_data/${activeCompanyId}/ledger/${id}`, record);
      pushToast({ type: 'success', title: 'Ledger entry added' });
    },
    [activeCompanyId, pushToast]
  );

  const deleteManualLedger = useCallback(
    async (entryId: string) => {
      if (!activeCompanyId) return;
      await dbRemovePath(`staff_online/company_data/${activeCompanyId}/ledger/${entryId}`);
      pushToast({ type: 'info', title: 'Ledger entry removed' });
    },
    [activeCompanyId, pushToast]
  );

  // Notifications
  const markAllNotificationsRead = useCallback(async () => {
    if (!activeCompanyId) return;
    const updates: Record<string, unknown> = {};
    activeDb.notifications.forEach((n) => {
      if (!n.read) updates[`${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      await dbUpdatePath(`staff_online/company_data/${activeCompanyId}/notifications`, updates);
    }
  }, [activeCompanyId, activeDb.notifications]);

  const clearNotifications = useCallback(async () => {
    if (!activeCompanyId) return;
    await dbRemovePath(`staff_online/company_data/${activeCompanyId}/notifications`);
    pushToast({ type: 'info', title: 'Notifications cleared' });
  }, [activeCompanyId, pushToast]);

  const value: StaffOnlineContextValue = {
    isReady,
    superAdmin: root.superAdmin,
    companies,
    companiesMap: root.companies,
    companyDataMap: root.companyData,
    session,
    inspectingCompanyId,
    setInspectingCompanyId,
    activeCompany,
    activeDb,
    lang,
    toggleLang,
    setLang,
    toasts,
    pushToast,
    dismissToast,
    notificationsOpen,
    setNotificationsOpen,
    gpayModal,
    openGPayModal: setGPayModal,
    closeGPayModal: () => setGPayModal(null),
    whatsappModal,
    openWhatsAppModal: setWhatsappModal,
    closeWhatsAppModal: () => setWhatsappModal(null),
    lightboxUrl,
    openLightbox: setLightboxUrl,
    closeLightbox: () => setLightboxUrl(null),
    loginSuperAdmin,
    loginCompanyAdmin,
    loginStaffWithSelfie,
    punchOutStaffWithSelfie,
    submitFrontSelfieStage,
    logout,
    registerCompany,
    updateCompany,
    extendCompanyPlanYear,
    setCompanyPlanStatus,
    toggleCompanyActive,
    deleteCompany,
    updateSuperAdminPassword,
    addStaff,
    updateStaff,
    toggleStaffActive,
    recordAdvanceOrSettlement,
    confirmStaffPayment,
    reportStaffPaymentIssue,
    sendDueDateNotification,
    addDutyPunchIn,
    recordDutyMilestone,
    punchOutDuty,
    updatePunchLog,
    sendLiveInstruction,
    acknowledgeInstruction,
    addCustomer,
    updateCustomer,
    collectCustomerDue,
    deleteCustomer,
    addWork,
    updateWork,
    deleteWork,
    addSubcontract,
    updateSubcontract,
    deleteSubcontract,
    submitStaffExpense,
    reviewExpense,
    addManualLedger,
    deleteManualLedger,
    markAllNotificationsRead,
    clearNotifications,
  };

  return <StaffOnlineContext.Provider value={value}>{children}</StaffOnlineContext.Provider>;
};

export function useStaffOnline(): StaffOnlineContextValue {
  const ctx = useContext(StaffOnlineContext);
  if (!ctx) throw new Error('useStaffOnline must be used within StaffOnlineProvider');
  return ctx;
}
