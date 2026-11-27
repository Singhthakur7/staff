import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Navigation,
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
import { LiveSelfieCaptureBox } from '../LiveSelfieCaptureBox';

export const StaffDutyTab: React.FC<{ staff: StaffMember }> = ({ staff }) => {
  const {
    activeDb,
    addDutyPunchIn,
    recordDutyMilestone,
    openLightbox,
    pushToast,
  } = useStaffOnline();

  // Stage 1: Office Departure Start Form (ZERO manual time pickers/dropdowns!)
  const [workTitle, setWorkTitle] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [mode, setMode] = useState(DUTY_MODES[0]);
  const [fromLocation, setFromLocation] = useState('Office');
  const [toLocation, setToLocation] = useState('');
  const [dutyWage, setDutyWage] = useState(String(staff.dutyWage));
  const [stage1Selfie, setStage1Selfie] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live Clock & Active Stage Modal State
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeStageModal, setActiveStageModal] = useState<
    null | 'departed' | 'arrived' | 'punched_out'
  >(null);
  const [modalSelfie, setModalSelfie] = useState('');
  const [workCompletedChecked, setWorkCompletedChecked] = useState(false);
  const [workCompletionNote, setWorkCompletionNote] = useState('');
  const [stampingStep, setStampingStep] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setDutyWage(String(staff.dutyWage));
  }, [staff.dutyWage]);

  const liveClockStr = formatTimeWithSecondsIN(new Date(nowMs).toISOString());
  const liveShortClock = formatTimeIN(new Date(nowMs).toISOString());
  const todayIso = getTodayISO();

  const myPunches = activeDb.punchLogs.filter((p) => p.staffId === staff.id);
  const activeDuty =
    myPunches.find((p) => p.type === 'duty_punch' && p.status === 'active') || null;
  const latestTodayDuty =
    activeDuty ||
    myPunches.find((p) => p.type === 'duty_punch' && p.date === todayIso) ||
    null;
  const myAssignedWorks = activeDb.works.filter((w) => w.assignedStaffIds.includes(staff.id));

  const openStageModal = (stage: 'departed' | 'arrived' | 'punched_out') => {
    setModalSelfie('');
    setWorkCompletedChecked(false);
    setWorkCompletionNote('');
    setActiveStageModal(stage);
  };

  const handleStartOfficeDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDuty) {
      pushToast({
        type: 'warning',
        title: 'Complete and Punch-Out your active shift first',
      });
      return;
    }
    if (!workTitle.trim()) {
      pushToast({ type: 'error', title: 'Please enter the Work / Site Title' });
      return;
    }
    if (!stage1Selfie) {
      pushToast({
        type: 'error',
        title: 'Capture a live front-camera selfie for Office Departure first',
      });
      return;
    }
    setSubmitting(true);
    const gps = await captureBrowserGps(4500);
    await addDutyPunchIn({
      workTitle: workTitle.trim(),
      date,
      mode,
      fromLocation: fromLocation.trim() || 'Office',
      toLocation: toLocation.trim() || 'Work Site',
      dutyWage: Math.max(0, Number(dutyWage) || staff.dutyWage),
      selfieUrl: stage1Selfie,
      asOfficeDeparture: true,
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsLabel: gps.label,
    });
    setSubmitting(false);
    setWorkTitle('');
    setFromLocation('Office');
    setToLocation('');
    setStage1Selfie('');
  };

  const handleConfirmStageModal = async () => {
    if (!activeDuty || !activeStageModal || stampingStep) return;
    if (!modalSelfie) {
      pushToast({ type: 'error', title: 'Live front-camera selfie is required for this stage' });
      return;
    }
    if (activeStageModal === 'punched_out' && !workCompletedChecked) {
      pushToast({
        type: 'error',
        title: 'Please check "Work Completed" before confirming Punch-Out',
      });
      return;
    }

    setStampingStep(activeStageModal);
    const gps = await captureBrowserGps(4500);
    const ok = await recordDutyMilestone(activeDuty.id, activeStageModal, {
      gps,
      selfieUrl: modalSelfie,
      workCompleted: activeStageModal === 'punched_out' ? true : undefined,
      workCompletionNote:
        activeStageModal === 'punched_out' ? workCompletionNote.trim() : undefined,
    });
    setStampingStep(null);
    if (ok) {
      setActiveStageModal(null);
      setModalSelfie('');
      setWorkCompletedChecked(false);
      setWorkCompletionNote('');
    }
  };

  const hasDeparted = Boolean(activeDuty?.departTime);
  const hasArrived = Boolean(activeDuty?.arriveTime);
  const hasPunchedOut = Boolean(activeDuty?.punchOutTime);

  const nextActiveStage: 'departed' | 'arrived' | 'punched_out' | null = !activeDuty
    ? null
    : !hasDeparted
      ? 'departed'
      : !hasArrived
        ? 'arrived'
        : !hasPunchedOut
          ? 'punched_out'
          : null;

  const trackerShift = activeDuty || latestTodayDuty;
  const trackerStageMeta = trackerShift ? getDutyStageInfo(trackerShift) : null;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TODAY'S 3-STAGE SITE TRACKING STATUS & INTERACTIVE STEPPER
         ===================================================================== */}
      {trackerShift && trackerStageMeta && (
        <div className="bg-[#0B1120] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-5">
          {/* Header: Shift Title, Stage Badge & Live Shift Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    activeDuty
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {activeDuty && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {trackerStageMeta.label}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {trackerShift.mode} · {formatINR(trackerShift.dutyWage)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-extrabold text-white truncate">
                {trackerShift.workTitle}
              </h3>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                <span>
                  {trackerShift.fromLocation || 'Office'} → {trackerShift.toLocation || 'Work Site'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-sky-300">{formatDateIN(trackerShift.date)}</span>
              </p>
            </div>

            {/* Live Shift Timer or Completed Duration */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 sm:text-right shrink-0">
              <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 flex items-center sm:justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {activeDuty ? 'Live Shift Timer' : 'Completed Shift'}
              </p>
              <p className="text-2xl font-mono font-extrabold text-emerald-300 tabular-nums mt-0.5">
                {activeDuty
                  ? formatElapsedTimer(activeDuty.punchInTime, nowMs)
                  : trackerShift.totalDurationText ||
                    (trackerShift.punchOutTime
                      ? formatShiftDuration(trackerShift.punchInTime, trackerShift.punchOutTime)
                      : 'Done')}
              </p>
              <p className="text-[11px] font-mono text-slate-400">Clock: {liveClockStr}</p>
            </div>
          </div>

          {/* Clean Visual 3-Stage Shift Progress Tracker */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Today&apos;s Site Journey Status
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  num: 1,
                  title: '1. Office Departure',
                  subtitle: 'Left Office for Site',
                  time: trackerShift.departTime,
                  selfie: trackerShift.departSelfieUrl || trackerShift.selfieUrl,
                  done: Boolean(trackerShift.departTime),
                  active: nextActiveStage === 'departed',
                },
                {
                  num: 2,
                  title: '2. Site Arrival',
                  subtitle: 'Reached Work Site',
                  time: trackerShift.arriveTime,
                  selfie: trackerShift.arriveSelfieUrl,
                  done: Boolean(trackerShift.arriveTime),
                  active: nextActiveStage === 'arrived',
                },
                {
                  num: 3,
                  title: '3. Work Completed & Punch-Out',
                  subtitle: trackerShift.workCompletionNote
                    ? `Note: ${trackerShift.workCompletionNote}`
                    : 'Confirm Work Done & Close',
                  time: trackerShift.punchOutTime,
                  selfie: trackerShift.punchOutSelfieUrl,
                  done: Boolean(trackerShift.punchOutTime),
                  active: nextActiveStage === 'punched_out',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`rounded-2xl p-3 border flex items-center justify-between gap-3 transition-all ${
                    step.done
                      ? 'bg-emerald-500/15 border-emerald-500/40'
                      : step.active
                        ? 'bg-[#2563EB]/25 border-sky-400/70 ring-2 ring-sky-400/30'
                        : 'bg-white/5 border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        step.done
                          ? 'bg-emerald-500 text-slate-950'
                          : step.active
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.done ? '✓' : step.num}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white truncate">{step.title}</p>
                      <p className="text-[10px] text-slate-300 truncate">{step.subtitle}</p>
                      <p
                        className={`text-[11px] font-mono font-bold mt-0.5 ${
                          step.done
                            ? 'text-emerald-300'
                            : step.active
                              ? 'text-sky-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {step.time ? formatTimeIN(step.time) : step.active ? 'Next Active Step' : 'Pending'}
                      </p>
                    </div>
                  </div>
                  {step.selfie && (
                    <button
                      type="button"
                      onClick={() => openLightbox(step.selfie!)}
                      className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0"
                      title="View verification selfie"
                    >
                      <img
                        src={step.selfie}
                        alt={step.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive 3-Stage Action Buttons (only while shift is active) */}
          {activeDuty && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1 Button: Office Departure */}
              <button
                type="button"
                disabled={hasDeparted}
                onClick={() => openStageModal('departed')}
                className={`min-h-[68px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                  hasDeparted
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 cursor-default'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] border-sky-400/60 text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.85)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hasDeparted ? 'bg-emerald-500 text-slate-950' : 'bg-white/20 text-white'
                    }`}
                  >
                    {hasDeparted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Rocket className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-tight">
                      {hasDeparted ? '✓ Office Departure' : '1. Office Departure'}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        hasDeparted ? 'text-emerald-300 font-mono' : 'text-sky-100'
                      }`}
                    >
                      {hasDeparted
                        ? `Logged at ${formatTimeIN(activeDuty.departTime)}`
                        : 'Left Office for Site'}
                    </p>
                  </div>
                </div>
                {hasDeparted ? (
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase shrink-0">
                    Selfie
                  </span>
                )}
              </button>

              {/* Stage 2 Button: Site Arrival */}
              <button
                type="button"
                disabled={hasArrived}
                onClick={() => openStageModal('arrived')}
                className={`min-h-[68px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                  hasArrived
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 cursor-default'
                    : nextActiveStage === 'arrived'
                      ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 text-white shadow-[0_10px_24px_-8px_rgba(2,132,199,0.85)] ring-2 ring-sky-400/40'
                      : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hasArrived
                        ? 'bg-emerald-500 text-slate-950'
                        : nextActiveStage === 'arrived'
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {hasArrived ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Navigation className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-tight">
                      {hasArrived ? '✓ Site Arrival' : '2. Site Arrival'}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        hasArrived
                          ? 'text-emerald-300 font-mono'
                          : nextActiveStage === 'arrived'
                            ? 'text-sky-100'
                            : 'text-slate-400'
                      }`}
                    >
                      {hasArrived
                        ? `Logged at ${formatTimeIN(activeDuty.arriveTime)}`
                        : 'Reached Work Site'}
                    </p>
                  </div>
                </div>
                {hasArrived ? (
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase shrink-0">
                    {nextActiveStage === 'arrived' ? 'Next Step' : 'Selfie'}
                  </span>
                )}
              </button>

              {/* Stage 3 Button: Work Completed & Punch-Out */}
              <button
                type="button"
                onClick={() => openStageModal('punched_out')}
                className={`min-h-[68px] w-full px-4 py-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
                  nextActiveStage === 'punched_out'
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white shadow-[0_10px_24px_-8px_rgba(225,29,72,0.85)] ring-2 ring-rose-400/40'
                    : 'bg-white/5 hover:bg-rose-950/40 border-rose-500/35 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      nextActiveStage === 'punched_out'
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <StopCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-tight">
                      3. Work Completed &amp; Punch-Out
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        nextActiveStage === 'punched_out' ? 'text-rose-100' : 'text-rose-300/80'
                      }`}
                    >
                      Confirm done &amp; credit {formatINR(activeDuty.dutyWage)}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] font-extrabold uppercase shrink-0">
                  {nextActiveStage === 'punched_out' ? 'Finish' : 'Close'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          START NEW SHIFT — STAGE 1: OFFICE DEPARTURE (LIVE SELFIE + GPS)
         ===================================================================== */}
      <form
        onSubmit={handleStartOfficeDeparture}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 card-elevated space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-display font-bold text-[#0F172A]">
              Stage 1 — Office Departure (Left Office for Site)
            </h2>
            <p className="text-xs text-slate-500">
              Capture your live front-camera selfie to log Office Departure. Next, capture Site
              Arrival when you reach the site, then confirm Work Completed before Punch-Out.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-[#0F172A] font-mono text-xs font-bold shrink-0 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            {liveClockStr}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Duty Info Fields */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Work / Site Title (എന്ത് വർക്ക്) *
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
                Date (തീയതി) *
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
                Mode (എങ്ങനെ) *
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
                placeholder="e.g. Office / Studio"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                To Site (എവിടേക്ക്)
              </label>
              <input
                type="text"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="e.g. Work Site / Venue"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
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

          {/* Right: Stage 1 Live Selfie Box */}
          <div className="lg:col-span-5">
            <LiveSelfieCaptureBox
              capturedSelfie={stage1Selfie}
              onCapture={setStage1Selfie}
              title="Stage 1: Office Departure Live Selfie"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || Boolean(activeDuty) || !stage1Selfie}
            className="w-full sm:w-auto min-h-[52px] px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-[0_8px_20px_-6px_rgba(37,99,235,0.45)]"
          >
            <Rocket className="w-4 h-4" />
            {submitting
              ? 'Uploading Selfie & Recording Departure...'
              : activeDuty
                ? 'Active Shift Running Above'
                : `Office Departure — Left Office for Site (${liveShortClock})`}
          </button>
          <p className="text-[11px] text-slate-500">
            Earned wage ({formatINR(Number(dutyWage) || staff.dutyWage)}) auto-credits to your
            Salary Slip after Work Completed &amp; Punch-Out.
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
                    Route: <strong>{w.fromLocation || 'Office'}</strong> →{' '}
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
                          setFromLocation(w.fromLocation || 'Office');
                          setToLocation(w.toLocation || w.clientVenue || '');
                          pushToast({
                            type: 'info',
                            title: 'Filled work details — capture selfie & log Office Departure',
                          });
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Use for Office Departure ↑
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
          MY DUTY & PUNCH HISTORY (3-STAGE TIMELINE + STAGE SELFIE THUMBNAILS)
         ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden card-elevated">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0F172A]">
            My Duty &amp; Punch History — 3-Stage Site Tracking ({myPunches.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">LIVE SELFIE VERIFIED</span>
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
              const departPhoto = p.departSelfieUrl || p.selfieUrl;
              const hasCoords = typeof p.gpsLat === 'number' && typeof p.gpsLng === 'number';
              const mapsHref = hasCoords
                ? `https://www.google.com/maps?q=${p.gpsLat},${p.gpsLng}`
                : undefined;

              return (
                <div key={p.id} className="p-4 sm:px-5 space-y-3 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {departPhoto ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(departPhoto)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                        >
                          <img
                            src={departPhoto}
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
                            {p.fromLocation || 'Office'} → {p.toLocation || 'Site'}
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

                  {/* 3-Stage Site Tracking Strip */}
                  {p.type === 'duty_punch' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              1. Office Departure
                            </p>
                            <p className="font-mono font-bold text-[#0F172A]">
                              {p.departTime ? formatTimeIN(p.departTime) : '—'}
                            </p>
                          </div>
                          {departPhoto && (
                            <button
                              type="button"
                              onClick={() => openLightbox(departPhoto)}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                              title="View Office Departure selfie"
                            >
                              <img
                                src={departPhoto}
                                alt="Office Departure"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              2. Site Arrival
                            </p>
                            <p className="font-mono font-bold text-[#0F172A]">
                              {p.arriveTime ? formatTimeIN(p.arriveTime) : '—'}
                            </p>
                          </div>
                          {p.arriveSelfieUrl && (
                            <button
                              type="button"
                              onClick={() => openLightbox(p.arriveSelfieUrl!)}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-sky-200 shrink-0"
                              title="View Site Arrival selfie"
                            >
                              <img
                                src={p.arriveSelfieUrl}
                                alt="Site Arrival"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              3. Work Done &amp; Punch-Out
                            </p>
                            <p className="font-mono font-bold text-emerald-700">
                              {p.punchOutTime ? formatTimeIN(p.punchOutTime) : 'Active'}
                            </p>
                          </div>
                          {p.punchOutSelfieUrl && (
                            <button
                              type="button"
                              onClick={() => openLightbox(p.punchOutSelfieUrl!)}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-emerald-200 shrink-0"
                              title="View Punch-Out selfie"
                            >
                              <img
                                src={p.punchOutSelfieUrl}
                                alt="Punch-Out"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.workCompletionNote && (
                        <p className="text-[11px] text-slate-600 bg-emerald-50/70 border border-emerald-200/70 rounded-xl px-3 py-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>
                            <strong>Completion Remark:</strong> {p.workCompletionNote}
                          </span>
                        </p>
                      )}
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

      {/* =====================================================================
          STAGE SELFIE & WORK COMPLETED CONFIRMATION MODAL
         ===================================================================== */}
      {activeStageModal && activeDuty && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !stampingStep && setActiveStageModal(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`px-5 py-4 text-white flex items-center justify-between gap-3 ${
                activeStageModal === 'punched_out'
                  ? 'bg-rose-700'
                  : activeStageModal === 'arrived'
                    ? 'bg-sky-700'
                    : 'bg-[#1E3A8A]'
              }`}
            >
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-display font-bold truncate">
                  {activeStageModal === 'departed'
                    ? 'Stage 1 — Office Departure (Left Office for Site)'
                    : activeStageModal === 'arrived'
                      ? 'Stage 2 — Site Arrival (Reached Work Site)'
                      : 'Stage 3 — Work Completed & Punch-Out'}
                </h3>
                <p className="text-[11px] text-white/80 truncate">
                  {activeDuty.workTitle} · Live Time: {liveShortClock}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(stampingStep)}
                onClick={() => setActiveStageModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Stage 3 Mandatory Work Completed Confirmation */}
              {activeStageModal === 'punched_out' && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workCompletedChecked}
                      onChange={(e) => setWorkCompletedChecked(e.target.checked)}
                      className="mt-0.5 w-5 h-5 accent-emerald-600 rounded shrink-0"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-[#0F172A]">
                        Work Completed (Required) *
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Confirm that all site duties are completed. &ldquo;Confirm &amp; Punch
                        Out&rdquo; remains disabled until this checkbox is checked.
                      </p>
                    </div>
                  </label>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Work Completion Note / Remark (Optional)
                    </label>
                    <input
                      type="text"
                      value={workCompletionNote}
                      onChange={(e) => setWorkCompletionNote(e.target.value)}
                      placeholder="e.g. Completed full shoot & packed all gear safely"
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-[#0F172A]"
                    />
                  </div>
                </div>
              )}

              {/* Live Selfie Capture */}
              <LiveSelfieCaptureBox
                capturedSelfie={modalSelfie}
                onCapture={setModalSelfie}
                autoStart
                title={
                  activeStageModal === 'departed'
                    ? 'Capture Office Departure Live Selfie'
                    : activeStageModal === 'arrived'
                      ? 'Capture Site Arrival Live Selfie'
                      : 'Capture Work Completed & Punch-Out Selfie'
                }
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={Boolean(stampingStep)}
                  onClick={() => setActiveStageModal(null)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(stampingStep) ||
                    !modalSelfie ||
                    (activeStageModal === 'punched_out' && !workCompletedChecked)
                  }
                  onClick={() => void handleConfirmStageModal()}
                  className={`min-h-[44px] px-5 rounded-xl disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 ${
                    activeStageModal === 'punched_out'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : activeStageModal === 'arrived'
                        ? 'bg-sky-600 hover:bg-sky-700'
                        : 'bg-[#2563EB] hover:bg-[#1E3A8A]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {stampingStep
                    ? 'Uploading Selfie & Saving...'
                    : activeStageModal === 'departed'
                      ? `Confirm Office Departure (${liveShortClock})`
                      : activeStageModal === 'arrived'
                        ? `Confirm Site Arrival (${liveShortClock})`
                        : `Confirm & Punch Out (${liveShortClock})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
