export type Language = 'en' | 'ml';

export type UserRole = 'super_admin' | 'company_admin' | 'staff';

export type SuperAdminTab =
  | 'companies'
  | 'selfie_logs'
  | 'staff_ledger'
  | 'customers'
  | 'passwords';

export type CompanyAdminTab =
  | 'salary'
  | 'punches'
  | 'customers'
  | 'quotation'
  | 'pnl'
  | 'expenses'
  | 'works'
  | 'subcontracts'
  | 'passwords';

export type StaffTab = 'duty' | 'salary' | 'expenses';

export type PlanStatus = 'trial' | 'annual';

export type PaymentMode = 'gpay' | 'cash' | 'bank';

export type PaymentConfirmationStatus = 'pending' | 'confirmed' | 'issue';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PasswordProfile = 'strong' | 'alphanumeric' | 'numeric';

export interface SuperAdminConfig {
  email: string;
  password: string;
  updatedAt: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  place: string;
  phone: string;
  adminEmail: string;
  adminPassword: string;
  planYears: number;
  planStatus: PlanStatus;
  planRatePerYear: number;
  planStartDate: string; // YYYY-MM-DD
  planEndDate: string; // YYYY-MM-DD
  active: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  dutyWage: number;
  phone: string;
  email: string;
  password: string;
  upiId: string;
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD (also Due Date)
  active: boolean;
  createdAt: string;
}

export interface AdvancePaymentRecord {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  date: string; // YYYY-MM-DD (എന്ന് കൊടുത്തു)
  time: string; // HH:mm (എപ്പോൾ കൊടുത്തു)
  dueDate: string; // YYYY-MM-DD (എത്ര ദിവസം വരെ / Due Date)
  mode: PaymentMode;
  kind: 'advance' | 'settlement';
  note: string;
  utr?: string;
  screenshotUrl?: string;
  confirmationStatus: PaymentConfirmationStatus;
  confirmedAt?: string;
  staffNote?: string;
  createdAt: string;
}

export type DutyStage =
  | 'punched_in'
  | 'departed'
  | 'arrived'
  | 'work_completed'
  | 'punched_out';

export interface GpsStamp {
  lat?: number;
  lng?: number;
  label?: string;
}

export interface PunchLogRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  type: 'login_selfie' | 'duty_punch';
  workTitle: string;
  date: string; // YYYY-MM-DD (When / Date)
  mode: string; // How / Mode (e.g. On-Site Duty, Studio Van, Multi-Cam)
  fromLocation: string;
  toLocation: string;
  workTime: string;
  departTime: string; // ISO timestamp (or legacy HH:mm)
  arriveTime: string; // ISO timestamp (or legacy HH:mm)
  workCompletedTime?: string; // ISO timestamp
  punchInTime: string; // ISO timestamp
  punchOutTime?: string; // ISO timestamp
  dutyStage?: DutyStage;
  totalDurationText?: string; // HH:MM
  status: 'active' | 'completed';
  dutyWage: number;
  selfieUrl: string;
  punchOutSelfieUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsLabel?: string;
  departGps?: GpsStamp;
  arriveGps?: GpsStamp;
  workCompletedGps?: GpsStamp;
  punchOutGps?: GpsStamp;
  editedAt?: string;
  createdAt: string;
}

export interface CustomerPaymentEntry {
  id: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  note: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  workDescription: string;
  workRate: number;
  received: number;
  paymentMode: PaymentMode;
  studioRules?: string;
  payments?: CustomerPaymentEntry[];
  createdAt: string;
}

export interface MultiCrewWork {
  id: string;
  title: string;
  clientVenue: string;
  fromLocation: string;
  toLocation: string;
  date: string; // YYYY-MM-DD
  time: string;
  mapsLink: string;
  assignedStaffIds: string[];
  notes?: string;
  status: 'scheduled' | 'completed';
  createdAt: string;
}

export interface SubcontractRecord {
  id: string;
  vendorName: string;
  workDescription: string;
  contractRate: number;
  paid: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  staffId: string;
  staffName: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  billPhotoUrl?: string;
  status: ApprovalStatus;
  reviewedAt?: string;
  createdAt: string;
}

export interface LiveInstruction {
  id: string;
  staffId: string;
  staffName: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface ManualLedgerEntry {
  id: string;
  type: 'income' | 'expense';
  title: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  mode: PaymentMode;
  note: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetRole: 'company_admin' | 'staff' | 'all';
  targetStaffId?: string;
  title: string;
  message: string;
  category: 'gpay' | 'advance' | 'due' | 'expense' | 'punch' | 'confirm' | 'system';
  read: boolean;
  createdAt: string;
}

export interface CompanyDatabase {
  staff: StaffMember[];
  advances: AdvancePaymentRecord[];
  customers: CustomerRecord[];
  works: MultiCrewWork[];
  subcontracts: SubcontractRecord[];
  punchLogs: PunchLogRecord[];
  expenses: ExpenseRecord[];
  instructions: LiveInstruction[];
  notifications: AppNotification[];
  ledger: ManualLedgerEntry[];
}

export const EMPTY_COMPANY_DB: CompanyDatabase = {
  staff: [],
  advances: [],
  customers: [],
  works: [],
  subcontracts: [],
  punchLogs: [],
  expenses: [],
  instructions: [],
  notifications: [],
  ledger: [],
};

export interface StaffOnlineRootState {
  superAdmin: SuperAdminConfig;
  companies: Record<string, CompanyRecord>;
  companyData: Record<string, CompanyDatabase>;
}

export interface AuthSession {
  role: UserRole;
  companyId?: string;
  staffId?: string;
  name: string;
  email: string;
  verifiedSelfieUrl?: string;
  verifiedAt?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  detail?: string;
}

export interface GPayModalPayload {
  staffId: string;
  staffName: string;
  upiId: string;
  amount: number;
  date: string;
  time: string;
  dueDate: string;
  note: string;
  screenshotUrl?: string;
}

export interface WhatsAppModalPayload {
  phone: string;
  recipientName: string;
  message: string;
}

export const STAFF_ROLES: string[] = [
  'Camera Operator',
  '4K Camera Operator',
  'LED Wall Technician',
  'Live Streaming Operator',
  'Drone Pilot',
  'Audio & Switching Engineer',
  'Video Editor',
  'Production Assistant',
  'Studio Coordinator',
  'Field Executive',
];

export const DUTY_MODES: string[] = [
  'On-Site Duty',
  'Studio Van',
  'Multi-Cam',
  'Own Camera / Gear',
  'Live Streaming',
  'LED Wall Setup',
  'Studio Shift',
  'Half-Day Duty',
  'Outstation Travel',
];
