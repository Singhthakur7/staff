import { jsPDF } from 'jspdf';
import {
  AttendanceRecord,
  CompanyDatabase,
  CompanyProfile,
  ExpenseClaim,
  SalaryPayment,
  StaffAccount,
} from '../types';
import {
  formatDateTimeShort,
  formatINR,
  formatMonthLabel,
  getRateModeLabel,
  numberToIndianWords,
} from './helpers';

export interface StaffSlipData {
  company: CompanyProfile;
  staff: StaffAccount;
  fromMonth: string; // 'all' or 'YYYY-MM'
  toMonth: string; // 'all' or 'YYYY-MM'
  periodLabel: string;
  slipRefNo: string;
  attendanceRows: AttendanceRecord[];
  approvedExpenses: ExpenseClaim[];
  paymentRows: SalaryPayment[];
  attendanceEarned: number;
  expensesTotal: number;
  grossEarnings: number;
  totalPaid: number;
  netPayable: number;
  verificationStatus: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'ISSUE FLAGGED' | 'NO PAYOUTS YET';
}

function inMonthRange(dateStr: string, fromMonth: string, toMonth: string): boolean {
  if (!dateStr) return false;
  if (fromMonth === 'all' && toMonth === 'all') return true;
  const ym = dateStr.slice(0, 7);
  if (fromMonth !== 'all' && ym < fromMonth) return false;
  if (toMonth !== 'all' && ym > toMonth) return false;
  return true;
}

