import { Language } from './types';

type Dict = Record<string, string>;

const EN: Dict = {
  brand: 'Staff. Online',
  trialBadge: '30-Day Free Trial (₹0)',
  annualOffer: '1-Month Free Trial • ₹1,000 / Year After Trial',
  registerTrialCta: 'Start 30-Day Free Trial (₹0)',
  offerGenTitle: 'Offer Advertisement Post Generator',
  staffSelfieLoginTitle: 'Staff Live Selfie Login',
  staffSelfieSubtitle: 'Mandatory live front-camera selfie verification for duty attendance',
  logout: 'Sign Out',
  notifications: 'Notifications',
  clearAll: 'Clear All',
  markAllRead: 'Mark Read',
  noNotifications: 'No live alerts yet.',
  // Super Admin Tabs
  superCompanies: 'Company & Plan Details',
  superSelfieLogs: 'Live Selfie Verification',
  superStaffLedger: 'Staff & Salary Ledger',
  superCustomers: 'Customer Full Details',
  superPasswords: 'Password Generator',
  // Company Admin Tabs
  adminSalary: 'Salary & Advance Slip',
  adminPunches: 'Live Selfie & Punch Logs',
  adminCustomers: 'Customers & Balance Slips',
  adminQuotation: 'Quotation & Invoice PDF',
  adminPnl: 'W/M/Y P&L Slip',
  adminExpenses: 'Staff Expenses Approval',
  adminWorks: 'Multi-Crew Works',
  adminSubcontracts: 'Subcontracts',
  adminPasswords: 'Password Generator',
  // Staff Tabs
  staffDuty: 'Duty, Route & Punch',
  staffSalary: 'My Formal Salary Slip',
  staffExpenses: 'Submit Expenses',
  // Common KPIs
  received: 'Received',
  pendingDue: 'Pending Due',
  staffBalance: 'Staff Balance',
  selfiePunches: 'Selfie Punches',
  earnedWages: 'Earned Duty Wages',
  advancesPaid: 'Advances / Paid',
  netBalance: 'Net Balance Payable',
  pdfDownload: 'PDF Download',
  directPrint: 'Direct Print',
  more: 'More',
};

const ML: Dict = {
  brand: 'Staff. Online',
  trialBadge: '30 ദിവസത്തെ സൗജന്യ ട്രയൽ പീരീഡ് (₹0)',
  annualOffer: '1-മാസം സൗജന്യ ട്രയൽ • ₹1,000 / വർഷം',
  registerTrialCta: '30-ദിവസ സൗജന്യ ട്രയൽ രജിസ്റ്റർ ചെയ്യുക (₹0)',
  offerGenTitle: 'ഓഫർ പരസ്യ പോസ്റ്റ് ജനറേറ്റർ',
  staffSelfieLoginTitle: 'സ്റ്റാഫ് ലൈവ് സെൽഫി ലോഗിൻ',
  staffSelfieSubtitle: 'ഫ്രണ്ട് ക്യാമറ ലൈവ് സെൽഫി പരിശോധന നിർബന്ധമാണ്',
  logout: 'ലോഗ് ഔട്ട്',
  notifications: 'അറിയിപ്പുകൾ',
  clearAll: 'എല്ലാം മായ്ക്കുക',
  markAllRead: 'വായിച്ചതായി അടയാളപ്പെടുത്തുക',
  noNotifications: 'പുതിയ അറിയിപ്പുകൾ ഒന്നുമില്ല.',
  // Super Admin Tabs
  superCompanies: 'കമ്പനി & പ്ലാൻ വിവരങ്ങൾ',
  superSelfieLogs: 'ലൈവ് സെൽഫി വെരിഫിക്കേഷൻ',
  superStaffLedger: 'സ്റ്റാഫ് & സാലറി ലെഡ്ജർ',
  superCustomers: 'കസ്റ്റമർ ഫുൾ ഡീറ്റെയിൽസ്',
  superPasswords: 'പാസ്സ്വേർഡ് ജനറേറ്റർ',
  // Company Admin Tabs
  adminSalary: 'സാലറി & അഡ്വാൻസ് സ്ലിപ്പ്',
  adminPunches: 'ലൈവ് സെൽഫി & പഞ്ച് ലോഗ്',
  adminCustomers: 'കസ്റ്റമേഴ്സ് & ബാലൻസ് സ്ലിപ്പ്',
  adminQuotation: 'കൊട്ടേഷൻ & ഇൻവോയ്സ് PDF',
  adminPnl: 'W/M/Y P&L സ്ലിപ്പ്',
  adminExpenses: 'എക്സ്പെൻസ് അപ്രൂവൽ',
  adminWorks: 'മൾട്ടി-ക്രൂ വർക്കുകൾ',
  adminSubcontracts: 'സബ്കോൺട്രാക്ട്',
  adminPasswords: 'പാസ്സ്വേർഡ് ജനറേറ്റർ',
  // Staff Tabs
  staffDuty: 'ഡ്യൂട്ടി, റൂട്ട് & പഞ്ച്',
  staffSalary: 'എന്റെ സാലറി സ്ലിപ്പ്',
  staffExpenses: 'എക്സ്പെൻസ് സമർപ്പിക്കുക',
  // Common KPIs
  received: 'ലഭിച്ച തുക',
  pendingDue: 'കുടിശ്ശിക',
  staffBalance: 'സ്റ്റാഫ് ബാലൻസ്',
  selfiePunches: 'സെൽഫി പഞ്ച്',
  earnedWages: 'ഡ്യൂട്ടി വേതനം',
  advancesPaid: 'അഡ്വാൻസ് / Paid',
  netBalance: 'ബാലൻസ് ലഭിക്കാൻ',
  pdfDownload: 'PDF ഡൗൺലോഡ്',
  directPrint: 'ഡയറക്ട് പ്രിന്റ്',
  more: 'കൂടുതൽ',
};

export function t(lang: Language, key: string): string {
  const dict = lang === 'ml' ? ML : EN;
  return dict[key] || EN[key] || key;
}
