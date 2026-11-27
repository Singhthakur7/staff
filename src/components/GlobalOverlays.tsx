import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  MessageCircle,
  QrCode,
  Smartphone,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useStaffOnline } from '../context/StaffOnlineContext';
import { t } from '../i18n';
import {
  buildGPayDeepLinks,
  buildWhatsAppUrl,
  compressImageFileToBase64,
  formatDateTimeIN,
  formatINR,
  safeCopyText,
} from '../utils/helpers';

export const GlobalOverlays: React.FC = () => {
  const {
    lang,
    session,
    activeDb,
    toasts,
    dismissToast,
    notificationsOpen,
    setNotificationsOpen,
    markAllNotificationsRead,
    clearNotifications,
    gpayModal,
    closeGPayModal,
    recordAdvanceOrSettlement,
    whatsappModal,
    closeWhatsAppModal,
    lightboxUrl,
    closeLightbox,
    pushToast,
  } = useStaffOnline();

  // GPay Modal local state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utr, setUtr] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(undefined);
  const [submittingGPay, setSubmittingGPay] = useState(false);

  useEffect(() => {
    if (!gpayModal) {
      setQrDataUrl('');
      setUtr('');
      setScreenshotUrl(undefined);
      return;
    }
    setScreenshotUrl(gpayModal.screenshotUrl);
    const { upiUrl } = buildGPayDeepLinks({
      upiId: gpayModal.upiId,
      payeeName: gpayModal.staffName,
      amount: gpayModal.amount,
      note: gpayModal.note || `Salary Settlement - ${gpayModal.staffName}`,
    });
    QRCode.toDataURL(upiUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [gpayModal]);

  const roleNotifications = activeDb.notifications.filter((n) => {
    if (!session) return false;
    if (session.role === 'staff') {
      return n.targetRole === 'all' || (n.targetRole === 'staff' && n.targetStaffId === session.staffId);
    }
    return n.targetRole === 'company_admin' || n.targetRole === 'all';
  });

  const handleConfirmGPaySync = async () => {
    if (!gpayModal) return;
    setSubmittingGPay(true);
    await recordAdvanceOrSettlement({
      staffId: gpayModal.staffId,
      amount: gpayModal.amount,
      date: gpayModal.date,
      time: gpayModal.time,
      dueDate: gpayModal.dueDate,
      mode: 'gpay',
      kind: 'settlement',
      note: gpayModal.note || 'Google Pay Settlement (Auto-Sync)',
      utr: utr.trim() || undefined,
      screenshotUrl,
    });
    setSubmittingGPay(false);
    closeGPayModal();
  };

  const handleScreenshotUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageFileToBase64(file, 720);
      setScreenshotUrl(compressed);
      pushToast({ type: 'success', title: 'Payment screenshot attached' });
    } catch {
      pushToast({ type: 'error', title: 'Could not process screenshot' });
    }
  };

  const gpayLinks = gpayModal
    ? buildGPayDeepLinks({
        upiId: gpayModal.upiId,
        payeeName: gpayModal.staffName,
        amount: gpayModal.amount,
        note: gpayModal.note || `Salary Settlement - ${gpayModal.staffName}`,
      })
    : null;

  return (
    <>
      {/* Live Notifications Slide-Over Drawer */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-xs flex justify-end no-print"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{t(lang, 'notifications')}</h3>
                  <p className="text-xs text-slate-500">
                    {roleNotifications.length} alert{roleNotifications.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleNotifications.length > 0 && (
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  className="text-xs font-semibold text-[#2563EB] hover:text-[#1E3A8A] inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t(lang, 'markAllRead')}
                </button>
                {session?.role !== 'staff' && (
                  <button
                    type="button"
                    onClick={() => void clearNotifications()}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t(lang, 'clearAll')}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {roleNotifications.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium text-slate-500">{t(lang, 'noNotifications')}</p>
                </div>
              ) : (
                roleNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-5 py-4 space-y-1 transition-colors ${
                      n.read ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[#0F172A]">{n.title}</p>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {formatDateTimeIN(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dual-Mode Google Pay Settlement Modal (QR on Desktop + Deep-Links on Mobile) */}
      {gpayModal && gpayLinks && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={closeGPayModal}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Google Pay Settlement (Auto-Sync)</h3>
                <p className="text-xs text-slate-300">
                  {gpayModal.staffName} · <span className="font-mono">{gpayModal.upiId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeGPayModal}
                className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Settlement Amount</p>
                  <p className="text-2xl font-mono font-extrabold text-[#0F172A] tabular-nums">
                    {formatINR(gpayModal.amount)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 font-mono">
                  <p>{gpayModal.date}</p>
                  <p>{gpayModal.time}</p>
                </div>
              </div>

              {/* Mobile Direct GPay / UPI Launchers */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
                  Mobile Direct Pay (Google Pay / Any UPI App)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={gpayLinks.gpayUrl}
                    className="min-h-[44px] px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Google Pay (GPay)
                  </a>
                  <a
                    href={gpayLinks.upiUrl}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    Open Any UPI App
                  </a>
                </div>
              </div>

              {/* Desktop Dynamic Scannable QR Code */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center space-y-2.5 bg-white">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#059669]" />
                  Desktop Scan &amp; Pay QR (Pre-filled UPI &amp; Amount)
                </p>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI QR for ${gpayModal.staffName}`}
                    className="w-48 h-48 rounded-xl border border-slate-100"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await safeCopyText(gpayModal.upiId);
                    pushToast({
                      type: ok ? 'success' : 'error',
                      title: ok ? 'UPI ID copied' : 'Copy failed',
                    });
                  }}
                  className="text-xs font-mono font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {gpayModal.upiId}
                </button>
              </div>

              {/* UTR & Screenshot Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    UTR / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 432198765432"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    GPay Screenshot (Optional)
                  </label>
                  <label className="w-full h-11 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#2563EB] bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{screenshotUrl ? 'Screenshot Attached ✓' : 'Attach Proof'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleScreenshotUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                disabled={submittingGPay}
                onClick={() => void handleConfirmGPaySync()}
                className="w-full min-h-[48px] px-5 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submittingGPay
                  ? 'Syncing Settlement...'
                  : 'Record GPay Settlement & Notify Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Direct Share Modal */}
      {whatsappModal && (
        <div
          className="fixed inset-0 z-[85] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
          onClick={closeWhatsAppModal}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#059669]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Share via WhatsApp — {whatsappModal.recipientName}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {whatsappModal.phone || 'Select contact in WhatsApp'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeWhatsAppModal}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <pre className="whitespace-pre-wrap text-xs font-sans bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto text-slate-700 leading-relaxed">
                {whatsappModal.message}
              </pre>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={buildWhatsAppUrl(whatsappModal.phone, whatsappModal.message)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open WhatsApp
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await safeCopyText(whatsappModal.message);
                    pushToast({
                      type: ok ? 'success' : 'error',
                      title: ok ? 'Message copied to clipboard' : 'Copy failed',
                    });
                  }}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  Copy Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[95] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 no-print"
          onClick={closeLightbox}
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={closeLightbox}
              className="self-end mb-3 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Zoomed proof preview"
              className="max-h-[82vh] max-w-full rounded-2xl border border-white/15 shadow-2xl object-contain bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Floating Toast Stack */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-[90] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none no-print">
        {toasts.map((toast) => {
          const Icon =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
                ? AlertTriangle
                : toast.type === 'warning'
                  ? AlertTriangle
                  : Info;
          const colorClass =
            toast.type === 'success'
              ? 'border-emerald-200 bg-white text-[#0F172A]'
              : toast.type === 'error'
                ? 'border-rose-200 bg-white text-[#0F172A]'
                : toast.type === 'warning'
                  ? 'border-amber-200 bg-white text-[#0F172A]'
                  : 'border-blue-200 bg-white text-[#0F172A]';
          const iconColor =
            toast.type === 'success'
              ? 'text-emerald-600'
              : toast.type === 'error'
                ? 'text-rose-600'
                : toast.type === 'warning'
                  ? 'text-amber-600'
                  : 'text-[#2563EB]';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 ${colorClass}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-snug">{toast.title}</p>
                {toast.detail && <p className="text-[11px] text-slate-500 mt-0.5">{toast.detail}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};
