import React, { useMemo, useState } from 'react';
import {
  Building2,
  Camera,
  Clock,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
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
        item.toLocation.toLowerCase().includes(q)
      );
    });
  }, [allLogs, typeFilter, search]);

  const loginCount = allLogs.filter((l) => l.type === 'login_selfie').length;
  const dutyCount = allLogs.filter((l) => l.type === 'duty_punch').length;
  const cloudHostedCount = allLogs.filter(
    (l) => l.selfieUrl && l.selfieUrl.startsWith('http')
  ).length;

  return (
    <div className="space-y-5">
      {/* Header + Scope Toggle + Search Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-bold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
              Live Selfie Verification Gallery ({filteredLogs.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every staff live verification selfie and field duty punch photo synced in real time.
              Tap any photo to zoom or open in full resolution.
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
            <p className="text-[11px] font-medium text-emerald-800">Duty Punches</p>
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
              placeholder="Search staff name, role, company, or work title..."
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
            <option value="duty_punch">Field Duty Punches</option>
          </select>
        </div>
      </div>

      {/* Selfie Verification Cards Grid */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-2 card-elevated">
          <Camera className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No verification selfies recorded yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            As soon as staff capture their live verification selfie during login or duty punch-in,
            their cloud-hosted photos and GPS timestamps appear here automatically.
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
            const isHosted = Boolean(log.selfieUrl && log.selfieUrl.startsWith('http'));
            const duration =
              log.totalDurationText ||
              (log.punchOutTime ? formatShiftDuration(log.punchInTime, log.punchOutTime) : '');
            const gpsPins = [
              { label: 'In', href: mapsHref },
              { label: 'Dep', href: buildGpsMapHref(log.departGps) },
              { label: 'Arr', href: buildGpsMapHref(log.arriveGps) },
              { label: 'Done', href: buildGpsMapHref(log.workCompletedGps) },
              { label: 'Out', href: buildGpsMapHref(log.punchOutGps) },
            ].filter((g): g is { label: string; href: string } => Boolean(g.href));

            return (
              <div
                key={`${log.companyId}-${log.id}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 card-elevated space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Zoomable Verification Selfie Photo */}
                  <button
                    type="button"
                    onClick={() => log.selfieUrl && openLightbox(log.selfieUrl)}
                    className="w-full sm:w-32 h-52 sm:h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative group"
                  >
                    {log.selfieUrl ? (
                      <img
                        src={log.selfieUrl}
                        alt={`${log.staffName} verification selfie`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                    <span
                      className={`absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] font-bold px-2 py-0.5 rounded-md text-center ${
                        log.type === 'login_selfie' ? 'bg-[#1E3A8A]/85' : 'bg-emerald-700/85'
                      }`}
                    >
                      {log.type === 'login_selfie' ? 'Selfie Login' : 'Duty Punch'}
                    </span>
                  </button>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] truncate">
                          {log.staffName}{' '}
                          <span className="font-normal text-xs text-slate-500">
                            · {log.staffRole}
                          </span>
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 truncate mt-0.5">
                          <Building2 className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span className="truncate">
                            {log.companyName}
                            {log.companyPlace ? ` (${log.companyPlace})` : ''}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${stageMeta.badgeClass}`}
                      >
                        {stageMeta.label}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#1E3A8A] truncate">
                      {log.workTitle}
                    </p>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <p className="col-span-2 flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="font-mono font-semibold text-slate-700">
                          {formatDateTimeIN(log.punchInTime || log.createdAt)}
                        </span>
                        {duration && (
                          <span className="ml-1 font-mono font-bold text-emerald-700">
                            ({duration})
                          </span>
                        )}
                      </p>
                      <p>
                        <span className="text-slate-400">Date:</span>{' '}
                        <span className="font-mono">{formatDateIN(log.date)}</span>
                      </p>
                      <p>
                        <span className="text-slate-400">Mode:</span>{' '}
                        <span className="font-semibold text-slate-700">{log.mode}</span>
                      </p>
                      <p className="col-span-2 truncate">
                        <span className="text-slate-400">Route:</span>{' '}
                        <span className="font-medium text-slate-700">
                          {log.fromLocation || '—'} → {log.toLocation || '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* All 5 Auto-Recorded Timestamps for Duty Punches */}
                {log.type === 'duty_punch' && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-[10px]">
                    <div>
                      <p className="text-slate-400 font-semibold">Punch-In</p>
                      <p className="font-mono font-bold text-[#0F172A]">
                        {formatTimeIN(log.punchInTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Departed</p>
                      <p className="font-mono font-bold text-[#0F172A]">
                        {log.departTime ? formatTimeIN(log.departTime) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Arrived</p>
                      <p className="font-mono font-bold text-[#0F172A]">
                        {log.arriveTime ? formatTimeIN(log.arriveTime) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Work Done</p>
                      <p className="font-mono font-bold text-[#0F172A]">
                        {log.workCompletedTime ? formatTimeIN(log.workCompletedTime) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Punch-Out</p>
                      <p className="font-mono font-bold text-emerald-700">
                        {log.punchOutTime ? formatTimeIN(log.punchOutTime) : 'Active'}
                      </p>
                    </div>
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
                    {log.punchOutSelfieUrl && (
                      <button
                        type="button"
                        onClick={() => openLightbox(log.punchOutSelfieUrl!)}
                        className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700"
                      >
                        Out Selfie
                      </button>
                    )}
                    {log.selfieUrl && (
                      <button
                        type="button"
                        onClick={() => openLightbox(log.selfieUrl)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700"
                      >
                        Zoom Photo
                      </button>
                    )}
                    {isHosted && (
                      <a
                        href={log.selfieUrl}
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
    </div>
  );
};
