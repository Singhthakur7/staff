import {
  CompanyDatabase,
  DutyStage,
  GpsStamp,
  PasswordProfile,
  PunchLogRecord,
  StaffMember,
} from '../types';

export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function formatINR(value: number): string {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentMonthISO(): string {
  return getTodayISO().slice(0, 7);
}

export function getCurrentTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const base = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addYearsISO(isoDate: string, years: number): string {
  const base = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  base.setFullYear(base.getFullYear() + years);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateIN(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    const parsed = isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function formatTimeIN(isoOrHHMM?: string): string {
  if (!isoOrHHMM) return '—';
  if (/^\d{2}:\d{2}$/.test(isoOrHHMM)) {
    const [hStr, mStr] = isoOrHHMM.split(':');
    const h = Number(hStr);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${mStr} ${suffix}`;
  }
  try {
    const d = new Date(isoOrHHMM);
    if (Number.isNaN(d.getTime())) return isoOrHHMM;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoOrHHMM;
  }
}

export function formatTimeWithSecondsIN(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return formatTimeIN(iso);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return formatTimeIN(iso);
  }
}

export function formatDateTimeIN(iso?: string): string {
  if (!iso) return '—';
  return `${formatDateIN(iso)}, ${formatTimeIN(iso)}`;
}

export function formatShiftDuration(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '—';
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return '00:00';
  const totalMins = Math.floor((endMs - startMs) / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatElapsedTimer(startIso?: string, nowMs = Date.now()): string {
  if (!startIso) return '00:00:00';
  const startMs = new Date(startIso).getTime();
  if (!Number.isFinite(startMs) || nowMs < startMs) return '00:00:00';
  const totalSecs = Math.floor((nowMs - startMs) / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface DutyStageMeta {
  stage: DutyStage;
  label: string;
  labelMl: string;
  badgeClass: string;
}

export function getDutyStageInfo(log: PunchLogRecord): DutyStageMeta {
  if (log.type === 'login_selfie') {
    return {
      stage: 'punched_out',
      label: 'Selfie Verified',
      labelMl: 'സെൽഫി വെരിഫൈഡ്',
      badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    };
  }
  if (log.status === 'completed' || log.punchOutTime || log.dutyStage === 'punched_out') {
    return {
      stage: 'punched_out',
      label: log.workCompleted ? 'Work Completed & Punched Out' : 'Punched Out',
      labelMl: 'വർക്ക് പൂർത്തിയായി • പഞ്ച്-ഔട്ട്',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    };
  }
  if (log.workCompletedTime || log.workCompleted || log.dutyStage === 'work_completed') {
    return {
      stage: 'work_completed',
      label: 'Work Completed',
      labelMl: 'വർക്ക് പൂർത്തിയായി',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    };
  }
  if (log.arriveTime || log.dutyStage === 'arrived') {
    return {
      stage: 'arrived',
      label: 'Site Arrival Logged',
      labelMl: 'സൈറ്റിൽ എത്തി',
      badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    };
  }
  if (log.departTime || log.dutyStage === 'departed') {
    return {
      stage: 'departed',
      label: 'Office Departure Logged',
      labelMl: 'ഓഫീസിൽ നിന്ന് പുറപ്പെട്ടു',
      badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25',
    };
  }
  return {
    stage: 'punched_in',
    label: 'Punched In',
    labelMl: 'പഞ്ച്-ഇൻ ചെയ്തു',
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
  };
}

export function captureBrowserGps(timeoutMs = 4500): Promise<GpsStamp> {
  return new Promise((resolve) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve({ label: 'GPS unavailable' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          resolve({ lat, lng, label: `${lat}, ${lng}` });
        },
        () => resolve({ label: 'Location permission not granted' }),
        { enableHighAccuracy: true, timeout: timeoutMs }
      );
    } catch {
      resolve({ label: 'GPS unavailable' });
    }
  });
}

export function slugifyCompany(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 36) || 'company'
  );
}

export function generateStaffEmail(staffName: string, companySlug: string): string {
  const cleanName =
    staffName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 18) || 'staff';
  const cleanDomain = (companySlug || 'studio').replace(/[^a-z0-9]/g, '').slice(0, 18) || 'studio';
  return `${cleanName}@${cleanDomain}.staff.online`;
}

export function generatePassword(
  length = 10,
  profile: PasswordProfile = 'strong'
): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  let charset = upper + lower + digits + symbols;
  if (profile === 'alphanumeric') charset = upper + lower + digits;
  if (profile === 'numeric') charset = '0123456789';

  const result: string[] = [];
  if (profile === 'strong') {
    result.push(
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    );
  }
  while (result.length < length) {
    result.push(charset[Math.floor(Math.random() * charset.length)]);
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

export function amountToIndianWords(amount: number): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
  };

  const threeDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 100) return twoDigits(n);
    const h = Math.floor(n / 100);
    const rem = n % 100;
    return `${ones[h]} Hundred${rem ? ` and ${twoDigits(rem)}` : ''}`;
  };

  let remaining = num;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10000000);
  if (crore > 0) {
    parts.push(`${threeDigits(crore)} Crore`);
    remaining %= 10000000;
  }
  const lakh = Math.floor(remaining / 100000);
  if (lakh > 0) {
    parts.push(`${twoDigits(lakh)} Lakh`);
    remaining %= 100000;
  }
  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    parts.push(`${twoDigits(thousand)} Thousand`);
    remaining %= 1000;
  }
  if (remaining > 0) {
    parts.push(threeDigits(remaining));
  }

  return `${amount < 0 ? 'Minus ' : ''}${parts.join(' ')} Rupees Only`;
}

export interface DueBadgeInfo {
  status: 'settled' | 'due_today' | 'overdue' | 'upcoming';
  label: string;
  labelMl: string;
  className: string;
}

export function getDueBadgeInfo(balancePayable: number, dueDate?: string): DueBadgeInfo {
  if (balancePayable <= 0) {
    return {
      status: 'settled',
      label: 'Settled',
      labelMl: 'തീർപ്പാക്കി',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    };
  }
  const today = getTodayISO();
  if (!dueDate) {
    return {
      status: 'upcoming',
      label: 'Upcoming',
      labelMl: 'വരാനിരിക്കുന്നു',
      className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    };
  }
  if (dueDate === today) {
    return {
      status: 'due_today',
      label: 'Due Today',
      labelMl: 'ഇന്ന് നൽകണം',
      className: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25',
    };
  }
  if (dueDate < today) {
    return {
      status: 'overdue',
      label: 'Overdue',
      labelMl: 'കാലാവധി കഴിഞ്ഞു',
      className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    };
  }
  return {
    status: 'upcoming',
    label: 'Upcoming',
    labelMl: 'വരാനിരിക്കുന്നു',
    className: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
  };
}

export interface StaffPayrollSummary {
  earnedDutyWages: number;
  approvedExpenses: number;
  grossPayable: number;
  advancesTaken: number;
  settledPaid: number;
  totalDeducted: number;
  netBalancePayable: number;
  workingDaysCount: number;
  dutyPunches: CompanyDatabase['punchLogs'];
  payments: CompanyDatabase['advances'];
  expenses: CompanyDatabase['expenses'];
  pendingConfirmationCount: number;
  dueBadge: DueBadgeInfo;
}

export function calculateStaffSummary(
  staff: StaffMember,
  db: CompanyDatabase,
  fromMonth?: string,
  toMonth?: string
): StaffPayrollSummary {
  const inMonthRange = (isoDate: string): boolean => {
    if (!isoDate) return true;
    const ym = isoDate.slice(0, 7);
    if (fromMonth && ym < fromMonth) return false;
    if (toMonth && ym > toMonth) return false;
    return true;
  };

  const dutyPunches = db.punchLogs.filter(
    (p) =>
      p.staffId === staff.id &&
      p.type === 'duty_punch' &&
      p.status === 'completed' &&
      inMonthRange(p.date)
  );
  const expenses = db.expenses.filter(
    (e) => e.staffId === staff.id && inMonthRange(e.date)
  );
  const payments = db.advances.filter(
    (a) => a.staffId === staff.id && inMonthRange(a.date)
  );

  const earnedDutyWages = dutyPunches.reduce((sum, p) => sum + (Number(p.dutyWage) || 0), 0);
  const approvedExpenses = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grossPayable = earnedDutyWages + approvedExpenses;

  const advancesTaken = payments
    .filter((p) => p.kind === 'advance')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const settledPaid = payments
    .filter((p) => p.kind === 'settlement')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalDeducted = advancesTaken + settledPaid;
  const netBalancePayable = grossPayable - totalDeducted;

  const uniqueDates = new Set(dutyPunches.map((p) => p.date));
  const pendingConfirmationCount = payments.filter(
    (p) => p.confirmationStatus === 'pending'
  ).length;

  return {
    earnedDutyWages,
    approvedExpenses,
    grossPayable,
    advancesTaken,
    settledPaid,
    totalDeducted,
    netBalancePayable,
    workingDaysCount: uniqueDates.size,
    dutyPunches,
    payments,
    expenses,
    pendingConfirmationCount,
    dueBadge: getDueBadgeInfo(netBalancePayable, staff.periodTo),
  };
}

export function buildGPayDeepLinks(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): { upiUrl: string; gpayUrl: string } {
  const qs = new URLSearchParams({
    pa: params.upiId.trim(),
    pn: params.payeeName.trim(),
    am: String(Math.max(1, Math.round(params.amount))),
    cu: 'INR',
    tn: params.note.slice(0, 60),
  }).toString();
  return {
    upiUrl: `upi://pay?${qs}`,
    gpayUrl: `tez://upi/pay?${qs}`,
  };
}

export function sanitizePhoneForLink(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const clean = sanitizePhoneForLink(phone);
  const encoded = encodeURIComponent(text);
  return clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function buildSmsUrl(phone: string, text: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(text);
  return `sms:${clean}?body=${encoded}`;
}

export async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function captureMirroredVideoFrame(
  video: HTMLVideoElement,
  maxWidth = 480
): string | null {
  try {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror horizontally for natural front-camera selfie
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    let quality = 0.72;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 90000 && quality > 0.3) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return dataUrl;
  } catch {
    return null;
  }
}

export function compressImageFileToBase64(
  file: File,
  maxWidth = 720
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file'));
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          let quality = 0.72;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > 90000 && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

export function isMobileViewport(): boolean {
  try {
    return window.innerWidth < 1024;
  } catch {
    return false;
  }
}
