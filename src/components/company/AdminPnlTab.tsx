import React, { useMemo, useRef, useState } from 'react';
import { Download, Plus, Printer, Trash2 } from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { PaymentMode } from '../../types';
import { addDaysISO, formatDateIN, formatINR, getTodayISO } from '../../utils/helpers';
import { downloadElementAsPdf, triggerDirectPrint } from '../../utils/pdfExport';
import { PnlStatementSheet } from '../DocumentPreviews';

type PnlPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL';

export const AdminPnlTab: React.FC = () => {
  const { activeCompany, activeDb, addManualLedger, deleteManualLedger, pushToast } =
    useStaffOnline();

  const [period, setPeriod] = useState<PnlPeriod>('MONTHLY');
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Operations');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [mode, setMode] = useState<PaymentMode>('gpay');
  const [note, setNote] = useState('');
  const [exporting, setExporting] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);

  const today = getTodayISO();

  const cutoffDate = useMemo(() => {
    if (period === 'WEEKLY') return addDaysISO(today, -7);
    if (period === 'MONTHLY') return addDaysISO(today, -30);
    if (period === 'YEARLY') return addDaysISO(today, -365);
    return '';
  }, [period, today]);

  const inRange = (d?: string) => !cutoffDate || !d || d >= cutoffDate;

  const stats = useMemo(() => {
    const receivedIncome = activeDb.customers
      .filter((c) => inRange(c.date))
      .reduce((s, c) => s + (Number(c.received) || 0), 0);

    const staffWages = activeDb.punchLogs
      .filter((p) => p.type === 'duty_punch' && inRange(p.date))
      .reduce((s, p) => s + (Number(p.dutyWage) || 0), 0);

    const approvedExpenses = activeDb.expenses
      .filter((e) => e.status === 'approved' && inRange(e.date))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const subcontractPaid = activeDb.subcontracts
      .filter((sc) => inRange(sc.date))
      .reduce((s, sc) => s + (Number(sc.paid) || 0), 0);

    const manualIncome = activeDb.ledger
      .filter((l) => l.type === 'income' && inRange(l.date))
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);

    const manualExpenses = activeDb.ledger
      .filter((l) => l.type === 'expense' && inRange(l.date))
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);

    return {
      receivedIncome,
      staffWages,
      approvedExpenses,
      subcontractPaid,
      manualIncome,
      manualExpenses,
    };
  }, [activeDb, cutoffDate]);

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!title.trim() || !amt || amt <= 0) return;
    await addManualLedger({
      type: entryType,
      title: title.trim(),
      category: category.trim() || 'General',
      amount: amt,
      date,
      mode,
      note: note.trim(),
    });
    setTitle('');
    setAmount('');
    setNote('');
  };

  if (!activeCompany) return null;

  const periodLabel =
    period === 'WEEKLY'
      ? `Last 7 Days (${formatDateIN(cutoffDate)} → ${formatDateIN(today)})`
      : period === 'MONTHLY'
        ? `Last 30 Days (${formatDateIN(cutoffDate)} → ${formatDateIN(today)})`
        : period === 'YEARLY'
          ? `Last 12 Months (${formatDateIN(cutoffDate)} → ${formatDateIN(today)})`
          : 'All-Time Cumulative';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Period Filter + Optional Manual Ledger Entries */}
      <div className="lg:col-span-5 space-y-5 no-print">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              P&amp;L Statement Period
            </h2>
            <p className="text-xs text-slate-500">
              Switch between Weekly, Monthly, Yearly, or All-Time financial statements.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL'] as PnlPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                  period === p ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                const ok = await downloadElementAsPdf(
                  sheetRef.current,
                  `PNL-${period}-${activeCompany.slug}.pdf`
                );
                setExporting(false);
                pushToast({
                  type: ok ? 'success' : 'error',
                  title: ok ? 'P&L Statement PDF downloaded' : 'PDF export failed',
                });
              }}
              className="min-h-[42px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'PDF Download'}
            </button>
            <button
              type="button"
              onClick={triggerDirectPrint}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Direct Print
            </button>
          </div>
        </div>

        {/* Optional Manual Income / Expense Ledger */}
        <form
          onSubmit={handleAddLedger}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-3.5"
        >
          <h3 className="text-sm font-bold text-[#0F172A]">Manual Income / Expense Entry</h3>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setEntryType('income')}
              className={`py-1.5 rounded-lg text-xs font-bold ${
                entryType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-600'
              }`}
            >
              + Manual Income
            </button>
            <button
              type="button"
              onClick={() => setEntryType('expense')}
              className={`py-1.5 rounded-lg text-xs font-bold ${
                entryType === 'expense' ? 'bg-rose-600 text-white' : 'text-slate-600'
              }`}
            >
              − Manual Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Description (e.g. Office Rent / Equipment Rental)"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount ₹"
              className="h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
              className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
            >
              <option value="gpay">Google Pay</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full min-h-[40px] rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Ledger Entry
          </button>

          {activeDb.ledger.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-52 overflow-y-auto">
              {activeDb.ledger.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0F172A] truncate">{l.title}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {formatDateIN(l.date)} · {l.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        l.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {l.type === 'income' ? '+' : '-'}
                      {formatINR(l.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteManualLedger(l.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Right: Formal P&L Statement Slip */}
      <div className="lg:col-span-7 print-only-container">
        <PnlStatementSheet
          company={activeCompany}
          periodLabel={periodLabel}
          receivedIncome={stats.receivedIncome}
          manualIncome={stats.manualIncome}
          staffWages={stats.staffWages}
          approvedExpenses={stats.approvedExpenses}
          subcontractPaid={stats.subcontractPaid}
          manualExpenses={stats.manualExpenses}
          sheetRef={sheetRef}
        />
      </div>
    </div>
  );
};
