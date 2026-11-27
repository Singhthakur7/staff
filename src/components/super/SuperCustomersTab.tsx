import React, { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { CompanyDatabase, CompanyRecord } from '../../types';
import { formatDateIN, formatINR } from '../../utils/helpers';

interface SuperCustomersTabProps {
  company: CompanyRecord | null;
  db: CompanyDatabase;
}

export const SuperCustomersTab: React.FC<SuperCustomersTabProps> = ({ company, db }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return db.customers;
    return db.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.workDescription.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [db.customers, query]);

  const totalRate = filtered.reduce((s, c) => s + (Number(c.workRate) || 0), 0);
  const totalReceived = filtered.reduce((s, c) => s + (Number(c.received) || 0), 0);
  const totalDue = Math.max(0, totalRate - totalReceived);

  if (!company) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-sm text-slate-500">
        Select a company to view its Customer Full Details.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Customer Name, Work Description, or Phone..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
        />
      </div>

      {/* 3 Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs font-medium text-slate-500">
            Total Work Rate (വർക്ക് തുടങ്ങിയ റേറ്റ്)
          </p>
          <p className="text-2xl font-mono font-extrabold text-[#0F172A] tabular-nums mt-1">
            {formatINR(totalRate)}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs font-medium text-emerald-700">
            Received (കസ്റ്റമറിൽ നിന്ന് കിട്ടിയത്)
          </p>
          <p className="text-2xl font-mono font-extrabold text-emerald-700 tabular-nums mt-1">
            {formatINR(totalReceived)}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
          <p className="text-xs font-medium text-rose-700">
            Balance Due (ഇനി കിട്ടാനുള്ള ബാലൻസ്)
          </p>
          <p className="text-2xl font-mono font-extrabold text-rose-700 tabular-nums mt-1">
            {formatINR(totalDue)}
          </p>
        </div>
      </div>

      {/* Customer Ledger Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2 card-elevated">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No matching customer records</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const pending = Math.max(0, (Number(c.workRate) || 0) - (Number(c.received) || 0));
            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">{c.name}</h3>
                    <p className="text-xs font-mono text-slate-500">
                      {c.phone || '—'} · {formatDateIN(c.date)} · {c.paymentMode.toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      pending === 0
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                    }`}
                  >
                    {pending === 0 ? 'Settled' : `Due ${formatINR(pending)}`}
                  </span>
                </div>
                <p className="text-xs text-slate-700 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/60">
                  {c.workDescription}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="font-sans text-[10px] text-slate-500">Work Rate</p>
                    <p className="font-bold text-[#0F172A] tabular-nums">{formatINR(c.workRate)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-2.5">
                    <p className="font-sans text-[10px] text-emerald-700">Paid</p>
                    <p className="font-bold text-emerald-800 tabular-nums">{formatINR(c.received)}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50/70 p-2.5">
                    <p className="font-sans text-[10px] text-rose-700">Pending</p>
                    <p className="font-bold text-rose-700 tabular-nums">{formatINR(pending)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
