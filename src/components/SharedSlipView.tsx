import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Loader2, Lock, Mail } from 'lucide-react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import {
  AttendanceRecord,
  CompanyDatabase,
  CompanyProfile,
  EMPTY_COMPANY_DB,
  ExpenseClaim,
  SalaryPayment,
  StaffAccount,
} from '../types';
import {
  auth,
  BOOTSTRAPPED_MASTER_EMAIL,
  db,
  googleProvider,
  isFirebaseConfigured,
  toIsoString,
} from '../firebase';
import { useErp } from '../context/ErpContext';
import { computeStaffSlipData } from '../utils/pdfSlip';
import { SalarySlipPreview } from './SalarySlipPreview';
import { FirebaseSetupBanner } from './FirebaseSetupBanner';

interface SharedSlipViewProps {
  companyId: string;
  staffId: string;
  fromMonth: string;
  toMonth: string;
  onExit: () => void;
}

export const SharedSlipView: React.FC<SharedSlipViewProps> = ({
  companyId,
  staffId,
  fromMonth,
  toMonth,
  onExit,
}) => {
  const { firebaseUser } = useErp();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyDb, setCompanyDb] = useState<CompanyDatabase>(EMPTY_COMPANY_DB);

  useEffect(() => {
    let active = true;
    const loadSlip = async () => {
      if (!isFirebaseConfigured || !firebaseUser || !firebaseUser.emailVerified) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setAuthError('');

      try {
        const userEmail = (firebaseUser.email || '').trim().toLowerCase();
        const compSnap = await getDoc(doc(db, 'companies', companyId));
        if (!compSnap.exists()) {
          if (active) {
            setCompany(null);
            setLoading(false);
          }
          return;
        }
        const compRaw = compSnap.data();
        const comp: CompanyProfile = {
          ...(compRaw as CompanyProfile),
          id: compSnap.id,
          createdAt: toIsoString(compRaw.createdAt),
        };

        const staffSnap = await getDoc(doc(db, 'companies', companyId, 'staff', staffId));
        if (!staffSnap.exists()) {
          if (active) {
            setCompany(comp);
            setCompanyDb(EMPTY_COMPANY_DB);
            setLoading(false);
          }
          return;
        }
        const staffDoc = { ...(staffSnap.data() as StaffAccount), id: staffSnap.id };

        const isMaster = userEmail === BOOTSTRAPPED_MASTER_EMAIL;
        const isCompAdmin = comp.adminEmail.toLowerCase() === userEmail;

        const attRef = collection(db, 'companies', companyId, 'attendance');
        const expRef = collection(db, 'companies', companyId, 'expenses');
        const payRef = collection(db, 'companies', companyId, 'payments');

        const filterClause = isMaster
          ? null
          : isCompAdmin
          ? where('companyAdminEmail', '==', userEmail)
          : where('staffEmail', '==', userEmail);

        const [attSnap, expSnap, paySnap] = await Promise.all([
          getDocs(filterClause ? query(attRef, filterClause) : attRef),
          getDocs(filterClause ? query(expRef, filterClause) : expRef),
          getDocs(filterClause ? query(payRef, filterClause) : payRef),
        ]);

        if (!active) return;
        setCompany(comp);
        setCompanyDb({
          ...EMPTY_COMPANY_DB,
          staff: [staffDoc],
          attendance: attSnap.docs.map((d) => ({ ...(d.data() as AttendanceRecord), id: d.id })),
          expenses: expSnap.docs.map((d) => ({
            ...(d.data() as ExpenseClaim),
            id: d.id,
            createdAt: toIsoString(d.data().createdAt),
          })),
          payments: paySnap.docs.map((d) => ({
            ...(d.data() as SalaryPayment),
            id: d.id,
            createdAt: toIsoString(d.data().createdAt),
          })),
        });
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setAuthError(
          err instanceof Error
            ? 'You do not have permission to view this private salary slip. Sign in with the employee or Company Admin account.'
            : 'Unable to load salary slip.'
        );
        setLoading(false);
      }
    };
    loadSlip();
    return () => {
      active = false;
    };
  }, [companyId, staffId, firebaseUser]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setAuthError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        setAuthError('Please verify your email link in your inbox before opening this slip.');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Email sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">
          <FirebaseSetupBanner />
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-5 rounded-xl bg-[#0B1120] text-white text-sm font-semibold"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0B1120]">
              Verify Identity to View Salary Slip
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sign in with your Email &amp; Password or Google account to unlock this private
              corporate salary slip.
            </p>
          </div>

          {authError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#DC2626]">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="w-full min-h-[44px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-bold"
            >
              {signingIn ? 'Signing in...' : 'Sign in with Email & Password'}
            </button>
          </form>

          <button
            type="button"
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[44px] px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0B1120] text-sm font-bold"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={onExit}
            className="w-full min-h-[40px] px-5 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span className="text-sm font-semibold text-[#0B1120]">
            Loading verified corporate salary slip from Cloud Firestore...
          </span>
        </div>
      </div>
    );
  }

  const staff = companyDb.staff.find((s) => s.id === staffId);

  if (!company || !staff) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-[#0B1120]">Salary Slip Unavailable</h2>
          <p className="text-sm text-slate-600">
            {authError || 'The requested company or employee record could not be located.'}
          </p>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B1120] text-white text-sm font-semibold"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  const slip = computeStaffSlipData(company, companyDb, staff, fromMonth, toMonth);

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-12">
      <header className="bg-[#0B1120] text-white border-b border-slate-800 sticky top-0 z-30 no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              {(company.badge || 'CO').slice(0, 3).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{company.name} — Official Salary Slip</p>
              <p className="text-[11px] text-slate-400 truncate">
                {staff.name} · {slip.periodLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Portal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <SalarySlipPreview slip={slip} />
      </main>
    </div>
  );
};
