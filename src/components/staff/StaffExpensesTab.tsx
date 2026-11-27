import React, { useState } from 'react';
import { Plus, Receipt, Upload, X } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { StaffMember } from '../../types';
import {
  compressImageFileToBase64,
  formatDateIN,
  formatINR,
  getTodayISO,
} from '../../utils/helpers';
import { uploadToCloudinary } from '../../utils/cloudinary';

export const StaffExpensesTab: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const { activeDb, submitStaffExpense, openLightbox, pushToast } = useStaffOnline();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [billPhotoUrl, setBillPhotoUrl] = useState<string | undefined>(undefined);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const myExpenses = activeDb.expenses.filter((e) => e.staffId === staff.id);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImageFileToBase64(file, 720);
      const uploaded = await uploadToCloudinary(compressed);
      setBillPhotoUrl(uploaded.url);
      pushToast({ type: 'success', title: 'Bill photo attached' });
    } catch {
      pushToast({ type: 'error', title: 'Could not read bill image' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!description.trim() || !amt || amt <= 0) {
      pushToast({ type: 'error', title: 'Enter a valid expense description and amount' });
      return;
    }
    setSubmitting(true);
    await submitStaffExpense({
      description: description.trim(),
      amount: amt,
      date,
      billPhotoUrl,
    });
    setSubmitting(false);
    setDescription('');
    setAmount('');
    setBillPhotoUrl(undefined);
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Submit Site Expense (എക്സ്പെൻസ് സമർപ്പിക്കുക)
          </h2>
          <p className="text-xs text-slate-500">
            Attach a clear bill photo. Once approved by Company Admin, the amount is credited
            directly to your Salary Slip.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Expense Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fuel / Toll / Site Food / Battery Purchase"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Bill Photo Upload (Optional)
            </label>
            <label className="w-full h-11 px-4 rounded-xl border border-dashed border-slate-300 hover:border-[#2563EB] bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              <span>
                {uploadingPhoto
                  ? 'Uploading photo...'
                  : billPhotoUrl
                    ? 'Bill Photo Ready ✓ (Tap to change)'
                    : 'Upload Bill Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {billPhotoUrl && (
          <div className="relative inline-block">
            <img
              src={billPhotoUrl}
              alt="Bill preview"
              referrerPolicy="no-referrer"
              className="h-28 w-auto rounded-xl border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={() => setBillPhotoUrl(undefined)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow"
              aria-label="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[46px] px-6 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Expense Claim'}
          </button>
        </div>
      </form>

      {/* My Submitted Expenses Status List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F172A]">
            My Submitted Expenses ({myExpenses.length})
          </h3>
        </div>
        {myExpenses.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No expenses submitted yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {exp.billPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(exp.billPhotoUrl!)}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                    >
                      <img
                        src={exp.billPhotoUrl}
                        alt="Bill thumbnail"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">{exp.description}</p>
                    <p className="text-xs font-mono text-slate-500">{formatDateIN(exp.date)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-mono font-extrabold text-[#0F172A] tabular-nums">
                    {formatINR(exp.amount)}
                  </p>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      exp.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        : exp.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                          : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                    }`}
                  >
                    {exp.status === 'approved'
                      ? 'Approved'
                      : exp.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
