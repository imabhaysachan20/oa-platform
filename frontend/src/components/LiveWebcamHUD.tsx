import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface LiveWebcamHUDProps {
  onCameraInterrupted?: () => void;
}

export const LiveWebcamHUD: React.FC<LiveWebcamHUDProps> = ({ onCameraInterrupted }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const initCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media unsupported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      // Handle stream track ending / device disconnected
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setHasStream(false);
          setErrorMsg('Camera stream ended');
          if (onCameraInterrupted) onCameraInterrupted();
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasStream(true);
      setErrorMsg(null);
    } catch (err: any) {
      console.warn('Live proctoring webcam initialization failed:', err);
      setHasStream(false);
      setErrorMsg('Camera offline');
      if (onCameraInterrupted) onCameraInterrupted();
    }
  }, [onCameraInterrupted]);

  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    initCamera();
    return () => {
      stopTracks();
    };
  }, [initCamera, stopTracks]);

  return (
    <div className="fixed bottom-4 right-4 z-50 transition-all select-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col w-52 sm:w-60">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/60 text-xs font-semibold text-slate-200">
          <div className="flex items-center gap-1.5">
            {hasStream ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-300">Live Proctor Active</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[11px] font-medium text-rose-300">Camera Warning</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
            title={isMinimized ? 'Expand camera' : 'Minimize camera'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Video Frame */}
        <div className={`relative transition-all duration-200 ${isMinimized ? 'h-0 hidden' : 'h-36 sm:h-40'}`}>
          <video
            ref={attachVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover bg-black"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!hasStream && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-2 text-center text-rose-300">
              <CameraOff size={24} className="mb-1 text-rose-400" />
              <span className="text-[11px] font-bold">{errorMsg || 'Camera Offline'}</span>
              <button
                type="button"
                onClick={initCamera}
                className="mt-2 text-[10px] underline hover:text-white"
              >
                Reconnect
              </button>
            </div>
          )}

          {hasStream && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] text-slate-300 flex items-center gap-1 font-mono">
              <ShieldCheck size={11} className="text-emerald-400" />
              <span>Proctored</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
