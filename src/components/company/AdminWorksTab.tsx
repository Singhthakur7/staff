import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { MultiCrewWork } from '../../types';
import { formatDateIN, formatTimeIN, getTodayISO } from '../../utils/helpers';

export const AdminWorksTab: React.FC = () => {
  const {
    activeCompany,
    activeDb,
    addWork,
    updateWork,
    deleteWork,
    openWhatsAppModal,
    pushToast,
  } = useStaffOnline();

  const [title, setTitle] = useState('');
  const [clientVenue, setClientVenue] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [time, setTime] = useState('08:00');
  const [mapsLink, setMapsLink] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  const toggleCrewMember = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientVenue.trim()) {
      pushToast({ type: 'error', title: 'Work Title and Client / Venue are required' });
      return;
    }
    if (assignedIds.length === 0) {
      pushToast({ type: 'error', title: 'Select at least one crew member via checkboxes' });
      return;
    }
    await addWork({
      title: title.trim(),
      clientVenue: clientVenue.trim(),
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      date,
      time,
      mapsLink: mapsLink.trim(),
      assignedStaffIds: assignedIds,
      notes: notes.trim() || undefined,
      status: 'scheduled',
    });
    setTitle('');
    setClientVenue('');
    setFromLocation('');
    setToLocation('');
    setMapsLink('');
    setNotes('');
    setAssignedIds([]);
  };

  const handleDutyAlertWA = (work: MultiCrewWork) => {
    const crew = activeDb.staff.filter((s) => work.assignedStaffIds.includes(s.id));
    const crewNames = crew.map((s) => `${s.name} (${s.role})`).join(', ');
    const firstPhone = crew[0]?.phone || '';

    openWhatsAppModal({
      phone: firstPhone,
      recipientName: `${work.title} Crew`,
      message: [
        `📋 *Duty Assignment — ${activeCompany?.name || 'Staff. Online'}*`,
        `Work: *${work.title}*`,
        `Client / Venue: ${work.clientVenue}`,
        `Date & Time: ${formatDateIN(work.date)} at ${formatTimeIN(work.time)}`,
        `Route: ${work.fromLocation || 'Base'} → ${work.toLocation || work.clientVenue}`,
        work.mapsLink ? `Location Map: ${work.mapsLink}` : '',
        `Assigned Crew: ${crewNames || 'TBA'}`,
        work.notes ? `Notes: ${work.notes}` : '',
        ``,
        `Please sign in with your Live Selfie & punch in on arrival.`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Multi-Crew Work Assignment Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Assign Multi-Crew Work / Event
          </h2>
          <p className="text-xs text-slate-500">
            Select multiple crew members using checkboxes to push instant duty notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work / Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding LED Wall + 2 Cam Live"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Client / Venue *
            </label>
            <input
              type="text"
              required
              value={clientVenue}
              onChange={(e) => setClientVenue(e.target.value)}
              placeholder="e.g. St. Mary's Auditorium, Kanjirappally"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              From Location
            </label>
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="Office / Base"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Location</label>
            <input
              type="text"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="Event Venue"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Time *</label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Google Maps Link (Optional)
            </label>
            <input
              type="url"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Duty Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Carry extra SDI cables & 2 tripods"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        {/* Crew Checkboxes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0F172A]">
            Assign Crew Members ({assignedIds.length} selected)
          </label>
          {activeDb.staff.length === 0 ? (
            <p className="text-xs text-slate-500">
              Add staff accounts in the Salary &amp; Advance Slip tab first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {activeDb.staff.map((st) => {
                const checked = assignedIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#2563EB] bg-blue-50/70 text-[#1E3A8A] font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCrewMember(st.id)}
                      className="rounded border-slate-300 text-[#2563EB]"
                    />
                    <span className="truncate">
                      {st.name} <span className="font-normal text-slate-500">({st.role})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Assign Multi-Crew Work
        </button>
      </form>

      {/* Assigned Works List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#0F172A]">
          Scheduled &amp; Completed Works ({activeDb.works.length})
        </h3>
        {activeDb.works.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2 card-elevated">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No multi-crew works scheduled yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeDb.works.map((w) => {
              const crew = activeDb.staff.filter((s) => w.assignedStaffIds.includes(s.id));
              return (
                <div
                  key={w.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">{w.title}</h4>
                      <p className="text-xs text-slate-500">{w.clientVenue}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                      }`}
                    >
                      {w.status === 'completed' ? 'Completed' : 'Scheduled'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-mono">
                      {formatDateIN(w.date)} · {formatTimeIN(w.time)}
                    </p>
                    <p>
                      Route: <strong>{w.fromLocation || 'Base'}</strong> →{' '}
                      <strong>{w.toLocation || w.clientVenue}</strong>
                    </p>
                    {w.mapsLink && (
                      <a
                        href={w.mapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Open Venue on Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="pt-1">
                      <span className="text-slate-400">Assigned Crew:</span>{' '}
                      <span className="font-semibold text-[#0F172A]">
                        {crew.map((c) => c.name).join(', ') || 'None'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDutyAlertWA(w)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp Duty Alert
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void updateWork(w.id, {
                          status: w.status === 'completed' ? 'scheduled' : 'completed',
                        })
                      }
                      className="min-h-[36px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {w.status === 'completed' ? 'Reopen' : 'Mark Completed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteWork(w.id)}
                      className="min-h-[36px] px-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 ml-auto"
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
