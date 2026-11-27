export type Language = 'en' | 'ml';

export type UserRole = 'master_admin' | 'company_admin' | 'staff';

export type MasterTab = 'overview' | 'companies' | 'database' | 'settings';
export type AdminTab = 'today' | 'works' | 'pnl' | 'payroll' | 'customers' | 'staff';
export type StaffTab = 'punch' | 'salary' | 'customers' | 'requests';

export type RateMode = 'regular' | 'half' | 'own_camera' | 'live_single_cam';

export type WorkType =
  | 'LED Wall'
  | 'Live Streaming'
  | 'Live Only Work - Single Camera (₹6,000)'
  | 'Camera'
  | '4K Camera (Own Equipment — ₹3,000)'
  | 'Drone'
  | 'LED Wall + Live Streaming'
  | 'Other Works';

export type PaymentMode = 'gpay' | 'upi' | 'bank' | 'cash';
export type PaymentCategory = 'salary' | 'advance';
export type PaymentConfirmationStatus = 'pending' | 'confirmed' | 'issue';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface MasterAdminConfig {
  brandName: string;
  supportEmail: string;
  email?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  address: string;
  phone: string;
  upi: string;
  badge: string;
  adminEmail: string;
  adminPass?: string;
  active: boolean;
  createdAt: string;
}

export interface MembershipRecord {
  id: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  companyActive: boolean;
  companyAdminEmail: string;
  email: string;
  role: 'company_admin' | 'staff';
  staffId?: string;
  active: boolean;
  createdAt: string;
}

export const WORK_TYPES: WorkType[] = [
  'LED Wall',
  'Live Streaming',
  'Live Only Work - Single Camera (₹6,000)',
  'Camera',
  '4K Camera (Own Equipment — ₹3,000)',
  'Drone',
  'LED Wall + Live Streaming',
  'Other Works',
];

export const STAFF_ROLES: string[] = [
  '4K Camera Operator',
  'Camera Operator',
  'LED Wall Tech & Live Operator',
  'Live Operator & LED Wall Tech',
  'LED Wall Technician',
  'Drone Operator',
  'Audio & Switching Engineer',
  'Production Assistant',
];

export interface AuthSession {
  role: UserRole;
  userId: string;
  companyId?: string;
  name: string;
  email: string;
}

export interface StaffAccount {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  name: string;
  role: string;
  email: string;
  password?: string;
  dailyWage: number;
  upiId: string;
  phone: string;
  salaryDay: number; // 1-31
  emergencyContact: string;
  kycLast4: string;
  active: boolean;
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  punchInTime: string; // ISO string
  punchOutTime?: string; // ISO string
  status: 'working' | 'completed';
  rateMode: RateMode;
  wageEarned: number;
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
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface WorkAssignment {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  date: string; // YYYY-MM-DD
  callTime: string; // HH:mm
  workType: WorkType;
  eventTitle: string;
  venue: string;
  studioName: string;
  studioWhatsApp: string;
  assignedStaffId: string;
  assignedStaffEmail?: string;
  assignedStaffName: string;
  rateMode: RateMode;
  mapsLink: string;
  hasSubContract: boolean;
  subContractorName: string;
  subContractorWA: string;
  subContractTotal: number;
  subContractPaid: number;
  billTotal: number;
  billReceived: number;
  gpayUtr: string;
  gpayScreenshot?: string;
  notes?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  title: string;
  category: string;
  amount: number;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  mode: PaymentMode;
  category: PaymentCategory;
  upiIdUsed: string;
  utr: string;
  note: string;
  screenshotUrl?: string;
  confirmationStatus: PaymentConfirmationStatus;
  confirmedAt?: string;
  staffNote?: string;
  issueReason?: string;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  allowedStaffEmails?: string[];
  name: string;
  studioName: string;
  whatsapp: string;
  workLocations: string;
  workDetails: string;
  income: number;
  expense: number;
  received: number;
  rulesAndTerms: string;
  addedByStaffName?: string;
  addedByEmail?: string;
  createdAt: string;
}

export interface ExpenseClaim {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  date: string;
  title: string;
  amount: number;
  billPhotoUrl?: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  leaveType: 'Casual' | 'Sick' | 'Emergency';
  date: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface SiteReceipt {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  date: string;
  note: string;
  imageUrl: string;
  createdAt: string;
}

export interface LiveInstruction {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  staffId: string;
  staffEmail?: string;
  staffName: string;
  message: string;
  presetTag?: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface AdminNotification {
  id: string;
  companyId?: string;
  companyAdminEmail?: string;
  type:
    | 'punch_in'
    | 'punch_out'
    | 'login'
    | 'payment_confirmed'
    | 'payment_issue'
    | 'expense'
    | 'leave'
    | 'customer'
    | 'receipt'
    | 'attendance_edit'
    | 'instruction_ack'
    | 'system';
  title: string;
  message: string;
  timestamp: string;
  staffId?: string;
  gpsLat?: number;
  gpsLng?: number;
  imageUrl?: string;
  read: boolean;
  priority?: 'high' | 'normal';
}

export interface CompanyDatabase {
  staff: StaffAccount[];
  attendance: AttendanceRecord[];
  works: WorkAssignment[];
  ledger: LedgerEntry[];
  payments: SalaryPayment[];
  customers: CustomerRecord[];
  expenses: ExpenseClaim[];
  leaves: LeaveRequest[];
  receipts: SiteReceipt[];
  instructions: LiveInstruction[];
  notifications: AdminNotification[];
}

export const EMPTY_COMPANY_DB: CompanyDatabase = {
  staff: [],
  attendance: [],
  works: [],
  ledger: [],
  payments: [],
  customers: [],
  expenses: [],
  leaves: [],
  receipts: [],
  instructions: [],
  notifications: [],
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export interface WhatsAppModalPayload {
  phone: string;
  recipientName: string;
  message: string;
}

export interface GPayModalPayload {
  staffId: string;
  staffName: string;
  upiId: string;
  phone: string;
  suggestedAmount: number;
  defaultNote?: string;
}
