import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import {
  Database,
  get as rtdbGet,
  getDatabase,
  onValue,
  ref as rtdbRef,
  remove as rtdbRemove,
  set as rtdbSet,
  update as rtdbUpdate,
} from 'firebase/database';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';
import {
  CompanyDatabase,
  CompanyRecord,
  EMPTY_COMPANY_DB,
  StaffOnlineRootState,
  SuperAdminConfig,
} from './types';

const COMPANY_SUBCOLLECTIONS = [
  'staff',
  'advances',
  'customers',
  'works',
  'subcontracts',
  'punchLogs',
  'expenses',
  'instructions',
  'notifications',
  'ledger',
] as const;

type CompanySubcollectionName = (typeof COMPANY_SUBCOLLECTIONS)[number];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function logFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Cloud Sync Error:', JSON.stringify(errInfo));
}

// Automatically loads provisioned Firebase config + optional env overrides
const FIREBASE_RUNTIME_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || '',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || '',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseAppletConfig.messagingSenderId ||
    '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
};

const FIRESTORE_DATABASE_ID =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID ||
  firebaseAppletConfig.firestoreDatabaseId ||
  '(default)';

export const DEFAULT_SUPER_ADMIN: SuperAdminConfig = {
  email: 'super@staff.online',
  password: 'Super@2026',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const LOCAL_MIRROR_KEY = 'staff_online_store_v1';
const CLOUD_MIGRATED_KEY = 'staff_online_cloud_migrated_v1';
const BROADCAST_CHANNEL_NAME = 'staff_online_sync_v1';

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let rtdbInstance: Database | null = null;

function ensureFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  if (!FIREBASE_RUNTIME_CONFIG.apiKey || !FIREBASE_RUNTIME_CONFIG.projectId) {
    return null;
  }
  try {
    appInstance = getApps().length ? getApp() : initializeApp(FIREBASE_RUNTIME_CONFIG);
    return appInstance;
  } catch {
    return null;
  }
}

function initFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  const app = ensureFirebaseApp();
  if (!app) return null;
  try {
    firestoreInstance =
      FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
        ? getFirestore(app, FIRESTORE_DATABASE_ID)
        : getFirestore(app);
    return firestoreInstance;
  } catch {
    return null;
  }
}

function initOptionalRtdb(): Database | null {
  if (rtdbInstance) return rtdbInstance;
  const dbUrl = FIREBASE_RUNTIME_CONFIG.databaseURL.trim();
  if (!dbUrl || !dbUrl.startsWith('http')) {
    return null;
  }
  const app = ensureFirebaseApp();
  if (!app) return null;
  try {
    rtdbInstance = getDatabase(app, dbUrl);
    return rtdbInstance;
  } catch {
    return null;
  }
}

export const firestoreDb = initFirestore();
export const rtdb = initOptionalRtdb();

async function testConnection(): Promise<void> {
  if (!firestoreDb) return;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Cloud connection check: client appears offline.');
    }
  }
}
void testConnection();

