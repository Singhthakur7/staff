import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { dbReadCompanySnapshotOnce } from '../firebase';
import { CompanyDatabase, CompanyRecord, EMPTY_COMPANY_DB } from '../types';
import { downloadElementAsPdf, triggerDirectPrint } from '../utils/pdfExport';
import { BrandLogo } from './BrandLogo';
import { FormalSalarySlipSheet } from './DocumentPreviews';

interface SharedSlipViewProps {
  companyId: string;
  staffId: string;
  fromMonth?: string;
  toMonth?: string;
}

export const SharedSlipView: React.FC<SharedSlipViewProps> = ({
  companyId,
  staffId,
  fromMonth,
  toMonth,
}) => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [db, setDb] = useState<CompanyDatabase>(EMPTY_COMPANY_DB);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    dbReadCompanySnapshotOnce(companyId).then((res) => {
      if (!mounted) return;
      setCompany(res.company);
      setDb(res.db);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const staff = db.staff.find((s) => s.id === staffId) || null;

  const handleDownload = async () => {
    if (!staff) return;
    setExporting(true);
    await downloadElementAsPdf(
      sheetRef.current,
      `Salary-Slip-${staff.name.replace(/\s+/g, '-')}.pdf`
    );
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 no-print card-elevated">
          <BrandLogo variant="light" size="sm" companyName={company?.name} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!staff || exporting}
              onClick={() => void handleDownload()}
              className="min-h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <button
              type="button"
              disabled={!staff}
              onClick={triggerDirectPrint}
              className="min-h-[40px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Direct Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
            Loading salary statement...
          </div>
        ) : !company || !staff ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
            <p className="text-base font-bold text-[#0F172A]">Salary Slip Not Found</p>
            <p className="text-xs text-slate-500">
              This slip link may have expired or the record has been removed.
            </p>
          </div>
        ) : (
          <div className="print-only-container">
            <FormalSalarySlipSheet
              company={company}
              staff={staff}
              db={db}
              fromMonth={fromMonth}
              toMonth={toMonth}
              sheetRef={sheetRef}
            />
          </div>
        )}
      </div>
    </div>
  );
};
