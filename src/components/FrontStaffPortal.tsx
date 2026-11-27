import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Languages,
  Lock,
  MapPin,
  Megaphone,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  StopCircle,
  UserCheck,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../context/StaffOnlineContext';
import { t } from '../i18n';
import { CompanyRecord } from '../types';
import {
  buildWhatsAppUrl,
  captureMirroredVideoFrame,
  formatINR,
  formatTimeIN,
  formatTimeWithSecondsIN,
  generatePassword,
  getDutyStageInfo,
  safeCopyText,
} from '../utils/helpers';
import { getSafeOrigin } from '../utils/router';
import { BrandLogo } from './BrandLogo';

type OfferStyle = 'annual_offer' | 'studio_selfie' | 'salary_billing';

const OFFER_TEMPLATES: Record<OfferStyle, string[]> = {
  annual_offer: [
    `🚀 *Staff. Online* — 30 ദിവസത്തെ സൗജന്യ ട്രയൽ പീരീഡ് (₹0)!\n\n✅ Live Selfie Attendance & GPS Punching\n✅ Auto-Deducted Formal Salary Slips (PDF & Print)\n✅ Google Pay Settlement Auto-Sync\n✅ Customer Balance Slips, Quotations & P&L\n\n💰 1-Month Free Trial • വെറും ₹1,000 / വർഷം മാത്രം!\nഇന്ന് തന്നെ നിങ്ങളുടെ കമ്പനി രജിസ്റ്റർ ചെയ്യൂ: ${getSafeOrigin()}`,
    `✨ *Staff. Online — Studio & Crew Operations Made Effortless*\n\n🎁 Start with a *30-Day Free Trial (₹0)* — After trial only *₹1,000 / Year*.\n• Mandatory Front-Camera Live Selfie Attendance\n• Instant Formal Salary & Advance Slips\n• Quotation, Tax Invoice & Weekly/Monthly/Yearly P&L\n\nRegister your company now: ${getSafeOrigin()}`,
  ],
  studio_selfie: [
    `📸 *Staff. Online Studio* — Crew, Live Selfie & Multi-Crew Dispatch!\n\nഫോട്ടോഗ്രാഫി, ലൈവ് സ്ട്രീമിംഗ്, LED വാൾ & ഇവന്റ് ടീമുകൾക്കായി:\n• ഫ്രണ്ട് ക്യാമറ ലൈവ് സെൽഫി പഞ്ച്-ഇൻ (GPS സഹിതം)\n• ഡ്യൂട്ടി റൂട്ട് & ടൈം ട്രാക്കിംഗ്\n• മൾട്ടി-ക്രൂ വർക്ക് അസൈൻമെന്റ് & WhatsApp അലർട്ടുകൾ\n\n🔥 30 ദിവസം സൗജന്യം (₹0) • വർഷത്തിൽ ₹1,000 മാത്രം!\n${getSafeOrigin()}`,
    `🎥 *Manage Your Entire Event & Studio Crew in One Place — Staff. Online*\n\nNo gallery uploads. 100% verified live front-camera selfie check-ins with GPS coordinates, live route logs, expense photo approval, and multi-crew dispatch.\n\nStart your 30-Day Free Trial (₹0): ${getSafeOrigin()}`,
  ],
  salary_billing: [
    `💼 *Staff. Online* — Formal Salary Slips, GPay Auto-Sync & Billing PDF!\n\n• സ്റ്റാഫ് അഡ്വാൻസുകൾ ഓട്ടോമാറ്റിക് ആയി സാലറിയിൽ കുറയും\n• Google Pay QR & ഡയറക്ട് പേയ്മെന്റ് + സ്റ്റാഫ് കൺഫർമേഷൻ\n• കൊട്ടേഷൻ, ഇൻവോയ്സ് & കസ്റ്റമർ ബാലൻസ് സ്ലിപ്പ് PDF\n• ആഴ്ച / മാസം / വർഷം P&L സ്റ്റേറ്റ്മെന്റ്\n\n🎉 30 ദിവസത്തെ സൗജന്യ ട്രയൽ (₹0) | ₹1,000/വർഷം\n${getSafeOrigin()}`,
    `📊 *Zero-Error Payroll & Client Billing with Staff. Online*\n\nGenerate A4 Corporate Salary Slips, sync Google Pay payouts with 2-way staff confirmation, send WhatsApp balance reminders to clients, and download Quotation/Invoice PDFs in seconds.\n\nTry Free for 30 Days (₹0): ${getSafeOrigin()}`,
  ],
};