function mapRecordValues<T extends { id: string; createdAt?: string }>(
  raw: Record<string, T> | null | undefined
): T[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([key, value]) => ({ ...value, id: value.id || key }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function normalizeCompanyDb(raw: Record<string, unknown> | undefined): CompanyDatabase {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_COMPANY_DB };
  return {
    staff: mapRecordValues(raw.staff as Record<string, CompanyDatabase['staff'][number]>),
    advances: mapRecordValues(raw.advances as Record<string, CompanyDatabase['advances'][number]>),
    customers: mapRecordValues(
      raw.customers as Record<string, CompanyDatabase['customers'][number]>
    ),
    works: mapRecordValues(raw.works as Record<string, CompanyDatabase['works'][number]>),
    subcontracts: mapRecordValues(
      raw.subcontracts as Record<string, CompanyDatabase['subcontracts'][number]>
    ),
    punchLogs: mapRecordValues(
      raw.punchLogs as Record<string, CompanyDatabase['punchLogs'][number]>
    ),
    expenses: mapRecordValues(raw.expenses as Record<string, CompanyDatabase['expenses'][number]>),
    instructions: mapRecordValues(
      raw.instructions as Record<string, CompanyDatabase['instructions'][number]>
    ),
    notifications: mapRecordValues(
      raw.notifications as Record<string, CompanyDatabase['notifications'][number]>
    ),
    ledger: mapRecordValues(raw.ledger as Record<string, CompanyDatabase['ledger'][number]>),
  };
}

function normalizeRootSnapshot(raw: Record<string, unknown> | null): StaffOnlineRootState {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const rawSuper = (safe.super_admin as Partial<SuperAdminConfig> | undefined) || {};
  const superAdmin: SuperAdminConfig = {
    email: rawSuper.email?.trim() || DEFAULT_SUPER_ADMIN.email,
    password: (rawSuper.password || DEFAULT_SUPER_ADMIN.password).trim(),
    updatedAt: rawSuper.updatedAt || DEFAULT_SUPER_ADMIN.updatedAt,
  };

  const rawCompanies = (safe.companies as Record<string, CompanyRecord> | undefined) || {};
  const companies: Record<string, CompanyRecord> = {};
  Object.entries(rawCompanies).forEach(([id, comp]) => {
    if (comp && typeof comp === 'object') {
      companies[id] = { ...comp, id: comp.id || id };
    }
  });

  const rawCompanyData =
    (safe.company_data as Record<string, Record<string, unknown>> | undefined) || {};
  const companyData: Record<string, CompanyDatabase> = {};
  Object.keys(companies).forEach((id) => {
    companyData[id] = normalizeCompanyDb(rawCompanyData[id]);
  });
  Object.entries(rawCompanyData).forEach(([id, data]) => {
    if (!companyData[id]) {
      companyData[id] = normalizeCompanyDb(data);
    }
  });

  return { superAdmin, companies, companyData };
}

function createEmptyRawTree(): Record<string, unknown> {
  return {
    super_admin: { ...DEFAULT_SUPER_ADMIN },
    companies: {},
    company_data: {},
  };
}

function readLocalRawTree(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(LOCAL_MIRROR_KEY);
    if (!raw) return createEmptyRawTree();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : createEmptyRawTree();
  } catch {
    return createEmptyRawTree();
  }
}

function writeLocalRawTree(tree: Record<string, unknown>, broadcast = true): void {
  try {
    window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(tree));
    if (broadcast && typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.postMessage({ updatedAt: Date.now() });
      ch.close();
    }
  } catch {
    // Ignore storage quota errors silently
  }
}

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function getNestedValue(root: Record<string, unknown>, relativePath: string): unknown {
  const segments = relativePath.replace(/^staff_online\/?/, '').split('/').filter(Boolean);
  let cursor: unknown = root;
  for (const seg of segments) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

function setNestedPath(
  root: Record<string, unknown>,
  relativePath: string,
  value: unknown
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
  const segments = relativePath.replace(/^staff_online\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return clone;
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!cursor[seg] || typeof cursor[seg] !== 'object') {
      cursor[seg] = {};
    }
    cursor = cursor[seg] as Record<string, unknown>;
  }
  const last = segments[segments.length - 1];
  if (value === undefined) {
    delete cursor[last];
  } else {
    cursor[last] = value;
  }
  return clone;
}

function updateNestedPath(
  root: Record<string, unknown>,
  relativePath: string,
  partial: Record<string, unknown>
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
  const segments = relativePath.replace(/^staff_online\/?/, '').split('/').filter(Boolean);
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!cursor[seg] || typeof cursor[seg] !== 'object') {
      cursor[seg] = {};
    }
    cursor = cursor[seg] as Record<string, unknown>;
  }
  Object.entries(partial).forEach(([k, v]) => {
    if (v === undefined) delete cursor[k];
    else cursor[k] = v;
  });
  return clone;
}

type RootListener = (state: StaffOnlineRootState) => void;
const localListeners = new Set<RootListener>();

