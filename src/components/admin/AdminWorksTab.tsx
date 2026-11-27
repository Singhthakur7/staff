import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  LocateFixed,
  MessageCircle,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { RateMode, WORK_TYPES, WorkType } from '../../types';
import {
  buildMapsUrl,
  fileToCompressedDataUrl,
  formatINR,
  getRateModeLabel,
  getSafeLocation,
  getTodayISO,
} from '../../utils/helpers';

export const AdminWorksTab: React.FC = () => {
  const { state, activeCompany, addWork, deleteWork, openWhatsAppModal, openLightbox, pushToast } =
    useErp();

  const [filterDate, setFilterDate] = useState<string>('');
  const [date, setDate] = useState(getTodayISO());
  const [callTime, setCallTime] = useState('07:30');
  const [workType, setWorkType] = useState<WorkType>('LED Wall + Live Streaming');
  const [eventTitle, setEventTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [studioName, setStudioName] = useState('');
  const [studioWhatsApp, setStudioWhatsApp] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState(state.staff[0]?.id || '');
  useEffect(() => {
    if (!assignedStaffId && state.staff.length > 0) {
      setAssignedStaffId(state.staff[0].id);
    }
  }, [assignedStaffId, state.staff]);
  const [rateMode, setRateMode] = useState<RateMode>('regular');
  const [mapsLink, setMapsLink] = useState('');
  const [notes, setNotes] = useState('');

  // Optional Sub-Contract block
  const [hasSubContract, setHasSubContract] = useState(false);
  const [subContractorName, setSubContractorName] = useState('');
  const [subContractorWA, setSubContractorWA] = useState('');
  const [subContractTotal, setSubContractTotal] = useState('0');
  const [subContractPaid, setSubContractPaid] = useState('0');

  // Client/Studio Billing block
  const [billTotal, setBillTotal] = useState('0');
  const [billReceived, setBillReceived] = useState('0');
  const [gpayUtr, setGpayUtr] = useState('');
  const [gpayScreenshot, setGpayScreenshot] = useState<string | undefined>(undefined);

  const subBalance = Math.max(0, (Number(subContractTotal) || 0) - (Number(subContractPaid) || 0));
  const billPending = Math.max(0, (Number(billTotal) || 0) - (Number(billReceived) || 0));

  const handleAutoGps = async () => {
    const coords = await getSafeLocation();
    setMapsLink(buildMapsUrl(coords.lat, coords.lng));
    pushToast({
      type: 'info',
      title: 'GPS Link Filled',
      description: coords.label,
    });
  };

  const handleGpayScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      setGpayScreenshot(url);
      pushToast({ type: 'success', title: 'Client GPay Screenshot Attached' });
    } catch {
      pushToast({ type: 'error', title: 'Could not read image' });
    }
  };

  const handleWorkTypeChange = (nextType: WorkType) => {
    setWorkType(nextType);
    if (nextType.includes('Own Equipment')) {
      setRateMode('own_camera');
    } else if (nextType.includes('Single Camera (₹6,000)')) {
      setRateMode('live_single_cam');
    }
  };

  const handleCreateWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !venue.trim()) {
      pushToast({ type: 'error', title: 'Enter Event Title and Venue' });
      return;
    }
    const staffObj = state.staff.find((s) => s.id === assignedStaffId);
    addWork({
      date,
      callTime,
      workType,
      eventTitle: eventTitle.trim(),
      venue: venue.trim(),
      studioName: studioName.trim() || 'Direct Client',
      studioWhatsApp: studioWhatsApp.trim(),
      assignedStaffId: staffObj?.id || '',
      assignedStaffName: staffObj?.name || 'Unassigned',
      rateMode,
      mapsLink: mapsLink.trim(),
      hasSubContract,
      subContractorName: hasSubContract ? subContractorName.trim() : '',
      subContractorWA: hasSubContract ? subContractorWA.trim() : '',
      subContractTotal: hasSubContract ? Number(subContractTotal) || 0 : 0,
      subContractPaid: hasSubContract ? Number(subContractPaid) || 0 : 0,
      billTotal: Number(billTotal) || 0,
      billReceived: Number(billReceived) || 0,
      gpayUtr: gpayUtr.trim(),
      gpayScreenshot,
      notes: notes.trim(),
    });

    setEventTitle('');
    setVenue('');
    setStudioName('');
    setStudioWhatsApp('');
    setMapsLink('');
    setNotes('');
    setHasSubContract(false);
    setSubContractorName('');
    setSubContractorWA('');
    setSubContractTotal('0');
    setSubContractPaid('0');
    setBillTotal('0');
    setBillReceived('0');
    setGpayUtr('');
    setGpayScreenshot(undefined);
  };

  const filteredWorks = filterDate
    ? state.works.filter((w) => w.date === filterDate)
    : state.works;

  return (
    <div className="space-y-6">
      {/* Add Work Dispatch & Billing Form */}
      <form
        onSubmit={handleCreateWork}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0B1120]">
              Schedule Date-Wise Work &amp; Client Billing
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign crew duty, optional sub-contracting, and studio billing in one dispatch sheet.
            </p>
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Save Work Dispatch
          </button>
        </div>

        {/* Core Event Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Event Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Call Time</label>
            <input
              type="time"
              value={callTime}
              onChange={(e) => setCallTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Work Type</label>
            <select
              value={workType}
              onChange={(e) => handleWorkTypeChange(e.target.value as WorkType)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {WORK_TYPES.map((wt) => (
                <option key={wt} value={wt}>
                  {wt}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Event / Client Title
            </label>
            <input
              type="text"
              required
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. St. Mary's Wedding & Live Broadcast"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Event Venue</label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Auditorium / Church / Hall & Town"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Studio Name</label>
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="Partner Studio"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Studio WhatsApp
            </label>
            <input
              type="tel"
              value={studioWhatsApp}
              onChange={(e) => setStudioWhatsApp(e.target.value)}
              placeholder="919847..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Staff</label>
            <select
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {state.staff.length === 0 ? (
                <option value="">No staff created yet</option>
              ) : (
                state.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rate Mode</label>
            <select
              value={rateMode}
              onChange={(e) => setRateMode(e.target.value as RateMode)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="regular">Regular Full Day</option>
              <option value="half">Half Day (50%)</option>
              <option value="own_camera">With Own Camera (₹3,000)</option>
              <option value="live_single_cam">Live Only Single Camera (₹6,000)</option>
            </select>
          </div>
        </div>

        {/* Google Maps Link + Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Google Maps Venue Link
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://www.google.com/maps?q=..."
                className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
              />
              <button
                type="button"
                onClick={handleAutoGps}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#0B1120] flex items-center gap-1.5 whitespace-nowrap"
              >
                <LocateFixed className="w-4 h-4 text-[#2563EB]" />
                Auto GPS
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Technical / Crew Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Camera rig, LED size, LiveU backup, audio notes..."
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        {/* Sub-Contract & Client Billing Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Sub-Contract Block */}
          <div className="bg-[#F4F7FB] border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-[#0B1120]">
                Optional Sub-Contract Block (Truss / LED / Generator)
              </span>
              <input
                type="checkbox"
                checked={hasSubContract}
                onChange={(e) => setHasSubContract(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB]"
              />
            </label>

            {hasSubContract && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <input
                  type="text"
                  value={subContractorName}
                  onChange={(e) => setSubContractorName(e.target.value)}
                  placeholder="Sub-Contractor Name"
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs"
                />
                <input
                  type="tel"
                  value={subContractorWA}
                  onChange={(e) => setSubContractorWA(e.target.value)}
                  placeholder="Sub-Contractor WA"
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                />
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Sub Total (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={subContractTotal}
                    onChange={(e) => setSubContractTotal(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Paid (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={subContractPaid}
                    onChange={(e) => setSubContractPaid(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div className="col-span-2 text-xs flex items-center justify-between pt-1">
                  <span className="text-slate-600">Auto Sub-Contract Balance:</span>
                  <strong className="font-mono text-[#D97706] tabular-nums">
                    {formatINR(subBalance)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Client / Studio Billing Block */}
          <div className="bg-[#F4F7FB] border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-[#0B1120]">Client / Studio Billing &amp; Collection</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bill Total (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={billTotal}
                  onChange={(e) => setBillTotal(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Received (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={billReceived}
                  onChange={(e) => setBillReceived(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] text-slate-500 mb-1">GPay UTR / Ref</label>
                <input
                  type="text"
                  value={gpayUtr}
                  onChange={(e) => setGpayUtr(e.target.value)}
                  placeholder="UTR Ref"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-slate-600">
                Pending Collection:{' '}
                <strong className="font-mono text-[#DC2626] tabular-nums">
                  {formatINR(billPending)}
                </strong>
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{gpayScreenshot ? 'GPay Screenshot Ready' : 'Upload GPay Proof'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGpayScreenshot}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0B1120]">
          Scheduled Works &amp; Collections ({filteredWorks.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterDate('')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border transition-colors ${
              filterDate === ''
                ? 'bg-[#0B1120] text-white border-[#0B1120]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            All Dates
          </button>
        </div>
      </div>

      {/* Works List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredWorks.length === 0 ? (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No works scheduled for this date filter.
          </div>
        ) : (
          filteredWorks.map((w) => {
            const assignedStaff = state.staff.find((s) => s.id === w.assignedStaffId);
            const pendingAmt = Math.max(0, w.billTotal - w.billReceived);
            const subBal = Math.max(0, w.subContractTotal - w.subContractPaid);

            return (
              <div
                key={w.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {w.date} · Call {w.callTime} · {w.workType}
                      </p>
                      <h4 className="text-base font-bold text-[#0B1120] mt-0.5">{w.eventTitle}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {w.venue} · Studio: <strong>{w.studioName}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteWork(w.id)}
                      className="p-2 text-slate-400 hover:text-[#DC2626] rounded-lg"
                      aria-label="Delete work"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F4F7FB] rounded-xl p-3">
                    <div>
                      <p className="text-slate-500">Assigned Crew</p>
                      <p className="font-bold text-[#0B1120] mt-0.5">{w.assignedStaffName}</p>
                      <p className="text-[11px] text-slate-600">{getRateModeLabel(w.rateMode)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">Studio Billing</p>
                      <p className="font-mono font-bold text-[#0B1120] tabular-nums mt-0.5">
                        {formatINR(w.billReceived)} / {formatINR(w.billTotal)}
                      </p>
                      <p
                        className={`text-[11px] font-mono font-bold tabular-nums ${
                          pendingAmt > 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                        }`}
                      >
                        {pendingAmt > 0 ? `Pending ${formatINR(pendingAmt)}` : 'Settled Fully'}
                      </p>
                    </div>
                  </div>

                  {w.hasSubContract && (
                    <div className="text-xs px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                      <span>
                        Sub-Contract: <strong>{w.subContractorName}</strong>
                      </span>
                      <span className="font-mono font-bold text-[#D97706] tabular-nums">
                        Bal {formatINR(subBal)} / {formatINR(w.subContractTotal)}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {w.mapsLink && (
                      <a
                        href={w.mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Venue Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {w.gpayUtr && (
                      <span className="font-mono text-slate-500">UTR: {w.gpayUtr}</span>
                    )}
                    {w.gpayScreenshot && (
                      <button
                        type="button"
                        onClick={() => openLightbox(w.gpayScreenshot!)}
                        className="text-[#2563EB] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        GPay Proof
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Click WhatsApp Launchers */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      openWhatsAppModal({
                        phone: assignedStaff?.phone || '',
                        recipientName: w.assignedStaffName,
                        message: [
                          `*DUTY DISPATCH — ${(activeCompany?.name || 'COMPANY').toUpperCase()}*`,
                          `Staff: ${w.assignedStaffName}`,
                          `Date: ${w.date} | Call Time: ${w.callTime}`,
                          `Work: ${w.workType}`,
                          `Event: ${w.eventTitle}`,
                          `Venue: ${w.venue}`,
                          `Studio: ${w.studioName}`,
                          `Rate Mode: ${getRateModeLabel(w.rateMode)}`,
                          w.mapsLink ? `Map: ${w.mapsLink}` : '',
                          w.notes ? `Notes: ${w.notes}` : '',
                        ]
                          .filter(Boolean)
                          .join('\n'),
                      })
                    }
                    className="min-h-[38px] px-3 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#FBBF24]" />
                    Staff Duty Alert
                  </button>

                  {w.hasSubContract && (
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsAppModal({
                          phone: w.subContractorWA,
                          recipientName: w.subContractorName,
                          message: [
                            `*SUB-CONTRACT ORDER — ${(activeCompany?.name || 'COMPANY').toUpperCase()}*`,
                            `Vendor: ${w.subContractorName}`,
                            `Date: ${w.date} | Call Time: ${w.callTime}`,
                            `Event: ${w.eventTitle}`,
                            `Venue: ${w.venue}`,
                            `Agreed Total: ${formatINR(w.subContractTotal)} | Paid: ${formatINR(w.subContractPaid)} | Balance: ${formatINR(subBal)}`,
                            w.mapsLink ? `Location: ${w.mapsLink}` : '',
                          ]
                            .filter(Boolean)
                            .join('\n'),
                        })
                      }
                      className="min-h-[38px] px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[#B45309] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Sub-Contract Order
                    </button>
                  )}

                  {pendingAmt > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        openWhatsAppModal({
                          phone: w.studioWhatsApp,
                          recipientName: w.studioName,
                          message: [
                            `Hello ${w.studioName},`,
                            `Gentle payment reminder from *${activeCompany?.name || 'our team'}*.`,
                            `Event: ${w.eventTitle} (${w.date})`,
                            `Total Bill: ${formatINR(w.billTotal)}`,
                            `Received: ${formatINR(w.billReceived)}`,
                            `*Pending Balance: ${formatINR(pendingAmt)}*`,
                            activeCompany?.upi ? `\nCompany Google Pay UPI: ${activeCompany.upi}` : '',
                            `Thank you for partnering with us!`,
                          ]
                            .filter(Boolean)
                            .join('\n'),
                        })
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Studio Pending Reminder
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
