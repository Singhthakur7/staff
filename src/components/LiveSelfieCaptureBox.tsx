import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, StopCircle } from 'lucide-react';
import { captureMirroredVideoFrame, formatTimeIN } from '../utils/helpers';

interface LiveSelfieCaptureBoxProps {
  capturedSelfie: string;
  onCapture: (dataUrl: string) => void;
  title?: string;
  autoStart?: boolean;
}

export const LiveSelfieCaptureBox: React.FC<LiveSelfieCaptureBoxProps> = ({
  capturedSelfie,
  onCapture,
  title = 'Live Front-Camera Selfie',
  autoStart = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedAt, setCapturedAt] = useState('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live front camera is not supported on this device/browser.');
        return;
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError(
        'Camera permission denied. Allow front camera access to capture your live selfie.'
      );
    }
  };

  useEffect(() => {
    if (autoStart && !capturedSelfie) {
      void startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const dataUrl = captureMirroredVideoFrame(videoRef.current, 480);
    if (!dataUrl) {
      setCameraError('Camera frame is still warming up. Please try again.');
      return;
    }
    setCapturedAt(new Date().toISOString());
    onCapture(dataUrl);
    stopCamera();
  };

  return (
    <div className="space-y-2.5">
      <div className="relative aspect-[4/3] w-full max-h-64 rounded-2xl overflow-hidden bg-[#0B1120] border border-slate-200 flex items-center justify-center">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : capturedSelfie ? (
          <img
            src={capturedSelfie}
            alt="Captured live selfie"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center px-5 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-sky-300 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-white">{title}</p>
            <p className="text-[11px] text-slate-400">
              Tap Start Camera below to take a live mirrored selfie.
            </p>
          </div>
        )}

        {capturedSelfie && !cameraActive && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-950/75 text-white px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-300 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Live Selfie Ready
            </span>
            {capturedAt && <span className="font-mono text-slate-200">{formatTimeIN(capturedAt)}</span>}
          </div>
        )}
      </div>

      {cameraError && (
        <p className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {cameraError}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {!cameraActive ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="col-span-2 min-h-[44px] px-3.5 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            {capturedSelfie ? <RefreshCw className="w-3.5 h-3.5" /> : <Camera className="w-4 h-4" />}
            {capturedSelfie ? 'Retake Live Selfie' : 'Start Front Camera'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            className="col-span-2 min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            Capture Selfie Now
          </button>
        )}

        <button
          type="button"
          onClick={stopCamera}
          disabled={!cameraActive}
          className="min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
        >
          <StopCircle className="w-3.5 h-3.5 text-rose-600" />
          Stop
        </button>
      </div>
    </div>
  );
};
