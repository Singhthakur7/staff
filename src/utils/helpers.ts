import { RateMode, StaffAccount } from '../types';

export const SESSION_STORAGE_KEY = 'saas_erp_auth_session_v1';
export const LANG_STORAGE_KEY = 'saas_erp_lang_v1';

export function safeSessionGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSessionSet(key: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}

export async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  } catch {
    return false;
  }
  return false;
}

export interface GeoCoords {
  lat: number;
  lng: number;
  label: string;
  isFallback: boolean;
}

export const KOTTAYAM_FALLBACK: GeoCoords = {
  lat: 9.5595,
  lng: 76.7874,
  label: 'Kottayam, Kerala (Fallback)',
  isFallback: true,
};

export function getSafeLocation(): Promise<GeoCoords> {
  return new Promise((resolve) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(KOTTAYAM_FALLBACK);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          resolve({
            lat,
            lng,
            label: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
            isFallback: false,
          });
        },
        () => resolve(KOTTAYAM_FALLBACK),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } catch {
      resolve(KOTTAYAM_FALLBACK);
    }
  });
}

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNeg = safe < 0;
  const formatted = Math.abs(Math.round(safe)).toLocaleString('en-IN');
  return `${isNeg ? '-' : ''}₹${formatted}`;
}

export function numberToIndianWords(num: number): string {
  const n = Math.abs(Math.round(num));
  if (n === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (x: number): string => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return `${tens[t]}${o ? ' ' + ones[o] : ''}`;
  };

  const threeDigits = (x: number): string => {
    const h = Math.floor(x / 100);
    const rem = x % 100;
    if (h && rem) return `${ones[h]} Hundred and ${twoDigits(rem)}`;
    if (h) return `${ones[h]} Hundred`;
    return twoDigits(rem);
  };

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  const prefix = num < 0 ? 'Minus ' : '';
  return `${prefix}Rupees ${parts.join(' ')} Only`;
}

export function calculateShiftWage(baseRate: number, rateMode: RateMode): number {
  switch (rateMode) {
    case 'half':
      return Math.round(baseRate * 0.5);
    case 'own_camera':
      return 3000;
    case 'live_single_cam':
      return 6000;
    case 'regular':
    default:
      return baseRate;
  }
}

export function getRateModeLabel(rateMode: RateMode): string {
  switch (rateMode) {
    case 'regular':
      return 'Regular Full Day';
    case 'half':
      return 'Half Day (50%)';
    case 'own_camera':
      return 'Own Camera (₹3,000)';
    case 'live_single_cam':
      return 'Live Single Cam (₹6,000)';
  }
}

export function formatDurationHHMMSS(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthYM(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function formatDateTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function buildUpiUrl(params: {
  upiId: string;
  name: string;
  amount: number;
  note: string;
}): string {
  const q = new URLSearchParams({
    pa: params.upiId.trim(),
    pn: params.name.trim(),
    am: String(Math.max(1, Math.round(params.amount))),
    cu: 'INR',
    tn: params.note.slice(0, 60),
  });
  return `upi://pay?${q.toString()}`;
}

export function buildGpayDeepLink(params: {
  upiId: string;
  name: string;
  amount: number;
  note: string;
}): string {
  const q = new URLSearchParams({
    pa: params.upiId.trim(),
    pn: params.name.trim(),
    am: String(Math.max(1, Math.round(params.amount))),
    cu: 'INR',
    tn: params.note.slice(0, 60),
  });
  return `tez://upi/pay?${q.toString()}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function slugifyCompany(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'company'
  );
}

export function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CO';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function generateStaffCredentials(
  name: string,
  companySlug = 'company',
  randomize = false
): {
  email: string;
  password: string;
  upiId: string;
} {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 14) || 'staff';
  const domain = `${companySlug.replace(/[^a-z0-9]/g, '').slice(0, 18) || 'company'}.in`;
  if (!randomize) {
    return {
      email: `${slug}@${domain}`,
      password: `${slug}@2026`,
      upiId: `${slug}@okicici`,
    };
  }
  const suffix = Math.floor(100 + Math.random() * 900);
  const banks = ['okicici', 'okaxis', 'oksbi', 'okhdfc'];
  const bank = banks[Math.floor(Math.random() * banks.length)];
  return {
    email: `${slug}${suffix}@${domain}`,
    password: `${slug}@${suffix}`,
    upiId: `${slug}${suffix}@${bank}`,
  };
}

export function isSalaryDueWithin2Days(staff: StaffAccount): {
  isDue: boolean;
  daysUntil: number;
} {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(Math.max(1, staff.salaryDay), daysInMonth);

  let diff = targetDay - currentDay;
  if (diff < 0) {
    diff = daysInMonth - currentDay + targetDay;
  }
  return {
    isDue: diff >= 0 && diff <= 2,
    daysUntil: diff,
  };
}

export function getAppOrigin(): string {
  try {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
  } catch {
    // Fallback
  }
  return '';
}

export function buildSlipShareUrl(
  companyId: string,
  staffId: string,
  fromMonth: string,
  toMonth: string
): string {
  const origin = getAppOrigin();
  return `${origin}/#slip=company=${encodeURIComponent(companyId)}&staff=${encodeURIComponent(
    staffId
  )}&from=${encodeURIComponent(fromMonth)}&to=${encodeURIComponent(toMonth)}`;
}

/**
 * Compress any HTMLCanvasElement to a lightweight Base64 JPEG strictly under 80KB for Firebase RTDB.
 */
export function compressCanvasUnder80KB(canvas: HTMLCanvasElement, maxBytes = 76000): string {
  let quality = 0.72;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > maxBytes && quality > 0.22) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > maxBytes) {
    // Downscale by 65% once more if still large
    const small = document.createElement('canvas');
    small.width = Math.max(160, Math.round(canvas.width * 0.65));
    small.height = Math.max(120, Math.round(canvas.height * 0.65));
    const ctx = small.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, small.width, small.height);
      dataUrl = small.toDataURL('image/jpeg', 0.55);
    }
  }
  return dataUrl;
}

/**
 * Compress any uploaded image File to a lightweight Base64 JPEG (<80KB) suitable for Firebase RTDB.
 */
export function fileToCompressedDataUrl(file: File, maxDim = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(compressCanvasUnder80KB(canvas));
        } catch {
          resolve(String(reader.result));
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
