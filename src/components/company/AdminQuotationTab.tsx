import React, { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { formatINR, getTodayISO } from '../../utils/helpers';
import { downloadElementAsPdf, triggerDirectPrint } from '../../utils/pdfExport';
import { QuotationInvoiceSheet } from '../DocumentPreviews';

export const AdminQuotationTab: React.FC = () => {
  const { activeCompany, activeDb, pushToast } = useStaffOnline();

  const [docType, setDocType] = useState<'QUOTATION' | 'TAX / SERVICE INVOICE'>('QUOTATION');
  const [docDate, setDocDate] = useState(() => getTodayISO());
  const [docNumber, setDocNumber] = useState(() => `QT-${Date.now().toString().slice(-5)}`);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('0');
  const [receivedAmount, setReceivedAmount] = useState('0');
  const [exporting, setExporting] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);

  if (!activeCompany) return null;

  const totalNum = Math.max(0, Number(totalAmount) || 0);
  const receivedNum = Math.max(0, Number(receivedAmount) || 0);
  const balanceNum = Math.max(0, totalNum - receivedNum);

  const handleCustomerPreset = (customerId: string) => {
    const cust = activeDb.customers.find((c) => c.id === customerId);
    if (!cust) return;
    setClientName(cust.name);
    setClientPhone(cust.phone);
    setScopeDescription(cust.workDescription);
    setTotalAmount(String(cust.workRate));
    setReceivedAmount(String(cust.received));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Controls */}
      <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4 no-print">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Quotation &amp; Invoice Studio
          </h2>
          <p className="text-xs text-slate-500">
            Auto-fill from an existing customer or craft a bespoke A4 Quotation / Invoice PDF.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {(['QUOTATION', 'TAX / SERVICE INVOICE'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setDocType(type);
                setDocNumber(
                  `${type === 'QUOTATION' ? 'QT' : 'INV'}-${Date.now().toString().slice(-5)}`
                );
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                docType === type
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {activeDb.customers.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Auto-Fill from Registered Customer
            </label>
            <select
              defaultValue=""
              onChange={(e) => handleCustomerPreset(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="">-- Select customer preset --</option>
              {activeDb.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatINR(c.workRate)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Document #</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client / Studio Name"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Client Phone</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Scope / Items Description (One line per deliverable)
          </label>
          <textarea
            rows={4}
            value={scopeDescription}
            onChange={(e) => setScopeDescription(e.target.value)}
            placeholder={'LED Wall 12x8 Setup\nMulti-Camera Live Streaming (YouTube)\nCrew & Generator Support'}
            className="w-full p-3 rounded-xl border border-slate-300 text-xs leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Total (₹)</label>
            <input
              type="number"
              min={0}
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Received (₹)</label>
            <input
              type="number"
              min={0}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Auto Balance</label>
            <div className="h-10 px-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center text-xs font-mono font-extrabold text-[#1E3A8A] tabular-nums">
              {formatINR(balanceNum)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              const ok = await downloadElementAsPdf(
                sheetRef.current,
                `${docNumber}-${(clientName || 'Client').replace(/\s+/g, '-')}.pdf`
              );
              setExporting(false);
              pushToast({
                type: ok ? 'success' : 'error',
                title: ok ? `${docType} PDF downloaded` : 'PDF export failed',
              });
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating...' : 'PDF Download'}
          </button>
          <button
            type="button"
            onClick={triggerDirectPrint}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Right Live A4 Preview */}
      <div className="lg:col-span-7 print-only-container">
        <QuotationInvoiceSheet
          company={activeCompany}
          docType={docType}
          docNumber={docNumber}
          docDate={docDate}
          clientName={clientName}
          clientPhone={clientPhone}
          scopeDescription={scopeDescription}
          totalAmount={totalNum}
          receivedAmount={receivedNum}
          sheetRef={sheetRef}
        />
      </div>
    </div>
  );
};
