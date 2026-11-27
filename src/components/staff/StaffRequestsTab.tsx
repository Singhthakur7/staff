import React, { useState } from 'react';
import { CalendarDays, Camera, CheckCircle2, Clock, Receipt, Upload, XCircle } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { fileToCompressedDataUrl, formatINR, getTodayISO } from '../../utils/helpers';

export const StaffRequestsTab: React.FC = () => {
  const {
    state,
    session,
    submitExpense,
    submitLeave,
    uploadSiteReceipt,
    openLightbox,
    pushToast,
  } = useErp();

  const staffMember = state.staff.find((s) => s.id === session?.userId);

  // Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPhoto, setExpPhoto] = useState<string | undefined>(undefined);

  // Leave form
  const [leaveType, setLeaveType] = useState<'Casual' | 'Sick' | 'Emergency'>('Casual');
  const [leaveDate, setLeaveDate] = useState(getTodayISO());
  const [leaveReason, setLeaveReason] = useState('');

  // Site receipt uploader
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptImg, setReceiptImg] = useState<string | undefined>(undefined);

  if (!staffMember) return null;

  const myExpenses = state.expenses.filter((e) => e.staffId === staffMember.id);
  const myLeaves = state.leaves.filter((l) => l.staffId === staffMember.id);
  const myReceipts = state.receipts.filter((r) => r.staffId === staffMember.id);

  const handleBillFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      setter(url);
      pushToast({ type: 'success', title: 'Photo Attached' });
    } catch {
      pushToast({ type: 'error', title: 'Could not read image' });
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!expTitle.trim() || !Number.isFinite(amt) || amt <= 0) {
      pushToast({ type: 'error', title: 'Enter valid expense title and amount' });
      return;
    }
    submitExpense({
      staffId: staffMember.id,
      staffName: staffMember.name,
      date: getTodayISO(),
      title: expTitle.trim(),
      amount: Math.round(amt),
      billPhotoUrl: expPhoto,
    });
    setExpTitle('');
    setExpAmount('');
    setExpPhoto(undefined);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      pushToast({ type: 'error', title: 'Please enter a leave reason' });
      return;
    }
    submitLeave({
      staffId: staffMember.id,
      staffName: staffMember.name,
      leaveType,
      date: leaveDate,
      reason: leaveReason.trim(),
    });
    setLeaveReason('');
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptImg) {
      pushToast({ type: 'error', title: 'Please select a bill/receipt image first' });
      return;
    }
    uploadSiteReceipt({
      staffId: staffMember.id,
      staffName: staffMember.name,
      date: getTodayISO(),
      note: receiptNote.trim() || 'Site Receipt / Bill Screenshot',
      imageUrl: receiptImg,
    });
    setReceiptNote('');
    setReceiptImg(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Expense Claim Form */}
        <form
          onSubmit={handleExpenseSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#0B1120]">Submit Expense Claim</h2>
          </div>

          <input
            type="text"
            required
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
            placeholder="Expense title (Fuel, Tea, Cables...)"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />

          <input
            type="number"
            required
            min={1}
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
            placeholder="Amount (₹)"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
          />

          <label className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
            <span className="inline-flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              {expPhoto ? 'Bill photo attached' : 'Attach bill photo (optional)'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleBillFile(e, setExpPhoto)}
              className="hidden"
            />
            {expPhoto && (
              <img src={expPhoto} alt="Bill" className="w-8 h-8 rounded object-cover" />
            )}
          </label>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors"
          >
            Submit Expense to Admin
          </button>
        </form>

        {/* 2. Leave Application Form */}
        <form
          onSubmit={handleLeaveSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#D97706]" />
            <h2 className="text-sm font-bold text-[#0B1120]">Apply for Leave</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['Casual', 'Sick', 'Emergency'] as const).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setLeaveType(lt)}
                className={`min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                  leaveType === lt
                    ? 'bg-[#0B1120] text-white border-[#0B1120]'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {lt}
              </button>
            ))}
          </div>

          <input
            type="date"
            required
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
          />

          <textarea
            rows={2}
            required
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Reason for leave..."
            className="w-full p-3 rounded-xl border border-slate-300 text-sm"
          />

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Send Leave Application
          </button>
        </form>

        {/* 3. Direct Site Receipt / Bill Screenshot Uploader */}
        <form
          onSubmit={handleReceiptSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#059669]" />
            <h2 className="text-sm font-bold text-[#0B1120]">Direct Site Receipt Upload</h2>
          </div>

          <input
            type="text"
            value={receiptNote}
            onChange={(e) => setReceiptNote(e.target.value)}
            placeholder="Short note (e.g. Fuel bill / Generator Diesel)"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />

          <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer min-h-[104px]">
            {receiptImg ? (
              <img
                src={receiptImg}
                alt="Receipt preview"
                className="max-h-24 rounded-lg object-contain"
              />
            ) : (
              <>
                <Upload className="w-5 h-5 text-[#059669]" />
                <span className="text-xs font-semibold text-slate-600">
                  Tap to upload site bill / screenshot
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleBillFile(e, setReceiptImg)}
              className="hidden"
            />
          </label>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
          >
            Upload Receipt &amp; Notify Admin
          </button>
        </form>
      </div>

      {/* Submission History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expense History */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-[#0B1120]">
              My Expense Claims ({myExpenses.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {myExpenses.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No expense claims yet.</p>
            ) : (
              myExpenses.map((e) => (
                <div key={e.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1120] truncate">{e.title}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{e.date}</p>
                    {e.billPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => openLightbox(e.billPhotoUrl!)}
                        className="text-xs font-semibold text-[#2563EB] hover:underline mt-1"
                      >
                        View Bill
                      </button>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-bold text-[#0B1120] tabular-nums">
                      {formatINR(e.amount)}
                    </p>
                    <span
                      className={`text-xs font-bold inline-flex items-center gap-1 mt-0.5 ${
                        e.status === 'approved'
                          ? 'text-[#059669]'
                          : e.status === 'rejected'
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {e.status === 'approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : e.status === 'rejected' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {e.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leaves & Receipts History */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-[#0B1120]">
              My Leave Requests ({myLeaves.length}) &amp; Site Receipts ({myReceipts.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {myLeaves.length === 0 && myReceipts.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                No leaves or site receipts submitted yet.
              </p>
            ) : (
              <>
                {myLeaves.map((l) => (
                  <div key={l.id} className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0B1120]">
                        {l.leaveType} Leave · <span className="font-mono">{l.date}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{l.reason}</p>
                    </div>
                    <span
                      className={`text-xs font-bold capitalize shrink-0 ${
                        l.status === 'approved'
                          ? 'text-[#059669]'
                          : l.status === 'rejected'
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
                {myReceipts.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0B1120]">{r.note}</p>
                      <p className="text-xs font-mono text-slate-500">{r.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openLightbox(r.imageUrl)}
                      className="shrink-0"
                    >
                      <img
                        src={r.imageUrl}
                        alt="Site receipt"
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                      />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