// Canonical in-memory tree synced from Firestore + local mirror
let liveTree: Record<string, unknown> = readLocalRawTree();

function emitLiveTree(broadcast = false): void {
  writeLocalRawTree(liveTree, broadcast);
  const normalized = normalizeRootSnapshot(liveTree);
  localListeners.forEach((cb) => cb(normalized));
}

function isValidSubcollection(name: string): name is CompanySubcollectionName {
  return (COMPANY_SUBCOLLECTIONS as readonly string[]).includes(name);
}

function getSubcollectionLimit(subcol: CompanySubcollectionName): number {
  return subcol === 'punchLogs' ? 2000 : 1000;
}

function resolveFirestoreTarget(
  path: string
):
  | { kind: 'super_admin'; fsPath: string }
  | { kind: 'company'; companyId: string; fsPath: string }
  | {
      kind: 'subdoc';
      companyId: string;
      subcol: CompanySubcollectionName;
      docId: string;
      fsPath: string;
    }
  | { kind: 'company_data_root'; companyId: string; fsPath: string }
  | null {
  const segments = path.replace(/^staff_online\/?/, '').split('/').filter(Boolean);
  if (segments.length === 1 && segments[0] === 'super_admin') {
    return { kind: 'super_admin', fsPath: 'staff_online_config/super_admin' };
  }
  if (segments.length === 2 && segments[0] === 'companies') {
    return {
      kind: 'company',
      companyId: segments[1],
      fsPath: `staff_online_companies/${segments[1]}`,
    };
  }
  if (segments.length === 2 && segments[0] === 'company_data') {
    return {
      kind: 'company_data_root',
      companyId: segments[1],
      fsPath: `staff_online_companies/${segments[1]}`,
    };
  }
  if (segments.length === 4 && segments[0] === 'company_data' && isValidSubcollection(segments[2])) {
    return {
      kind: 'subdoc',
      companyId: segments[1],
      subcol: segments[2],
      docId: segments[3],
      fsPath: `staff_online_companies/${segments[1]}/${segments[2]}/${segments[3]}`,
    };
  }
  return null;
}

async function writeTargetToFirestore(
  path: string,
  fullValue: Record<string, unknown>
): Promise<void> {
  if (!firestoreDb) return;
  const target = resolveFirestoreTarget(path);
  if (!target || target.kind === 'company_data_root') return;
  const cleanPayload = stripUndefined(fullValue);
  try {
    if (target.kind === 'super_admin') {
      await setDoc(doc(firestoreDb, 'staff_online_config', 'super_admin'), cleanPayload);
      return;
    }
    if (target.kind === 'company') {
      await setDoc(doc(firestoreDb, 'staff_online_companies', target.companyId), cleanPayload);
      return;
    }
    await setDoc(
      doc(firestoreDb, 'staff_online_companies', target.companyId, target.subcol, target.docId),
      cleanPayload
    );
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, target.fsPath);
  }
}

async function deleteTargetFromFirestore(path: string): Promise<void> {
  if (!firestoreDb) return;
  const target = resolveFirestoreTarget(path);
  if (!target) return;
  try {
    if (target.kind === 'company') {
      await deleteDoc(doc(firestoreDb, 'staff_online_companies', target.companyId));
      return;
    }
    if (target.kind === 'subdoc') {
      await deleteDoc(
        doc(firestoreDb, 'staff_online_companies', target.companyId, target.subcol, target.docId)
      );
      return;
    }
    if (target.kind === 'company_data_root') {
      // Delete all docs in every subcollection for this company
      await Promise.all(
        COMPANY_SUBCOLLECTIONS.map(async (subcol) => {
          if (!firestoreDb) return;
          try {
            const snap = await getDocs(
              query(
                collection(firestoreDb, 'staff_online_companies', target.companyId, subcol),
                limit(getSubcollectionLimit(subcol))
              )
            );
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
          } catch (err) {
            logFirestoreError(
              err,
              OperationType.DELETE,
              `staff_online_companies/${target.companyId}/${subcol}`
            );
          }
        })
      );
    }
  } catch (err) {
    logFirestoreError(err, OperationType.DELETE, target.fsPath);
  }
}

