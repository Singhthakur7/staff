import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  MessageCircle,
  QrCode,
  Smartphone,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PaymentCategory, PaymentMode } from '../types';
import {
  buildGpayDeepLink,
  buildUpiUrl,
  buildWhatsAppUrl,
  fileToCompressedDataUrl,
  formatINR,
  safeCopyText,
} from '../utils/helpers';

export const GlobalModals: React.FC = () => {
  const {
    toasts,
    dismissToast,
    whatsappModal,
    closeWhatsAppModal,
    gpayModal,
    closeGPayModal,
    lightboxUrl,
    closeLightbox,
    recordSalaryPayment,
    activeCompany,
    pushToast,
  } = useErp();

  // WhatsApp modal local editable state
  const [waPhone, setWaPhone] = useState('');
  const [waText, setWaText] = useState('');

  useEffect(() => {
    if (whatsappModal) {
      setWaPhone(whatsappModal.phone);
      setWaText(whatsappModal.message);
    }
  }, [whatsappModal]);

  // GPay modal state
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<PaymentMode>('gpay');
  const [payCategory, setPayCategory] = useState<PaymentCategory>('salary');
  const [payUpi, setPayUpi] = useState('');
  const [payUtr, setPayUtr] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payScreenshot, setPayScreenshot] = useState<string | undefined>(undefined);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (gpayModal) {
      setPayAmount(String(Math.max(100, Math.round(gpayModal.suggestedAmount || 0))));
      setPayMode('gpay');
      setPayCategory('salary');
      setPayUpi(gpayModal.upiId);
      setPayUtr('');
      setPayNote(gpayModal.defaultNote || `Salary Payout - ${gpayModal.staffName}`);
      setPayScreenshot(undefined);
    }
  }, [gpayModal]);

  // Generate dynamic offline UPI QR code whenever amount / upi / staff changes
  useEffect(() => {
    if (!gpayModal || !payUpi) {
      setQrDataUrl('');
      return;
    }
    const numericAmt = Number(payAmount) || 0;
    const upiStr = buildUpiUrl({
      upiId: payUpi,
      name: gpayModal.staffName,
      amount: Math.max(1, numericAmt),
      note: payNote || `${activeCompany?.name || 'Salary'} Payout`,
    });
    let cancelled = false;
    QRCode.toDataURL(upiStr, {
      width: 240,
      margin: 2,
      color: { dark: '#0B1120', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [gpayModal, payUpi, payAmount, payNote, activeCompany?.name]);

  const handleCopyWaText = async () => {
    const ok = await safeCopyText(waText);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? 'Message Copied' : 'Could not copy message',
    });
  };

  const handleCopyUpi = async () => {
    const ok = await safeCopyText(payUpi);
    pushToast({
      type: ok ? 'success' : 'error',
      title: ok ? `UPI Copied: ${payUpi}` : 'Copy failed',
    });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPayScreenshot(dataUrl);
      pushToast({ type: 'success', title: 'Payment Screenshot Attached' });
    } catch {
      pushToast({ type: 'error', title: 'Image upload failed' });
    }
  };

  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpayModal) return;
    const numericAmount = Number(payAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      pushToast({ type: 'error', title: 'Enter a valid payment amount' });
      return;
    }
    recordSalaryPayment({
      staffId: gpayModal.staffId,
      amount: Math.round(numericAmount),
      mode: payMode,
      category: payCategory,
      upiIdUsed: payUpi.trim(),
      utr: payUtr.trim(),
      note: payNote.trim() || `${payCategory === 'salary' ? 'Salary' : 'Advance'} Payout`,
      screenshotUrl: payScreenshot,
    });
    closeGPayModal();
  };

  const numericAmt = Math.max(1, Number(payAmount) || 0);
  const defaultUpiNote = `${activeCompany?.name || 'Salary'} Payout`;
  const gpayDeepLink = gpayModal
    ? buildGpayDeepLink({
        upiId: payUpi,
        name: gpayModal.staffName,
        amount: numericAmt,
        note: payNote || defaultUpiNote,
      })
    : '#';
  const universalUpiLink = gpayModal
    ? buildUpiUrl({
        upiId: payUpi,
        name: gpayModal.staffName,
        amount: numericAmt,
        note: payNote || defaultUpiNote,
      })
    : '#';

  return (
    <>
      {/* Floating Toast Notification Stack */}
      <div
        className="fixed top-4 right-4 z-[80] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none no-print"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            );
          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white border border-slate-200 shadow-lg shadow-slate-900/10 rounded-xl px-4 py-3 flex items-start gap-3"
            >
              {icon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0B1120] leading-snug">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Direct WhatsApp Modal */}
      {whatsappModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={closeWhatsAppModal}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1120]">WhatsApp Direct Dispatch</h3>
                  <p className="text-xs text-slate-500">{whatsappModal.recipientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeWhatsAppModal}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close WhatsApp modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Recipient WhatsApp Number (with Country Code)
                </label>
                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="919876543210"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Editable Message Preview
                </label>
                <textarea
                  rows={6}
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopyWaText}
                  className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Copy className="w-4 h-4" />
                  Copy Text
                </button>
                <a
                  href={buildWhatsAppUrl(waPhone, waText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeWhatsAppModal}
                  className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Dual-Mode Google Pay / UPI Payout Modal */}
      {gpayModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/65 backdrop-blur-xs flex items-end lg:items-center justify-center p-0 sm:p-4 overflow-y-auto no-print"
          onClick={closeGPayModal}
        >
          <div
            className="bg-white w-full lg:max-w-3xl rounded-t-3xl lg:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lg:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="px-5 py-4 bg-[#0B1120] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Google Pay &amp; Bank Salary Payout</h3>
                  <p className="text-xs text-slate-300">
                    {gpayModal.staffName} · Balance {formatINR(gpayModal.suggestedAmount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeGPayModal}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                aria-label="Close payout modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmPayout}
              className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5"
            >
              {/* Left Column: Payment Controls */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'gpay', label: 'Google Pay (UPI)', icon: Smartphone },
                        { id: 'upi', label: 'PhonePe / UPI', icon: QrCode },
                        { id: 'bank', label: 'Bank IMPS / NEFT', icon: Building2 },
                        { id: 'cash', label: 'Cash Payout', icon: CreditCard },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const active = payMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayMode(m.id)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                            active
                              ? 'bg-[#2563EB] text-white border-[#2563EB]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Payout Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base font-bold font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Category
                    </label>
                    <select
                      value={payCategory}
                      onChange={(e) => setPayCategory(e.target.value as PaymentCategory)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    >
                      <option value="salary">Salary Payment</option>
                      <option value="advance">Advance / Petty Cash</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Staff UPI ID / Account Ref
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={payUpi}
                      onChange={(e) => setPayUpi(e.target.value)}
                      className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy UPI
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      UTR / Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={payUtr}
                      onChange={(e) => setPayUtr(e.target.value)}
                      placeholder="e.g. 432918445210"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Payment Note
                    </label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Monthly salary settlement"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Attach GPay / Bank Receipt Screenshot (Optional)
                  </label>
                  <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                      <Upload className="w-4 h-4 text-[#2563EB]" />
                      <span>
                        {payScreenshot
                          ? 'Screenshot attached (click to replace)'
                          : 'Upload GPay / NEFT confirmation screenshot'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    {payScreenshot && (
                      <img
                        src={payScreenshot}
                        alt="Receipt preview"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                      />
                    )}
                  </label>
                </div>
              </div>

              {/* Right Column: Instant Desktop QR & Mobile 1-Tap GPay Launch */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-[#F4F7FB] border border-slate-200 rounded-2xl p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#0B1120]">
                      Instant Scan &amp; Pay (Desktop QR)
                    </span>
                    <span className="text-xs font-mono font-bold text-[#2563EB] tabular-nums">
                      {formatINR(numericAmt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Scan directly with Google Pay or PhonePe on your phone — Staff UPI &amp; exact
                    amount are pre-locked.
                  </p>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`UPI QR Code for ${gpayModal.staffName}`}
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                        Enter UPI ID to render QR
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <p className="text-xs font-bold text-[#0B1120]">{gpayModal.staffName}</p>
                      <p className="text-[11px] font-mono text-slate-500">{payUpi}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile 1-Tap Deep Links */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">
                    Mobile One-Tap UPI App Launch
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={gpayDeepLink}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0B1120] hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#D97706]" />
                      Open GPay
                    </a>
                    <a
                      href={universalUpiLink}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-[#0B1120] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                      Any UPI App
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Confirm &amp; Send to Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Zoom Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 no-print"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="fixed top-4 right-4 min-h-[44px] min-w-[44px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full resolution preview"
            className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
