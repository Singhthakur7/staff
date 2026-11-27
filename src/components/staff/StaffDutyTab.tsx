import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  Navigation,
  PlayCircle,
  Rocket,
  StopCircle,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { DUTY_MODES, StaffMember } from '../../types';
import {
  captureBrowserGps,
  formatDateIN,
  formatElapsedTimer,
  formatINR,
  formatShiftDuration,
  formatTimeIN,
  formatTimeWithSecondsIN,
  getDutyStageInfo,
  getTodayISO,
} from '../../utils/helpers';

export const StaffDutyTab: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const {
    activeDb,
    addDutyPunchIn,
    recordDutyMilestone,
    openLightbox,
    pushToast,
  } = useStaffOnline();

  // Start Duty Form (ZERO manual time pickers/dropdowns!)
  const [workTitle, setWorkTitle] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [mode, setMode] = useState(DUTY_MODES[0]);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [dutyWage, setDutyWage] = useState(String(staff.dutyWage));
  const [submitting, setSubmitting] = useState(false);

  // Live Clock & Milestone Recording State
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [stampingStep, setStampingStep] = useState<string | null>(null);
  const [earlyPunchOutOpen, setEarlyPunchOutOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const liveClockStr = formatTimeWithSecondsIN(new Date(nowMs).toISOString());
  const liveShortClock = formatTimeIN(new Date(nowMs).toISOString());

  const myPunches = activeDb.punchLogs.filter((p) => p.staffId === staff.id);
  const activeDuty =
    myPunches.find((p) => p.type === 'duty_punch' && p.status === 'active') || null;
  const myAssignedWorks = activeDb.works.filter((w) => w.assignedStaffIds.includes(staff.id));

  const handleStartDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDuty) {
      pushToast({
        type: 'warning',
        title: 'Finish or Punch-Out your active duty shift first',
      });
      return;
    }
    if (!workTitle.trim()) {
      pushToast({ type: 'error', title: 'Please enter the Work / Event Title' });
      return;
    }
    setSubmitting(true);
    const gps = await captureBrowserGps(4500);
    await addDutyPunchIn({
      workTitle: workTitle.trim(),
      date,
      mode,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      dutyWage: Math.max(0, Number(dutyWage) || staff.dutyWage),
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsLabel: gps.label,
    });
    setSubmitting(false);
    setWorkTitle('');
    setFromLocation('');
    setToLocation('');
  };

  const handleTapMilestone = async (
    milestone: 'departed' | 'arrived' | 'work_completed' | 'punched_out'
  ) => {
    if (!activeDuty || stampingStep) return;
    setStampingStep(milestone);
    const gps = await captureBrowserGps(4500);
    await recordDutyMilestone(activeDuty.id, milestone, gps);
    setStampingStep(null);
    setEarlyPunchOutOpen(false);
  };

  // Determine sequential unlock state for the active duty
  const hasDeparted = Boolean(activeDuty?.departTime);
  const hasArrived = Boolean(activeDuty?.arriveTime);
  const hasWorkCompleted = Boolean(activeDuty?.workCompletedTime);
  const hasPunchedOut = Boolean(activeDuty?.punchOutTime);

  const nextActiveStep: 'departed' | 'arrived' | 'work_completed' | 'punched_out' | null =
    !activeDuty
      ? null
      : !hasDeparted
        ? 'departed'
        : !hasArrived
          ? 'arrived'
          : !hasWorkCompleted
            ? 'work_completed'
            : !hasPunchedOut
              ? 'punched_out'
              : null;

  const activeStageMeta = activeDuty ? getDutyStageInfo(activeDuty) : null;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          ULTRA-PREMIUM LIVE DUTY PROGRESS STEPPER & 4 AUTO-TIMESTAMP BUTTONS
         ===================================================================== */}
      {activeDuty && activeStageMeta && (
        <div className="bg-[#0B1120] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-5">
          {/* Header: Shift Title, Stage Badge & Live Ticking Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeStageMeta.label} ({activeStageMeta.labelMl})
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {activeDuty.mode} · {formatINR(activeDuty.dutyWage)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-extrabold text-white truncate">
                {activeDuty.workTitle}
              </h3>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                <span>
                  {activeDuty.fromLocation || 'Base'} → {activeDuty.toLocation || 'Venue'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-sky-300">
                  Punch-In: {formatTimeIN(activeDuty.punchInTime)}
                </span>
              </p>
            </div>

            {/* Live Shift Elapsed Timer */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 sm:text-right shrink-0">
              <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 flex items-center sm:justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Live Shift Timer
              </p>
              <p className="text-2xl font-mono font-extrabold text-emerald-300 tabular-nums mt-0.5">
                {formatElapsedTimer(activeDuty.punchInTime, nowMs)}
              </p>
              <p className="text-[11px] font-mono text-slate-400">Clock: {liveClockStr}</p>
            </div>
          </div>

          {/* Visual 5-Milestone Progress Bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
              {[
                {
                  key: 'in',
                  label: 'Punch-In',
                  done: true,
                  time: activeDuty.punchInTime,
                },
                {
                  key: 'dep',
                  label: 'Departed',
                  done: hasDeparted,
                  active: nextActiveStep === 'departed',
                  time: activeDuty.departTime,
                },
                {
                  key: 'arr',
                  label: 'Arrived',
                  done: hasArrived,
                  active: nextActiveStep === 'arrived',
                  time: activeDuty.arriveTime,
                },
                {
                  key: 'comp',
                  label: 'Completed',
                  done: hasWorkCompleted,
                  active: nextActiveStep === 'work_completed',
                  time: activeDuty.workCompletedTime,
                },
                {
                  key: 'out',
                  label: 'Punch-Out',
                  done: hasPunchedOut,
                  active: nextActiveStep === 'punched_out',
                  time: activeDuty.punchOutTime,
                },
              ].map((m, idx) => (
                <div key={m.key} className="flex flex-col items-center space-y-1.5">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold border transition-all ${
                      m.done
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : m.active
                          ? 'bg-[#2563EB] border-sky-300 text-white ring-4 ring-blue-500/30'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {m.done ? '✓' : idx + 1}
                  </div>
                  <p
                    className={`text-[10px] sm:text-[11px] font-bold leading-tight ${
                      m.done
                        ? 'text-emerald-300'
                        : m.active
                          ? 'text-white'
                          : 'text-slate-500'
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-mono text-slate-300 leading-none">
                    {m.time ? formatTimeIN(m.time) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Sequential One-Tap Auto-Timestamp Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* STEP 1: DEPARTED */}
            {(() => {
              const done = hasDeparted;
              const isNext = nextActiveStep === 'departed';
              const busy = stampingStep === 'departed';
              return (
                <button
                  type="button"
                  disabled={done || !isNext || Boolean(stampingStep)}
                  onClick={() => void handleTapMilestone('departed')}
                  className={`min-h-[60px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                    done
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 cursor-default'
                      : isNext
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] border-sky-400/60 text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.85)] active:scale-[0.99]'
                        : 'bg-white/5 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        done
                          ? 'bg-emerald-500 text-slate-950'
                          : isNext
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-tight">
                        {done ? '✓ Departed (പുറപ്പെട്ടു)' : '1. 🚀 Departed (പുറപ്പെട്ടു)'}
                      </p>
                      <p
                        className={`text-[11px] font-mono mt-0.5 ${
                          done ? 'text-emerald-300' : isNext ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {done
                          ? `Locked at ${formatTimeWithSecondsIN(activeDuty.departTime)}`
                          : busy
                            ? 'Recording Live Time & GPS...'
                            : isNext
                              ? `Tap to record • ${liveShortClock}`
                              : 'Waiting'}
                      </p>
                    </div>
                  </div>
                  {done ? (
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isNext ? (
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                      Tap Now
                    </span>
                  ) : null}
                </button>
              );
            })()}

            {/* STEP 2: ARRIVED */}
            {(() => {
              const done = hasArrived;
              const isNext = nextActiveStep === 'arrived';
              const busy = stampingStep === 'arrived';
              return (
                <button
                  type="button"
                  disabled={done || !isNext || Boolean(stampingStep)}
                  onClick={() => void handleTapMilestone('arrived')}
                  className={`min-h-[60px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                    done
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 cursor-default'
                      : isNext
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] border-sky-400/60 text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.85)] active:scale-[0.99]'
                        : 'bg-white/5 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        done
                          ? 'bg-emerald-500 text-slate-950'
                          : isNext
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Navigation className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-tight">
                        {done ? '✓ Arrived (എത്തി)' : '2. 📍 Arrived (എത്തി)'}
                      </p>
                      <p
                        className={`text-[11px] font-mono mt-0.5 ${
                          done ? 'text-emerald-300' : isNext ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {done
                          ? `Locked at ${formatTimeWithSecondsIN(activeDuty.arriveTime)}`
                          : busy
                            ? 'Recording Live Time & GPS...'
                            : isNext
                              ? `Tap to record • ${liveShortClock}`
                              : 'Unlocks after Departed'}
                      </p>
                    </div>
                  </div>
                  {done ? (
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isNext ? (
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                      Tap Now
                    </span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })()}

            {/* STEP 3: WORK COMPLETED */}
            {(() => {
              const done = hasWorkCompleted;
              const isNext = nextActiveStep === 'work_completed';
              const busy = stampingStep === 'work_completed';
              return (
                <button
                  type="button"
                  disabled={done || !isNext || Boolean(stampingStep)}
                  onClick={() => void handleTapMilestone('work_completed')}
                  className={`min-h-[60px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                    done
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 cursor-default'
                      : isNext
                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/70 text-white shadow-[0_10px_24px_-8px_rgba(16,185,129,0.75)] active:scale-[0.99]'
                        : 'bg-white/5 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        done
                          ? 'bg-emerald-500 text-slate-950'
                          : isNext
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-tight">
                        {done
                          ? '✓ Work Completed (വർക്ക് പൂർത്തിയായി)'
                          : '3. ✅ Work Completed (വർക്ക് പൂർത്തിയായി)'}
                      </p>
                      <p
                        className={`text-[11px] font-mono mt-0.5 ${
                          done ? 'text-emerald-300' : isNext ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {done
                          ? `Locked at ${formatTimeWithSecondsIN(activeDuty.workCompletedTime)}`
                          : busy
                            ? 'Recording Live Time & GPS...'
                            : isNext
                              ? `Tap to record • ${liveShortClock}`
                              : 'Unlocks after Arrived'}
                      </p>
                    </div>
                  </div>
                  {done ? (
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isNext ? (
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                      Tap Now
                    </span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })()}

            {/* STEP 4: PUNCH OUT */}
            {(() => {
              const isNext = nextActiveStep === 'punched_out';
              const busy = stampingStep === 'punched_out';
              return (
                <button
                  type="button"
                  disabled={Boolean(stampingStep)}
                  onClick={() => {
                    if (isNext) {
                      void handleTapMilestone('punched_out');
                    } else {
                      setEarlyPunchOutOpen(true);
                    }
                  }}
                  className={`min-h-[60px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                    isNext
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-400/70 text-white shadow-[0_10px_24px_-8px_rgba(225,29,72,0.8)] active:scale-[0.99]'
                      : 'bg-white/5 hover:bg-rose-950/40 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isNext ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      <StopCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-tight">
                        4. ⏹️ Punch Out (പഞ്ച്-ഔട്ട്)
                      </p>
                      <p
                        className={`text-[11px] font-mono mt-0.5 ${
                          isNext ? 'text-rose-100' : 'text-rose-300/80'
                        }`}
                      >
                        {busy
                          ? 'Closing Shift & Crediting Wage...'
                          : isNext
                            ? `Tap to finish & credit ${formatINR(activeDuty.dutyWage)} • ${liveShortClock}`
                            : 'Emergency Early Punch-Out (Confirmation)'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      isNext ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {isNext ? 'Finish' : 'Early Out'}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* =====================================================================
          START NEW DUTY FORM (NO MANUAL TIME PICKERS / DROPDOWNS)
         ===================================================================== */}
      <form
        onSubmit={handleStartDuty}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              Start New Duty / Punch-In (പുതിയ ഡ്യൂട്ടി ആരംഭിക്കുക)
            </h2>
            <p className="text-xs text-slate-500">
              All timestamps (Punch-In, Departed, Arrived, Work Completed &amp; Punch-Out) are
              captured automatically with live clock &amp; GPS.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-[#0F172A] font-mono text-xs font-bold shrink-0 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            {liveClockStr}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Work / Event Title (എന്ത് വർക്ക്) *
            </label>
            <input
              type="text"
              required
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="e.g. St. Thomas Auditorium Multi-Cam Live"
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
              placeholder="e.g. Studio / Base"
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
              placeholder="e.g. Event Venue"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || Boolean(activeDuty)}
            className="w-full sm:w-auto min-h-[52px] px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)]"
          >
            <PlayCircle className="w-4 h-4" />
            {submitting
              ? 'Capturing GPS & Starting Duty...'
              : activeDuty
                ? 'Active Shift Running Above'
                : `▶️ Start Duty / Punch-In (${liveShortClock})`}
          </button>
          <p className="text-[11px] text-slate-500">
            Earned wage ({formatINR(Number(dutyWage) || staff.dutyWage)}) auto-credits to your
            Salary Slip on Punch-Out.
          </p>
        </div>
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
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {w.mapsLink && (
                      <a
                        href={w.mapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Open Directions
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {!activeDuty && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkTitle(w.title);
                          setDate(w.date || getTodayISO());
                          setFromLocation(w.fromLocation || '');
                          setToLocation(w.toLocation || w.clientVenue || '');
                          pushToast({
                            type: 'info',
                            title: 'Filled work details — tap Start Duty / Punch-In',
                          });
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Use for Duty Punch-In ↑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          MY DUTY & PUNCH HISTORY (DAILY DETAILS WITH FULL 5-STEP TIMELINE)
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0F172A]">
            My Duty &amp; Punch History — Daily Details ({myPunches.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">AUTO-TIMESTAMPED</span>
        </div>
        {myPunches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No punches recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myPunches.map((p) => {
              const stageMeta = getDutyStageInfo(p);
              const duration =
                p.totalDurationText ||
                (p.punchOutTime ? formatShiftDuration(p.punchInTime, p.punchOutTime) : '');
              const hasCoords = typeof p.gpsLat === 'number' && typeof p.gpsLng === 'number';
              const mapsHref = hasCoords
                ? `https://www.google.com/maps?q=${p.gpsLat},${p.gpsLng}`
                : undefined;

              return (
                <div key={p.id} className="p-4 sm:px-5 space-y-3 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {p.selfieUrl ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(p.selfieUrl)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                        >
                          <img
                            src={p.selfieUrl}
                            alt="Punch selfie"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#0F172A] truncate">{p.workTitle}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stageMeta.badgeClass}`}
                          >
                            {stageMeta.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateIN(p.date)} · {p.mode} · Route:{' '}
                          <strong className="text-slate-700">
                            {p.fromLocation || 'Base'} → {p.toLocation || 'Venue'}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-extrabold text-[#0F172A] tabular-nums">
                        {formatINR(p.dutyWage)}
                      </p>
                      {duration && (
                        <p className="text-[11px] font-mono font-semibold text-emerald-700">
                          Dur: {duration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Full Auto-Recorded 5-Timestamp Timeline Strip */}
                  {p.type === 'duty_punch' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-[11px]">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Punch-In</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {formatTimeIN(p.punchInTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Departed</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.departTime ? formatTimeIN(p.departTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Arrived</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.arriveTime ? formatTimeIN(p.arriveTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Work Done</p>
                        <p className="font-mono font-bold text-[#0F172A]">
                          {p.workCompletedTime ? formatTimeIN(p.workCompletedTime) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Punch-Out</p>
                        <p className="font-mono font-bold text-emerald-700">
                          {p.punchOutTime ? formatTimeIN(p.punchOutTime) : 'Active'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                      <span>Verified Login Check-In: {formatTimeIN(p.punchInTime)}</span>
                      {mapsHref && (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2563EB] hover:underline inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          GPS Pin
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Early Punch-Out Confirmation Modal */}
      {earlyPunchOutOpen && activeDuty && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEarlyPunchOutOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Confirm Early Punch-Out</h3>
              </div>
              <button
                type="button"
                onClick={() => setEarlyPunchOutOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Some earlier duty steps (Departed / Arrived / Work Completed) have not been stamped
                yet for <strong>{activeDuty.workTitle}</strong>. Are you sure you want to Punch-Out
                now at <strong className="font-mono">{liveShortClock}</strong>?
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEarlyPunchOutOpen(false)}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={stampingStep === 'punched_out'}
                  onClick={() => void handleTapMilestone('punched_out')}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" />
                  {stampingStep === 'punched_out' ? 'Punching Out...' : 'Yes, Punch-Out Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
