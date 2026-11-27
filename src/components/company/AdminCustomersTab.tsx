import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  IndianRupee,
  MessageCircle,
  MessageSquare,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { CustomerRecord, PaymentMode } from '../../types';
import {
  buildSmsUrl,
  buildWhatsAppUrl,
  formatDateIN,
  formatINR,
  getTodayISO,
  safeCopyText,
} from '../../utils/helpers';
import { downloadElementAsPdf, triggerDirectPrint } from '../../utils/pdfExport';
import { CustomerBalanceSlipSheet } from '../DocumentPreviews';

export const AdminCustomersTab: React.FC = () => {
  const {
    activeCompany,
    activeDb,
    addCustomer,
    collectCustomerDue,
    deleteCustomer,
    pushToast,
  } = useStaffOnline();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [workDescription, setWorkDescription] = useState('');
  const [workRate, setWorkRate] = useState('');
  const [received, setReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('gpay');
  const [studioRules, setStudioRules] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dueModalCustomer, setDueModalCustomer] = useState<CustomerRecord | null>(null);
  const [dueAmount, setDueAmount] = useState('');
  const [dueMode, setDueMode] = useState<PaymentMode>('gpay');
  const [dueNote, setDueNote] = useState('');
  const [exporting, setExporting] = useState(false);

  const slipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedCustomerId && activeDb.customers[0]) {
      setSelectedCustomerId(activeDb.customers[0].id);
    }
  }, [activeDb.customers, selectedCustomerId]);

  const selectedCustomer =
    activeDb.customers.find((c) => c.id === selectedCustomerId) || activeDb.customers[0] || null;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workDescription.trim()) {
      pushToast({ type: 'error', title: 'Customer Name and Work Description are required' });
      return;
    }
    await addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      date,
      workDescription: workDescription.trim(),
      workRate: Math.max(0, Number(workRate) || 0),
      received: Math.max(0, Number(received) || 0),
      paymentMode,
      studioRules: studioRules.trim() || undefined,
    });
    setName('');
    setPhone('');
    setWorkDescription('');
    setWorkRate('');
    setReceived('');
    setStudioRules('');
  };

  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueModalCustomer) return;
    const amt = Number(dueAmount);
    if (!amt || amt <= 0) return;
    await collectCustomerDue(dueModalCustomer.id, amt, dueMode, dueNote);
    setDueModalCustomer(null);
    setDueAmount('');
    setDueNote('');
  };

  if (!activeCompany) return null;

  const reminderMessage = selectedCustomer
    ? (() => {
        const due = Math.max(
          0,
          (Number(selectedCustomer.workRate) || 0) - (Number(selectedCustomer.received) || 0)
        );
        return [
          `നമസ്കാരം *${selectedCustomer.name}*,`,
          `${activeCompany.name} (${activeCompany.place}) അറിയിക്കുന്നത്:`,
          ``,
          `Work: ${selectedCustomer.workDescription}`,
          `Date: ${formatDateIN(selectedCustomer.date)}`,
          `Total Rate: ${formatINR(selectedCustomer.workRate)}`,
          `Received: ${formatINR(selectedCustomer.received)}`,
          `*Pending Balance Due (ബാലൻസ് തുക): ${formatINR(due)}*`,
          ``,
          `Kindly arrange the pending balance at your convenience. Contact: ${activeCompany.phone || activeCompany.adminEmail}. Thank you!`,
        ].join('\n');
      })()
    : '';

  return (
    <div className="space-y-6">
      {/* Add Customer Form */}
      <form
        onSubmit={handleAddCustomer}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4 no-print"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Add Customer &amp; Work Rate
          </h2>
          <p className="text-xs text-slate-500">
            Track work rates, received payments, pending dues, and formal balance slips.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Customer / Studio Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grace Wedding Studio"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Phone / WhatsApp
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
            >
              <option value="gpay">Google Pay</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work Description *
            </label>
            <input
              type="text"
              required
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="e.g. LED Wall 12x8 + 2 Camera Live Streaming"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work Rate (₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={workRate}
              onChange={(e) => setWorkRate(e.target.value)}
              placeholder="25000"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Received (₹)
            </label>
            <input
              type="number"
              min={0}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder="10000"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Studio Rules / Notes (Optional)
            </label>
            <input
              type="text"
              value={studioRules}
              onChange={(e) => setStudioRules(e.target.value)}
              placeholder="e.g. Balance payable within 3 days of event completion"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Customer Entry
        </button>
      </form>

      {/* Split-Screen: Customer List & Reminder (Left) + Formal Balance Slip (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="bg-white border border-slate-200/80 rounded-2xl card-elevated overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Customer Accounts ({activeDb.customers.length})
              </h3>
            </div>
            {activeDb.customers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No customers added yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
                {activeDb.customers.map((c) => {
                  const due = Math.max(0, (Number(c.workRate) || 0) - (Number(c.received) || 0));
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 space-y-2.5 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0F172A] truncate">{c.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            {c.phone || '—'} · {formatDateIN(c.date)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            due === 0
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                          }`}
                        >
                          {due === 0 ? 'Paid' : `Due ${formatINR(due)}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{c.workDescription}</p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                        <span>Rate: {formatINR(c.workRate)}</span>
                        <span className="text-emerald-700">Paid: {formatINR(c.received)}</span>
                        <span className="text-rose-700 font-bold">Due: {formatINR(due)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="h-8 px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-bold"
                        >
                          Slip
                        </button>
                        {due > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDueModalCustomer(c);
                              setDueAmount(String(due));
                            }}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <IndianRupee className="w-3 h-3" />+ Due
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteCustomer(c.id)}
                          className="h-8 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold ml-auto"
                          aria-label="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Malayalam/English Balance Reminder Box */}
          {selectedCustomer && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A]">
                Auto Balance Reminder (Malayalam / English)
              </h4>
              <pre className="whitespace-pre-wrap text-[11px] font-sans bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 leading-relaxed">
                {reminderMessage}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await safeCopyText(reminderMessage);
                    pushToast({
                      type: ok ? 'success' : 'error',
                      title: ok ? 'Reminder copied' : 'Copy failed',
                    });
                  }}
                  className="min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <a
                  href={buildWhatsAppUrl(selectedCustomer.phone, reminderMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <a
                  href={buildSmsUrl(selectedCustomer.phone, reminderMessage)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  SMS
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right: Formal Customer Balance Slip Preview */}
        <div className="lg:col-span-7 space-y-3">
          {selectedCustomer ? (
            <>
              <div className="flex flex-wrap justify-end gap-2 no-print">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    const ok = await downloadElementAsPdf(
                      slipRef.current,
                      `Balance-Slip-${selectedCustomer.name.replace(/\s+/g, '-')}.pdf`
                    );
                    setExporting(false);
                    pushToast({
                      type: ok ? 'success' : 'error',
                      title: ok ? 'Balance Slip PDF downloaded' : 'PDF export failed',
                    });
                  }}
                  className="min-h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'PDF Download'}
                </button>
                <button
                  type="button"
                  onClick={triggerDirectPrint}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
              <div className="print-only-container">
                <CustomerBalanceSlipSheet
                  company={activeCompany}
                  customer={selectedCustomer}
                  sheetRef={slipRef}
                />
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-sm text-slate-500 card-elevated">
              Add a customer entry to generate Formal Customer Balance Slips &amp; Reminders.
            </div>
          )}
        </div>
      </div>

      {/* Collect +Due Payment Modal */}
      {dueModalCustomer && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={() => setDueModalCustomer(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Collect Due Payment — {dueModalCustomer.name}
              </h3>
              <button
                type="button"
                onClick={() => setDueModalCustomer(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCollectDue} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount Collected (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mode</label>
                <select
                  value={dueMode}
                  onChange={(e) => setDueMode(e.target.value as PaymentMode)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
                >
                  <option value="gpay">Google Pay</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note</label>
                <input
                  type="text"
                  value={dueNote}
                  onChange={(e) => setDueNote(e.target.value)}
                  placeholder="e.g. Final settlement via GPay"
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDueModalCustomer(null)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
