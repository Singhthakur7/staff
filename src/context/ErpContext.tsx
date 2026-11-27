import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Query,
  DocumentData,
} from 'firebase/firestore';
import {
  AdminNotification,
  AttendanceRecord,
  AuthSession,
  CompanyDatabase,
  CompanyProfile,
  CustomerRecord,
  EMPTY_COMPANY_DB,
  ExpenseClaim,
  GPayModalPayload,
  Language,
  LeaveRequest,
  LedgerEntry,
  LiveInstruction,
  MasterAdminConfig,
  MembershipRecord,
  PaymentCategory,
  PaymentMode,
  RateMode,
  SalaryPayment,
  SiteReceipt,
  StaffAccount,
  ToastMessage,
  WhatsAppModalPayload,
  WorkAssignment,
} from '../types';
import {
  auth,
  BOOTSTRAPPED_MASTER_EMAIL,
  db,
  emailToMemberKey,
  googleProvider,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
  sanitizeOptStr,
  sanitizeStr,
  stripUndefined,
  testConnection,
  toIsoString,
} from '../firebase';
import {
  calculateShiftWage,
  getSafeLocation,
  getTodayISO,
  LANG_STORAGE_KEY,
  safeSessionGet,
  safeSessionSet,
  SESSION_STORAGE_KEY,
  uid,
} from '../utils/helpers';

export const DEFAULT_MASTER_ADMIN: MasterAdminConfig = {
  brandName: 'AuraERP Cloud Suite',
  supportEmail: BOOTSTRAPPED_MASTER_EMAIL,
  email: BOOTSTRAPPED_MASTER_EMAIL,
};

function mapDocWithDates<T extends object>(id: string, raw: DocumentData): T {
  const mapped: Record<string, unknown> = { ...raw, id };
  if ('createdAt' in raw) mapped.createdAt = toIsoString(raw.createdAt);
  if ('updatedAt' in raw) mapped.updatedAt = toIsoString(raw.updatedAt);
  return mapped as unknown as T;
}

const SUBCOLLECTIONS = [
  'staff',
  'attendance',
  'works',
  'ledger',
  'payments',
  'customers',
  'expenses',
  'leaves',
  'receipts',
  'instructions',
  'notifications',
] as const;

