import React, { useState } from 'react';
import { Edit3, MessageCircle, Plus, Search, UserCheck } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { CustomerRecord } from '../../types';
import { formatINR } from '../../utils/helpers';

export const AdminCustomersTab: React.FC = () => {
  const { state, activeCompany, addCustomer, updateCustomer, openWhatsAppModal, pushToast } =
    useErp();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [workLocations, setWorkLocations] = useState('');
  const [workDetails, setWorkDetails] = useState('');
  const [income, setIncome] = useState('0');
  const [expense, setExpense] = useState('0');
  const [received, setReceived] = useState('0');
  const [rulesAndTerms, setRulesAndTerms] = useState('');

  const autoPending = Math.max(0, (Number(income) || 0) - (Number(received) || 0));
  const autoNet = (Number(income) || 0) - (Number(expense) || 0);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStudioName('');
    setWhatsapp('');
    setWorkLocations('');
    setWorkDetails('');
    setIncome('0');
    setExpense('0');
    setReceived('0');
    setRulesAndTerms('');
  };

  const handleLoadEdit = (c: CustomerRecord) => {
    setEditingId(c.id);
    setName(c.name);
    setStudioName(c.studioName);
    setWhatsapp(c.whatsapp);
    setWorkLocations(c.workLocations);
    setWorkDetails(c.workDetails);
    setIncome(String(c.income));
    setExpense(String(c.expense));
    setReceived(String(c.received));
    setRulesAndTerms(c.rulesAndTerms);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim() || !name.trim()) {
      pushToast({ type: 'error', title: 'Enter Contact Name and Studio Name' });
      return;
    }
    const payload = {
      name: name.trim(),
      studioName: studioName.trim(),
      whatsapp: whatsapp.trim(),
      workLocations: workLocations.trim(),
      workDetails: workDetails.trim(),
      income: Number(income) || 0,
      expense: Number(expense) || 0,
      received: Number(received) || 0,
      rulesAndTerms: rulesAndTerms.trim(),
    };
    if (editingId) {
      updateCustomer(editingId, payload);
    } else {
      addCustomer(payload);
    }
    resetForm();
  };

  const filtered = state.customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.studioName.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.workLocations.toLowerCase().includes(q) ||
      c.workDetails.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Add / Edit Customer & Studio CRM Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              {editingId ? 'Edit Customer / Studio Profile' : 'Add Customer / Partner Studio'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track billing totals, studio terms, crew dress codes, and WhatsApp contacts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {editingId ? 'Update Studio' : 'Save Studio'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Saju Mathew"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Studio Name</label>
            <input
              type="text"
              required
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="e.g. Royal Frames Studio"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="919447..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work Locations
            </label>
            <input
              type="text"
              value={workLocations}
              onChange={(e) => setWorkLocations(e.target.value)}
              placeholder="Kanjirappally, Pala..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Work Details</label>
            <input
              type="text"
              value={workDetails}
              onChange={(e) => setWorkDetails(e.target.value)}
              placeholder="4K Live, Outdoor LED Wall, Drone Coverage"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Studio Rules &amp; Terms (Visible to Crew)
            </label>
            <input
              type="text"
              value={rulesAndTerms}
              onChange={(e) => setRulesAndTerms(e.target.value)}
              placeholder="Dress code, arrival time, footage embargo, branding rules..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#F4F7FB] border border-slate-200 rounded-xl p-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Income (₹)</label>
            <input
              type="number"
              min={0}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Expense (₹)
            </label>
            <input
              type="number"
              min={0}
              value={expense}
              onChange={(e) => setExpense(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Received (₹)
            </label>
            <input
              type="number"
              min={0}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
            />
          </div>
          <div className="flex flex-col justify-center px-2">
            <span className="text-[11px] text-slate-500">Auto Pending</span>
            <span className="text-sm font-mono font-extrabold text-[#DC2626] tabular-nums">
              {formatINR(autoPending)}
            </span>
          </div>
          <div className="flex flex-col justify-center px-2">
            <span className="text-[11px] text-slate-500">Auto Net Profit</span>
            <span className="text-sm font-mono font-extrabold text-[#059669] tabular-nums">
              {formatINR(autoNet)}
            </span>
          </div>
        </div>
      </form>

      {/* Search + Directory */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0B1120]">
          Customer &amp; Studio Directory ({filtered.length})
        </h3>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search studio, name, or location..."
            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No customer or partner studio records found yet.
          </div>
        ) : null}
        {filtered.map((c) => {
          const pending = Math.max(0, c.income - c.received);
          const net = c.income - c.expense;
          return (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-[#0B1120]">{c.studioName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.name} · {c.workLocations || 'Kottayam District'}
                    </p>
                    {c.addedByStaffName && (
                      <p className="text-[11px] font-semibold text-[#2563EB] mt-1 inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Added by Staff: {c.addedByStaffName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoadEdit(c)}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsAppModal({
                          phone: c.whatsapp,
                          recipientName: c.studioName,
                          message: `Hello ${c.name} (${c.studioName}),\nGreetings from ${activeCompany?.name || 'our team'}.${
                            pending > 0
                              ? `\nCurrent pending balance: ${formatINR(pending)}${
                                  activeCompany?.upi ? ` (UPI: ${activeCompany.upi})` : ''
                                }.`
                              : ''
                          }`,
                        })
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>

                {c.workDetails && <p className="text-xs text-slate-700">{c.workDetails}</p>}

                <div className="grid grid-cols-4 gap-2 bg-[#F4F7FB] rounded-xl p-3 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500">Income</p>
                    <p className="text-xs font-mono font-bold text-[#0B1120] tabular-nums">
                      {formatINR(c.income)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Received</p>
                    <p className="text-xs font-mono font-bold text-[#059669] tabular-nums">
                      {formatINR(c.received)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Pending</p>
                    <p className="text-xs font-mono font-bold text-[#DC2626] tabular-nums">
                      {formatINR(pending)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Net</p>
                    <p className="text-xs font-mono font-bold text-[#2563EB] tabular-nums">
                      {formatINR(net)}
                    </p>
                  </div>
                </div>

                {c.rulesAndTerms && (
                  <div className="text-xs bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-slate-700">
                    <span className="font-bold text-[#B45309]">Studio Rules &amp; Terms: </span>
                    {c.rulesAndTerms}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