interface FrontStaffPortalProps {
  companySlug?: string;
}

export const FrontStaffPortal: React.FC<FrontStaffPortalProps> = ({ companySlug }) => {
  const {
    lang,
    toggleLang,
    companies,
    companyDataMap,
    registerCompany,
    loginStaffWithSelfie,
    punchOutStaffWithSelfie,
    pushToast,
  } = useStaffOnline();

  const lockedCompany = useMemo(() => {
    if (!companySlug) return null;
    return companies.find((c) => c.slug.toLowerCase() === companySlug.toLowerCase()) || null;
  }, [companies, companySlug]);

  // Offer Generator State
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerStyle, setOfferStyle] = useState<OfferStyle>('annual_offer');
  const [offerVariantIdx, setOfferVariantIdx] = useState(0);

  const currentOfferText = useMemo(() => {
    const list = OFFER_TEMPLATES[offerStyle];
    return list[offerVariantIdx % list.length];
  }, [offerStyle, offerVariantIdx]);

  // Free Trial Registration Modal State
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPlace, setRegPlace] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regYears, setRegYears] = useState<number>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [createdCompany, setCreatedCompany] = useState<CompanyRecord | null>(null);

  // Staff Live Selfie Login State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [selfieActionMode, setSelfieActionMode] = useState<'punch_in' | 'punch_out'>('punch_in');
  const [punchOutReceipt, setPunchOutReceipt] = useState<{
    staffName: string;
    workTitle: string;
    durationText: string;
    dutyWage: number;
    punchOutTime: string;
  } | null>(null);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [liveNowIso, setLiveNowIso] = useState<string>(() => new Date().toISOString());

  // Mandatory Front Camera Selfie & GPS State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedSelfie, setCapturedSelfie] = useState<string>('');
  const [capturedAt, setCapturedAt] = useState<string>('');
  const [gpsLat, setGpsLat] = useState<number | undefined>(undefined);
  const [gpsLng, setGpsLng] = useState<number | undefined>(undefined);
  const [gpsLabel, setGpsLabel] = useState<string>('Detecting GPS...');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveNowIso(new Date().toISOString());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lockedCompany) {
      setSelectedCompanyId(lockedCompany.id);
    } else if (!selectedCompanyId && companies.length > 0) {
      const firstActive = companies.find((c) => c.active) || companies[0];
      if (firstActive) setSelectedCompanyId(firstActive.id);
    }
  }, [lockedCompany, companies, selectedCompanyId]);

  const activeCompanyForLogin = useMemo(
    () => lockedCompany || companies.find((c) => c.id === selectedCompanyId) || null,
    [lockedCompany, companies, selectedCompanyId]
  );

  const staffOptionsForCompany = useMemo(() => {
    if (!activeCompanyForLogin) return [];
    const db = companyDataMap[activeCompanyForLogin.id];
    return (db?.staff || []).filter((s) => s.active);
  }, [activeCompanyForLogin, companyDataMap]);

  const activeShiftForIdentifier = useMemo(() => {
    if (!activeCompanyForLogin || !staffIdentifier.trim()) return null;
    const db = companyDataMap[activeCompanyForLogin.id];
    if (!db) return null;
    const ident = staffIdentifier.trim().toLowerCase();
    const digits = ident.replace(/[^0-9]/g, '');
    const matched = db.staff.find((s) => {
      const emailMatch = s.email.trim().toLowerCase() === ident;
      const phoneDigits = s.phone.replace(/[^0-9]/g, '');
      const phoneMatch = Boolean(digits) && (phoneDigits === digits || phoneDigits.endsWith(digits));
      return emailMatch || phoneMatch || s.id === staffIdentifier;
    });
    if (!matched) return null;
    return (
      db.punchLogs.find(
        (p) => p.staffId === matched.id && p.type === 'duty_punch' && p.status === 'active'
      ) || null
    );
  }, [activeCompanyForLogin, companyDataMap, staffIdentifier]);

  // Capture GPS silently on mount
  const refreshGps = () => {
    try {
      if (!navigator.geolocation) {
        setGpsLabel('GPS unavailable on device');
        return;
      }
      setGpsLabel('Locating GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setGpsLat(lat);
          setGpsLng(lng);
          setGpsLabel(`${lat}, ${lng}`);
        },
        () => {
          setGpsLabel('Location permission not granted');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch {
      setGpsLabel('GPS unavailable');
    }
  };

  useEffect(() => {
    refreshGps();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live front camera is not supported in this browser.');
        return;
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Camera access denied. Please allow front camera permission to capture a live selfie.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const dataUrl = captureMirroredVideoFrame(videoRef.current, 480);
    if (!dataUrl) {
      setCameraError('Camera frame is not ready yet. Please wait a second and try again.');
      return;
    }
    setCapturedSelfie(dataUrl);
    setCapturedAt(new Date().toISOString());
    stopCamera();
    pushToast({ type: 'success', title: 'Live mirrored selfie captured' });
  };

  const handleRegisterTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Please fill Company Name, Admin Email, and Password.');
      return;
    }
    if (regPassword.trim().length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    setRegLoading(true);
    const res = await registerCompany({
      name: regName.trim(),
      place: regPlace.trim() || 'India',
      phone: regPhone.trim(),
      planYears: regYears,
      planStatus: 'trial',
      adminEmail: regEmail.trim().toLowerCase(),
      adminPassword: regPassword.trim(),
    });
    setRegLoading(false);
    if (!res.ok || !res.company) {
      setRegError(res.error || 'Could not register company.');
      return;
    }
    setCreatedCompany(res.company);
    setSelectedCompanyId(res.company.id);
    setRegName('');
    setRegPlace('');
    setRegPhone('');
    setRegYears(1);
    setRegEmail('');
    setRegPassword('');
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setPunchOutReceipt(null);
    if (!activeCompanyForLogin) {
      setLoginError('Please select a registered company first.');
      return;
    }
    if (!staffIdentifier.trim() || !staffPassword) {
      setLoginError('Enter your Staff Email/Phone and Password.');
      return;
    }
    if (!capturedSelfie) {
      setLoginError('Mandatory Live Front-Camera Selfie is required before proceeding.');
      return;
    }
    setLoggingIn(true);
    if (selfieActionMode === 'punch_out') {
      const res = await punchOutStaffWithSelfie({
        companyId: activeCompanyForLogin.id,
        identifier: staffIdentifier.trim(),
        password: staffPassword,
        selfieUrl: capturedSelfie,
        gpsLat,
        gpsLng,
        gpsLabel,
      });
      setLoggingIn(false);
      if (!res.ok) {
        setLoginError(res.error || 'Unable to complete Punch-Out.');
        return;
      }
      setPunchOutReceipt({
        staffName: res.staffName || 'Staff Member',
        workTitle: res.workTitle || 'Duty Shift',
        durationText: res.durationText || '00:00',
        dutyWage: res.dutyWage || 0,
        punchOutTime: res.punchOutTime || new Date().toISOString(),
      });
      setSelfieActionMode('punch_in');
      return;
    }

    const res = await loginStaffWithSelfie({
      companyId: activeCompanyForLogin.id,
      identifier: staffIdentifier.trim(),
      password: staffPassword,
      selfieUrl: capturedSelfie,
      gpsLat,
      gpsLng,
      gpsLabel,
    });
    setLoggingIn(false);
    if (!res.ok) {
      setLoginError(res.error || 'Unable to sign in.');
    }
  };

  const origin = getSafeOrigin();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Strict 3-Zone Top Bar (ZERO Admin/Super Admin Links!) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <BrandLogo
            variant="light"
            size="md"
            companyName={lockedCompany ? lockedCompany.name : undefined}
          />

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#free-trial" className="hover:text-[#0F172A] transition-colors whitespace-nowrap">
              Free Trial
            </a>
            <a href="#offer-generator" className="hover:text-[#0F172A] transition-colors whitespace-nowrap">
              Offer Generator
            </a>
            <a href="#staff-selfie-login" className="hover:text-[#0F172A] transition-colors whitespace-nowrap">
              Staff Login
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{lang === 'en' ? 'മലയാളം' : 'English'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedCompany(null);
                setRegError('');
                setTrialModalOpen(true);
              }}
              className="h-9 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Free Trial (₹0)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10">
        {/* Hero & Free Trial Offer Section */}
        <section
          id="free-trial"
          className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 card-elevated"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  30 ദിവസത്തെ സൗജന്യ ട്രയൽ പീരീഡ് (₹0)
                </span>
                <span className="text-slate-500">
                  1-Month Free Trial · ₹1,000 / Year After Trial
                </span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold tracking-tight text-[#0F172A] leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                {lockedCompany ? (
                  <>
                    {lockedCompany.name} —{' '}
                    <span className="text-[#2563EB]">Verified Staff Field Portal</span>
                  </>
                ) : (
                  <>
                    Crew Attendance, Formal Salary Slips &amp; Billing in{' '}
                    <span className="text-[#2563EB]">One Executive Suite</span>
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                {lockedCompany
                  ? `${lockedCompany.place}${lockedCompany.phone ? ` · ${lockedCompany.phone}` : ''} — Sign in below with mandatory front-camera live selfie verification to log duties, view salary slips, and confirm Google Pay settlements.`
                  : 'Built for studios, event crews, and field teams. Mandatory live front-camera selfie check-ins, auto-deducted advances, Google Pay settlement sync, quotations, invoices, and W/M/Y P&L statements.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCompany(null);
                    setRegError('');
                    setTrialModalOpen(true);
                  }}
                  className="min-h-[48px] px-5 sm:px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-sm font-bold inline-flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.55)] transition-all"
                >
                  <Rocket className="w-4 h-4 shrink-0" />
                  <span>🚀 30-ദിവസ സൗജന്യ ട്രയൽ രജിസ്റ്റർ ചെയ്യുക (₹0)</span>
                </button>
                <a
                  href="#staff-selfie-login"
                  className="min-h-[48px] px-5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0F172A] text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4 text-[#2563EB]" />
                  <span>{t(lang, 'staffSelfieLoginTitle')}</span>
                </a>
              </div>
            </div>

            {/* Right Executive Plan Summary */}
            <div className="lg:col-span-5 bg-[#0B1120] text-white rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold text-sky-300">Annual Studio License</p>
                  <p className="text-3xl font-mono font-extrabold tabular-nums mt-1">
                    ₹0 <span className="text-xs font-sans font-normal text-slate-400">for 30 Days</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">After Trial</p>
                  <p className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                    ₹1,000 / Yr
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Dedicated isolated workspace with private company URLs</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Camera className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Front-camera live selfie &amp; GPS check-in (zero gallery spoofing)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>A4 Formal Salary Slips, GPay QR Sync, Quotations &amp; P&amp;L PDFs</span>
                </li>
              </ul>

              {/* Collapsible Offer Generator Toggle */}
              <div id="offer-generator" className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOfferOpen((prev) => !prev)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs font-semibold text-white flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>ഓഫർ പരസ്യ പോസ്റ്റ് ജനറേറ്റർ</span>
                  </span>
                  {offerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Interactive Offer Advertisement Post Generator */}
          {offerOpen && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    {t(lang, 'offerGenTitle')} (ഓഫർ പരസ്യ പോസ്റ്റ് ജനറേറ്റർ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pick a campaign style, regenerate copy, and share directly on WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(
                    [
                      ['annual_offer', 'Staff. Online — Annual Offer'],
                      ['studio_selfie', 'Staff. Online Studio — Crew & Selfie'],
                      ['salary_billing', 'Staff. Online — Salary Slip & Billing'],
                    ] as [OfferStyle, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOfferStyle(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        offerStyle === key
                          ? 'bg-white text-[#0F172A] shadow-xs'
                          : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <pre className="whitespace-pre-wrap text-xs sm:text-sm font-sans text-slate-800 leading-relaxed">
                  {currentOfferText}
                </pre>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setOfferVariantIdx((i) => i + 1)}
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await safeCopyText(currentOfferText);
                      pushToast({
                        type: ok ? 'success' : 'error',
                        title: ok ? 'Offer post copied' : 'Copy failed',
                      });
                    }}
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Post
                  </button>
                  <a
                    href={buildWhatsAppUrl('', currentOfferText)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[40px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Share on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Primary Staff Live Selfie Login Card (Mandatory Front Camera ONLY) */}
        <section
          id="staff-selfie-login"
          className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 card-elevated"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="text-xl font-display font-extrabold text-[#0F172A]">
                {t(lang, 'staffSelfieLoginTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {t(lang, 'staffSelfieSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1120] text-white font-mono text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatTimeWithSecondsIN(liveNowIso)}</span>
              </span>
              <button
                type="button"
                onClick={refreshGps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-mono text-[11px] font-semibold"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>📍 GPS: {gpsLabel}</span>
              </button>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  capturedSelfie
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                }`}
              >
                {capturedSelfie
                  ? `Live Selfie Captured (${formatTimeIN(capturedAt)})`
                  : 'Live Selfie Required'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* Left: Mandatory Front Camera Viewfinder (NO gallery upload!) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#0B1120] border border-slate-200 flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : capturedSelfie ? (
                  <img
                    src={capturedSelfie}
                    alt="Captured mirrored live selfie"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 text-sky-300 flex items-center justify-center mx-auto">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Front Camera Only</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Gallery uploads are disabled. Tap Start Camera and capture a mirrored live
                        selfie to unlock your Staff Portal.
                      </p>
                    </div>
                  </div>
                )}

                {capturedSelfie && !cameraActive && (
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/75 backdrop-blur-xs text-white px-3.5 py-2 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified Mirrored Selfie
                    </span>
                    <span className="font-mono text-[11px] text-slate-200">
                      {formatTimeIN(capturedAt)}
                    </span>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {cameraError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="sm:col-span-2 min-h-[46px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {capturedSelfie ? 'Retake Live Selfie' : 'Start Camera'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCaptureSelfie}
                    className="sm:col-span-2 min-h-[46px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Mirrored Selfie
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={!cameraActive}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <StopCircle className="w-4 h-4 text-rose-600" />
                  Stop Camera
                </button>
              </div>
            </div>

            {/* Right: Staff Credentials Form */}
            <form onSubmit={handleStaffLoginSubmit} className="lg:col-span-6 space-y-4">
              {!lockedCompany && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Select Registered Company *
                  </label>
                  {companies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                      <p className="font-semibold text-[#0F172A]">
                        No companies registered yet.
                      </p>
                      <p>
                        Register your company with the 30-Day Free Trial (₹0) button above to create
                        your isolated staff portal.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setStaffIdentifier('');
                      }}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-[#0F172A]"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.place}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {lockedCompany && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {lockedCompany.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{lockedCompany.place}</p>
                  </div>
                </div>
              )}

              {staffOptionsForCompany.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Quick Pick Staff Profile (Optional)
                  </label>
                  <select
                    value={
                      staffOptionsForCompany.some((s) => s.email === staffIdentifier)
                        ? staffIdentifier
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) setStaffIdentifier(e.target.value);
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0F172A]"
                  >
                    <option value="">-- Choose your name or type Email/Phone below --</option>
                    {staffOptionsForCompany.map((s) => (
                      <option key={s.id} value={s.email}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Staff Email or Phone *
                </label>
                <input
                  type="text"
                  required
                  value={staffIdentifier}
                  onChange={(e) => setStaffIdentifier(e.target.value)}
                  placeholder="staff@company.staff.online or phone"
                  className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Staff Password *
                </label>
                <div className="relative">
                  <input
                    type={showStaffPass ? 'text' : 'password'}
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter your staff password"
                    className="w-full h-12 pl-3.5 pr-11 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPass((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Toggle password visibility"
                  >
                    {showStaffPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Active Shift Auto-Detected Banner */}
              {activeShiftForIdentifier && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Duty Shift Open: {activeShiftForIdentifier.workTitle}
                    </p>
                    <p className="text-emerald-800 font-mono text-[11px]">
                      Punched In: {formatTimeIN(activeShiftForIdentifier.punchInTime)} · Stage:{' '}
                      {getDutyStageInfo(activeShiftForIdentifier).label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelfieActionMode('punch_out')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0"
                  >
                    Switch to Punch-Out
                  </button>
                </div>
              )}

              {/* Direct Live Selfie Punch-Out Confirmation Receipt */}
              {punchOutReceipt && (
                <div className="rounded-2xl bg-[#0B1120] text-white p-4 space-y-2.5 border border-emerald-500/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Shift Punched-Out &amp; Verified
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {formatTimeIN(punchOutReceipt.punchOutTime)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">
                    <strong>{punchOutReceipt.staffName}</strong> completed{' '}
                    <strong>{punchOutReceipt.workTitle}</strong> · Duration:{' '}
                    <span className="font-mono font-bold text-emerald-300">
                      {punchOutReceipt.durationText}
                    </span>{' '}
                    · Wage Credited:{' '}
                    <span className="font-mono font-bold text-amber-300">
                      {formatINR(punchOutReceipt.dutyWage)}
                    </span>
                  </p>
                </div>
              )}

              {/* Prominent Action Mode Toggle: Punch-In & Login vs Punch-Out */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Select Live Selfie Action *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieActionMode('punch_in');
                      setLoginError('');
                    }}
                    className={`min-h-[48px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      selfieActionMode === 'punch_in'
                        ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <PlayCircle className="w-4 h-4 shrink-0" />
                    <span>▶️ Punch-In &amp; Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieActionMode('punch_out');
                      setLoginError('');
                    }}
                    className={`min-h-[48px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      selfieActionMode === 'punch_out'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-[0_6px_16px_-6px_rgba(225,29,72,0.55)]'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <StopCircle className="w-4 h-4 shrink-0" />
                    <span>⏹️ Punch-Out</span>
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-medium text-rose-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn || !capturedSelfie || !activeCompanyForLogin}
                className={`w-full min-h-[52px] px-5 rounded-2xl disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  selfieActionMode === 'punch_out'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-[0_8px_20px_-6px_rgba(225,29,72,0.45)]'
                    : 'bg-[#2563EB] hover:bg-[#1E3A8A] shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)]'
                }`}
              >
                {selfieActionMode === 'punch_out' ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    {loggingIn
                      ? 'Verifying Selfie & Punching Out...'
                      : `Verify Selfie & Punch-Out (${formatTimeIN(liveNowIso)})`}
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    {loggingIn
                      ? 'Verifying Selfie & Signing In...'
                      : `Punch-In & Enter Portal (${formatTimeIN(liveNowIso)})`}
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Live selfie, exact server-synced clock time, and GPS coordinates are stamped
                  automatically — zero manual time editing.
                </span>
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* Quiet Footer (ZERO Admin / Super Admin links) */}
      <footer className="border-t border-slate-200/80 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <BrandLogo variant="light" size="sm" />
          <p>© {new Date().getFullYear()} Staff. Online — Multi-Tenant Studio, Crew &amp; Payroll Suite</p>
        </div>
      </footer>

      {/* New Company 30-Day Free Trial Registration Modal */}
      {trialModalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setTrialModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0B1120] text-white flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-emerald-400">
                  30 ദിവസത്തെ സൗജന്യ ട്രയൽ (₹0)
                </p>
                <h3 className="text-base font-display font-bold">
                  {createdCompany ? 'Company Workspace Ready!' : 'Register Your Company / Studio'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(false)}
                className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {createdCompany ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-emerald-900 text-sm">
                        {createdCompany.name} is live with 30-Day Free Trial!
                      </p>
                      <p className="text-emerald-800">
                        Save your private Company Admin Panel URL and credentials below.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div>
                      <p className="font-sans text-[11px] font-semibold text-slate-500">
                        Private Company Admin Panel URL
                      </p>
                      <p className="text-[#1E3A8A] font-bold break-all">
                        {origin}/c/{createdCompany.slug}/admin
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[11px] font-semibold text-slate-500">
                        Staff Portal URL (Share with Crew)
                      </p>
                      <p className="text-emerald-700 font-bold break-all">
                        {origin}/c/{createdCompany.slug}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <p className="font-sans text-[11px] text-slate-500">Admin Email</p>
                        <p className="font-bold text-[#0F172A] break-all">
                          {createdCompany.adminEmail}
                        </p>
                      </div>
                      <div>
                        <p className="font-sans text-[11px] text-slate-500">Admin Password</p>
                        <p className="font-bold text-[#0F172A] break-all">
                          {createdCompany.adminPassword}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const text = [
                          `${createdCompany.name} — Staff. Online Portal Details`,
                          `Admin Panel: ${origin}/c/${createdCompany.slug}/admin`,
                          `Admin Email: ${createdCompany.adminEmail}`,
                          `Admin Password: ${createdCompany.adminPassword}`,
                          `Staff Portal: ${origin}/c/${createdCompany.slug}`,
                        ].join('\n');
                        const ok = await safeCopyText(text);
                        pushToast({
                          type: ok ? 'success' : 'error',
                          title: ok ? 'Credentials & links copied' : 'Copy failed',
                        });
                      }}
                      className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Credentials
                    </button>
                    <a
                      href={buildWhatsAppUrl(
                        createdCompany.phone,
                        `Welcome to *${createdCompany.name}* on Staff. Online!\n\nAdmin Panel: ${origin}/c/${createdCompany.slug}/admin\nEmail: ${createdCompany.adminEmail}\nPassword: ${createdCompany.adminPassword}\n\nStaff Portal: ${origin}/c/${createdCompany.slug}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Save to WhatsApp
                    </a>
                    <a
                      href={`/c/${createdCompany.slug}/admin`}
                      className="w-full min-h-[46px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-2"
                    >
                      Open My Company Admin Panel →
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterTrial} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Company / Studio Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Horizon Broadcast & Studio"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Place / City *
                      </label>
                      <input
                        type="text"
                        required
                        value={regPlace}
                        onChange={(e) => setRegPlace(e.target.value)}
                        placeholder="e.g. Kochi, Kerala"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98..."
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Plan Duration (After 30-Day Free Trial ₹0)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { y: 1, label: '1 Year ₹1,000' },
                          { y: 2, label: '2 Years ₹2,000' },
                          { y: 3, label: '3 Years ₹3,000' },
                        ].map((opt) => (
                          <button
                            key={opt.y}
                            type="button"
                            onClick={() => setRegYears(opt.y)}
                            className={`h-11 rounded-xl border text-xs font-bold transition-colors ${
                              regYears === opt.y
                                ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A]'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Company Admin Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="admin@yourstudio.com"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Admin Password *
                      </label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type={showRegPass ? 'text' : 'password'}
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full h-11 pl-3 pr-9 rounded-xl border border-slate-300 text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPass((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRegPassword(generatePassword(10, 'strong'));
                            setShowRegPass(true);
                          }}
                          title="Generate Strong Password"
                          className="h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#0F172A] shrink-0"
                        >
                          <Dices className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {regError && (
                    <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                      {regError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full min-h-[48px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold transition-colors"
                  >
                    {regLoading
                      ? 'Creating Company Workspace...'
                      : 'Activate 30-Day Free Trial (₹0)'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