async function migrateLocalOnlyDataToCloudOnce(localSeed: Record<string, unknown>): Promise<void> {
  if (!firestoreDb) return;
  try {
    if (window.localStorage.getItem(CLOUD_MIGRATED_KEY) === '1') return;
    window.localStorage.setItem(CLOUD_MIGRATED_KEY, '1');
  } catch {
    return;
  }

  const localCompanies = (localSeed.companies as Record<string, CompanyRecord> | undefined) || {};
  const companyIds = Object.keys(localCompanies);
  if (companyIds.length === 0) return;

  const localCompanyData =
    (localSeed.company_data as Record<string, Record<string, Record<string, unknown>>> | undefined) ||
    {};

  for (const cid of companyIds) {
    const comp = localCompanies[cid];
    if (!comp || typeof comp !== 'object') continue;
    await writeTargetToFirestore(`staff_online/companies/${cid}`, {
      ...comp,
      id: comp.id || cid,
    } as Record<string, unknown>);

    const cData = localCompanyData[cid];
    if (!cData || typeof cData !== 'object') continue;
    for (const subcol of COMPANY_SUBCOLLECTIONS) {
      const records = cData[subcol];
      if (!records || typeof records !== 'object') continue;
      for (const [docId, rec] of Object.entries(records)) {
        if (!rec || typeof rec !== 'object') continue;
        await writeTargetToFirestore(`staff_online/company_data/${cid}/${subcol}/${docId}`, {
          ...(rec as Record<string, unknown>),
          id: ((rec as Record<string, unknown>).id as string) || docId,
        });
      }
    }
  }
}

async function fetchCompanySubcollectionsFromFirestore(
  companyId: string
): Promise<Record<string, Record<string, unknown>>> {
  const result: Record<string, Record<string, unknown>> = {};
  if (!firestoreDb) return result;
  await Promise.all(
    COMPANY_SUBCOLLECTIONS.map(async (subcol) => {
      if (!firestoreDb) return;
      try {
        const snap = await getDocs(
          query(
            collection(firestoreDb, 'staff_online_companies', companyId, subcol),
            limit(getSubcollectionLimit(subcol))
          )
        );
        const map: Record<string, unknown> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          map[d.id] = { ...data, id: (data.id as string) || d.id };
        });
        result[subcol] = map;
      } catch (err) {
        logFirestoreError(
          err,
          OperationType.LIST,
          `staff_online_companies/${companyId}/${subcol}`
        );
      }
    })
  );
  return result;
}

/**
 * Forces a fresh one-shot fetch of all cloud records (super_admin, companies, and subcollections).
 * Used before rejecting any login attempt so newly created accounts on other devices work instantly.
 */
export async function refreshCloudSnapshotOnce(): Promise<StaffOnlineRootState> {
  if (firestoreDb) {
    try {
      const [superSnap, companiesSnap] = await Promise.all([
        getDoc(doc(firestoreDb, 'staff_online_config', 'super_admin')).catch(() => null),
        getDocs(query(collection(firestoreDb, 'staff_online_companies'), limit(500))),
      ]);

      const nextCompanies: Record<string, CompanyRecord> = {};
      companiesSnap.docs.forEach((d) => {
        const data = d.data() as CompanyRecord;
        nextCompanies[d.id] = { ...data, id: data.id || d.id };
      });

      const nextCompanyData: Record<string, Record<string, unknown>> = {};
      await Promise.all(
        Object.keys(nextCompanies).map(async (cid) => {
          nextCompanyData[cid] = await fetchCompanySubcollectionsFromFirestore(cid);
        })
      );

      const nextSuper =
        superSnap && superSnap.exists()
          ? (superSnap.data() as SuperAdminConfig)
          : ((liveTree.super_admin as SuperAdminConfig | undefined) || DEFAULT_SUPER_ADMIN);

      liveTree = {
        super_admin: nextSuper,
        companies: nextCompanies,
        company_data: nextCompanyData,
      };
      emitLiveTree(false);
      return normalizeRootSnapshot(liveTree);
    } catch (err) {
      logFirestoreError(err, OperationType.LIST, 'staff_online_companies');
    }
  }

  if (rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, 'staff_online'));
      const val = snap.val() as Record<string, unknown> | null;
      if (val && typeof val === 'object') {
        liveTree = val;
        emitLiveTree(false);
        return normalizeRootSnapshot(liveTree);
      }
    } catch {
      // fall through to local mirror
    }
  }

  return normalizeRootSnapshot(liveTree);
}

