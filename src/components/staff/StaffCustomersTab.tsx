import React, { useState } from 'react';
import { MessageCircle, Plus, Search } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export const StaffCustomersTab: React.FC = () => {
  const { state, session, activeCompany, addCustomer, openWhatsAppModal, pushToast } = useErp();

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [workLocations, setWorkLocations] = useState('');
  const [workDetails, setWorkDetails] = useState('');
  const [rulesAndTerms, setRulesAndTerms] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim() || !name.trim()) {
      pushToast({ type: 'error', title: 'Enter Studio Name and Contact Name' });
      return;
    }
    addCustomer({
      name: name.trim(),
      studioName: studioName.trim(),
      whatsapp: whatsapp.trim(),
      workLocations: workLocations.trim(),
      workDetails: workDetails.trim(),
      income: 0,
      expense: 0,
      received: 0,
      rulesAndTerms: rulesAndTerms.trim(),
      addedByStaffName: session?.name || 'Crew Member',
    });
    setName('');
    setStudioName('');
    setWhatsapp('');
    setWorkLocations('');
    setWorkDetails('');
    setRulesAndTerms('');
  };

  const filtered = state.customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.studioName.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.workLocations.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Staff Submit New Customer / Studio */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div>
          <h2 className="text-base font-bold text-[#0B1120]">
            Add New Partner Studio / Client Lead
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically syncs to Admin CRM and sends an instant notification to Admin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <input
            type="text"
            required
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="Studio Name *"
            className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Owner / Contact Name *"
            className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp Number"
            className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
          />
          <input
            type="text"
            value={workLocations}
            onChange={(e) => setWorkLocations(e.target.value)}
            placeholder="Locations (e.g. Pala, Kanjirappally)"
            className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={workDetails}
            onChange={(e) => setWorkDetails(e.target.value)}
            placeholder="Work Details (LED / Live / Camera)"
            className="sm:col-span-2 h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
          <input
            type="text"
            value={rulesAndTerms}
            onChange={(e) => setRulesAndTerms(e.target.value)}
            placeholder="Studio Rules, Dress Code, or Special Instructions"
            className="sm:col-span-2 lg:col-span-3 h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <button
          type="submit"
          className="min-h-[46px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Submit Studio to CRM &amp; Notify Admin
        </button>
      </form>

      {/* Searchable Directory */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0B1120]">
          Studio Directory &amp; Site Rules ({filtered.length})
        </h3>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search studio or location..."
            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No studios or clients added yet.
          </div>
        ) : null}
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-[#0B1120]">{c.studioName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.name} · {c.workLocations || 'Location not specified'}
                </p>
              </div>
              {c.whatsapp && (
                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppModal({
                      phone: c.whatsapp,
                      recipientName: c.studioName,
                      message: `Hello ${c.name}, ${session?.name || 'Crew'} from ${
                        activeCompany?.name || 'our company'
                      } checking in regarding today's shoot.`,
                    })
                  }
                  className="min-h-[38px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              )}
            </div>
            {c.workDetails && <p className="text-xs text-slate-700">{c.workDetails}</p>}
            {c.rulesAndTerms && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-slate-700">
                <span className="font-bold text-[#B45309]">Studio Rules: </span>
                {c.rulesAndTerms}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
