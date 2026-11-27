import React, { useState } from 'react';
import {
  Briefcase,
  Camera,
  ExternalLink,
  MapPin,
  PlayCircle,
  StopCircle,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { DUTY_MODES, StaffMember } from '../../types';
import {
  formatDateIN,
  formatINR,
  formatTimeIN,
  getCurrentTimeHHMM,
  getTodayISO,
} from '../../utils/helpers';

export const StaffDutyTab: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const {
    activeDb,
    addDutyPunchIn,
    punchOutDuty,
    openLightbox,
    pushToast,
  } = useStaffOnline();

  const [workTitle, setWorkTitle] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [mode, setMode] = useState(DUTY_MODES[0]);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [workTime, setWorkTime] = useState(() => getCurrentTimeHHMM());
  const [departTime, setDepartTime] = useState(() => getCurrentTimeHHMM());
  const [arriveTime, setArriveTime] = useState(() => getCurrentTimeHHMM());
  const [dutyWage, setDutyWage] = useState(String(staff.dutyWage));
  const [submitting, setSubmitting] = useState(false);

  const myPunches = activeDb.punchLogs.filter((p) => p.staffId === staff.id);
  const activeDuty = myPunches.find((p) => p.type === 'duty_punch' && p.status === 'active') || null;
  const myAssignedWorks = activeDb.works.filter((w) => w.assignedStaffIds.includes(staff.id));

  const captureGpsCoords = (): Promise<{ lat?: number; lng?: number; label: string }> =>
    new Promise((resolve) => {
      try {
        if (!navigator.geolocation) {
          resolve({ label: 'GPS unavailable' });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(5));
            const lng = Number(pos.coords.longitude.toFixed(5));
            resolve({ lat, lng, label: `${lat}, ${lng}` });
          },
          () => resolve({ label: 'Location permission not granted' }),
          { enableHighAccuracy: true, timeout: 4500 }
        );
      } catch {
        resolve({ label: 'GPS unavailable' });
      }
    });

  const handlePunchIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) {
      pushToast({ type: 'error', title: 'Please enter the Work / Duty description' });
      return;
    }
    setSubmitting(true);
    const gps = await captureGpsCoords();
    await addDutyPunchIn({
      workTitle: workTitle.trim(),
      date,
      mode,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      workTime,
      departTime,
      arriveTime,
      dutyWage: Math.max(0, Number(dutyWage) || staff.dutyWage),
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsLabel: gps.label,
    });
    setSubmitting(false);
    setWorkTitle('');
    setFromLocation('');
    setToLocation('');
    setWorkTime(getCurrentTimeHHMM());
  };

  return (
    <div className="space-y-6">
      {/* Active Duty Banner */}
      {activeDuty && (
        <div className="bg-[#0B1120] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              Active Duty In Progress
            </span>
            <h3 className="text-base font-display font-bold">{activeDuty.workTitle}</h3>
            <p className="text-xs text-slate-300">
              {activeDuty.fromLocation || 'Base'} → {activeDuty.toLocation || 'Venue'} ·{' '}
              {activeDuty.mode} · Started {formatTimeIN(activeDuty.punchInTime)} ·{' '}
              <span className="font-mono font-bold text-emerald-300">
                {formatINR(activeDuty.dutyWage)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void punchOutDuty(activeDuty.id)}
            className="min-h-[46px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0"
          >
            <StopCircle className="w-4 h-4" />
            ⏹️ Punch-Out
          </button>
        </div>
      )}

      {/* Detailed Duty Punch-In Form (All 9 Exact Fields) */}
      <form
        onSubmit={handlePunchIn}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Detailed Duty Punch-In (ഡ്യൂട്ടി &amp; റൂട്ട് രേഖപ്പെടുത്തുക)
          </h2>
          <p className="text-xs text-slate-500">
            Logs your work details, travel route, timings, GPS location, and daily wage directly to
            your Formal Salary Slip.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work / എന്ത് വർക്ക് *
            </label>
            <input
              type="text"
              required
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="e.g. St. Thomas Auditorium Live Camera"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              When / Date (എപ്പോൾ) *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              How / Mode (എങ്ങനെ) *
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
            >
              {DUTY_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              From (എവിടെ നിന്ന്)
            </label>
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="e.g. Office / Home"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              To (എവിടേക്ക്)
            </label>
            <input
              type="text"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="e.g. Venue / Studio"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work Time (വർക്ക് സമയം)
            </label>
            <input
              type="time"
              value={workTime}
              onChange={(e) => setWorkTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Depart Time (പുറപ്പെട്ട സമയം)
            </label>
            <input
              type="time"
              value={departTime}
              onChange={(e) => setDepartTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Arrive Time (എത്തിയ സമയം)
            </label>
            <input
              type="time"
              value={arriveTime}
              onChange={(e) => setArriveTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Duty Wage (₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={dutyWage}
              onChange={(e) => setDutyWage(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[48px] px-6 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          {submitting ? 'Capturing GPS & Punching In...' : 'Submit Duty Punch-In'}
        </button>
      </form>

      {/* Assigned Multi-Crew Works */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 card-elevated space-y-3.5">
        <h3 className="text-sm font-display font-bold text-[#0F172A] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#2563EB]" />
          My Assigned Multi-Crew Works ({myAssignedWorks.length})
        </h3>
        {myAssignedWorks.length === 0 ? (
          <p className="text-xs text-slate-500">No multi-crew works assigned to you yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAssignedWorks.map((w) => {
              const fellowCrew = activeDb.staff
                .filter((s) => w.assignedStaffIds.includes(s.id) && s.id !== staff.id)
                .map((s) => `${s.name} (${s.role})`);
              return (
                <div
                  key={w.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-1.5 bg-slate-50/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#0F172A]">{w.title}</p>
                    <span className="text-[11px] font-mono font-semibold text-[#1E3A8A]">
                      {formatDateIN(w.date)} · {formatTimeIN(w.time)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{w.clientVenue}</p>
                  <p className="text-xs text-slate-600">
                    Route: <strong>{w.fromLocation || 'Base'}</strong> →{' '}
                    <strong>{w.toLocation || w.clientVenue}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    Fellow Crew:{' '}
                    <strong className="text-[#0F172A]">
                      {fellowCrew.length > 0 ? fellowCrew.join(', ') : 'Solo Assignment'}
                    </strong>
                  </p>
                  {w.mapsLink && (
                    <a
                      href={w.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline pt-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Open Directions
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Duty & Selfie Punch History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F172A]">
            My Duty &amp; Selfie Punch History ({myPunches.length})
          </h3>
        </div>
        {myPunches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No punches recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myPunches.map((p) => (
              <div
                key={p.id}
                className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.selfieUrl ? (
                    <button
                      type="button"
                      onClick={() => openLightbox(p.selfieUrl)}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                    >
                      <img
                        src={p.selfieUrl}
                        alt="Punch selfie"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">{p.workTitle}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {formatDateIN(p.date)} · {p.mode} · {p.fromLocation || 'Base'} →{' '}
                      {p.toLocation || 'Venue'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      In: {formatTimeIN(p.punchInTime)} · Out:{' '}
                      {p.punchOutTime ? formatTimeIN(p.punchOutTime) : 'On Duty'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-extrabold text-[#0F172A] tabular-nums">
                    {formatINR(p.dutyWage)}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.status === 'active' ? 'Active' : 'Completed'}
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
