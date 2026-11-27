import React, { useMemo, useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useStaffOnline } from '../../context/StaffOnlineContext';
import { CompanyRecord, EMPTY_COMPANY_DB, GpsStamp, PunchLogRecord } from '../../types';
import {
  formatDateIN,
  formatDateTimeIN,
  formatINR,
  formatShiftDuration,
  formatTimeIN,
  getDutyStageInfo,
} from '../../utils/helpers';

function buildGpsMapHref(gps?: GpsStamp): string | undefined {
  if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number') return undefined;
  return `https://www.google.com/maps?q=${gps.lat},${gps.lng}`;
}

interface SuperSelfieLogsTabProps {
  selectedCompany: CompanyRecord | null;
}

interface EnrichedSelfieLog extends PunchLogRecord {
  companyId: string;
  companyName: string;
  companyPlace: string;
}

export const SuperSelfieLogsTab: React.FC<SuperSelfieLogsTabProps> = ({
  selectedCompany,
}) => {
  const { companies, companyDataMap, openLightbox } = useStaffOnline();

  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [typeFilter, setTypeFilter] = useState<'all' | 'login_selfie' | 'duty_punch'>('all');
  const [search, setSearch] = useState('');
  const [detailLog, setDetailLog] = useState<EnrichedSelfieLog | null>(null);

  const allLogs = useMemo<EnrichedSelfieLog[]>(() => {
    const targetCompanies =
      scope === 'all' || !selectedCompany ? companies : [selectedCompany];

    const merged: EnrichedSelfieLog[] = [];
    for (const comp of targetCompanies) {
      const db = companyDataMap[comp.id] || EMPTY_COMPANY_DB;
      for (const log of db.punchLogs) {
        merged.push({
          ...log,
          companyId: comp.id,
          companyName: comp.name,
          companyPlace: comp.place,
        });
      }
    }

    return merged.sort((a, b) =>
      (b.createdAt || b.punchInTime || '').localeCompare(a.createdAt || a.punchInTime || '')
    );
  }, [companies, companyDataMap, scope, selectedCompany]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLogs.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return (
        item.staffName.toLowerCase().includes(q) ||
        item.staffRole.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.workTitle.toLowerCase().includes(q) ||
        item.fromLocation.toLowerCase().includes(q) ||
        item.toLocation.toLowerCase().includes(q) ||
        (item.workCompletionNote || '').toLowerCase().includes(q)
      );
    });
  }, [allLogs, typeFilter, search]);

  const loginCount = allLogs.filter((l) => l.type === 'login_selfie').length;
  const dutyCount = allLogs.filter((l) => l.type === 'duty_punch').length;
  const cloudHostedCount = allLogs.filter(
    (l) =>
      (l.selfieUrl && l.selfieUrl.startsWith('http')) ||
      (l.departSelfieUrl && l.departSelfieUrl.startsWith('http')) ||
      (l.arriveSelfieUrl && l.arriveSelfieUrl.startsWith('http')) ||
      (l.punchOutSelfieUrl && l.punchOutSelfieUrl.startsWith('http'))
  ).length;

  return (
    <div className="space-y-5">
      {/* Header + Scope Toggle + Search Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-bold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
              3-Stage Live Selfie Verification Gallery ({filteredLogs.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect Office Departure, Site Arrival, and Work Completed &amp; Punch-Out selfies,
              timestamps, remarks, and GPS pins across companies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scope === 'selected'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {selectedCompany ? selectedCompany.name : 'Selected Company'}
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scope === 'all'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                All Companies ({companies.length})
              </button>
            </div>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Total Verifications</p>
            <p className="text-lg font-mono font-extrabold text-[#0F172A] tabular-nums">
              {allLogs.length}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50/70 border border-blue-200/70 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-[#1E3A8A]">Login Selfies</p>
            <p className="text-lg font-mono font-extrabold text-[#1E3A8A] tabular-nums">
              {loginCount}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-emerald-800">3-Stage Duty Shifts</p>
            <p className="text-lg font-mono font-extrabold text-emerald-800 tabular-nums">
              {dutyCount}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Cloud Stored Photos</p>
            <p className="text-lg font-mono font-extrabold text-[#0F172A] tabular-nums">
              {cloudHostedCount}
            </p>
          </div>
        </div>

        {/* Search & Type Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff name, role, company, site, or completion remark..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'login_selfie' | 'duty_punch')
            }
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
          >
            <option value="all">All Verification Types</option>
            <option value="login_selfie">Selfie Login Check-Ins</option>
            <option value="duty_punch">3-Stage Site Duty Shifts</option>
          </select>
        </div>
      </div>

      {/* Selfie Verification Cards Grid */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-2 card-elevated">
          <Camera className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No verification selfies recorded yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            As soon as staff capture live selfies for Office Departure, Site Arrival, or Work
            Completed &amp; Punch-Out, their cloud-hosted photos and timestamps appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredLogs.map((log) => {
            const stageMeta = getDutyStageInfo(log);
            const hasCoords = typeof log.gpsLat === 'number' && typeof log.gpsLng === 'number';
            const mapsHref = hasCoords
              ? `https://www.google.com/maps?q=${log.gpsLat},${log.gpsLng}`
              : undefined;
            const departSelfie = log.departSelfieUrl || log.selfieUrl;
            const arriveSelfie = log.arriveSelfieUrl;
            const punchOutSelfie = log.punchOutSelfieUrl;
            const isWorkDone = Boolean(
              log.workCompleted || log.workCompletedTime || log.punchOutTime
            );
            const duration =
              log.totalDurationText ||
              (log.punchOutTime ? formatShiftDuration(log.punchInTime, log.punchOutTime) : '');
            const gpsPins = [
              { label: 'Departure', href: buildGpsMapHref(log.departGps) || mapsHref },
              { label: 'Site Arrival', href: buildGpsMapHref(log.arriveGps) },
              { label: 'Punch-Out', href: buildGpsMapHref(log.punchOutGps) },
            ].filter((g): g is { label: string; href: string } => Boolean(g.href));

            return (
              <div
                key={`${log.companyId}-${log.id}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-3"
              >
                {/* Top Metadata */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {log.staffName}{' '}
                      <span className="font-normal text-xs text-slate-500">· {log.staffRole}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 truncate mt-0.5">
                      <Building2 className="w-3 h-3 text-[#2563EB] shrink-0" />
                      <span className="truncate">
                        {log.companyName}
                        {log.companyPlace ? ` (${log.companyPlace})` : ''}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-[#1E3A8A] truncate mt-1">
                      {log.workTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="font-mono font-semibold text-slate-700">
                        {formatDateTimeIN(log.punchInTime || log.createdAt)}
                      </span>
                      {duration && (
                        <span className="font-mono font-bold text-emerald-700">({duration})</span>
                      )}
                      <span>· {log.fromLocation || '—'} → {log.toLocation || '—'}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${stageMeta.badgeClass}`}
                  >
                    {stageMeta.label}
                  </span>
                </div>

                {/* 3-Stage Selfies & Timestamps Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: '1. Office Departure',
                      time: log.departTime || (log.type === 'login_selfie' ? log.punchInTime : ''),
                      selfie: departSelfie,
                      bg: 'bg-blue-50/40 border-blue-200/80',
                    },
                    {
                      label: '2. Site Arrival',
                      time: log.arriveTime,
                      selfie: arriveSelfie,
                      bg: 'bg-sky-50/40 border-sky-200/80',
                    },
                    {
                      label: '3. Punch-Out',
                      time: log.punchOutTime,
                      selfie: punchOutSelfie,
                      bg: isWorkDone
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : 'bg-slate-50 border-slate-200',
                    },
                  ].map((st) => (
                    <div key={st.label} className={`rounded-xl border p-2 space-y-1.5 ${st.bg}`}>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 leading-tight">
                          {st.label}
                        </p>
                        <p className="text-[11px] font-mono font-extrabold text-[#0F172A]">
                          {st.time ? formatTimeIN(st.time) : '—'}
                        </p>
                      </div>
                      {st.selfie ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(st.selfie!)}
                          className="w-full h-24 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative group"
                        >
                          <img
                            src={st.selfie}
                            alt={`${log.staffName} ${st.label}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-slate-950/75 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                            Zoom
                          </span>
                        </button>
                      ) : (
                        <div className="w-full h-24 rounded-lg border border-dashed border-slate-200 bg-white/70 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                          <Camera className="w-3.5 h-3.5 mb-0.5" />
                          <span>—</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Work Completed Status + Remark */}
                {(isWorkDone || log.workCompletionNote) && log.type === 'duty_punch' && (
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 px-3 py-2 text-[11px] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Work Completed: {isWorkDone ? 'Confirmed' : 'Pending'}
                    </span>
                    {log.workCompletionNote && (
                      <span className="text-slate-700 inline-flex items-center gap-1">
                        <FileText className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>{log.workCompletionNote}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {log.dutyWage > 0 && (
                      <span className="font-mono font-extrabold text-[#0F172A] tabular-nums">
                        {formatINR(log.dutyWage)}
                      </span>
                    )}
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
                      <span className="text-[11px] text-slate-400">
                        {log.gpsLabel || 'No GPS'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailLog(log)}
                      className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[11px] font-bold text-[#1E3A8A] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>
                    {departSelfie && departSelfie.startsWith('http') && (
                      <a
                        href={departSelfie}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        Open URL
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full 3-Stage Details Modal */}
      {detailLog && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDetailLog(null)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#0B1120] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-display font-bold truncate">
                  3-Stage Audit — {detailLog.staffName} ({detailLog.companyName})
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {detailLog.workTitle} · {formatDateIN(detailLog.date)} ·{' '}
                  {detailLog.fromLocation || '—'} → {detailLog.toLocation || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLog(null)}
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
                    time: detailLog.departTime,
                    selfie: detailLog.departSelfieUrl || detailLog.selfieUrl,
                    gpsHref:
                      buildGpsMapHref(detailLog.departGps) ||
                      (typeof detailLog.gpsLat === 'number' && typeof detailLog.gpsLng === 'number'
                        ? `https://www.google.com/maps?q=${detailLog.gpsLat},${detailLog.gpsLng}`
                        : undefined),
                  },
                  {
                    title: 'Stage 2: Site Arrival',
                    sub: 'Reached Work Site',
                    time: detailLog.arriveTime,
                    selfie: detailLog.arriveSelfieUrl,
                    gpsHref: buildGpsMapHref(detailLog.arriveGps),
                  },
                  {
                    title: 'Stage 3: Work Done & Out',
                    sub:
                      detailLog.workCompleted || detailLog.punchOutTime
                        ? 'Work Completed ✓'
                        : 'Open',
                    time: detailLog.punchOutTime,
                    selfie: detailLog.punchOutSelfieUrl,
                    gpsHref: buildGpsMapHref(detailLog.punchOutGps),
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
                    {detailLog.workCompleted || detailLog.punchOutTime
                      ? 'Confirmed Completed'
                      : 'In Progress'}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-700">Completion Note / Remark:</strong>{' '}
                  <span className="text-slate-600">{detailLog.workCompletionNote || '—'}</span>
                </p>
                <p>
                  <strong className="text-slate-700">Total Duration &amp; Wage:</strong>{' '}
                  <span className="font-mono font-bold text-[#0F172A]">
                    {detailLog.totalDurationText ||
                      (detailLog.punchOutTime
                        ? formatShiftDuration(detailLog.punchInTime, detailLog.punchOutTime)
                        : 'Active')}{' '}
                    · {formatINR(detailLog.dutyWage)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
