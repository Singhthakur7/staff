import React, { useState } from 'react';
import { Database, Save, ShieldCheck } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import {
  BOOTSTRAPPED_MASTER_EMAIL,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
} from '../../firebase';
import { RtdbStatusBadge } from '../FirebaseSetupBanner';

export const MasterSettingsTab: React.FC = () => {
  const { masterConfig, session, updateMasterConfig, companies, pushToast } = useErp();

  const [brandName, setBrandName] = useState(masterConfig.brandName);
  const [supportEmail, setSupportEmail] = useState(
    masterConfig.supportEmail || session?.email || BOOTSTRAPPED_MASTER_EMAIL
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !supportEmail.trim()) {
      pushToast({ type: 'error', title: 'Platform Brand Name and Support Email are required' });
      return;
    }
    setSaving(true);
    await updateMasterConfig({
      brandName: brandName.trim(),
      supportEmail: supportEmail.trim().toLowerCase(),
    });
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSave}
        className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              Platform Branding &amp; Master Support Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Saved directly to Cloud Firestore at{' '}
              <span className="font-mono">/system/master_config</span>.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Platform Brand Name
          </label>
          <input
            type="text"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Master Support Email
          </label>
          <input
            type="email"
            required
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
          />
        </div>

        <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-[#0B1120]">Active Google Sign-In Identity</p>
          <p className="font-mono">{session?.email || BOOTSTRAPPED_MASTER_EMAIL}</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[46px] px-5 rounded-xl bg-[#0B1120] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4 text-[#FBBF24]" />
          {saving ? 'Saving to Firestore...' : 'Save Master Settings'}
        </button>
      </form>

      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0B1120]">Cloud Firestore Schema Health</h3>
          </div>
          <RtdbStatusBadge />
        </div>

        <div className="bg-[#0B1120] text-slate-200 rounded-xl p-4 font-mono text-xs space-y-1.5 overflow-x-auto">
          <p className="text-[#FBBF24] font-bold">
            Project: {FIREBASE_PROJECT_ID}
          </p>
          {FIRESTORE_DATABASE_ID && (
            <p className="text-[11px] text-slate-400 break-all">
              DB: {FIRESTORE_DATABASE_ID}
            </p>
          )}
          <p className="pt-1">/system/master_config</p>
          <p>/memberships/{'{membershipId}'}</p>
          <p>/companies/{'{companyId}'} ({companies.length} provisioned)</p>
          <p>/companies/{'{id}'}/members · staff · attendance</p>
          <p>/companies/{'{id}'}/works · ledger · payments</p>
          <p>/companies/{'{id}'}/customers · expenses · leaves</p>
          <p>/companies/{'{id}'}/receipts · instructions · notifications</p>
        </div>

        <div className="text-xs text-slate-600 space-y-1">
          <p>
            <strong>Staff Portal:</strong> <span className="font-mono">/</span> or{' '}
            <span className="font-mono">/c/:slug</span>
          </p>
          <p>
            <strong>Company Admin Panel:</strong> <span className="font-mono">/company-admin</span>{' '}
            or <span className="font-mono">/c/:slug/admin</span>
          </p>
          <p>
            <strong>Master Control Center:</strong> <span className="font-mono">/master-admin</span>
          </p>
        </div>
      </div>
    </div>
  );
};
