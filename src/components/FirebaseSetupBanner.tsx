import React from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useErp } from '../context/ErpContext';

export const RtdbStatusBadge: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const { isFirebaseConfigured, isRtdbConnected } = useErp();

  if (!isFirebaseConfigured) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap ${
          dark ? 'text-amber-300' : 'text-[#D97706]'
        }`}
      >
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        Firestore Setup Needed
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap ${
        isRtdbConnected
          ? dark
            ? 'text-emerald-300'
            : 'text-[#059669]'
          : dark
          ? 'text-amber-300'
          : 'text-[#D97706]'
      }`}
    >
      <Wifi className="w-3.5 h-3.5 shrink-0" />
      {isRtdbConnected ? 'Live Firestore Connected' : 'Connecting...'}
    </span>
  );
};

export const FirebaseSetupBanner: React.FC = () => {
  const { isFirebaseConfigured } = useErp();
  if (isFirebaseConfigured) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-left space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#0B1120]">
            Firebase Configuration Missing
          </h3>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
            Ensure <strong className="font-mono">firebase-applet-config.json</strong> is present in
            the workspace root to connect to Cloud Firestore and Firebase Authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
