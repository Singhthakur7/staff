import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import {
  Database,
  get,
  getDatabase,
  onValue,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';
import {
  CompanyDatabase,
  CompanyRecord,
  EMPTY_COMPANY_DB,
  StaffOnlineRootState,
  SuperAdminConfig,
} from './types';

// Silent configuration slots — automatically reads VITE_FIREBASE_* from environment variables (Vercel / .env)
const SILENT_RTDB_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const DEFAULT_SUPER_ADMIN: SuperAdminConfig = {
  email: 'super@staff.online',
  password: 'Super@2026',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const LOCAL_MIRROR_KEY = 'staff_online_store_v1';
const BROADCAST_CHANNEL_NAME = 'staff_online_sync_v1';

let appInstance: FirebaseApp | null = null;
let rtdbInstance: Database | null = null;

function initSilentDatabase(): Database | null {
  if (rtdbInstance) return rtdbInstance;
  const dbUrl = SILENT_RTDB_CONFIG.databaseURL.trim();
  if (!dbUrl || !dbUrl.startsWith('http')) {
    return null;
  }
  try {
    appInstance = getApps().length ? getApp() : initializeApp(SILENT_RTDB_CONFIG);
    rtdbInstance = getDatabase(appInstance, dbUrl);
    return rtdbInstance;
  } catch {
    return null;
  }
}

export const rtdb = initSilentDatabase();

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
    password: rawSuper.password || DEFAULT_SUPER_ADMIN.password,
    updatedAt: rawSuper.updatedAt || DEFAULT_SUPER_ADMIN.updatedAt,
  };

  const rawCompanies =
    (safe.companies as Record<string, CompanyRecord> | undefined) || {};
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

function readLocalRawTree(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(LOCAL_MIRROR_KEY);
    if (!raw) return { super_admin: DEFAULT_SUPER_ADMIN, companies: {}, company_data: {} };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object'
      ? parsed
      : { super_admin: DEFAULT_SUPER_ADMIN, companies: {}, company_data: {} };
  } catch {
    return { super_admin: DEFAULT_SUPER_ADMIN, companies: {}, company_data: {} };
  }
}

function writeLocalRawTree(tree: Record<string, unknown>): void {
  try {
    window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(tree));
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.postMessage({ updatedAt: Date.now() });
      ch.close();
    }
  } catch {
    // Ignore storage quota errors silently
  }
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

function emitLocalState(): void {
  const normalized = normalizeRootSnapshot(readLocalRawTree());
  localListeners.forEach((cb) => cb(normalized));
}

export function subscribeStaffOnlineRoot(onChange: RootListener): () => void {
  localListeners.add(onChange);

  // Immediately deliver current local state so UI never blocks
  onChange(normalizeRootSnapshot(readLocalRawTree()));

  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_MIRROR_KEY) emitLocalState();
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
      channel.onmessage = () => emitLocalState();
    }
  } catch {
    // ignore
  }

  let unsubRtdb: (() => void) | null = null;
  if (rtdb) {
    try {
      const rootRef = ref(rtdb, 'staff_online');
      unsubRtdb = onValue(
        rootRef,
        (snap) => {
          const val = snap.val() as Record<string, unknown> | null;
          if (val && typeof val === 'object') {
            writeLocalRawTree(val);
            onChange(normalizeRootSnapshot(val));
          } else {
            // Seed super_admin silently on first run if empty
            void set(ref(rtdb, 'staff_online/super_admin'), DEFAULT_SUPER_ADMIN).catch(() => {});
            onChange(normalizeRootSnapshot(readLocalRawTree()));
          }
        },
        () => {
          // Silently remain operational via local mirror
        }
      );
    } catch {
      // Silently remain operational
    }
  }

  return () => {
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
    if (unsubRtdb) {
      try {
        unsubRtdb();
      } catch {
        // ignore
      }
    }
  };
}

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export async function dbSetPath(path: string, value: unknown): Promise<void> {
  const cleanVal = stripUndefined(value);
  const nextLocal = setNestedPath(readLocalRawTree(), path, cleanVal);
  writeLocalRawTree(nextLocal);
  emitLocalState();

  if (rtdb) {
    try {
      await set(ref(rtdb, path), cleanVal);
    } catch {
      // Keep local mirror updated silently
    }
  }
}

export async function dbUpdatePath(
  path: string,
  partial: Record<string, unknown>
): Promise<void> {
  const cleanPartial = stripUndefined(partial);
  const nextLocal = updateNestedPath(readLocalRawTree(), path, cleanPartial);
  writeLocalRawTree(nextLocal);
  emitLocalState();

  if (rtdb) {
    try {
      await update(ref(rtdb, path), cleanPartial);
    } catch {
      // Keep local mirror updated silently
    }
  }
}

export async function dbRemovePath(path: string): Promise<void> {
  const nextLocal = setNestedPath(readLocalRawTree(), path, undefined);
  writeLocalRawTree(nextLocal);
  emitLocalState();

  if (rtdb) {
    try {
      await remove(ref(rtdb, path));
    } catch {
      // Keep local mirror updated silently
    }
  }
}

export async function dbReadCompanySnapshotOnce(
  companyId: string
): Promise<{ company: CompanyRecord | null; db: CompanyDatabase }> {
  if (rtdb) {
    try {
      const [compSnap, dataSnap] = await Promise.all([
        get(ref(rtdb, `staff_online/companies/${companyId}`)),
        get(ref(rtdb, `staff_online/company_data/${companyId}`)),
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
  const normalized = normalizeRootSnapshot(readLocalRawTree());
  return {
    company: normalized.companies[companyId] || null,
    db: normalized.companyData[companyId] || { ...EMPTY_COMPANY_DB },
  };
}
