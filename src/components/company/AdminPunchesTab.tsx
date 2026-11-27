import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
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
  const [detailPunch, setDetailPunch] = useState<PunchLogRecord | null>(null);
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
            3-Stage Live Selfie &amp; Site Attendance Logs ({visibleLogs.length})
          </h2>
          <p className="text-xs text-slate-500">
            View Office Departure, Site Arrival, and Work Completed &amp; Punch-Out timestamps,
            selfies, completion remarks, and GPS pins in real time.
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
            Live selfies and 3-stage site tracking timestamps appear here in real time as staff
            submit Office Departure, Site Arrival, and Work Completed &amp; Punch-Out.
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
            const departMapHref = buildGpsMapHref(p.departGps) || punchInMapHref;
            const arriveMapHref = buildGpsMapHref(p.arriveGps);
            const punchOutMapHref = buildGpsMapHref(p.punchOutGps);
            const duration =
              p.totalDurationText ||
              (p.punchOutTime ? formatShiftDuration(p.punchInTime, p.punchOutTime) : '');

            const departSelfie = p.departSelfieUrl || p.selfieUrl;
            const arriveSelfie = p.arriveSelfieUrl;
            const punchOutSelfie = p.punchOutSelfieUrl;
            const isWorkDone = Boolean(p.workCompleted || p.workCompletedTime || p.punchOutTime);

            const gpsPins = [
              { label: 'Departure', href: departMapHref },
              { label: 'Site Arrival', href: arriveMapHref },
              { label: 'Punch-Out', href: punchOutMapHref },
            ].filter((g): g is { label: string; href: string } => Boolean(g.href));

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {p.staffName}{' '}
                      <span className="font-normal text-xs text-slate-500">· {p.staffRole}</span>
                    </p>
                    <p className="text-xs font-semibold text-[#1E3A8A] truncate">{p.workTitle}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold text-slate-700">
                        {formatDateIN(p.date)}
                      </span>{' '}
                      · {p.mode} · {p.fromLocation || '—'} → {p.toLocation || '—'}
                      {duration && (
                        <span className="ml-1.5 font-mono font-bold text-emerald-700">
                          ({duration})
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${stageMeta.badgeClass}`}
                  >
                    {stageMeta.label}
                  </span>
                </div>

                {/* 3-Stage Site Tracking Cards (Timestamps + Clickable Stage Selfies) */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: '1. Office Departure',
                      time: p.departTime || (p.type === 'login_selfie' ? p.punchInTime : ''),
                      selfie: departSelfie,
                      accent: 'border-blue-200/80 bg-blue-50/40',
                    },
                    {
                      label: '2. Site Arrival',
                      time: p.arriveTime,
                      selfie: arriveSelfie,
                      accent: 'border-sky-200/80 bg-sky-50/40',
                    },
                    {
                      label: '3. Punch-Out',
                      time: p.punchOutTime,
                      selfie: punchOutSelfie,
                      accent: isWorkDone
                        ? 'border-emerald-200/80 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50',
                    },
                  ].map((st) => (
                    <div
                      key={st.label}
                      className={`rounded-xl border p-2 flex flex-col justify-between gap-2 ${st.accent}`}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 leading-tight">
                          {st.label}
                        </p>
                        <p className="text-[11px] font-mono font-extrabold text-[#0F172A] mt-0.5">
                          {st.time ? formatTimeIN(st.time) : '—'}
                        </p>
                      </div>
                      {st.selfie ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(st.selfie!)}
                          className="w-full h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative group"
                        >
                          <img
                            src={st.selfie}
                            alt={`${p.staffName} ${st.label}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-slate-950/75 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                            Zoom
                          </span>
                        </button>
                      ) : (
                        <div className="w-full h-20 rounded-lg border border-dashed border-slate-200 bg-white/70 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                          <Camera className="w-3.5 h-3.5 mb-0.5" />
                          <span>—</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Work Completed Status + Completion Remark */}
                {(isWorkDone || p.workCompletionNote) && p.type === 'duty_punch' && (
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 px-3 py-2 text-[11px] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Work Completed: {isWorkDone ? 'Yes' : 'Pending'}
                    </span>
                    {p.workCompletionNote && (
                      <span className="text-slate-700 inline-flex items-center gap-1">
                        <FileText className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>{p.workCompletionNote}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Footer: Wage, Clickable GPS Links & Actions */}
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
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailPunch(p)}
                      className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[11px] font-bold text-[#1E3A8A] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>
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

      {/* Full 3-Stage Attendance Audit Details Modal */}
      {detailPunch && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDetailPunch(null)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#0B1120] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-display font-bold truncate">
                  3-Stage Site Audit — {detailPunch.staffName}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {detailPunch.workTitle} · {formatDateIN(detailPunch.date)} ·{' '}
                  {detailPunch.fromLocation || '—'} → {detailPunch.toLocation || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPunch(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    title: 'Stage 1: Office Departure',
                    sub: 'Left Office for Site',
                    time: detailPunch.departTime,
                    selfie: detailPunch.departSelfieUrl || detailPunch.selfieUrl,
                    gpsHref:
                      buildGpsMapHref(detailPunch.departGps) ||
                      (typeof detailPunch.gpsLat === 'number' &&
                      typeof detailPunch.gpsLng === 'number'
                        ? `https://www.google.com/maps?q=${detailPunch.gpsLat},${detailPunch.gpsLng}`
                        : undefined),
                  },
                  {
                    title: 'Stage 2: Site Arrival',
                    sub: 'Reached Work Site',
                    time: detailPunch.arriveTime,
                    selfie: detailPunch.arriveSelfieUrl,
                    gpsHref: buildGpsMapHref(detailPunch.arriveGps),
                  },
                  {
                    title: 'Stage 3: Work Done & Out',
                    sub: detailPunch.workCompleted || detailPunch.punchOutTime ? 'Work Completed ✓' : 'Open',
                    time: detailPunch.punchOutTime,
                    selfie: detailPunch.punchOutSelfieUrl,
                    gpsHref: buildGpsMapHref(detailPunch.punchOutGps),
                  },
                ].map((stage) => (
                  <div
                    key={stage.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-[#0F172A]">{stage.title}</p>
                      <p className="text-[10px] text-slate-500">{stage.sub}</p>
                      <p className="text-xs font-mono font-bold text-[#1E3A8A] mt-1">
                        {stage.time ? formatTimeIN(stage.time) : '—'}
                      </p>
                    </div>
                    {stage.selfie ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(stage.selfie!)}
                        className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-200"
                      >
                        <img
                          src={stage.selfie}
                          alt={stage.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-36 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-xs text-slate-400">
                        No selfie recorded
                      </div>
                    )}
                    {stage.gpsHref && (
                      <a
                        href={stage.gpsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline"
                      >
                        <MapPin className="w-3 h-3" />
                        Open GPS Pin
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
                <p>
                  <strong className="text-slate-700">Work Completed Status:</strong>{' '}
                  <span className="font-bold text-emerald-700">
                    {detailPunch.workCompleted || detailPunch.punchOutTime
                      ? 'Confirmed Completed'
                      : 'In Progress'}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-700">Completion Note / Remark:</strong>{' '}
                  <span className="text-slate-600">{detailPunch.workCompletionNote || '—'}</span>
                </p>
                <p>
                  <strong className="text-slate-700">Total Duration &amp; Duty Wage:</strong>{' '}
                  <span className="font-mono font-bold text-[#0F172A]">
                    {detailPunch.totalDurationText ||
                      (detailPunch.punchOutTime
                        ? formatShiftDuration(detailPunch.punchInTime, detailPunch.punchOutTime)
                        : 'Active')}{' '}
                    · {formatINR(detailPunch.dutyWage)}
                  </span>
                </p>
              </div>
            </div>
          </div>
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
                Recorded 3-stage timestamps (Office Departure, Site Arrival, Work Completed &amp;
                Punch-Out) are audit-locked and preserved automatically.
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