export function computeStaffSlipData(
  company: CompanyProfile,
  dbState: CompanyDatabase,
  staff: StaffAccount,
  fromMonth: string,
  toMonth: string
): StaffSlipData {
  const attendanceRows = dbState.attendance
    .filter((a) => a.staffId === staff.id && inMonthRange(a.date, fromMonth, toMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  const approvedExpenses = dbState.expenses
    .filter(
      (e) =>
        e.staffId === staff.id &&
        e.status === 'approved' &&
        inMonthRange(e.date, fromMonth, toMonth)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const paymentRows = dbState.payments
    .filter((p) => p.staffId === staff.id && inMonthRange(p.date, fromMonth, toMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  const attendanceEarned = attendanceRows.reduce((s, r) => s + r.wageEarned, 0);
  const expensesTotal = approvedExpenses.reduce((s, e) => s + e.amount, 0);
  const grossEarnings = attendanceEarned + expensesTotal;
  const totalPaid = paymentRows.reduce((s, p) => s + p.amount, 0);
  const netPayable = grossEarnings - totalPaid;

  let verificationStatus: StaffSlipData['verificationStatus'] = 'NO PAYOUTS YET';
  if (paymentRows.length > 0) {
    if (paymentRows.some((p) => p.confirmationStatus === 'issue')) {
      verificationStatus = 'ISSUE FLAGGED';
    } else if (paymentRows.every((p) => p.confirmationStatus === 'confirmed')) {
      verificationStatus = 'CONFIRMED';
    } else {
      verificationStatus = 'PENDING CONFIRMATION';
    }
  }

  const periodLabel =
    fromMonth === 'all' && toMonth === 'all'
      ? 'All Records (Cumulative)'
      : fromMonth === toMonth
      ? formatMonthLabel(fromMonth)
      : `${fromMonth === 'all' ? 'Start' : formatMonthLabel(fromMonth)} to ${
          toMonth === 'all' ? 'Present' : formatMonthLabel(toMonth)
        }`;

  const compCode = (company.badge || company.slug || 'ERP')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 4);
  const shortId = staff.id.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-4);
  const periodCode = fromMonth === 'all' ? 'ALL' : fromMonth.replace('-', '');
  const slipRefNo = `${compCode}-SLIP-${periodCode}-${shortId}`;

  return {
    company,
    staff,
    fromMonth,
    toMonth,
    periodLabel,
    slipRefNo,
    attendanceRows,
    approvedExpenses,
    paymentRows,
    attendanceEarned,
    expensesTotal,
    grossEarnings,
    totalPaid,
    netPayable,
    verificationStatus,
  };
}

function pdfCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const neg = safe < 0 ? '-' : '';
  return `${neg}Rs. ${Math.abs(Math.round(safe)).toLocaleString('en-IN')}`;
}

export function downloadCorporateSalarySlipPdf(slip: StaffSlipData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // 1. Navy & Gold Executive Letterhead (Dynamic Company Branding)
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 34, pageWidth, 1.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(slip.company.name.toUpperCase().slice(0, 48), margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text((slip.company.address || '').slice(0, 68), margin, 18);
  doc.text(
    `Ph: ${slip.company.phone || '-'}  |  Company UPI: ${slip.company.upi || '-'}`,
    margin,
    23.5
  );
  doc.text(`Admin Email: ${slip.company.adminEmail || '-'}`, margin, 29);

  // Right side letterhead badge
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CORPORATE SALARY SLIP', pageWidth - margin, 13, { align: 'right' });
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Ref: ${slip.slipRefNo}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`Period: ${slip.periodLabel}`, pageWidth - margin, 24.5, { align: 'right' });
  doc.text(`Issued: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 29.5, {
    align: 'right',
  });

  y = 42;

  // 2. Employee Info Grid
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const col1 = margin + 4;
  const col2 = margin + contentWidth / 3 + 2;
  const col3 = margin + (contentWidth * 2) / 3 + 2;

  const drawField = (label: string, val: string, x: number, fy: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(val, x, fy + 4.3);
  };

  drawField('EMPLOYEE NAME', slip.staff.name, col1, y + 5.5);
  drawField('DESIGNATION', slip.staff.role, col2, y + 5.5);
  drawField('PHONE / WHATSAPP', `+${slip.staff.phone}`, col3, y + 5.5);
  drawField('GPAY / UPI ID', slip.staff.upiId, col1, y + 16);
  drawField('BASE DAILY WAGE', pdfCurrency(slip.staff.dailyWage), col2, y + 16);
  drawField('TOTAL WORKING ENTRIES', `${slip.attendanceRows.length} Shift(s)`, col3, y + 16);

  y += 30;

  // 3. Detailed Shift & Travel Log Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(11, 17, 32);
  doc.text('SHIFT, STUDIO & TRAVEL LOG', margin, y);
  y += 3;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('DATE', margin + 2.5, y + 4.8);
  doc.text('STUDIO / VENUE', margin + 24, y + 4.8);
  doc.text('TRAVEL ROUTE (FROM -> TO)', margin + 84, y + 4.8);
  doc.text('RATE MODE', margin + 132, y + 4.8);
  doc.text('WAGE', pageWidth - margin - 2.5, y + 4.8, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  if (slip.attendanceRows.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.rect(margin, y, contentWidth, 8);
    doc.text('No attendance records in selected period.', margin + 3, y + 5.2);
    y += 8;
  } else {
    slip.attendanceRows.forEach((row, idx) => {
      if (y > pageHeight - 75) {
        doc.addPage();
        y = 18;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 7.5, pageWidth - margin, y + 7.5);

      doc.setTextColor(15, 23, 42);
      doc.text(row.date, margin + 2.5, y + 4.9);
      const studioVenue = `${row.studioName || '-'} · ${row.venue || '-'}`.slice(0, 34);
      doc.text(studioVenue, margin + 24, y + 4.9);
      const route = `${row.fromLocation || '-'} -> ${row.toLocation || '-'}`.slice(0, 26);
      doc.text(route, margin + 84, y + 4.9);
      doc.text(getRateModeLabel(row.rateMode).slice(0, 19), margin + 132, y + 4.9);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfCurrency(row.wageEarned), pageWidth - margin - 2.5, y + 4.9, {
        align: 'right',
      });
      doc.setFont('helvetica', 'normal');
      y += 7.5;
    });
  }

  y += 7;
  if (y > pageHeight - 85) {
    doc.addPage();
    y = 18;
  }

  // 4. Two-Column Financial Summary
  const halfW = (contentWidth - 5) / 2;
  const leftX = margin;
  const rightX = margin + halfW + 5;
  const boxTop = y;

  doc.setFillColor(236, 253, 245);
  doc.rect(leftX, boxTop, halfW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(5, 150, 105);
  doc.text('EARNINGS & REIMBURSEMENTS', leftX + 3, boxTop + 4.8);

  let ly = boxTop + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Attendance Wages (${slip.attendanceRows.length} shifts)`, leftX + 3, ly);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfCurrency(slip.attendanceEarned), leftX + halfW - 3, ly, { align: 'right' });

  ly += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Approved Staff Expenses (${slip.approvedExpenses.length})`, leftX + 3, ly);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfCurrency(slip.expensesTotal), leftX + halfW - 3, ly, { align: 'right' });

  ly += 7;
  doc.setDrawColor(203, 213, 225);
  doc.line(leftX + 2, ly - 3, leftX + halfW - 2, ly - 3);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('GROSS EARNINGS', leftX + 3, ly + 1.5);
  doc.text(pdfCurrency(slip.grossEarnings), leftX + halfW - 3, ly + 1.5, { align: 'right' });

  doc.setFillColor(239, 246, 255);
  doc.rect(rightX, boxTop, halfW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(37, 99, 235);
  doc.text('PAYOUTS / ADVANCES PAID', rightX + 3, boxTop + 4.8);

  let ry = boxTop + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(30, 41, 59);
  if (slip.paymentRows.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No GPay / Bank payouts in this period.', rightX + 3, ry);
    ry += 6;
  } else {
    slip.paymentRows.slice(0, 6).forEach((p) => {
      const statusTag =
        p.confirmationStatus === 'confirmed'
          ? '[CONFIRMED]'
          : p.confirmationStatus === 'issue'
          ? '[ISSUE]'
          : '[PENDING]';
      const label = `${p.date} · ${p.mode.toUpperCase()} ${p.utr ? `UTR:${p.utr.slice(-6)}` : ''} ${statusTag}`;
      doc.text(label.slice(0, 40), rightX + 3, ry);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfCurrency(p.amount), rightX + halfW - 3, ry, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      ry += 5.2;
    });
  }

  ry += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(rightX + 2, ry - 3, rightX + halfW - 2, ry - 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PAID / ADVANCE', rightX + 3, ry + 1.5);
  doc.text(pdfCurrency(slip.totalPaid), rightX + halfW - 3, ry + 1.5, { align: 'right' });

  const boxHeight = Math.max(ly, ry) - boxTop + 6;
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftX, boxTop, halfW, boxHeight);
  doc.rect(rightX, boxTop, halfW, boxHeight);

  y = boxTop + boxHeight + 7;

  // 5. Net Payable Highlight Box
  doc.setFillColor(11, 17, 32);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('NET PAYABLE BALANCE', margin + 5, y + 7);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(pdfCurrency(slip.netPayable), margin + 5, y + 14.5);
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(`In Words: ${numberToIndianWords(slip.netPayable)}`, margin + 5, y + 20.5);

  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(pageWidth - margin - 52, y + 4.5, 47, 15, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(251, 191, 36);
  doc.text('PAYMENT VERIFICATION', pageWidth - margin - 28.5, y + 10, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.8);
  doc.text(slip.verificationStatus, pageWidth - margin - 28.5, y + 15.5, { align: 'center' });

  y += 38;

  // 6. Dual Signature Block
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, margin + 62, y);
  doc.line(pageWidth - margin - 62, y, pageWidth - margin, y);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Employee Signature', margin, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${slip.staff.name} (${slip.staff.role})`, margin, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', pageWidth - margin, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(slip.company.name, pageWidth - margin, y + 9.5, { align: 'right' });

  const safeFile = `${slip.company.slug}_${slip.staff.name.replace(/[^a-z0-9]/gi, '_')}_Salary_Slip_${slip.fromMonth}.pdf`;
  doc.save(safeFile);
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSingleSlipHtml(slip: StaffSlipData, withPageBreak: boolean): string {
  const attendanceHtml =
    slip.attendanceRows.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:12px;">No attendance shifts recorded for this period.</td></tr>`
      : slip.attendanceRows
          .map(
            (r) => `
          <tr>
            <td style="font-family:monospace;">${escapeHtml(r.date)}</td>
            <td><strong>${escapeHtml(r.studioName || '-')}</strong><br/><span style="color:#64748b;font-size:11px;">${escapeHtml(r.venue || '-')}</span></td>
            <td>${escapeHtml(r.fromLocation || '-')} → ${escapeHtml(r.toLocation || '-')}</td>
            <td>${escapeHtml(getRateModeLabel(r.rateMode))}</td>
            <td style="text-align:right;font-family:monospace;font-weight:700;">${escapeHtml(formatINR(r.wageEarned))}</td>
          </tr>`
          )
          .join('');

  const paymentsHtml =
    slip.paymentRows.length === 0
      ? `<div style="color:#64748b;font-size:12px;padding:6px 0;">No payouts recorded in this period.</div>`
      : slip.paymentRows
          .map((p) => {
            const badge =
              p.confirmationStatus === 'confirmed'
                ? `<span style="color:#059669;font-weight:700;">Confirmed${p.confirmedAt ? ` (${escapeHtml(formatDateTimeShort(p.confirmedAt))})` : ''}</span>`
                : p.confirmationStatus === 'issue'
                ? `<span style="color:#DC2626;font-weight:700;">Issue Flagged</span>`
                : `<span style="color:#D97706;font-weight:700;">Awaiting Confirmation</span>`;
            return `
            <div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12px;">
              <div>
                <div><strong>${escapeHtml(p.date)}</strong> · ${escapeHtml(p.mode.toUpperCase())} ${p.utr ? `(UTR: ${escapeHtml(p.utr)})` : ''}</div>
                <div style="font-size:11px;">${badge}</div>
              </div>
              <div style="font-family:monospace;font-weight:700;white-space:nowrap;">${escapeHtml(formatINR(p.amount))}</div>
            </div>`;
          })
          .join('');

  return `
  <div class="slip-page" style="${withPageBreak ? 'page-break-after: always;' : ''}">
    <div style="background:#0B1120;color:#fff;padding:22px 24px;border-bottom:4px solid #D97706;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <div style="font-size:17px;font-weight:800;letter-spacing:0.3px;">${escapeHtml(slip.company.name)}</div>
        <div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">${escapeHtml(slip.company.address)}</div>
        <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">Ph: ${escapeHtml(slip.company.phone)} · Company UPI: ${escapeHtml(slip.company.upi)}</div>
      </div>
      <div style="text-align:right;white-space:nowrap;">
        <div style="font-size:13px;font-weight:800;color:#fbbf24;letter-spacing:0.6px;">CORPORATE SALARY SLIP</div>
        <div style="font-size:11.5px;color:#e2e8f0;margin-top:4px;font-family:monospace;">Ref: ${escapeHtml(slip.slipRefNo)}</div>
        <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">Period: ${escapeHtml(slip.periodLabel)}</div>
      </div>
    </div>

    <div style="padding:20px 24px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:18px;">
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">EMPLOYEE NAME</div><div style="font-size:13px;font-weight:700;margin-top:2px;">${escapeHtml(slip.staff.name)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">DESIGNATION</div><div style="font-size:13px;font-weight:700;margin-top:2px;">${escapeHtml(slip.staff.role)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">WHATSAPP / PHONE</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">+${escapeHtml(slip.staff.phone)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">GPAY / UPI ID</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">${escapeHtml(slip.staff.upiId)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">BASE DAILY WAGE</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">${escapeHtml(formatINR(slip.staff.dailyWage))}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;">WORKING ENTRIES</div><div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:2px;">${slip.attendanceRows.length} Shifts</div></div>
      </div>

      <div style="font-size:11.5px;font-weight:700;color:#0B1120;margin-bottom:8px;letter-spacing:0.4px;">SHIFT & TRAVEL LOG</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px;">
        <thead>
          <tr style="background:#0f172a;color:#fff;text-align:left;">
            <th style="padding:8px 10px;">Date</th>
            <th style="padding:8px 10px;">Studio / Venue</th>
            <th style="padding:8px 10px;">Travel Route</th>
            <th style="padding:8px 10px;">Rate Mode</th>
            <th style="padding:8px 10px;text-align:right;">Wage</th>
          </tr>
        </thead>
        <tbody>${attendanceHtml}</tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
        <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <div style="background:#ecfdf5;color:#059669;padding:8px 12px;font-size:11.5px;font-weight:700;">EARNINGS & REIMBURSEMENTS</div>
          <div style="padding:12px;font-size:12.5px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Attendance Wages (${slip.attendanceRows.length} shifts)</span><strong style="font-family:monospace;">${escapeHtml(formatINR(slip.attendanceEarned))}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Approved Staff Expenses (${slip.approvedExpenses.length})</span><strong style="font-family:monospace;">${escapeHtml(formatINR(slip.expensesTotal))}</strong></div>
            <div style="display:flex;justify-content:space-between;padding-top:8px;margin-top:8px;border-top:1px solid #e2e8f0;font-weight:800;"><span>Gross Earnings</span><span style="font-family:monospace;">${escapeHtml(formatINR(slip.grossEarnings))}</span></div>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <div style="background:#eff6ff;color:#2563eb;padding:8px 12px;font-size:11.5px;font-weight:700;">GPAY / BANK PAYOUTS & ADVANCES</div>
          <div style="padding:12px;">
            ${paymentsHtml}
            <div style="display:flex;justify-content:space-between;padding-top:8px;margin-top:8px;border-top:1px solid #e2e8f0;font-size:12.5px;font-weight:800;"><span>Total Paid / Advance</span><span style="font-family:monospace;">${escapeHtml(formatINR(slip.totalPaid))}</span></div>
          </div>
        </div>
      </div>

      <div style="background:#0B1120;color:#fff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:36px;">
        <div>
          <div style="font-size:11px;color:#94a3b8;font-weight:600;">NET PAYABLE BALANCE</div>
          <div style="font-size:24px;font-weight:800;font-family:monospace;margin-top:2px;">${escapeHtml(formatINR(slip.netPayable))}</div>
          <div style="font-size:11.5px;color:#fbbf24;margin-top:4px;">In Words: ${escapeHtml(numberToIndianWords(slip.netPayable))}</div>
        </div>
        <div style="border:1.5px solid #fbbf24;border-radius:6px;padding:10px 14px;text-align:center;">
          <div style="font-size:9.5px;color:#fbbf24;font-weight:700;letter-spacing:0.6px;">PAYMENT VERIFICATION</div>
          <div style="font-size:12px;font-weight:800;margin-top:3px;">${escapeHtml(slip.verificationStatus)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;">
        <div style="width:210px;border-top:1px solid #94a3b8;padding-top:6px;">
          <div style="font-size:12px;font-weight:700;">Employee Signature</div>
          <div style="font-size:11px;color:#64748b;">${escapeHtml(slip.staff.name)}</div>
        </div>
        <div style="width:240px;border-top:1px solid #94a3b8;padding-top:6px;text-align:right;">
          <div style="font-size:12px;font-weight:700;">Authorized Signatory</div>
          <div style="font-size:11px;color:#64748b;">${escapeHtml(slip.company.name)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

export function printSalarySlipsHTML(slips: StaffSlipData[]): boolean {
  try {
    if (typeof document === 'undefined' || slips.length === 0) return false;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }

    const pages = slips
      .map((s, idx) => buildSingleSlipHtml(s, idx < slips.length - 1))
      .join('');

    doc.open();
    doc.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Corporate Salary Slip — ${escapeHtml(slips[0].company.name)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #0B1120; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            table td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .slip-page { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
          </style>
        </head>
        <body>${pages}</body>
      </html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Ignore print dialog cancel
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1200);
      }
    }, 250);
    return true;
  } catch {
    return false;
  }
}