export function subscribeStaffOnlineRoot(
  onChange: RootListener,
  onCloudSynced?: () => void
): () => void {
  localListeners.add(onChange);

  // Deliver current cached state immediately if available
  const initialLocal = readLocalRawTree();
  liveTree = initialLocal;
  const initialCompanies = (initialLocal.companies as Record<string, unknown> | undefined) || {};
  if (Object.keys(initialCompanies).length > 0) {
    onChange(normalizeRootSnapshot(liveTree));
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_MIRROR_KEY) {
      liveTree = readLocalRawTree();
      onChange(normalizeRootSnapshot(liveTree));
    }
  };
  try {
    window.addEventListener('storage', onStorage);
  } catch {
    // ignore
  }

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = () => {
        liveTree = readLocalRawTree();
        onChange(normalizeRootSnapshot(liveTree));
      };
    }
  } catch {
    // ignore
  }

  let cloudSyncedNotified = false;
  const markCloudSynced = () => {
    if (cloudSyncedNotified) return;
    cloudSyncedNotified = true;
    onChange(normalizeRootSnapshot(liveTree));
    onCloudSynced?.();
  };

  // Fallback timer so UI never hangs indefinitely if offline
  const hydrationFallbackTimer = window.setTimeout(() => {
    markCloudSynced();
  }, 2800);

  // Live Firestore subscriptions (primary real-time cloud store)
  const fsUnsubs: Unsubscribe[] = [];
  const companySubUnsubs = new Map<string, Unsubscribe[]>();
  let handledFirstCompaniesSnap = false;

  const ensureCompanySubListeners = (companyId: string) => {
    if (!firestoreDb || companySubUnsubs.has(companyId)) return;
    const list: Unsubscribe[] = [];
    for (const subcol of COMPANY_SUBCOLLECTIONS) {
      const q = query(
        collection(firestoreDb, 'staff_online_companies', companyId, subcol),
        limit(getSubcollectionLimit(subcol))
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const map: Record<string, unknown> = {};
          snap.docs.forEach((d) => {
            const data = d.data() as Record<string, unknown>;
            map[d.id] = { ...data, id: (data.id as string) || d.id };
          });
          const prevCompanyData =
            (liveTree.company_data as Record<string, Record<string, unknown>> | undefined) || {};
          const prevForCompany = prevCompanyData[companyId] || {};
          liveTree = {
            ...liveTree,
            company_data: {
              ...prevCompanyData,
              [companyId]: {
                ...prevForCompany,
                [subcol]: map,
              },
            },
          };
          emitLiveTree(false);
        },
        (err) => {
          logFirestoreError(
            err,
            OperationType.LIST,
            `staff_online_companies/${companyId}/${subcol}`
          );
        }
      );
      list.push(unsub);
    }
    companySubUnsubs.set(companyId, list);
  };

  const cleanupRemovedCompanyListeners = (activeIds: Set<string>) => {
    for (const [cid, unsubs] of companySubUnsubs.entries()) {
      if (!activeIds.has(cid)) {
        unsubs.forEach((fn) => {
          try {
            fn();
          } catch {
            // ignore
          }
        });
        companySubUnsubs.delete(cid);
      }
    }
  };

  if (firestoreDb) {
    try {
      // 1. Subscribe to Super Admin credentials
      const unsubSuper = onSnapshot(
        doc(firestoreDb, 'staff_online_config', 'super_admin'),
        (snap) => {
          if (snap.exists()) {
            liveTree = {
              ...liveTree,
              super_admin: snap.data() as SuperAdminConfig,
            };
            emitLiveTree(false);
          } else {
            // Seed default super_admin silently on first run
            void setDoc(
              doc(firestoreDb, 'staff_online_config', 'super_admin'),
              DEFAULT_SUPER_ADMIN
            ).catch(() => {});
          }
        },
        (err) => {
          logFirestoreError(err, OperationType.GET, 'staff_online_config/super_admin');
        }
      );
      fsUnsubs.push(unsubSuper);

      // 2. Subscribe to all registered companies
      const unsubCompanies = onSnapshot(
        query(collection(firestoreDb, 'staff_online_companies'), limit(500)),
        (snap) => {
          const nextCompanies: Record<string, CompanyRecord> = {};
          const activeIds = new Set<string>();
          snap.docs.forEach((d) => {
            const data = d.data() as CompanyRecord;
            nextCompanies[d.id] = { ...data, id: data.id || d.id };
            activeIds.add(d.id);
          });

          if (!handledFirstCompaniesSnap) {
            handledFirstCompaniesSnap = true;
            if (snap.empty) {
              // One-time migration of any pre-existing local companies to cloud
              void migrateLocalOnlyDataToCloudOnce(initialLocal);
            } else {
              try {
                window.localStorage.setItem(CLOUD_MIGRATED_KEY, '1');
              } catch {
                // ignore
              }
            }
          }

          const prevCompanyData =
            (liveTree.company_data as Record<string, Record<string, unknown>> | undefined) || {};
          const nextCompanyData: Record<string, Record<string, unknown>> = {};
          activeIds.forEach((cid) => {
            nextCompanyData[cid] = prevCompanyData[cid] || {};
          });

          liveTree = {
            ...liveTree,
            companies: nextCompanies,
            company_data: nextCompanyData,
          };

          cleanupRemovedCompanyListeners(activeIds);
          activeIds.forEach((cid) => ensureCompanySubListeners(cid));

          emitLiveTree(false);
          window.clearTimeout(hydrationFallbackTimer);
          markCloudSynced();
        },
        (err) => {
          logFirestoreError(err, OperationType.LIST, 'staff_online_companies');
          window.clearTimeout(hydrationFallbackTimer);
          markCloudSynced();
        }
      );
      fsUnsubs.push(unsubCompanies);
    } catch (err) {
      logFirestoreError(err, OperationType.LIST, 'staff_online_companies');
      window.clearTimeout(hydrationFallbackTimer);
      markCloudSynced();
    }
  } else if (!rtdb) {
    window.clearTimeout(hydrationFallbackTimer);
    markCloudSynced();
  }

  // Optional RTDB listener if VITE_FIREBASE_DATABASE_URL is configured
  let unsubRtdb: (() => void) | null = null;
  if (rtdb) {
    try {
      const rootRef = rtdbRef(rtdb, 'staff_online');
      unsubRtdb = onValue(
        rootRef,
        (snap) => {
          const val = snap.val() as Record<string, unknown> | null;
          if (val && typeof val === 'object') {
            liveTree = val;
            emitLiveTree(false);
          } else {
            void rtdbSet(rtdbRef(rtdb, 'staff_online/super_admin'), DEFAULT_SUPER_ADMIN).catch(
              () => {}
            );
          }
          window.clearTimeout(hydrationFallbackTimer);
          markCloudSynced();
        },
        () => {
          window.clearTimeout(hydrationFallbackTimer);
          markCloudSynced();
        }
      );
    } catch {
      window.clearTimeout(hydrationFallbackTimer);
      markCloudSynced();
    }
  }

  return () => {
    window.clearTimeout(hydrationFallbackTimer);
    localListeners.delete(onChange);
    try {
      window.removeEventListener('storage', onStorage);
    } catch {
      // ignore
    }
    if (channel) {
      try {
        channel.close();
      } catch {
        // ignore
      }
    }
    fsUnsubs.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
    for (const unsubs of companySubUnsubs.values()) {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    }
    companySubUnsubs.clear();
    if (unsubRtdb) {
      try {
        unsubRtdb();
      } catch {
        // ignore
      }
    }
  };
}

