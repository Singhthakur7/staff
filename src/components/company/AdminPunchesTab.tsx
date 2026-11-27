import React, { useState } from 'react';
import {
  Camera,
  Edit3,
  ExternalLink,
  MapPin,
  Send,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { GpsStamp, PunchLogRecord } from '../../types';
import {
  formatDateIN,
  formatINR,
  formatShiftDuration,
  formatTimeIN,
  getDutyStageInfo,
} from '../../utils/helpers';

function buildGpsMapHref(gps?: GpsStamp): string | undefined {
  if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number') return undefined;
  return `https://www.google.com/maps?q=${gps.lat},${gps.lng}`;
}

export const AdminPunchesTab: React.FC = () => {
  const {
    activeDb,
    updatePunchLog,
    sendLiveInstruction,
    openLightbox,
  } = useStaffOnline();

  const [filterStaffId, setFilterStaffId] = useState('all');
  const [editingPunch, setEditingPunch] = useState<PunchLogRecord | null>(null);
  const [editWorkTitle, setEditWorkTitle] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editWage, setEditWage] = useState('0');

  const [instructStaff, setInstructStaff] = useState<{ id: string; name: string } | null>(null);
  const [instructionText, setInstructionText] = useState('');

  const visibleLogs =
    filterStaffId === 'all'
      ? activeDb.punchLogs
      : activeDb.punchLogs.filter((p) => p.staffId === filterStaffId);

  const openEdit = (p: PunchLogRecord) => {
    setEditingPunch(p);
    setEditWorkTitle(p.workTitle);
    setEditFrom(p.fromLocation);
    setEditTo(p.toLocation);
    setEditMode(p.mode);
    setEditWage(String(p.dutyWage));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPunch) return;
    await updatePunchLog(editingPunch.id, {
      workTitle: editWorkTitle.trim(),
      fromLocation: editFrom.trim(),
      toLocation: editTo.trim(),
      mode: editMode.trim(),
      dutyWage: Math.max(0, Number(editWage) || 0),
    });
    setEditingPunch(null);
  };

  const handleSendInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructStaff || !instructionText.trim()) return;
    await sendLiveInstruction(instructStaff.id, instructionText.trim());
    setInstructionText('');
    setInstructStaff(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 card-elevated">
        <div>
          <h2 className="text-sm font-display font-bold text-[#0F172A]">
            Live Selfie &amp; Duty Punch Logs ({visibleLogs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stage tracking with all 5 auto-recorded timestamps (Punch-In, Departed,
            Arrived, Work Completed, Punch-Out) and GPS map links.
          </p>
        </div>
        <select
          value={filterStaffId}
          onChange={(e) => setFilterStaffId(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
        >
          <option value="all">All Staff Members</option>
          {activeDb.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>
      </div>

      {visibleLogs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-2 card-elevated">
          <Camera className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            No selfie or duty punches logged yet
          </p>
          <p className="text-xs text-slate-500">
            Live selfies and 5-step automatic duty timestamps appear here in real time as staff
            check in and tap milestone buttons.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleLogs.map((p) => {
            const stageMeta = getDutyStageInfo(p);
            const hasCoords = typeof p.gpsLat === 'number' && typeof p.gpsLng === 'number';
            const punchInMapHref = hasCoords
              ? `https://www.google.com/maps?q=${p.gpsLat},${p.gpsLng}`
              : undefined;
            const departMapHref = buildGpsMapHref(p.departGps);
            const arriveMapHref = buildGpsMapHref(p.arriveGps);
            const completedMapHref = buildGpsMapHref(p.workCompletedGps);
            const punchOutMapHref = buildGpsMapHref(p.punchOutGps);
            const duration =
              p.totalDurationText ||
              (p.punchOutTime ? formatShiftDuration(p.punchInTime, p.punchOutTime) : '');

            const gpsPins = [
              { label: 'In', href: punchInMapHref },
              { label: 'Dep', href: departMapHref },
              { label: 'Arr', href: arriveMapHref },
              { label: 'Done', href: completedMapHref },
              { label: 'Out', href: punchOutMapHref },
            ].filter((g): g is { label: string; href: string } => Boolean(g.href));

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Zoomable Live Selfie Thumbnail */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => p.selfieUrl && openLightbox(p.selfieUrl)}
                      className="w-28 h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative group"
                    >
                      {p.selfieUrl ? (
                        <img
                          src={p.selfieUrl}
                          alt={`${p.staffName} selfie`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md text-center">
                        {p.type === 'login_selfie' ? 'Selfie Login' : 'Punch-In'}
                      </span>
                    </button>

                    {p.punchOutSelfieUrl && (
                      <button
                        type="button"
                        onClick={() => openLightbox(p.punchOutSelfieUrl!)}
                        className="w-28 h-14 rounded-xl overflow-hidden bg-slate-900 border border-rose-200 shrink-0 relative group"
                      >
                        <img
                          src={p.punchOutSelfieUrl}
                          alt={`${p.staffName} punch-out selfie`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 left-1 right-1 bg-rose-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-center">
                          Punch-Out Selfie
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] truncate">
                          {p.staffName}{' '}
                          <span className="font-normal text-xs text-slate-500">
                            · {p.staffRole}
                          </span>
                        </p>
                        <p className="text-xs font-semibold text-[#1E3A8A] truncate">
                          {p.workTitle}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${stageMeta.badgeClass}`}
                      >
                        {stageMeta.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <p>
                        <span className="text-slate-400">Date &amp; Mode:</span>{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {formatDateIN(p.date)}
                        </span>{' '}
                        · <span className="font-semibold text-slate-800">{p.mode}</span>
                        {duration && (
                          <span className="ml-2 font-mono font-bold text-emerald-700">
                            ({duration})
                          </span>
                        )}
                      </p>
                      <p className="truncate">
                        <span className="text-slate-400">Route:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {p.fromLocation || '—'} → {p.toLocation || '—'}
                        </span>
                      </p>
                    </div>

                    {/* All 5 Auto-Recorded Timestamps Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-[10px]">
                      <div>
                        <p className="text-slate-400 font-semibold">Punch-In</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {formatTimeIN(p.punchInTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Departed</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.departTime ? formatTimeIN(p.departTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Arrived</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.arriveTime ? formatTimeIN(p.arriveTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Work Done</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.workCompletedTime ? formatTimeIN(p.workCompletedTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Punch-Out</p>
                        <p className="font-mono font-bold text-emerald-700">
                          {p.punchOutTime ? formatTimeIN(p.punchOutTime) : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Wage, All Clickable GPS Map Links & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-extrabold text-[#0F172A] tabular-nums">
                      {formatINR(p.dutyWage)}
                    </span>
                    {gpsPins.length > 0 ? (
                      gpsPins.map((pin) => (
                        <a
                          key={pin.label}
                          href={pin.href}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-mono font-semibold text-[#2563EB] hover:bg-blue-100 inline-flex items-center gap-0.5"
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {pin.label}
                          <ExternalLink className="w-2 h-2" />
                        </a>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400">{p.gpsLabel || 'No GPS'}</span>
                    )}
                    {p.selfieUrl && p.selfieUrl.startsWith('http') && (
                      <a
                        href={p.selfieUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        Photo
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstructStaff({ id: p.staffId, name: p.staffName })}
                      className="h-8 px-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Instruct
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Duty Details Modal (Auto-timestamps remain tamper-proof) */}
      {editingPunch && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingPunch(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Edit Duty Details — {editingPunch.staffName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPunch(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Work Title</label>
                <input
                  type="text"
                  required
                  value={editWorkTitle}
                  onChange={(e) => setEditWorkTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
                  <input
                    type="text"
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
                  <input
                    type="text"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mode</label>
                  <input
                    type="text"
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Duty Wage (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editWage}
                    onChange={(e) => setEditWage(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                Recorded live timestamps (Punch-In, Departed, Arrived, Work Completed, Punch-Out)
                are audit-locked and preserved automatically.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPunch(null)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Live Instruction Modal */}
      {instructStaff && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInstructStaff(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Send Live Instruction to {instructStaff.name}
              </h3>
              <button
                type="button"
                onClick={() => setInstructStaff(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSendInstruction} className="p-5 space-y-3">
              <textarea
                rows={4}
                required
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                placeholder="Type live site instruction (shows instantly in Staff Portal)..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInstructStaff(null)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-[#0F172A] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Live Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
