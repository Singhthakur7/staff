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
import { PunchLogRecord } from '../../types';
import {
  formatDateIN,
  formatINR,
  formatTimeIN,
} from '../../utils/helpers';

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
  const [editWorkTime, setEditWorkTime] = useState('');
  const [editDepart, setEditDepart] = useState('');
  const [editArrive, setEditArrive] = useState('');

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
    setEditWorkTime(p.workTime);
    setEditDepart(p.departTime);
    setEditArrive(p.arriveTime);
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
      workTime: editWorkTime,
      departTime: editDepart,
      arriveTime: editArrive,
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
            Click any selfie to zoom. Verify GPS coordinates, route details, or send live
            instructions.
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
          <p className="text-sm font-semibold text-slate-700">No selfie or duty punches logged yet</p>
          <p className="text-xs text-slate-500">
            Live selfies and duty punches appear here automatically when staff log in and punch in.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleLogs.map((p) => {
            const hasCoords = typeof p.gpsLat === 'number' && typeof p.gpsLng === 'number';
            const mapsHref = hasCoords
              ? `https://www.google.com/maps?q=${p.gpsLat},${p.gpsLng}`
              : undefined;

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated flex flex-col sm:flex-row gap-4"
              >
                {/* Zoomable Live Selfie Thumbnail */}
                <button
                  type="button"
                  onClick={() => p.selfieUrl && openLightbox(p.selfieUrl)}
                  className="w-full sm:w-28 h-44 sm:h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative group"
                >
                  {p.selfieUrl ? (
                    <img
                      src={p.selfieUrl}
                      alt={`${p.staffName} selfie`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md text-center">
                    {p.type === 'login_selfie' ? 'Selfie Login' : 'Duty Punch'}
                  </span>
                </button>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] truncate">
                        {p.staffName}{' '}
                        <span className="font-normal text-xs text-slate-500">· {p.staffRole}</span>
                      </p>
                      <p className="text-xs font-semibold text-[#1E3A8A] truncate">{p.workTitle}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status === 'active' ? 'On Duty' : 'Completed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <p>
                      <span className="text-slate-400">When:</span>{' '}
                      <span className="font-mono font-semibold text-slate-800">
                        {formatDateIN(p.date)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">How:</span>{' '}
                      <span className="font-semibold text-slate-800">{p.mode}</span>
                    </p>
                    <p className="col-span-2">
                      <span className="text-slate-400">Route:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {p.fromLocation || '—'} → {p.toLocation || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Work Time:</span>{' '}
                      <span className="font-mono">{formatTimeIN(p.workTime)}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Depart / Arrive:</span>{' '}
                      <span className="font-mono">
                        {formatTimeIN(p.departTime)} / {formatTimeIN(p.arriveTime)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Punch-In:</span>{' '}
                      <span className="font-mono">{formatTimeIN(p.punchInTime)}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Punch-Out:</span>{' '}
                      <span className="font-mono">
                        {p.punchOutTime ? formatTimeIN(p.punchOutTime) : 'Active'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-extrabold text-[#0F172A] tabular-nums">
                        {formatINR(p.dutyWage)}
                      </span>
                      {mapsHref ? (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-[#2563EB] hover:underline inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          Maps
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">{p.gpsLabel || 'No GPS'}</span>
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
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Punch Details Modal */}
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
                Edit Punch Details — {editingPunch.staffName}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Work Time
                  </label>
                  <input
                    type="time"
                    value={editWorkTime}
                    onChange={(e) => setEditWorkTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Depart / Arrive
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="time"
                      value={editDepart}
                      onChange={(e) => setEditDepart(e.target.value)}
                      className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                    <input
                      type="time"
                      value={editArrive}
                      onChange={(e) => setEditArrive(e.target.value)}
                      className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
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