export async function dbSetPath(path: string, value: unknown): Promise<void> {
  const cleanVal = stripUndefined(value);
  liveTree = setNestedPath(liveTree, path, cleanVal);
  emitLiveTree(true);

  const cloudOps: Promise<void>[] = [];
  if (firestoreDb && cleanVal && typeof cleanVal === 'object') {
    cloudOps.push(writeTargetToFirestore(path, cleanVal as Record<string, unknown>));
  }
  if (rtdb) {
    cloudOps.push(
      rtdbSet(rtdbRef(rtdb, path), cleanVal).catch(() => {
        // Silent fallback
      })
    );
  }
  if (cloudOps.length > 0) {
    await Promise.all(cloudOps);
  }
}

export async function dbUpdatePath(
  path: string,
  partial: Record<string, unknown>
): Promise<void> {
  const cleanPartial = stripUndefined(partial);
  liveTree = updateNestedPath(liveTree, path, cleanPartial);
  emitLiveTree(true);

  const mergedDoc = getNestedValue(liveTree, path);
  const cloudOps: Promise<void>[] = [];
  if (firestoreDb && mergedDoc && typeof mergedDoc === 'object') {
    cloudOps.push(writeTargetToFirestore(path, mergedDoc as Record<string, unknown>));
  }
  if (rtdb) {
    cloudOps.push(
      rtdbUpdate(rtdbRef(rtdb, path), cleanPartial).catch(() => {
        // Silent fallback
      })
    );
  }
  if (cloudOps.length > 0) {
    await Promise.all(cloudOps);
  }
}

