import React, { useEffect, useState } from 'react';
import {
  Building2,
  Eye,
  KeyRound,
  ReceiptIndianRupee,
  Users,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { t } from '../../i18n';
import { EMPTY_COMPANY_DB, SuperAdminTab } from '../../types';
import { formatDateIN } from '../../utils/helpers';
import { ShellFrame, ShellNavItem } from '../ShellFrame';
import { SuperCompaniesTab } from './SuperCompaniesTab';
import { SuperCustomersTab } from './SuperCustomersTab';
import { SuperPasswordsTab } from './SuperPasswordsTab';
import { SuperStaffLedgerTab } from './SuperStaffLedgerTab';

export const SuperAdminPortal: React.FC = () => {
  const {
    lang,
    companies,
    companyDataMap,
    setInspectingCompanyId,
  } = useStaffOnline();

  const [activeTab, setActiveTab] = useState<SuperAdminTab>('companies');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  useEffect(() => {
    if (!selectedCompanyId && companies[0]) {
      setSelectedCompanyId(companies[0].id);
    } else if (selectedCompanyId && !companies.some((c) => c.id === selectedCompanyId)) {
      setSelectedCompanyId(companies[0]?.id || '');
    }
  }, [companies, selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;
  const selectedDb = selectedCompany
    ? companyDataMap[selectedCompany.id] || EMPTY_COMPANY_DB
    : EMPTY_COMPANY_DB;

  const navItems: ShellNavItem[] = [
    {
      id: 'companies',
      label: t(lang, 'superCompanies'),
      shortLabel: 'Companies',
      icon: Building2,
    },
    {
      id: 'staff_ledger',
      label: t(lang, 'superStaffLedger'),
      shortLabel: 'Staff',
      icon: ReceiptIndianRupee,
    },
    {
      id: 'customers',
      label: t(lang, 'superCustomers'),
      shortLabel: 'Customers',
      icon: Users,
    },
    {
      id: 'passwords',
      label: t(lang, 'superPasswords'),
      shortLabel: 'Passwords',
      icon: KeyRound,
    },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab);

  return (
    <ShellFrame
      roleLabel="Super Admin Console"
      companySubtitle={`${companies.length} Companies`}
      pageTitle={activeNav?.label || 'Super Admin'}
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as SuperAdminTab)}
      showNotifications={false}
    >
      <div className="space-y-6">
        {/* Global Top Company Selector Bar + Live Summary Card */}
        <div className="bg-[#0B1120] text-white rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
            <div className="sm:w-72 shrink-0">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Active Company Context
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold"
              >
                {companies.length === 0 ? (
                  <option value="">No Companies Registered</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.place})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedCompany && (
              <div className="min-w-0 text-xs space-y-0.5 sm:border-l sm:border-white/10 sm:pl-4">
                <p className="font-bold text-white truncate">
                  {selectedCompany.name}{' '}
                  <span className="font-normal text-slate-400">· {selectedCompany.place}</span>
                </p>
                <p className="text-slate-300 font-mono text-[11px] truncate">
                  {selectedCompany.phone || '—'} ·{' '}
                  {selectedCompany.planStatus === 'trial'
                    ? '30-Day Free Trial (₹0)'
                    : `Annual ₹1,000/Yr (${selectedCompany.planYears} Yr)`}{' '}
                  · {formatDateIN(selectedCompany.planStartDate)} →{' '}
                  {formatDateIN(selectedCompany.planEndDate)}
                </p>
              </div>
            )}
          </div>

          {selectedCompany && (
            <button
              type="button"
              onClick={() => setInspectingCompanyId(selectedCompany.id)}
              className="min-h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              Open Company Admin View
            </button>
          )}
        </div>

        {activeTab === 'companies' && (
          <SuperCompaniesTab
            selectedCompany={selectedCompany}
            onSelectCompanyId={setSelectedCompanyId}
          />
        )}
        {activeTab === 'staff_ledger' && (
          <SuperStaffLedgerTab company={selectedCompany} db={selectedDb} />
        )}
        {activeTab === 'customers' && (
          <SuperCustomersTab company={selectedCompany} db={selectedDb} />
        )}
        {activeTab === 'passwords' && (
          <SuperPasswordsTab defaultCompanyId={selectedCompany?.id} />
        )}
      </div>
    </ShellFrame>
  );
};
