import React, { useState } from 'react';
import { Handshake, IndianRupee, Plus, Trash2 } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { formatDateIN, formatINR, getTodayISO } from '../../utils/helpers';

export const AdminSubcontractsTab: React.FC = () => {
  const { activeDb, addSubcontract, updateSubcontract, deleteSubcontract, pushToast } =
    useStaffOnline();

  const [vendorName, setVendorName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [contractRate, setContractRate] = useState('');
  const [paid, setPaid] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !workDescription.trim()) {
      pushToast({ type: 'error', title: 'Vendor Name and Work Description are required' });
      return;
    }
    await addSubcontract({
      vendorName: vendorName.trim(),
      workDescription: workDescription.trim(),
      contractRate: Math.max(0, Number(contractRate) || 0),
      paid: Math.max(0, Number(paid) || 0),
      date,
      note: note.trim() || undefined,
    });
    setVendorName('');
    setWorkDescription('');
    setContractRate('');
    setPaid('');
    setNote('');
  };

  const totalRate = activeDb.subcontracts.reduce((s, x) => s + (Number(x.contractRate) || 0), 0);
  const totalPaid = activeDb.subcontracts.reduce((s, x) => s + (Number(x.paid) || 0), 0);
  const totalDue = Math.max(0, totalRate - totalPaid);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-slate-500">Total Subcontract Value</p>
          <p className="text-xl font-mono font-extrabold text-[#0F172A] tabular-nums mt-0.5">
            {formatINR(totalRate)}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-emerald-700">Paid to Vendors</p>
          <p className="text-xl font-mono font-extrabold text-emerald-700 tabular-nums mt-0.5">
            {formatINR(totalPaid)}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs text-rose-700">Auto Balance Due</p>
          <p className="text-xl font-mono font-extrabold text-rose-700 tabular-nums mt-0.5">
            {formatINR(totalDue)}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Add Subcontract Entry
          </h2>
          <p className="text-xs text-slate-500">
            Track external vendor rentals, LED partners, crane/generator teams, and auto balances.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Vendor / Partner *
            </label>
            <input
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Apex Audio & Lights"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
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
              placeholder="e.g. Generator 30kVA + Crane Support"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contract Rate (₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={contractRate}
              onChange={(e) => setContractRate(e.target.value)}
              placeholder="12000"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Paid (₹)</label>
            <input
              type="number"
              min={0}
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder="5000"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
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
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional payment terms or bill ref"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full min-h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Save Entry
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F172A]">
            Subcontract Ledger ({activeDb.subcontracts.length})
          </h3>
        </div>
        {activeDb.subcontracts.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Handshake className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No subcontract records yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeDb.subcontracts.map((sc) => {
              const due = Math.max(0, (Number(sc.contractRate) || 0) - (Number(sc.paid) || 0));
              return (
                <div
                  key={sc.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-[#0F172A]">{sc.vendorName}</p>
                    <p className="text-xs text-slate-600">{sc.workDescription}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {formatDateIN(sc.date)} · Rate: {formatINR(sc.contractRate)} · Paid:{' '}
                      <span className="text-emerald-700 font-bold">{formatINR(sc.paid)}</span> ·
                      Balance Due:{' '}
                      <span className="text-rose-700 font-bold">{formatINR(due)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {due > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateSubcontract(sc.id, { paid: sc.contractRate })
                        }
                        className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        Mark Fully Paid
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteSubcontract(sc.id)}
                      className="h-9 px-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
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
    </div>
  );
};