export async function dbRemovePath(path: string): Promise<void> {
  liveTree = setNestedPath(liveTree, path, undefined);
  emitLiveTree(true);

  const cloudOps: Promise<void>[] = [];
  if (firestoreDb) {
    cloudOps.push(deleteTargetFromFirestore(path));
  }
  if (rtdb) {
    cloudOps.push(
      rtdbRemove(rtdbRef(rtdb, path)).catch(() => {
        // Silent fallback
      })
    );
  }
  if (cloudOps.length > 0) {
    await Promise.all(cloudOps);
  }
}

export async function dbReadCompanySnapshotOnce(
  companyId: string
): Promise<{ company: CompanyRecord | null; db: CompanyDatabase }> {
  if (firestoreDb) {
    try {
      const compSnap = await getDoc(doc(firestoreDb, 'staff_online_companies', companyId));
      if (compSnap.exists()) {
        const compVal = compSnap.data() as CompanyRecord;
        const subData = await fetchCompanySubcollectionsFromFirestore(companyId);
        return {
          company: { ...compVal, id: compVal.id || companyId },
          db: normalizeCompanyDb(subData),
        };
      }
    } catch (err) {
      logFirestoreError(err, OperationType.GET, `staff_online_companies/${companyId}`);
    }
  }

  if (rtdb) {
    try {
      const [compSnap, dataSnap] = await Promise.all([
        rtdbGet(rtdbRef(rtdb, `staff_online/companies/${companyId}`)),
        rtdbGet(rtdbRef(rtdb, `staff_online/company_data/${companyId}`)),
      ]);
      const compVal = compSnap.val() as CompanyRecord | null;
      const dataVal = dataSnap.val() as Record<string, unknown> | null;
      if (compVal) {
        return {
          company: { ...compVal, id: compVal.id || companyId },
          db: normalizeCompanyDb(dataVal || undefined),
        };
      }
    } catch {
      // fallback to local mirror silently
    }
  }

  const normalized = normalizeRootSnapshot(liveTree);
  return {
    company: normalized.companies[companyId] || null,
    db: normalized.companyData[companyId] || { ...EMPTY_COMPANY_DB },
  };
}