interface ErpContextValue {
  isFirebaseConfigured: boolean;
  isRtdbConnected: boolean;
  isBooting: boolean;
  firebaseUser: User | null;
  masterConfig: MasterAdminConfig;
  companies: CompanyProfile[];
  allCompanyDatabases: Record<string, CompanyDatabase>;
  activeCompany: CompanyProfile | null;
  state: CompanyDatabase;
  session: AuthSession | null;
  inspectingCompanyId: string | null;
  setInspectingCompanyId: (companyId: string | null) => void;
  lang: Language;
  toasts: ToastMessage[];
  whatsappModal: WhatsAppModalPayload | null;
  gpayModal: GPayModalPayload | null;
  lightboxUrl: string | null;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  openWhatsAppModal: (payload: WhatsAppModalPayload) => void;
  closeWhatsAppModal: () => void;
  openGPayModal: (payload: GPayModalPayload) => void;
  closeGPayModal: () => void;
  openLightbox: (url: string) => void;
  closeLightbox: () => void;
  // Isolated 3-Tier Google Auth
  signInWithGoogle: (
    portalType: 'master_admin' | 'company_admin' | 'staff',
    companySlug?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Master Admin Operations
  updateMasterConfig: (updates: Partial<MasterAdminConfig>) => Promise<boolean>;
  createCompany: (
    input: Omit<CompanyProfile, 'id' | 'createdAt'>
  ) => Promise<CompanyProfile | null>;
  updateCompany: (companyId: string, updates: Partial<CompanyProfile>) => Promise<boolean>;
  toggleCompanyActive: (companyId: string) => Promise<boolean>;
  deleteCompany: (companyId: string) => Promise<boolean>;
  // Scoped Company ERP Operations
  punchIn: (payload: {
    staffId: string;
    rateMode: RateMode;
    studioName: string;
    studioPhone: string;
    venue: string;
    fromLocation: string;
    toLocation: string;
    workNotes: string;
    gpsLat: number;
    gpsLng: number;
    gpsLabel: string;
    selfieUrl?: string;
  }) => Promise<void>;
  punchOut: (attendanceId: string, gpsLat?: number, gpsLng?: number) => Promise<void>;
  updateAttendance: (
    id: string,
    updates: Partial<AttendanceRecord>,
    editorName: string
  ) => Promise<void>;
  sendInstruction: (staffId: string, message: string, presetTag?: string) => Promise<void>;
  acknowledgeInstruction: (instructionId: string) => Promise<void>;
  addWork: (work: Omit<WorkAssignment, 'id' | 'createdAt'>) => Promise<void>;
  updateWork: (id: string, updates: Partial<WorkAssignment>) => Promise<void>;
  deleteWork: (id: string) => Promise<void>;
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;
  recordSalaryPayment: (payload: {
    staffId: string;
    amount: number;
    mode: PaymentMode;
    category: PaymentCategory;
    upiIdUsed: string;
    utr: string;
    note: string;
    screenshotUrl?: string;
  }) => Promise<void>;
  confirmPaymentReceived: (paymentId: string, staffNote: string) => Promise<void>;
  reportPaymentIssue: (paymentId: string, issueReason: string) => Promise<void>;
  addCustomer: (customer: Omit<CustomerRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<CustomerRecord>) => Promise<void>;
  addStaffAccount: (staff: Omit<StaffAccount, 'id' | 'joinedDate'>) => Promise<StaffAccount | null>;
  updateStaffAccount: (id: string, updates: Partial<StaffAccount>) => Promise<void>;
  toggleStaffActive: (id: string) => Promise<void>;
  submitExpense: (payload: Omit<ExpenseClaim, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  reviewExpense: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  submitLeave: (payload: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  reviewLeave: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  uploadSiteReceipt: (payload: Omit<SiteReceipt, 'id' | 'createdAt'>) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRtdbConnected, setIsRtdbConnected] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [masterConfig, setMasterConfig] = useState<MasterAdminConfig>(DEFAULT_MASTER_ADMIN);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [activeCompanyData, setActiveCompanyData] = useState<CompanyDatabase>(EMPTY_COMPANY_DB);
  const [allCompanyDatabases, setAllCompanyDatabases] = useState<Record<string, CompanyDatabase>>(
    {}
  );

  const [session, setSession] = useState<AuthSession | null>(() =>
    safeSessionGet<AuthSession | null>(SESSION_STORAGE_KEY, null)
  );
  const [inspectingCompanyId, setInspectingCompanyId] = useState<string | null>(null);

  const [lang, setLangState] = useState<Language>(() =>
    safeSessionGet<Language>(LANG_STORAGE_KEY, 'en')
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [whatsappModal, setWhatsappModal] = useState<WhatsAppModalPayload | null>(null);
  const [gpayModal, setGpayModal] = useState<GPayModalPayload | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = uid('tst');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    safeSessionSet(LANG_STORAGE_KEY, next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Language = prev === 'en' ? 'ml' : 'en';
      safeSessionSet(LANG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const reportError = useCallback(
    (err: unknown, op: OperationType, path: string | null, escalate = false) => {
      try {
        handleFirestoreError(err, op, path);
      } catch (wrapped) {
        const errorObj = wrapped instanceof Error ? wrapped : new Error(String(wrapped));
        if (escalate) {
          setFatalError(errorObj);
        } else {
          pushToast({
            type: 'error',
            title: 'Cloud Sync Error',
            description: err instanceof Error ? err.message : 'Operation could not be completed.',
          });
        }
      }
    },
    [pushToast]
  );

  // 1. Live Firestore reachability check
  useEffect(() => {
    let active = true;
    testConnection().then((ok) => {
      if (active) setIsRtdbConnected(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  // 2. Firebase Auth listener (gates all Firestore queries)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setSession(null);
        setInspectingCompanyId(null);
        setCompanies([]);
        setActiveCompanyData(EMPTY_COMPANY_DB);
        setAllCompanyDatabases({});
        safeSessionSet(SESSION_STORAGE_KEY, null);
      } else {
        const userEmail = (user.email || '').trim().toLowerCase();
        setSession((prev) => {
          if (!prev) return null;
          if (prev.email.trim().toLowerCase() !== userEmail) {
            safeSessionSet(SESSION_STORAGE_KEY, null);
            return null;
          }
          return prev;
        });
      }
      setIsBooting(false);
    });
    return () => unsub();
  }, []);

  // 3. Subscribe to Master Config & Companies Directory based on authenticated role
  useEffect(() => {
    if (!firebaseUser || !session) {
      setCompanies([]);
      return;
    }

    const userEmail = (firebaseUser.email || '').trim().toLowerCase();
    const unsubs: (() => void)[] = [];

    if (session.role === 'master_admin') {
      const configRef = doc(db, 'system', 'master_config');
      unsubs.push(
        onSnapshot(
          configRef,
          (snap) => {
            setIsRtdbConnected(true);
            if (snap.exists()) {
              const d = snap.data();
              setMasterConfig({
                brandName: String(d.brandName || 'AuraERP Cloud Suite'),
                supportEmail: String(d.supportEmail || userEmail),
                email: String(d.supportEmail || userEmail),
              });
            }
          },
          (err) => {
            if (!auth.currentUser) return;
            reportError(err, OperationType.GET, 'system/master_config', false);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'companies'),
          (snap) => {
            setIsRtdbConnected(true);
            const list = snap.docs
              .map((d) => mapDocWithDates<CompanyProfile>(d.id, d.data()))
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCompanies(list);
          },
          (err) => {
            if (!auth.currentUser) return;
            reportError(err, OperationType.LIST, 'companies', true);
          }
        )
      );
    } else if (session.role === 'company_admin') {
      const q = query(collection(db, 'companies'), where('adminEmail', '==', userEmail));
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            setIsRtdbConnected(true);
            const list = snap.docs
              .map((d) => mapDocWithDates<CompanyProfile>(d.id, d.data()))
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCompanies(list);
          },
          (err) => {
            if (!auth.currentUser) return;
            reportError(err, OperationType.LIST, 'companies', true);
          }
        )
      );
    } else if (session.role === 'staff' && session.companyId) {
      const compRef = doc(db, 'companies', session.companyId);
      unsubs.push(
        onSnapshot(
          compRef,
          (snap) => {
            setIsRtdbConnected(true);
            if (snap.exists()) {
              const comp = mapDocWithDates<CompanyProfile>(snap.id, snap.data());
              setCompanies([comp]);
            } else {
              setCompanies([]);
            }
          },
          (err) => {
            if (!auth.currentUser) return;
            // If company was suspended/deleted, enforce clean sign-out
            if (err.code === 'permission-denied') {
              setSession(null);
              safeSessionSet(SESSION_STORAGE_KEY, null);
              pushToast({
                type: 'error',
                title: 'Company Account Suspended',
                description: 'Access has been suspended or revoked by your administrator.',
              });
              return;
            }
            reportError(err, OperationType.GET, `companies/${session.companyId}`, true);
          }
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, session, pushToast, reportError]);

  const activeCompanyId = useMemo(() => {
    if (session?.role === 'master_admin') {
      return inspectingCompanyId;
    }
    return session?.companyId || null;
  }, [session, inspectingCompanyId]);

  const activeCompany = useMemo(() => {
    if (!activeCompanyId) return null;
    return companies.find((c) => c.id === activeCompanyId) || null;
  }, [companies, activeCompanyId]);

  // Live company suspension check
  useEffect(() => {
    if (
      session &&
      (session.role === 'company_admin' || session.role === 'staff') &&
      session.companyId &&
      companies.length > 0
    ) {
      const comp = companies.find((c) => c.id === session.companyId);
      if (comp && !comp.active) {
        setSession(null);
        safeSessionSet(SESSION_STORAGE_KEY, null);
        pushToast({
          type: 'error',
          title: 'Company Account Suspended',
          description: 'Access has been suspended by the Master Administrator.',
        });
      }
    }
  }, [session, companies, pushToast]);

  // 4. Subscribe strictly to the active company's isolated Firestore subcollections
  useEffect(() => {
    if (!firebaseUser || !session || !activeCompanyId) {
      setActiveCompanyData(EMPTY_COMPANY_DB);
      return;
    }

    const userEmail = (firebaseUser.email || '').trim().toLowerCase();
    const unsubs: (() => void)[] = [];

    const subscribeCol = <T extends object>(
      subcol: keyof CompanyDatabase,
      q: Query<DocumentData>,
      sorter: (a: T, b: T) => number
    ) => {
      const path = `companies/${activeCompanyId}/${subcol}`;
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items = snap.docs
            .map((d) => mapDocWithDates<T>(d.id, d.data()))
            .sort(sorter);
          setActiveCompanyData((prev) => ({ ...prev, [subcol]: items }));
        },
        (err) => {
          if (!auth.currentUser) return;
          if (err.code === 'permission-denied') {
            // Gracefully clear if company/member was just deactivated
            setActiveCompanyData((prev) => ({ ...prev, [subcol]: [] }));
            return;
          }
          reportError(err, OperationType.LIST, path, false);
        }
      );
      unsubs.push(unsub);
    };

    const colRef = (sub: string) => collection(db, 'companies', activeCompanyId, sub);

    if (session.role === 'master_admin') {
      subscribeCol<StaffAccount>('staff', query(colRef('staff')), (a, b) =>
        a.name.localeCompare(b.name)
      );
      subscribeCol<AttendanceRecord>('attendance', query(colRef('attendance')), (a, b) =>
        (b.punchInTime || b.date).localeCompare(a.punchInTime || a.date)
      );
      subscribeCol<WorkAssignment>('works', query(colRef('works')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LedgerEntry>('ledger', query(colRef('ledger')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SalaryPayment>('payments', query(colRef('payments')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<CustomerRecord>('customers', query(colRef('customers')), (a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      subscribeCol<ExpenseClaim>('expenses', query(colRef('expenses')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LeaveRequest>('leaves', query(colRef('leaves')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SiteReceipt>('receipts', query(colRef('receipts')), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LiveInstruction>('instructions', query(colRef('instructions')), (a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      subscribeCol<AdminNotification>('notifications', query(colRef('notifications')), (a, b) =>
        (b.timestamp || '').localeCompare(a.timestamp || '')
      );
    } else if (session.role === 'company_admin') {
      const adminFilter = where('companyAdminEmail', '==', userEmail);
      subscribeCol<StaffAccount>('staff', query(colRef('staff'), adminFilter), (a, b) =>
        a.name.localeCompare(b.name)
      );
      subscribeCol<AttendanceRecord>(
        'attendance',
        query(colRef('attendance'), adminFilter),
        (a, b) => (b.punchInTime || b.date).localeCompare(a.punchInTime || a.date)
      );
      subscribeCol<WorkAssignment>('works', query(colRef('works'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LedgerEntry>('ledger', query(colRef('ledger'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SalaryPayment>('payments', query(colRef('payments'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<CustomerRecord>('customers', query(colRef('customers'), adminFilter), (a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      subscribeCol<ExpenseClaim>('expenses', query(colRef('expenses'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LeaveRequest>('leaves', query(colRef('leaves'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SiteReceipt>('receipts', query(colRef('receipts'), adminFilter), (a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LiveInstruction>(
        'instructions',
        query(colRef('instructions'), adminFilter),
        (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      subscribeCol<AdminNotification>(
        'notifications',
        query(colRef('notifications'), adminFilter),
        (a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')
      );
    } else if (session.role === 'staff') {
      subscribeCol<StaffAccount>(
        'staff',
        query(colRef('staff'), where('email', '==', userEmail)),
        (a, b) => a.name.localeCompare(b.name)
      );
      subscribeCol<AttendanceRecord>(
        'attendance',
        query(colRef('attendance'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.punchInTime || b.date).localeCompare(a.punchInTime || a.date)
      );
      subscribeCol<WorkAssignment>(
        'works',
        query(colRef('works'), where('assignedStaffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SalaryPayment>(
        'payments',
        query(colRef('payments'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<CustomerRecord>(
        'customers',
        query(colRef('customers'), where('allowedStaffEmails', 'array-contains', userEmail)),
        (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      subscribeCol<ExpenseClaim>(
        'expenses',
        query(colRef('expenses'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LeaveRequest>(
        'leaves',
        query(colRef('leaves'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<SiteReceipt>(
        'receipts',
        query(colRef('receipts'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
      );
      subscribeCol<LiveInstruction>(
        'instructions',
        query(colRef('instructions'), where('staffEmail', '==', userEmail)),
        (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      setActiveCompanyData((prev) => ({ ...prev, ledger: [], notifications: [] }));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, session, activeCompanyId, reportError]);

  // 5. Subscribe to ALL company subcollections ONLY when Master Admin is signed in
  const companyIdsKey = useMemo(() => companies.map((c) => c.id).join(','), [companies]);

  useEffect(() => {
    if (!firebaseUser || session?.role !== 'master_admin' || companies.length === 0) {
      setAllCompanyDatabases({});
      return;
    }

    const unsubs: (() => void)[] = [];
    const masterOverviewCols: (keyof CompanyDatabase)[] = [
      'staff',
      'attendance',
      'works',
      'ledger',
      'payments',
      'expenses',
      'notifications',
    ];

    companies.forEach((comp) => {
      masterOverviewCols.forEach((subcol) => {
        const ref = collection(db, 'companies', comp.id, subcol);
        const unsub = onSnapshot(
          ref,
          (snap) => {
            const rows = snap.docs.map((d) => mapDocWithDates(d.id, d.data()));
            setAllCompanyDatabases((prev) => ({
              ...prev,
              [comp.id]: {
                ...(prev[comp.id] || EMPTY_COMPANY_DB),
                [subcol]: rows,
              },
            }));
          },
          (err) => {
            if (!auth.currentUser) return;
            reportError(err, OperationType.LIST, `companies/${comp.id}/${subcol}`, false);
          }
        );
        unsubs.push(unsub);
      });
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, session?.role, companyIdsKey, reportError]);

  // Helper: push isolated notification into target company's Firestore subcollection
  const pushCompanyNotification = useCallback(
    async (
      companyId: string,
      companyAdminEmail: string,
      notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>
    ) => {
      const user = auth.currentUser;
      if (!user) return;
      const id = uid('ntf');
      const path = `companies/${companyId}/notifications/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId,
          companyAdminEmail: companyAdminEmail.trim().toLowerCase(),
          type: notification.type,
          title: sanitizeStr(notification.title, 200) || 'Activity Update',
          message: sanitizeStr(notification.message, 1000),
          timestamp: new Date().toISOString(),
          read: false,
          staffId: sanitizeOptStr(notification.staffId, 128),
          gpsLat: typeof notification.gpsLat === 'number' ? notification.gpsLat : undefined,
          gpsLng: typeof notification.gpsLng === 'number' ? notification.gpsLng : undefined,
          imageUrl: sanitizeOptStr(notification.imageUrl, 120000),
          priority: notification.priority,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', companyId, 'notifications', id), docData);
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [reportError]
  );

  // =========================================================================
  // 3-TIER ISOLATED GOOGLE AUTHENTICATION
  // =========================================================================

  const signInWithGoogle: ErpContextValue['signInWithGoogle'] = useCallback(
    async (portalType, companySlug) => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const email = (user.email || '').trim().toLowerCase();

        if (!email || !user.emailVerified) {
          await signOut(auth);
          return {
            ok: false,
            error: 'A verified Google account email is required to sign in.',
          };
        }

        // ---- 1. MASTER ADMIN ----
        if (portalType === 'master_admin') {
          let isMaster = email === BOOTSTRAPPED_MASTER_EMAIL;
          if (!isMaster) {
            try {
              const adminSnap = await getDoc(doc(db, 'admins', user.uid));
              isMaster = adminSnap.exists() && adminSnap.data()?.role === 'master_admin';
            } catch {
              isMaster = false;
            }
          }

          if (!isMaster) {
            await signOut(auth);
            pushToast({ type: 'error', title: 'Unauthorized Master Admin Account' });
            return {
              ok: false,
              error: `The Google account (${email}) does not have Master Administrator privileges.`,
            };
          }

          // Ensure system/master_config exists
          const cfgRef = doc(db, 'system', 'master_config');
          let brandName = DEFAULT_MASTER_ADMIN.brandName;
          let supportEmail = email;
          try {
            const cfgSnap = await getDoc(cfgRef);
            if (cfgSnap.exists()) {
              const d = cfgSnap.data();
              brandName = String(d.brandName || brandName);
              supportEmail = String(d.supportEmail || email);
            } else {
              await setDoc(cfgRef, {
                brandName,
                supportEmail,
                createdByUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            reportError(err, OperationType.WRITE, 'system/master_config', false);
          }

          const next: AuthSession = {
            role: 'master_admin',
            userId: user.uid,
            name: brandName,
            email,
          };
          setMasterConfig({ brandName, supportEmail, email: supportEmail });
          setSession(next);
          safeSessionSet(SESSION_STORAGE_KEY, next);
          setInspectingCompanyId(null);
          pushToast({
            type: 'success',
            title: 'Master Control Center Unlocked',
            description: 'Live multi-tenant Cloud Firestore oversight active.',
          });
          return { ok: true };
        }

        // ---- 2. COMPANY ADMIN ----
        if (portalType === 'company_admin') {
          const q = query(collection(db, 'companies'), where('adminEmail', '==', email));
          const snap = await getDocs(q);
          const allMatched = snap.docs.map((d) => mapDocWithDates<CompanyProfile>(d.id, d.data()));

          const matched = companySlug
            ? allMatched.find((c) => c.slug.toLowerCase() === companySlug.toLowerCase())
            : allMatched[0];

          if (!matched) {
            await signOut(auth);
            pushToast({ type: 'error', title: 'Company Admin Account Not Found' });
            return {
              ok: false,
              error: companySlug
                ? `Google account (${email}) is not assigned as Company Admin for "/c/${companySlug}".`
                : `Google account (${email}) is not registered as a Company Administrator.`,
            };
          }

          if (!matched.active) {
            await signOut(auth);
            const msg = 'Company Account Suspended — Contact Master Administrator';
            pushToast({ type: 'error', title: 'Access Suspended', description: msg });
            return { ok: false, error: msg };
          }

          const next: AuthSession = {
            role: 'company_admin',
            userId: user.uid,
            companyId: matched.id,
            name: `${matched.name} Admin`,
            email,
          };
          setCompanies([matched]);
          setSession(next);
          safeSessionSet(SESSION_STORAGE_KEY, next);
          pushToast({
            type: 'success',
            title: `Welcome to ${matched.name}`,
            description: 'Connected to your isolated Company Admin Firestore database.',
          });
          return { ok: true };
        }

        // ---- 3. STAFF PORTAL ----
        const memQuery = query(collection(db, 'memberships'), where('email', '==', email));
        const memSnap = await getDocs(memQuery);
        const memberships = memSnap.docs
          .map((d) => mapDocWithDates<MembershipRecord>(d.id, d.data()))
          .filter((m) => m.role === 'staff');

        const matchedMem = companySlug
          ? memberships.find((m) => m.companySlug.toLowerCase() === companySlug.toLowerCase())
          : memberships[0];

        if (!matchedMem || !matchedMem.staffId) {
          await signOut(auth);
          pushToast({ type: 'error', title: 'Staff Account Not Registered' });
          return {
            ok: false,
            error: companySlug
              ? `Google account (${email}) is not registered as staff for this company portal. Ask your manager to add your Google email.`
              : `Google account (${email}) is not registered as an employee. Ask your company manager to add your Google email.`,
          };
        }

        if (!matchedMem.companyActive) {
          await signOut(auth);
          const msg = 'Your company account is currently suspended. Please contact your manager.';
          pushToast({ type: 'error', title: 'Company Suspended', description: msg });
          return { ok: false, error: msg };
        }

        if (!matchedMem.active) {
          await signOut(auth);
          const msg = 'Your staff account has been disabled by your Company Admin.';
          pushToast({ type: 'error', title: 'Account Disabled', description: msg });
          return { ok: false, error: msg };
        }

        const staffSnap = await getDoc(
          doc(db, 'companies', matchedMem.companyId, 'staff', matchedMem.staffId)
        );
        if (!staffSnap.exists()) {
          await signOut(auth);
          return { ok: false, error: 'Staff profile record could not be loaded.' };
        }
        const staffDoc = mapDocWithDates<StaffAccount>(staffSnap.id, staffSnap.data());
        if (!staffDoc.active) {
          await signOut(auth);
          return { ok: false, error: 'Your staff account has been disabled by your Company Admin.' };
        }

        const next: AuthSession = {
          role: 'staff',
          userId: staffDoc.id,
          companyId: matchedMem.companyId,
          name: staffDoc.name,
          email,
        };
        setSession(next);
        safeSessionSet(SESSION_STORAGE_KEY, next);

        const coords = await getSafeLocation();
        await pushCompanyNotification(matchedMem.companyId, matchedMem.companyAdminEmail, {
          type: 'login',
          title: `Staff Login: ${staffDoc.name}`,
          message: `${staffDoc.name} (${staffDoc.role}) signed in via Google from ${coords.label} (${coords.lat.toFixed(
            4
          )}, ${coords.lng.toFixed(4)}).`,
          staffId: staffDoc.id,
          gpsLat: coords.lat,
          gpsLng: coords.lng,
        });

        pushToast({
          type: 'success',
          title: `Welcome, ${staffDoc.name}`,
          description: `${matchedMem.companyName} · GPS synced (${coords.label}).`,
        });
        return { ok: true };
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code || '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return { ok: false, error: 'Google sign-in popup was closed before completing.' };
        }
        if (code === 'auth/popup-blocked') {
          return {
            ok: false,
            error: 'Browser blocked the Google sign-in popup. Please allow popups and try again.',
          };
        }
        const msg = err instanceof Error ? err.message : 'Google authentication failed.';
        return { ok: false, error: msg };
      }
    },
    [pushCompanyNotification, pushToast, reportError]
  );

  const logout = useCallback(async () => {
    setSession(null);
    setInspectingCompanyId(null);
    setCompanies([]);
    setActiveCompanyData(EMPTY_COMPANY_DB);
    setAllCompanyDatabases({});
    safeSessionSet(SESSION_STORAGE_KEY, null);
    try {
      await signOut(auth);
    } catch {
      // Ignore signout error
    }
    pushToast({ type: 'info', title: 'Signed Out' });
  }, [pushToast]);

  // =========================================================================
  // MASTER ADMIN MULTI-TENANT OPERATIONS
  // =========================================================================

  const updateMasterConfig = useCallback(
    async (updates: Partial<MasterAdminConfig>) => {
      const user = auth.currentUser;
      if (!user) return false;
      const nextBrand = sanitizeStr(updates.brandName ?? masterConfig.brandName, 120) || 'AuraERP Cloud Suite';
      const nextSupport = sanitizeStr(
        (updates.supportEmail ?? updates.email ?? masterConfig.supportEmail).toLowerCase(),
        160
      );
      const ref = doc(db, 'system', 'master_config');
      try {
        const existing = await getDoc(ref);
        if (existing.exists()) {
          await updateDoc(ref, {
            brandName: nextBrand,
            supportEmail: nextSupport,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            brandName: nextBrand,
            supportEmail: nextSupport,
            createdByUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        setMasterConfig({ brandName: nextBrand, supportEmail: nextSupport, email: nextSupport });
        if (session?.role === 'master_admin') {
          const updatedSession: AuthSession = { ...session, name: nextBrand };
          setSession(updatedSession);
          safeSessionSet(SESSION_STORAGE_KEY, updatedSession);
        }
        pushToast({ type: 'success', title: 'Master Settings Saved to Cloud Firestore' });
        return true;
      } catch (err) {
        reportError(err, OperationType.UPDATE, 'system/master_config', false);
        return false;
      }
    },
    [masterConfig, session, pushToast, reportError]
  );

  const createCompany = useCallback(
    async (input: Omit<CompanyProfile, 'id' | 'createdAt'>): Promise<CompanyProfile | null> => {
      const user = auth.currentUser;
      if (!user) return null;

      const slugClean = sanitizeStr(input.slug.toLowerCase(), 80);
      if (slugClean.length < 2) {
        pushToast({ type: 'error', title: 'Company URL slug must be at least 2 characters' });
        return null;
      }
      if (companies.some((c) => c.slug.toLowerCase() === slugClean)) {
        pushToast({
          type: 'error',
          title: 'URL Slug Already Exists',
          description: `Choose a unique slug other than "${slugClean}".`,
        });
        return null;
      }

      const id = uid('comp');
      const adminEmail = sanitizeStr(input.adminEmail.toLowerCase(), 160);
      const adminMemberKey = emailToMemberKey(adminEmail);
      const membershipId = `${id}__admin`;
      const nameClean = sanitizeStr(input.name, 160);
      const nowIso = new Date().toISOString();

      try {
        const batch = writeBatch(db);
        const companyPayload = stripUndefined({
          id,
          name: nameClean,
          slug: slugClean,
          tagline: sanitizeOptStr(input.tagline, 200),
          address: sanitizeOptStr(input.address, 300),
          phone: sanitizeOptStr(input.phone, 40),
          upi: sanitizeOptStr(input.upi, 120),
          badge: sanitizeOptStr(input.badge, 10),
          adminEmail,
          active: Boolean(input.active),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'companies', id), companyPayload);

        batch.set(doc(db, 'companies', id, 'members', adminMemberKey), {
          id: adminMemberKey,
          companyId: id,
          email: adminEmail,
          role: 'company_admin',
          active: true,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'memberships', membershipId), {
          id: membershipId,
          companyId: id,
          companySlug: slugClean,
          companyName: nameClean,
          companyActive: Boolean(input.active),
          companyAdminEmail: adminEmail,
          email: adminEmail,
          role: 'company_admin',
          active: true,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();

        const created: CompanyProfile = {
          id,
          name: nameClean,
          slug: slugClean,
          tagline: input.tagline || '',
          address: input.address || '',
          phone: input.phone || '',
          upi: input.upi || '',
          badge: input.badge || '',
          adminEmail,
          active: Boolean(input.active),
          createdAt: nowIso,
        };

        pushToast({
          type: 'success',
          title: `Company Provisioned: ${created.name}`,
          description: 'Isolated Cloud Firestore workspace and portal links are live.',
        });
        return created;
      } catch (err) {
        reportError(err, OperationType.CREATE, `companies/${id}`, false);
        return null;
      }
    },
    [companies, pushToast, reportError]
  );

  const updateCompany = useCallback(
    async (companyId: string, updates: Partial<CompanyProfile>) => {
      const user = auth.currentUser;
      const existing = companies.find((c) => c.id === companyId);
      if (!user || !existing) return false;

      const nextName =
        updates.name !== undefined ? sanitizeStr(updates.name, 160) : existing.name;
      const nextAdminEmail =
        updates.adminEmail !== undefined
          ? sanitizeStr(updates.adminEmail.toLowerCase(), 160)
          : existing.adminEmail.toLowerCase();

      const patch = stripUndefined({
        name: updates.name !== undefined ? nextName : undefined,
        tagline: updates.tagline !== undefined ? sanitizeStr(updates.tagline, 200) : undefined,
        address: updates.address !== undefined ? sanitizeStr(updates.address, 300) : undefined,
        phone: updates.phone !== undefined ? sanitizeStr(updates.phone, 40) : undefined,
        upi: updates.upi !== undefined ? sanitizeStr(updates.upi, 120) : undefined,
        badge: updates.badge !== undefined ? sanitizeStr(updates.badge, 10) : undefined,
        adminEmail: updates.adminEmail !== undefined ? nextAdminEmail : undefined,
        active: updates.active !== undefined ? Boolean(updates.active) : undefined,
        updatedAt: serverTimestamp(),
      });

      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'companies', companyId), patch);

        if (session?.role === 'master_admin') {
          const emailChanged = nextAdminEmail !== existing.adminEmail.toLowerCase();
          if (emailChanged) {
            const oldKey = emailToMemberKey(existing.adminEmail);
            const newKey = emailToMemberKey(nextAdminEmail);
            if (oldKey !== newKey) {
              batch.delete(doc(db, 'companies', companyId, 'members', oldKey));
              batch.set(doc(db, 'companies', companyId, 'members', newKey), {
                id: newKey,
                companyId,
                email: nextAdminEmail,
                role: 'company_admin',
                active: true,
                createdByUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          }

          // Sync denormalized membership metadata
          const memSnap = await getDocs(
            query(collection(db, 'memberships'), where('companyId', '==', companyId))
          );
          memSnap.docs.forEach((mDoc) => {
            const mData = mDoc.data();
            const mPatch: Record<string, unknown> = {
              companyName: nextName,
              companyAdminEmail: nextAdminEmail,
              updatedAt: serverTimestamp(),
            };
            if (updates.active !== undefined) {
              mPatch.companyActive = Boolean(updates.active);
            }
            if (mData.role === 'company_admin' && emailChanged) {
              mPatch.email = nextAdminEmail;
            }
            batch.update(mDoc.ref, mPatch);
          });
        }

        await batch.commit();
        pushToast({ type: 'success', title: 'Company Profile Updated' });
        return true;
      } catch (err) {
        reportError(err, OperationType.UPDATE, `companies/${companyId}`, false);
        return false;
      }
    },
    [companies, session?.role, pushToast, reportError]
  );

  const toggleCompanyActive = useCallback(
    async (companyId: string) => {
      const target = companies.find((c) => c.id === companyId);
      if (!target) return false;
      const nextActive = !target.active;

      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'companies', companyId), {
          active: nextActive,
          updatedAt: serverTimestamp(),
        });

        const memSnap = await getDocs(
          query(collection(db, 'memberships'), where('companyId', '==', companyId))
        );
        memSnap.docs.forEach((mDoc) => {
          batch.update(mDoc.ref, {
            companyActive: nextActive,
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
        pushToast({
          type: nextActive ? 'success' : 'warning',
          title: nextActive ? `${target.name} Activated` : `${target.name} Suspended`,
          description: nextActive
            ? 'Company Admin & Staff access restored.'
            : 'Company Admin & Staff logins are now blocked.',
        });
        return true;
      } catch (err) {
        reportError(err, OperationType.UPDATE, `companies/${companyId}`, false);
        return false;
      }
    },
    [companies, pushToast, reportError]
  );

  const deleteCompany = useCallback(
    async (companyId: string) => {
      try {
        // Delete all subcollections + members + memberships before deleting company root doc
        const subNames = ['members', ...SUBCOLLECTIONS];
        for (const sub of subNames) {
          const snap = await getDocs(collection(db, 'companies', companyId, sub));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        }
        const memSnap = await getDocs(
          query(collection(db, 'memberships'), where('companyId', '==', companyId))
        );
        for (const m of memSnap.docs) {
          await deleteDoc(m.ref);
        }
        await deleteDoc(doc(db, 'companies', companyId));

        if (inspectingCompanyId === companyId) {
          setInspectingCompanyId(null);
        }
        pushToast({
          type: 'info',
          title: 'Company & Isolated Firestore Workspace Deleted',
        });
        return true;
      } catch (err) {
        reportError(err, OperationType.DELETE, `companies/${companyId}`, false);
        return false;
      }
    },
    [inspectingCompanyId, pushToast, reportError]
  );

  // =========================================================================
  // SCOPED COMPANY ERP OPERATIONS
  // =========================================================================

  const getCompanyAdminEmail = useCallback(() => {
    return (activeCompany?.adminEmail || '').trim().toLowerCase();
  }, [activeCompany]);

  const punchIn: ErpContextValue['punchIn'] = useCallback(
    async (payload) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const member = activeCompanyData.staff.find((s) => s.id === payload.staffId);
      if (!member) return;

      const id = uid('att');
      const wageEarned = calculateShiftWage(member.dailyWage, payload.rateMode);
      const path = `companies/${activeCompanyId}/attendance/${id}`;
      try {
        const record = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: member.id,
          staffEmail: member.email.trim().toLowerCase(),
          staffName: sanitizeStr(member.name, 120),
          date: getTodayISO(),
          punchInTime: new Date().toISOString(),
          status: 'working',
          rateMode: payload.rateMode,
          wageEarned,
          studioName: sanitizeOptStr(payload.studioName, 160),
          studioPhone: sanitizeOptStr(payload.studioPhone, 40),
          venue: sanitizeOptStr(payload.venue, 240),
          fromLocation: sanitizeOptStr(payload.fromLocation, 160),
          toLocation: sanitizeOptStr(payload.toLocation, 160),
          workNotes: sanitizeOptStr(payload.workNotes, 1000),
          gpsLat: Number(payload.gpsLat) || 0,
          gpsLng: Number(payload.gpsLng) || 0,
          gpsLabel: sanitizeOptStr(payload.gpsLabel, 200),
          selfieUrl: sanitizeOptStr(payload.selfieUrl, 120000),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'companies', activeCompanyId, 'attendance', id), record);
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'punch_in',
          title: `${member.name} Punched In`,
          message: `Venue: ${payload.venue || 'Site'} · Route: ${payload.fromLocation} → ${payload.toLocation} · Wage ₹${wageEarned.toLocaleString('en-IN')}.`,
          staffId: member.id,
          gpsLat: payload.gpsLat,
          gpsLng: payload.gpsLng,
          imageUrl: payload.selfieUrl,
          priority: 'high',
        });
        pushToast({
          type: 'success',
          title: 'Shift Started (Punched In)',
          description: 'Synced live to Cloud Firestore & Admin notified.',
        });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const punchOut = useCallback(
    async (attendanceId: string, gpsLat?: number, gpsLng?: number) => {
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !adminEmail) return;
      const target = activeCompanyData.attendance.find((a) => a.id === attendanceId);
      if (!target) return;
      const now = new Date().toISOString();
      const path = `companies/${activeCompanyId}/attendance/${attendanceId}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'attendance', attendanceId), {
          status: 'completed',
          punchOutTime: now,
          gpsLat: gpsLat ?? target.gpsLat,
          gpsLng: gpsLng ?? target.gpsLng,
          updatedAt: serverTimestamp(),
        });
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'punch_out',
          title: `${target.staffName} Punched Out`,
          message: `Completed shift at ${target.venue || target.studioName}. Earned ₹${target.wageEarned.toLocaleString('en-IN')}.`,
          staffId: target.staffId,
          gpsLat: gpsLat ?? target.gpsLat,
          gpsLng: gpsLng ?? target.gpsLng,
        });
        pushToast({ type: 'success', title: 'Shift Completed (Punched Out)' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.attendance,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const updateAttendance = useCallback(
    async (id: string, updates: Partial<AttendanceRecord>, editorName: string) => {
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !adminEmail) return;
      const target = activeCompanyData.attendance.find((a) => a.id === id);
      if (!target) return;

      const path = `companies/${activeCompanyId}/attendance/${id}`;
      try {
        if (session?.role === 'staff') {
          // Tier 2B Staff allowlist: cannot alter wageEarned, rateMode, or status
          const staffPatch = stripUndefined({
            studioName:
              updates.studioName !== undefined ? sanitizeStr(updates.studioName, 160) : undefined,
            venue: updates.venue !== undefined ? sanitizeStr(updates.venue, 240) : undefined,
            fromLocation:
              updates.fromLocation !== undefined
                ? sanitizeStr(updates.fromLocation, 160)
                : undefined,
            toLocation:
              updates.toLocation !== undefined ? sanitizeStr(updates.toLocation, 160) : undefined,
            workNotes:
              updates.workNotes !== undefined ? sanitizeStr(updates.workNotes, 1000) : undefined,
            lastEditedBy: sanitizeStr(editorName, 120),
            lastEditedAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'companies', activeCompanyId, 'attendance', id), staffPatch);
        } else {
          const staffMember = activeCompanyData.staff.find((s) => s.id === target.staffId);
          const nextRateMode = updates.rateMode ?? target.rateMode;
          const recalcWage =
            updates.wageEarned !== undefined
              ? Math.max(0, Number(updates.wageEarned) || 0)
              : staffMember && updates.rateMode
              ? calculateShiftWage(staffMember.dailyWage, nextRateMode)
              : target.wageEarned;

          const adminPatch = stripUndefined({
            status: updates.status,
            punchOutTime:
              updates.punchOutTime !== undefined
                ? sanitizeStr(updates.punchOutTime, 64)
                : undefined,
            rateMode: updates.rateMode,
            wageEarned: recalcWage,
            studioName:
              updates.studioName !== undefined ? sanitizeStr(updates.studioName, 160) : undefined,
            studioPhone:
              updates.studioPhone !== undefined ? sanitizeStr(updates.studioPhone, 40) : undefined,
            venue: updates.venue !== undefined ? sanitizeStr(updates.venue, 240) : undefined,
            fromLocation:
              updates.fromLocation !== undefined
                ? sanitizeStr(updates.fromLocation, 160)
                : undefined,
            toLocation:
              updates.toLocation !== undefined ? sanitizeStr(updates.toLocation, 160) : undefined,
            workNotes:
              updates.workNotes !== undefined ? sanitizeStr(updates.workNotes, 1000) : undefined,
            lastEditedBy: sanitizeStr(editorName, 120),
            lastEditedAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'companies', activeCompanyId, 'attendance', id), adminPatch);
        }

        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'attendance_edit',
          title: `Attendance Updated (${target.staffName})`,
          message: `${editorName} updated ${target.date} shift details (${updates.venue || target.venue}).`,
          staffId: target.staffId,
        });
        pushToast({ type: 'success', title: 'Attendance Updated in Firestore' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData,
      session?.role,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const sendInstruction = useCallback(
    async (staffId: string, message: string, presetTag?: string) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const member = activeCompanyData.staff.find((s) => s.id === staffId);
      if (!member) return;
      const id = uid('ins');
      const path = `companies/${activeCompanyId}/instructions/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: member.id,
          staffEmail: member.email.trim().toLowerCase(),
          staffName: sanitizeStr(member.name, 120),
          message: sanitizeStr(message, 1000),
          presetTag: sanitizeOptStr(presetTag, 80),
          acknowledged: false,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'instructions', id), docData);
        pushToast({ type: 'success', title: 'Live Instruction Sent' });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [activeCompanyId, activeCompanyData.staff, getCompanyAdminEmail, pushToast, reportError]
  );

  const acknowledgeInstruction = useCallback(
    async (instructionId: string) => {
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !adminEmail) return;
      const ins = activeCompanyData.instructions.find((i) => i.id === instructionId);
      if (!ins) return;
      const path = `companies/${activeCompanyId}/instructions/${instructionId}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'instructions', instructionId), {
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'instruction_ack',
          title: `${ins.staffName} Acknowledged Instruction`,
          message: `Confirmed: "${ins.message.slice(0, 90)}"`,
          staffId: ins.staffId,
        });
        pushToast({ type: 'success', title: 'Instruction Acknowledged' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.instructions,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const addWork = useCallback(
    async (work: Omit<WorkAssignment, 'id' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const id = uid('wrk');
      const assignedStaff = activeCompanyData.staff.find((s) => s.id === work.assignedStaffId);
      const path = `companies/${activeCompanyId}/works/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          date: sanitizeStr(work.date, 32) || getTodayISO(),
          callTime: sanitizeOptStr(work.callTime, 32),
          workType: sanitizeStr(work.workType, 160),
          eventTitle: sanitizeStr(work.eventTitle, 200),
          venue: sanitizeStr(work.venue, 240),
          studioName: sanitizeOptStr(work.studioName, 160),
          studioWhatsApp: sanitizeOptStr(work.studioWhatsApp, 40),
          assignedStaffId: sanitizeOptStr(work.assignedStaffId, 128),
          assignedStaffEmail: assignedStaff
            ? assignedStaff.email.trim().toLowerCase()
            : sanitizeOptStr(work.assignedStaffEmail?.toLowerCase(), 160),
          assignedStaffName: sanitizeOptStr(work.assignedStaffName, 120),
          rateMode: work.rateMode,
          mapsLink: sanitizeOptStr(work.mapsLink, 500),
          hasSubContract: Boolean(work.hasSubContract),
          subContractorName: sanitizeOptStr(work.subContractorName, 160),
          subContractorWA: sanitizeOptStr(work.subContractorWA, 40),
          subContractTotal: Math.max(0, Number(work.subContractTotal) || 0),
          subContractPaid: Math.max(0, Number(work.subContractPaid) || 0),
          billTotal: Math.max(0, Number(work.billTotal) || 0),
          billReceived: Math.max(0, Number(work.billReceived) || 0),
          gpayUtr: sanitizeOptStr(work.gpayUtr, 100),
          gpayScreenshot: sanitizeOptStr(work.gpayScreenshot, 120000),
          notes: sanitizeOptStr(work.notes, 1000),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'works', id), docData);
        pushToast({
          type: 'success',
          title: 'Work Dispatch Saved',
          description: `${work.eventTitle} assigned to ${work.assignedStaffName}.`,
        });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [activeCompanyId, activeCompanyData.staff, getCompanyAdminEmail, pushToast, reportError]
  );

  const updateWork = useCallback(
    async (id: string, updates: Partial<WorkAssignment>) => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/works/${id}`;
      const assignedStaff = updates.assignedStaffId
        ? activeCompanyData.staff.find((s) => s.id === updates.assignedStaffId)
        : undefined;
      try {
        const patch = stripUndefined({
          date: updates.date !== undefined ? sanitizeStr(updates.date, 32) : undefined,
          callTime: updates.callTime !== undefined ? sanitizeStr(updates.callTime, 32) : undefined,
          workType: updates.workType !== undefined ? sanitizeStr(updates.workType, 160) : undefined,
          eventTitle:
            updates.eventTitle !== undefined ? sanitizeStr(updates.eventTitle, 200) : undefined,
          venue: updates.venue !== undefined ? sanitizeStr(updates.venue, 240) : undefined,
          studioName:
            updates.studioName !== undefined ? sanitizeStr(updates.studioName, 160) : undefined,
          studioWhatsApp:
            updates.studioWhatsApp !== undefined
              ? sanitizeStr(updates.studioWhatsApp, 40)
              : undefined,
          assignedStaffId:
            updates.assignedStaffId !== undefined
              ? sanitizeStr(updates.assignedStaffId, 128)
              : undefined,
          assignedStaffEmail: assignedStaff
            ? assignedStaff.email.trim().toLowerCase()
            : updates.assignedStaffEmail !== undefined
            ? sanitizeStr(updates.assignedStaffEmail.toLowerCase(), 160)
            : undefined,
          assignedStaffName:
            updates.assignedStaffName !== undefined
              ? sanitizeStr(updates.assignedStaffName, 120)
              : undefined,
          rateMode: updates.rateMode,
          mapsLink: updates.mapsLink !== undefined ? sanitizeStr(updates.mapsLink, 500) : undefined,
          hasSubContract: updates.hasSubContract,
          subContractorName:
            updates.subContractorName !== undefined
              ? sanitizeStr(updates.subContractorName, 160)
              : undefined,
          subContractorWA:
            updates.subContractorWA !== undefined
              ? sanitizeStr(updates.subContractorWA, 40)
              : undefined,
          subContractTotal:
            updates.subContractTotal !== undefined
              ? Math.max(0, Number(updates.subContractTotal) || 0)
              : undefined,
          subContractPaid:
            updates.subContractPaid !== undefined
              ? Math.max(0, Number(updates.subContractPaid) || 0)
              : undefined,
          billTotal:
            updates.billTotal !== undefined
              ? Math.max(0, Number(updates.billTotal) || 0)
              : undefined,
          billReceived:
            updates.billReceived !== undefined
              ? Math.max(0, Number(updates.billReceived) || 0)
              : undefined,
          gpayUtr: updates.gpayUtr !== undefined ? sanitizeStr(updates.gpayUtr, 100) : undefined,
          gpayScreenshot:
            updates.gpayScreenshot !== undefined
              ? sanitizeStr(updates.gpayScreenshot, 120000)
              : undefined,
          notes: updates.notes !== undefined ? sanitizeStr(updates.notes, 1000) : undefined,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'companies', activeCompanyId, 'works', id), patch);
        pushToast({ type: 'success', title: 'Work Updated' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, activeCompanyData.staff, pushToast, reportError]
  );

  const deleteWork = useCallback(
    async (id: string) => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/works/${id}`;
      try {
        await deleteDoc(doc(db, 'companies', activeCompanyId, 'works', id));
        pushToast({ type: 'info', title: 'Work Record Removed' });
      } catch (err) {
        reportError(err, OperationType.DELETE, path, false);
      }
    },
    [activeCompanyId, pushToast, reportError]
  );

  const addLedgerEntry = useCallback(
    async (entry: Omit<LedgerEntry, 'id' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const id = uid('ldg');
      const path = `companies/${activeCompanyId}/ledger/${id}`;
      try {
        await setDoc(doc(db, 'companies', activeCompanyId, 'ledger', id), {
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          date: sanitizeStr(entry.date, 32) || getTodayISO(),
          type: entry.type,
          title: sanitizeStr(entry.title, 200),
          category: sanitizeStr(entry.category, 120) || 'General',
          amount: Math.max(1, Number(entry.amount) || 1),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        pushToast({
          type: 'success',
          title: entry.type === 'income' ? 'Income Added' : 'Expense Recorded',
        });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [activeCompanyId, getCompanyAdminEmail, pushToast, reportError]
  );

  const deleteLedgerEntry = useCallback(
    async (id: string) => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/ledger/${id}`;
      try {
        await deleteDoc(doc(db, 'companies', activeCompanyId, 'ledger', id));
        pushToast({ type: 'info', title: 'Ledger Entry Deleted' });
      } catch (err) {
        reportError(err, OperationType.DELETE, path, false);
      }
    },
    [activeCompanyId, pushToast, reportError]
  );

  const recordSalaryPayment: ErpContextValue['recordSalaryPayment'] = useCallback(
    async (payload) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const member = activeCompanyData.staff.find((s) => s.id === payload.staffId);
      if (!member) return;
      const id = uid('pay');
      const path = `companies/${activeCompanyId}/payments/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: member.id,
          staffEmail: member.email.trim().toLowerCase(),
          staffName: sanitizeStr(member.name, 120),
          date: getTodayISO(),
          amount: Math.max(1, Number(payload.amount) || 1),
          mode: payload.mode,
          category: payload.category,
          upiIdUsed: sanitizeOptStr(payload.upiIdUsed, 120),
          utr: sanitizeOptStr(payload.utr, 100),
          note: sanitizeOptStr(payload.note, 500),
          screenshotUrl: sanitizeOptStr(payload.screenshotUrl, 120000),
          confirmationStatus: 'pending',
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'payments', id), docData);
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'system',
          title: `Payout Sent to ${member.name}`,
          message: `₹${payload.amount.toLocaleString('en-IN')} via ${payload.mode.toUpperCase()} — Awaiting Staff Confirmation.`,
          staffId: member.id,
          imageUrl: payload.screenshotUrl,
        });
        pushToast({
          type: 'success',
          title: 'Payment Recorded & Sent to Staff',
          description: 'Awaiting Staff Confirmation in Staff Inbox.',
        });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const confirmPaymentReceived = useCallback(
    async (paymentId: string, staffNote: string) => {
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !adminEmail) return;
      const target = activeCompanyData.payments.find((p) => p.id === paymentId);
      if (!target) return;
      const now = new Date().toISOString();
      const path = `companies/${activeCompanyId}/payments/${paymentId}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'payments', paymentId), {
          confirmationStatus: 'confirmed',
          confirmedAt: now,
          staffNote: sanitizeStr(staffNote, 400) || 'Received safely.',
          issueReason: '',
          updatedAt: serverTimestamp(),
        });
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'payment_confirmed',
          title: `${target.staffName} confirmed receiving ₹${target.amount.toLocaleString('en-IN')}!`,
          message: `${target.staffName} confirmed receiving ₹${target.amount.toLocaleString(
            'en-IN'
          )} via ${target.mode.toUpperCase()}${target.utr ? ` (UTR: ${target.utr})` : ''}.${
            staffNote.trim() ? ` Note: "${staffNote.trim()}"` : ''
          }`,
          staffId: target.staffId,
          priority: 'high',
        });
        pushToast({ type: 'success', title: 'Payment Confirmed & Admin Notified' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.payments,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const reportPaymentIssue = useCallback(
    async (paymentId: string, issueReason: string) => {
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !adminEmail) return;
      const target = activeCompanyData.payments.find((p) => p.id === paymentId);
      if (!target) return;
      const path = `companies/${activeCompanyId}/payments/${paymentId}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'payments', paymentId), {
          confirmationStatus: 'issue',
          issueReason: sanitizeStr(issueReason, 400) || 'Amount not reflected in bank yet.',
          updatedAt: serverTimestamp(),
        });
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'payment_issue',
          title: `Payment Issue Flagged by ${target.staffName}`,
          message: `₹${target.amount.toLocaleString('en-IN')} (${target.mode.toUpperCase()}) flagged: "${
            issueReason.trim() || 'Not received / mismatch'
          }"`,
          staffId: target.staffId,
          priority: 'high',
        });
        pushToast({ type: 'warning', title: 'Issue Reported to Company Admin' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.payments,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const addCustomer = useCallback(
    async (customer: Omit<CustomerRecord, 'id' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const id = uid('cust');
      const path = `companies/${activeCompanyId}/customers/${id}`;
      const userEmail = (user.email || '').trim().toLowerCase();
      const isStaff = session?.role === 'staff';
      const staffEmails = isStaff
        ? [userEmail]
        : activeCompanyData.staff
            .filter((s) => s.active)
            .map((s) => s.email.trim().toLowerCase())
            .slice(0, 100);

      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          allowedStaffEmails: staffEmails,
          name: sanitizeStr(customer.name, 160),
          studioName: sanitizeStr(customer.studioName, 160),
          whatsapp: sanitizeOptStr(customer.whatsapp, 40),
          workLocations: sanitizeOptStr(customer.workLocations, 240),
          workDetails: sanitizeOptStr(customer.workDetails, 500),
          income: isStaff ? 0 : Math.max(0, Number(customer.income) || 0),
          expense: isStaff ? 0 : Math.max(0, Number(customer.expense) || 0),
          received: isStaff ? 0 : Math.max(0, Number(customer.received) || 0),
          rulesAndTerms: sanitizeOptStr(customer.rulesAndTerms, 1000),
          addedByStaffName: sanitizeOptStr(customer.addedByStaffName, 120),
          addedByEmail: sanitizeOptStr(userEmail, 160),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'customers', id), docData);
        if (customer.addedByStaffName) {
          await pushCompanyNotification(activeCompanyId, adminEmail, {
            type: 'customer',
            title: `New Studio Added by ${customer.addedByStaffName}`,
            message: `${customer.studioName} (${customer.name}) · ${customer.workLocations}`,
          });
        }
        pushToast({ type: 'success', title: 'Customer / Studio Saved' });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      session?.role,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: Partial<CustomerRecord>) => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/customers/${id}`;
      try {
        const patch = stripUndefined({
          name: updates.name !== undefined ? sanitizeStr(updates.name, 160) : undefined,
          studioName:
            updates.studioName !== undefined ? sanitizeStr(updates.studioName, 160) : undefined,
          whatsapp: updates.whatsapp !== undefined ? sanitizeStr(updates.whatsapp, 40) : undefined,
          workLocations:
            updates.workLocations !== undefined
              ? sanitizeStr(updates.workLocations, 240)
              : undefined,
          workDetails:
            updates.workDetails !== undefined ? sanitizeStr(updates.workDetails, 500) : undefined,
          income:
            updates.income !== undefined ? Math.max(0, Number(updates.income) || 0) : undefined,
          expense:
            updates.expense !== undefined ? Math.max(0, Number(updates.expense) || 0) : undefined,
          received:
            updates.received !== undefined ? Math.max(0, Number(updates.received) || 0) : undefined,
          rulesAndTerms:
            updates.rulesAndTerms !== undefined
              ? sanitizeStr(updates.rulesAndTerms, 1000)
              : undefined,
          allowedStaffEmails: updates.allowedStaffEmails,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'companies', activeCompanyId, 'customers', id), patch);
        pushToast({ type: 'success', title: 'Customer Record Updated' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, pushToast, reportError]
  );

  const addStaffAccount = useCallback(
    async (staffInput: Omit<StaffAccount, 'id' | 'joinedDate'>): Promise<StaffAccount | null> => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !activeCompany || !user || !adminEmail) return null;

      const staffEmail = sanitizeStr(staffInput.email.toLowerCase(), 160);
      if (activeCompanyData.staff.some((s) => s.email.toLowerCase() === staffEmail)) {
        pushToast({
          type: 'error',
          title: 'Email Already Assigned',
          description: 'A staff member with this Google email already exists in this company.',
        });
        return null;
      }

      const id = uid('stf');
      const memberKey = emailToMemberKey(staffEmail);
      const membershipId = `${activeCompanyId}__${id}`;
      const joinedDate = getTodayISO();
      const path = `companies/${activeCompanyId}/staff/${id}`;

      try {
        const batch = writeBatch(db);
        const staffDocData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          name: sanitizeStr(staffInput.name, 120),
          role: sanitizeStr(staffInput.role, 100),
          phone: sanitizeOptStr(staffInput.phone, 40),
          email: staffEmail,
          upiId: sanitizeOptStr(staffInput.upiId, 120),
          dailyWage: Math.max(0, Number(staffInput.dailyWage) || 0),
          salaryDay: Math.min(31, Math.max(1, Number(staffInput.salaryDay) || 5)),
          emergencyContact: sanitizeOptStr(staffInput.emergencyContact, 120),
          kycLast4: sanitizeOptStr(staffInput.kycLast4, 8),
          active: Boolean(staffInput.active),
          joinedDate,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'companies', activeCompanyId, 'staff', id), staffDocData);

        batch.set(doc(db, 'companies', activeCompanyId, 'members', memberKey), {
          id: memberKey,
          companyId: activeCompanyId,
          email: staffEmail,
          role: 'staff',
          staffId: id,
          active: Boolean(staffInput.active),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'memberships', membershipId), {
          id: membershipId,
          companyId: activeCompanyId,
          companySlug: activeCompany.slug,
          companyName: activeCompany.name,
          companyActive: activeCompany.active,
          companyAdminEmail: adminEmail,
          email: staffEmail,
          role: 'staff',
          staffId: id,
          active: Boolean(staffInput.active),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();

        const created: StaffAccount = {
          ...staffInput,
          id,
          email: staffEmail,
          joinedDate,
        };
        pushToast({
          type: 'success',
          title: 'Staff Account Created',
          description: `${created.name} (${created.email}) can now sign in with Google.`,
        });
        return created;
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
        return null;
      }
    },
    [
      activeCompanyId,
      activeCompany,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushToast,
      reportError,
    ]
  );

  const updateStaffAccount = useCallback(
    async (id: string, updates: Partial<StaffAccount>) => {
      const user = auth.currentUser;
      if (!activeCompanyId || !user) return;
      const existing = activeCompanyData.staff.find((s) => s.id === id);
      if (!existing) return;

      const nextEmail =
        updates.email !== undefined
          ? sanitizeStr(updates.email.toLowerCase(), 160)
          : existing.email.toLowerCase();
      const nextActive = updates.active !== undefined ? Boolean(updates.active) : existing.active;
      const path = `companies/${activeCompanyId}/staff/${id}`;

      try {
        const batch = writeBatch(db);
        const patch = stripUndefined({
          name: updates.name !== undefined ? sanitizeStr(updates.name, 120) : undefined,
          role: updates.role !== undefined ? sanitizeStr(updates.role, 100) : undefined,
          phone: updates.phone !== undefined ? sanitizeStr(updates.phone, 40) : undefined,
          email: updates.email !== undefined ? nextEmail : undefined,
          upiId: updates.upiId !== undefined ? sanitizeStr(updates.upiId, 120) : undefined,
          dailyWage:
            updates.dailyWage !== undefined
              ? Math.max(0, Number(updates.dailyWage) || 0)
              : undefined,
          salaryDay:
            updates.salaryDay !== undefined
              ? Math.min(31, Math.max(1, Number(updates.salaryDay) || 5))
              : undefined,
          emergencyContact:
            updates.emergencyContact !== undefined
              ? sanitizeStr(updates.emergencyContact, 120)
              : undefined,
          kycLast4: updates.kycLast4 !== undefined ? sanitizeStr(updates.kycLast4, 8) : undefined,
          active: updates.active !== undefined ? nextActive : undefined,
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'companies', activeCompanyId, 'staff', id), patch);

        const oldKey = emailToMemberKey(existing.email);
        const newKey = emailToMemberKey(nextEmail);
        if (oldKey !== newKey) {
          batch.delete(doc(db, 'companies', activeCompanyId, 'members', oldKey));
          batch.set(doc(db, 'companies', activeCompanyId, 'members', newKey), {
            id: newKey,
            companyId: activeCompanyId,
            email: nextEmail,
            role: 'staff',
            staffId: id,
            active: nextActive,
            createdByUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (updates.active !== undefined) {
          batch.update(doc(db, 'companies', activeCompanyId, 'members', oldKey), {
            active: nextActive,
            updatedAt: serverTimestamp(),
          });
        }

        const membershipId = `${activeCompanyId}__${id}`;
        batch.update(doc(db, 'memberships', membershipId), {
          email: nextEmail,
          active: nextActive,
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        pushToast({ type: 'success', title: 'Staff Account Updated' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, activeCompanyData.staff, pushToast, reportError]
  );

  const toggleStaffActive = useCallback(
    async (id: string) => {
      if (!activeCompanyId) return;
      const target = activeCompanyData.staff.find((s) => s.id === id);
      if (!target) return;
      const nextActive = !target.active;
      const path = `companies/${activeCompanyId}/staff/${id}`;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'companies', activeCompanyId, 'staff', id), {
          active: nextActive,
          updatedAt: serverTimestamp(),
        });
        const memberKey = emailToMemberKey(target.email);
        batch.update(doc(db, 'companies', activeCompanyId, 'members', memberKey), {
          active: nextActive,
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'memberships', `${activeCompanyId}__${id}`), {
          active: nextActive,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        pushToast({ type: 'info', title: 'Staff Access Status Updated' });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, activeCompanyData.staff, pushToast, reportError]
  );

  const submitExpense = useCallback(
    async (payload: Omit<ExpenseClaim, 'id' | 'status' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const staffEmail =
        activeCompanyData.staff.find((s) => s.id === payload.staffId)?.email ||
        user.email ||
        '';
      const id = uid('exp');
      const path = `companies/${activeCompanyId}/expenses/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: payload.staffId,
          staffEmail: staffEmail.trim().toLowerCase(),
          staffName: sanitizeStr(payload.staffName, 120),
          date: sanitizeStr(payload.date, 32) || getTodayISO(),
          title: sanitizeStr(payload.title, 200),
          amount: Math.max(1, Number(payload.amount) || 1),
          billPhotoUrl: sanitizeOptStr(payload.billPhotoUrl, 120000),
          status: 'pending',
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'expenses', id), docData);
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'expense',
          title: `Expense Claim — ${payload.staffName}`,
          message: `₹${payload.amount.toLocaleString('en-IN')} for ${payload.title}`,
          staffId: payload.staffId,
          imageUrl: payload.billPhotoUrl,
        });
        pushToast({ type: 'success', title: 'Expense Claim Submitted' });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const reviewExpense = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/expenses/${id}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'expenses', id), {
          status,
          updatedAt: serverTimestamp(),
        });
        pushToast({
          type: status === 'approved' ? 'success' : 'warning',
          title: status === 'approved' ? 'Expense Approved' : 'Expense Rejected',
        });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, pushToast, reportError]
  );

  const submitLeave = useCallback(
    async (payload: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const staffEmail =
        activeCompanyData.staff.find((s) => s.id === payload.staffId)?.email ||
        user.email ||
        '';
      const id = uid('lv');
      const path = `companies/${activeCompanyId}/leaves/${id}`;
      try {
        await setDoc(doc(db, 'companies', activeCompanyId, 'leaves', id), {
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: payload.staffId,
          staffEmail: staffEmail.trim().toLowerCase(),
          staffName: sanitizeStr(payload.staffName, 120),
          leaveType: payload.leaveType,
          date: sanitizeStr(payload.date, 32) || getTodayISO(),
          reason: sanitizeStr(payload.reason, 500) || 'Leave requested',
          status: 'pending',
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'leave',
          title: `Leave Request — ${payload.staffName}`,
          message: `${payload.leaveType} Leave on ${payload.date}: ${payload.reason}`,
          staffId: payload.staffId,
        });
        pushToast({ type: 'success', title: 'Leave Application Sent' });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const reviewLeave = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      if (!activeCompanyId) return;
      const path = `companies/${activeCompanyId}/leaves/${id}`;
      try {
        await updateDoc(doc(db, 'companies', activeCompanyId, 'leaves', id), {
          status,
          updatedAt: serverTimestamp(),
        });
        pushToast({
          type: status === 'approved' ? 'success' : 'warning',
          title: status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
        });
      } catch (err) {
        reportError(err, OperationType.UPDATE, path, false);
      }
    },
    [activeCompanyId, pushToast, reportError]
  );

  const uploadSiteReceipt = useCallback(
    async (payload: Omit<SiteReceipt, 'id' | 'createdAt'>) => {
      const user = auth.currentUser;
      const adminEmail = getCompanyAdminEmail();
      if (!activeCompanyId || !user || !adminEmail) return;
      const staffEmail =
        activeCompanyData.staff.find((s) => s.id === payload.staffId)?.email ||
        user.email ||
        '';
      const id = uid('rcp');
      const path = `companies/${activeCompanyId}/receipts/${id}`;
      try {
        const docData = stripUndefined({
          id,
          companyId: activeCompanyId,
          companyAdminEmail: adminEmail,
          staffId: payload.staffId,
          staffEmail: staffEmail.trim().toLowerCase(),
          staffName: sanitizeStr(payload.staffName, 120),
          date: sanitizeStr(payload.date, 32) || getTodayISO(),
          note: sanitizeOptStr(payload.note, 400),
          imageUrl: sanitizeStr(payload.imageUrl, 120000),
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'companies', activeCompanyId, 'receipts', id), docData);
        await pushCompanyNotification(activeCompanyId, adminEmail, {
          type: 'receipt',
          title: `Site Receipt Uploaded — ${payload.staffName}`,
          message: payload.note || 'Uploaded site bill / receipt photo.',
          staffId: payload.staffId,
          imageUrl: payload.imageUrl,
        });
        pushToast({ type: 'success', title: 'Site Receipt Uploaded to Cloud Firestore' });
      } catch (err) {
        reportError(err, OperationType.CREATE, path, false);
      }
    },
    [
      activeCompanyId,
      activeCompanyData.staff,
      getCompanyAdminEmail,
      pushCompanyNotification,
      pushToast,
      reportError,
    ]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!activeCompanyId) return;
    const unread = activeCompanyData.notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'companies', activeCompanyId, 'notifications', n.id), {
          read: true,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      reportError(
        err,
        OperationType.UPDATE,
        `companies/${activeCompanyId}/notifications`,
        false
      );
    }
  }, [activeCompanyId, activeCompanyData.notifications, reportError]);

  const clearNotifications = useCallback(async () => {
    if (!activeCompanyId) return;
    if (activeCompanyData.notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      activeCompanyData.notifications.forEach((n) => {
        batch.delete(doc(db, 'companies', activeCompanyId, 'notifications', n.id));
      });
      await batch.commit();
      pushToast({ type: 'info', title: 'Notifications Cleared' });
    } catch (err) {
      reportError(
        err,
        OperationType.DELETE,
        `companies/${activeCompanyId}/notifications`,
        false
      );
    }
  }, [activeCompanyId, activeCompanyData.notifications, pushToast, reportError]);

  const value: ErpContextValue = useMemo(
    () => ({
      isFirebaseConfigured,
      isRtdbConnected,
      isBooting,
      firebaseUser,
      masterConfig,
      companies,
      allCompanyDatabases,
      activeCompany,
      state: activeCompanyData,
      session,
      inspectingCompanyId,
      setInspectingCompanyId,
      lang,
      toasts,
      whatsappModal,
      gpayModal,
      lightboxUrl,
      setLang,
      toggleLang,
      pushToast,
      dismissToast,
      openWhatsAppModal: setWhatsappModal,
      closeWhatsAppModal: () => setWhatsappModal(null),
      openGPayModal: setGpayModal,
      closeGPayModal: () => setGpayModal(null),
      openLightbox: setLightboxUrl,
      closeLightbox: () => setLightboxUrl(null),
      signInWithGoogle,
      logout,
      updateMasterConfig,
      createCompany,
      updateCompany,
      toggleCompanyActive,
      deleteCompany,
      punchIn,
      punchOut,
      updateAttendance,
      sendInstruction,
      acknowledgeInstruction,
      addWork,
      updateWork,
      deleteWork,
      addLedgerEntry,
      deleteLedgerEntry,
      recordSalaryPayment,
      confirmPaymentReceived,
      reportPaymentIssue,
      addCustomer,
      updateCustomer,
      addStaffAccount,
      updateStaffAccount,
      toggleStaffActive,
      submitExpense,
      reviewExpense,
      submitLeave,
      reviewLeave,
      uploadSiteReceipt,
      markAllNotificationsRead,
      clearNotifications,
    }),
    [
      isRtdbConnected,
      isBooting,
      firebaseUser,
      masterConfig,
      companies,
      allCompanyDatabases,
      activeCompany,
      activeCompanyData,
      session,
      inspectingCompanyId,
      lang,
      toasts,
      whatsappModal,
      gpayModal,
      lightboxUrl,
      setLang,
      toggleLang,
      pushToast,
      dismissToast,
      signInWithGoogle,
      logout,
      updateMasterConfig,
      createCompany,
      updateCompany,
      toggleCompanyActive,
      deleteCompany,
      punchIn,
      punchOut,
      updateAttendance,
      sendInstruction,
      acknowledgeInstruction,
      addWork,
      updateWork,
      deleteWork,
      addLedgerEntry,
      deleteLedgerEntry,
      recordSalaryPayment,
      confirmPaymentReceived,
      reportPaymentIssue,
      addCustomer,
      updateCustomer,
      addStaffAccount,
      updateStaffAccount,
      toggleStaffActive,
      submitExpense,
      reviewExpense,
      submitLeave,
      reviewLeave,
      uploadSiteReceipt,
      markAllNotificationsRead,
      clearNotifications,
    ]
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
};

export function useErp(): ErpContextValue {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside ErpProvider');
  return ctx;
}
