import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { formatINR, getCurrentMonthYM, getTodayISO } from '../../utils/helpers';

type PeriodFilter = 'all' | 'today' | 'month';

export const AdminPnlTab: React.FC = () => {
  const { state, addLedgerEntry, deleteLedgerEntry, pushToast } = useErp();

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [entryType, setEntryType] = useState<'income' | 'expense'>('income');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Studio Billing');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());

  const todayISO = getTodayISO();
  const currentMonth = getCurrentMonthYM();

  const matchesPeriod = (d: string): boolean => {
    if (period === 'all') return true;
    if (period === 'today') return d === todayISO;
    return d.startsWith(currentMonth);
  };

  const manualIncome = state.ledger
    .filter((l) => l.type === 'income' && matchesPeriod(l.date))
    .reduce((s, l) => s + l.amount, 0);

  const workCollectionIncome = state.works
    .filter((w) => matchesPeriod(w.date))
    .reduce((s, w) => s + w.billReceived, 0);

  const totalIncome = manualIncome + workCollectionIncome;

  const companyExpenses = state.ledger
    .filter((l) => l.type === 'expense' && matchesPeriod(l.date))
    .reduce((s, l) => s + l.amount, 0);

  const approvedStaffExpenses = state.expenses
    .filter((e) => e.status === 'approved' && matchesPeriod(e.date))
    .reduce((s, e) => s + e.amount, 0);

  const subContractCosts = state.works
    .filter((w) => w.hasSubContract && matchesPeriod(w.date))
    .reduce((s, w) => s + w.subContractTotal, 0);

  const staffSalaries = state.attendance
    .filter((a) => matchesPeriod(a.date))
    .reduce((s, a) => s + a.wageEarned, 0);

  const totalOutflow =
    companyExpenses + approvedStaffExpenses + subContractCosts + staffSalaries;
  const netPnL = totalIncome - totalOutflow;

  const filteredLedger = state.ledger.filter((l) => matchesPeriod(l.date));

  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!title.trim() || !Number.isFinite(numAmt) || numAmt <= 0) {
      pushToast({ type: 'error', title: 'Enter a valid title and positive amount' });
      return;
    }
    addLedgerEntry({
      type: entryType,
      title: title.trim(),
      category: category.trim() || (entryType === 'income' ? 'Direct Income' : 'Operations'),
      amount: Math.round(numAmt),
      date,
    });
    setTitle('');
    setAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Period Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0B1120]">Company Profit &amp; Loss Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Net P&amp;L = Total Income − (Company Expenses + Approved Staff Expenses + Sub-Contract Costs + Staff Salaries)
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 gap-1">
          {(
            [
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today Only' },
              { id: 'month', label: 'This Month' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                period === item.id
                  ? 'bg-white text-[#0B1120] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1120]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Net Profit/Loss Executive Banner */}
      <div
        className={`rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          netPnL >= 0 ? 'bg-[#0B1120]' : 'bg-[#7F1D1D]'
        }`}
      >
        <div>
          <p className="text-xs font-semibold text-slate-300">
            {netPnL >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'} ·{' '}
            {period === 'all' ? 'ALL DATES' : period === 'today' ? 'TODAY' : 'THIS MONTH'}
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-1.5">
            {formatINR(netPnL)}
          </p>
          <p className="text-xs text-slate-300 mt-1.5 font-mono tabular-nums">
            Total Income {formatINR(totalIncome)} − Total Outflow {formatINR(totalOutflow)}
          </p>
        </div>
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            netPnL >= 0 ? 'bg-[#059669]/20 text-emerald-300' : 'bg-white/10 text-red-200'
          }`}
        >
          {netPnL >= 0 ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
        </div>
      </div>

      {/* 4 Breakdown Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Total Income</p>
          <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#059669] mt-2">
            {formatINR(totalIncome)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            Works {formatINR(workCollectionIncome)} + Ledger {formatINR(manualIncome)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Company &amp; Staff Exp.</p>
          <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#0B1120] mt-2">
            {formatINR(companyExpenses + approvedStaffExpenses)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            Co. {formatINR(companyExpenses)} + Staff {formatINR(approvedStaffExpenses)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Sub-Contract Costs</p>
          <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#D97706] mt-2">
            {formatINR(subContractCosts)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Truss, Generator &amp; Vendor</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500">Crew Salaries Earned</p>
          <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#2563EB] mt-2">
            {formatINR(staffSalaries)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Accrued attendance wages</p>
        </div>
      </div>

      {/* Manual Ledger Entry + History Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddLedger}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-[#0B1120]">Add Manual Ledger Entry</h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEntryType('income')}
              className={`min-h-[44px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                entryType === 'income'
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Income (+)
            </button>
            <button
              type="button"
              onClick={() => setEntryType('expense')}
              className={`min-h-[44px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                entryType === 'expense'
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Expense (−)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Entry Description
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Van Diesel / Studio Settlement"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Fuel / Equipment / Studio Billing"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Save Ledger Entry
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1120]">
              Manual Ledger History ({filteredLedger.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredLedger.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No manual ledger entries found for this period.
              </div>
            ) : (
              filteredLedger.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1120] truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{item.date}</span> · {item.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-mono font-extrabold tabular-nums ${
                        item.type === 'income' ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '−'}
                      {formatINR(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteLedgerEntry(item.id)}
                      className="p-1.5 text-slate-400 hover:text-[#DC2626] rounded-lg"
                      aria-label="Delete ledger entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
