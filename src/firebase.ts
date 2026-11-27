import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const BOOTSTRAPPED_MASTER_EMAIL = 'shriyanshsingh7581@gmail.com';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Provision a Firebase Email/Password account using an isolated secondary App instance
 * so the currently signed-in Master Admin or Company Admin session is never interrupted.
 * Plaintext passwords are NEVER stored in Firestore.
 */
export async function provisionEmailPasswordAccount(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  status: 'created' | 'exists' | 'provider_disabled' | 'error';
  message?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || password.trim().length < 6) {
    return { ok: false, status: 'error', message: 'Password must be at least 6 characters.' };
  }

  try {
    const secondaryName = 'secondary-provisioning-auth';
    const secondaryApp =
      getApps().find((a) => a.name === secondaryName) ||
      initializeApp(firebaseConfig, secondaryName);
    const secondaryAuth = getAuth(secondaryApp);

    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password.trim());
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Verification email can also be resent from the login screen
    }
    await signOut(secondaryAuth);
    return {
      ok: true,
      status: 'created',
      message: `Email/Password login created for ${cleanEmail} and verification link sent.`,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/email-already-in-use') {
      return {
        ok: true,
        status: 'exists',
        message: `Auth account for ${cleanEmail} already exists — they can sign in immediately.`,
      };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        status: 'provider_disabled',
        message:
          'Enable Email/Password sign-in in Firebase Console (Authentication → Sign-in method) to activate password logins.',
      };
    }
    return {
      ok: false,
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to create Email/Password auth account.',
    };
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function emailToMemberKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 128);
}

export function sanitizeStr(value: string | undefined | null, maxLen: number): string {
  if (!value) return '';
  return String(value).trim().slice(0, maxLen);
}

export function sanitizeOptStr(
  value: string | undefined | null,
  maxLen: number
): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) {
      out[k] = v;
    }
  });
  return out;
}

export function toIsoString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as Timestamp).toDate === 'function'
  ) {
    return (val as Timestamp).toDate().toISOString();
  }
  return '';
}

// Validate Firestore connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
      return false;
    }
    return true;
  }
}

void testConnection();
