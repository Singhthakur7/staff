import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  LocateFixed,
  MapPin,
  Megaphone,
  MessageCircle,
  Play,
  RotateCcw,
  Square,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { AttendanceRecord, RateMode } from '../../types';
import {
  buildMapsUrl,
  calculateShiftWage,
  compressCanvasUnder80KB,
  fileToCompressedDataUrl,
  formatDateTimeShort,
  formatDurationHHMMSS,
  formatINR,
  GeoCoords,
  getRateModeLabel,
  getTodayISO,
  KOTTAYAM_FALLBACK,
} from '../../utils/helpers';

export const StaffPunchTab: React.FC = () => {
  const {
    state,
    session,
    activeCompany,
    punchIn,
    punchOut,
    updateAttendance,
    acknowledgeInstruction,
    openWhatsAppModal,
    openLightbox,
    pushToast,
  } = useErp();

  const staffMember = state.staff.find((s) => s.id === session?.userId);
  const todayISO = getTodayISO();

  // Live 1s timer tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Live GPS watcher with Kottayam fallback
  const [coords, setCoords] = useState<GeoCoords>(KOTTAYAM_FALLBACK);
  useEffect(() => {
    let watchId: number | null = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(5));
            const lng = Number(pos.coords.longitude.toFixed(5));
            setCoords({
              lat,
              lng,
              label: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
              isFallback: false,
            });
          },
          () => setCoords(KOTTAYAM_FALLBACK),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 }
        );
      }
    } catch {
      setCoords(KOTTAYAM_FALLBACK);
    }
    return () => {
      try {
        if (watchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Assigned duty today (for auto-prefill)
  const myAssignedWorks = state.works.filter(
    (w) => w.assignedStaffId === session?.userId && w.date >= todayISO
  );
  const todayAssigned = myAssignedWorks.find((w) => w.date === todayISO);

  // Active shift
  const activeShift = state.attendance.find(
    (a) => a.staffId === session?.userId && a.status === 'working'
  );

  // Form states
  const [rateMode, setRateMode] = useState<RateMode>(todayAssigned?.rateMode || 'regular');
  const [studioName, setStudioName] = useState(todayAssigned?.studioName || '');
  const [studioPhone, setStudioPhone] = useState(todayAssigned?.studioWhatsApp || '');
  const [venue, setVenue] = useState(todayAssigned?.venue || '');
  const [fromLocation, setFromLocation] = useState(
    activeCompany?.address ? activeCompany.address.split(',')[0].trim() : 'Base Office'
  );
  const [toLocation, setToLocation] = useState(todayAssigned?.venue || '');
  const [workNotes, setWorkNotes] = useState(todayAssigned?.notes || '');

  // Front Camera Selfie Verification
  const [selfieUrl, setSelfieUrl] = useState<string | undefined>(undefined);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    } catch {
      // Ignore stop errors
    }
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        pushToast({
          type: 'warning',
          title: 'Camera unavailable in browser',
          description: 'Use the Upload Selfie Photo button instead.',
        });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      pushToast({
        type: 'warning',
        title: 'Camera permission denied',
        description: 'You can attach a selfie photo using file upload.',
      });
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setSelfieUrl(compressCanvasUnder80KB(canvas));
        pushToast({ type: 'success', title: 'Live Selfie Captured' });
      }
    } catch {
      pushToast({ type: 'error', title: 'Failed to capture frame' });
    } finally {
      stopCamera();
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      setSelfieUrl(url);
      pushToast({ type: 'success', title: 'Selfie Photo Attached' });
    } catch {
      pushToast({ type: 'error', title: 'Could not read photo' });
    }
  };

  // Edit own attendance modal
  const [editingRec, setEditingRec] = useState<AttendanceRecord | null>(null);
  const [editStudio, setEditStudio] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!staffMember) return null;

  const liveWagePreview = calculateShiftWage(staffMember.dailyWage, rateMode);
  const myInstructions = state.instructions.filter(
    (i) => i.staffId === staffMember.id && !i.acknowledged
  );
  const myLogs = state.attendance.filter((a) => a.staffId === staffMember.id);
  const todaysCrew = state.attendance.filter(
    (a) => a.date === todayISO || a.status === 'working'
  );

  const handlePunchIn = (e: React.FormEvent) => {
    e.preventDefault();
    punchIn({
      staffId: staffMember.id,
      rateMode,
      studioName: studioName.trim() || activeCompany?.name || 'Company Unit',
      studioPhone: studioPhone.trim(),
      venue: venue.trim() || coords.label,
      fromLocation: fromLocation.trim() || 'Base',
      toLocation: toLocation.trim() || venue.trim() || 'Venue',
      workNotes: workNotes.trim(),
      gpsLat: coords.lat,
      gpsLng: coords.lng,
      gpsLabel: coords.label,
      selfieUrl,
    });
  };

  const openEditLog = (rec: AttendanceRecord) => {
    setEditingRec(rec);
    setEditStudio(rec.studioName);
    setEditVenue(rec.venue);
    setEditFrom(rec.fromLocation);
    setEditTo(rec.toLocation);
    setEditNotes(rec.workNotes);
  };

  const saveEditLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRec) return;
    updateAttendance(
      editingRec.id,
      {
        studioName: editStudio,
        venue: editVenue,
        fromLocation: editFrom,
        toLocation: editTo,
        workNotes: editNotes,
      },
      staffMember.name
    );
    setEditingRec(null);
  };

  return (
    <div className="space-y-6">
      {/* Live GPS Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <LocateFixed
            className={`w-4 h-4 shrink-0 ${
              coords.isFallback ? 'text-[#D97706]' : 'text-[#059669]'
            }`}
          />
          <span className="font-semibold text-[#0B1120]">
            {coords.isFallback ? 'GPS Fallback Active' : 'Live GPS Locked'}:
          </span>
          <span className="font-mono text-slate-600">{coords.label}</span>
        </div>
        <a
          href={buildMapsUrl(coords.lat, coords.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
        >
          View Pin <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Admin Live Instructions Banner */}
      {myInstructions.length > 0 && (
        <div className="space-y-2.5">
          {myInstructions.map((ins) => (
            <div
              key={ins.id}
              className="bg-[#0B1120] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#FBBF24]">
                    LIVE ADMIN INSTRUCTION {ins.presetTag ? `· ${ins.presetTag}` : ''}
                  </p>
                  <p className="text-sm text-white mt-1 leading-relaxed">{ins.message}</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Sent {formatDateTimeShort(ins.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => acknowledgeInstruction(ins.id)}
                  className="min-h-[42px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Check className="w-4 h-4" />
                  Acknowledge
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppModal({
                      phone: activeCompany?.phone || '',
                      recipientName: `${activeCompany?.name || 'Company'} Admin`,
                      message: `Hi Sir, ${staffMember.name} here. Regarding your instruction ("${ins.message.slice(
                        0,
                        60
                      )}"): `,
                    })
                  }
                  className="min-h-[42px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  Reply WA
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assigned Duties Card */}
      {myAssignedWorks.length > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#0B1120]">
            My Assigned Duties ({myAssignedWorks.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAssignedWorks.map((w) => (
              <div
                key={w.id}
                className="bg-white border border-blue-100 rounded-xl p-3.5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#2563EB]">
                    {w.date} · Call {w.callTime}
                  </span>
                  <span className="font-semibold text-slate-600">
                    {getRateModeLabel(w.rateMode)}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#0B1120]">{w.eventTitle}</p>
                <p className="text-slate-600">
                  {w.venue} · Studio: {w.studioName}
                </p>
                {w.mapsLink && (
                  <a
                    href={w.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#2563EB] font-semibold hover:underline pt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Open Venue in Google Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Shift Live Card OR Punch-In Duty & Selfie Form */}
      {activeShift ? (
        <div className="bg-[#0B1120] text-white rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#34D399]">SHIFT IN PROGRESS · LIVE TIMER</p>
              <p className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums mt-2">
                {formatDurationHHMMSS(activeShift.punchInTime)}
              </p>
              <p className="text-xs text-slate-300 mt-2">
                {activeShift.venue} · {activeShift.fromLocation} → {activeShift.toLocation}
              </p>
              <p className="text-xs font-mono text-[#FBBF24] mt-1">
                {getRateModeLabel(activeShift.rateMode)} · Wage Earned{' '}
                {formatINR(activeShift.wageEarned)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => punchOut(activeShift.id, coords.lat, coords.lng)}
              className="min-h-[52px] px-6 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Square className="w-4 h-4 fill-current" />
              Punch Out &amp; Finish Shift
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handlePunchIn}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1120]">
                Live Selfie &amp; Duty Punch-In
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify location, select today&apos;s rate mode, attach selfie, and start live shift timer.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">Live Wage Preview</p>
              <p className="text-xl font-extrabold font-mono tabular-nums text-[#059669]">
                {formatINR(liveWagePreview)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Selfie Verification Panel */}
            <div className="lg:col-span-5 bg-[#F4F7FB] border border-slate-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#0B1120]">Live Selfie Verification</p>
              <div className="aspect-[4/3] bg-[#0B1120] rounded-xl overflow-hidden flex items-center justify-center relative">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : selfieUrl ? (
                  <img
                    src={selfieUrl}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-60" />
                    <p className="text-xs">Start front camera or upload selfie</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="min-h-[42px] px-3 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    {selfieUrl ? 'Retake Live' : 'Open Camera'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="min-h-[42px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Capture Photo
                  </button>
                )}

                {cameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                ) : (
                  <label className="min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Duty & Travel Form */}
            <div className="lg:col-span-7 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Duty / Rate Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'regular', label: `Regular (${formatINR(staffMember.dailyWage)})` },
                      {
                        id: 'half',
                        label: `Half Day (${formatINR(Math.round(staffMember.dailyWage * 0.5))})`,
                      },
                      { id: 'own_camera', label: 'Own Camera (₹3,000)' },
                      { id: 'live_single_cam', label: 'Live Single Cam (₹6,000)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRateMode(opt.id)}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                        rateMode === opt.id
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Studio Name"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="tel"
                  value={studioPhone}
                  onChange={(e) => setStudioPhone(e.target.value)}
                  placeholder="Studio Phone / WhatsApp"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
                />
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Event Venue / Auditorium"
                  className="sm:col-span-2 h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  placeholder="Travel From (e.g. Manimala)"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder="Travel To (e.g. Pala Hall)"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <textarea
                rows={2}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Work notes (camera setup, LED cabinet size, generator, live stream info)..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm"
              />

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Punch In &amp; Start Shift ({formatINR(liveWagePreview)})
              </button>
            </div>
          </div>
        </form>
      )}

      {/* My Editable Attendance & Travel Log */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-[#0B1120]">
            My Editable Attendance &amp; Travel Log ({myLogs.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {myLogs.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">No shifts logged yet.</p>
          ) : (
            myLogs.map((rec) => (
              <div
                key={rec.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {rec.selfieUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(rec.selfieUrl!)}
                      className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                    >
                      <img src={rec.selfieUrl} alt="Shift selfie" className="w-full h-full object-cover" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1120]">
                      {rec.date} · {rec.venue}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {rec.studioName} · {rec.fromLocation} → {rec.toLocation}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {getRateModeLabel(rec.rateMode)} · {formatINR(rec.wageEarned)} ·{' '}
                      {rec.status === 'working' ? 'Live Now' : 'Completed'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditLog(rec)}
                  className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 self-start sm:self-center"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Today's Working Crew Overview */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-sm font-bold text-[#0B1120]">
            Today&apos;s Working Crew ({todaysCrew.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {todaysCrew.map((c) => (
            <div key={c.id} className="p-3.5 rounded-xl bg-[#F4F7FB] border border-slate-200 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#0B1120]">{c.staffName}</span>
                <span className="font-mono text-[#059669] font-semibold inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDurationHHMMSS(c.punchInTime, c.punchOutTime)}
                </span>
              </div>
              <p className="text-slate-600 mt-1 truncate">{c.venue}</p>
              <p className="text-slate-500 mt-0.5 truncate">
                {c.fromLocation} → {c.toLocation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Edit Own Attendance Modal */}
      {editingRec && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingRec(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0B1120]">
                Edit My Attendance ({editingRec.date})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRec(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEditLog} className="p-5 space-y-3">
              <input
                type="text"
                value={editStudio}
                onChange={(e) => setEditStudio(e.target.value)}
                placeholder="Studio Name"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                placeholder="Event Venue"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editFrom}
                  onChange={(e) => setEditFrom(e.target.value)}
                  placeholder="From Location"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={editTo}
                  onChange={(e) => setEditTo(e.target.value)}
                  placeholder="To Location"
                  className="h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Work Notes"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRec(null)}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                >
                  Save &amp; Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
