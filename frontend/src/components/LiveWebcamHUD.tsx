import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, ShieldCheck, GripHorizontal } from 'lucide-react';

interface LiveWebcamHUDProps {
  onCameraInterrupted?: () => void;
}

/**
 * Global helper to immediately shut off any active webcam tracks across the application.
 */
export function stopAllActiveMediaTracks() {
  try {
    document.querySelectorAll('video').forEach((v) => {
      if (v.srcObject) {
        try {
          const stream = v.srcObject as MediaStream;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((t) => t.stop());
          }
        } catch {}
        v.srcObject = null;
      }
    });
  } catch (err) {
    console.warn('Error stopping all active media tracks:', err);
  }
}

export const LiveWebcamHUD: React.FC<LiveWebcamHUDProps> = ({ onCameraInterrupted }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem('ubicode_webcam_hud_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(8, window.innerWidth - 240);
          const maxY = Math.max(8, window.innerHeight - 180);
          return {
            x: Math.max(8, Math.min(parsed.x, maxX)),
            y: Math.max(8, Math.min(parsed.y, maxY)),
          };
        }
      }
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; elX: number; elY: number } | null>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(position);
  positionRef.current = position;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  // Keep callback reference stable across parent re-renders
  const onCameraInterruptedRef = useRef(onCameraInterrupted);
  useEffect(() => {
    onCameraInterruptedRef.current = onCameraInterrupted;
  }, [onCameraInterrupted]);

  // Handle window resizing so widget stays within viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev || !hudRef.current) return prev;
        const hudWidth = hudRef.current.offsetWidth || 240;
        const hudHeight = hudRef.current.offsetHeight || 180;
        const maxX = Math.max(8, window.innerWidth - hudWidth - 8);
        const maxY = Math.max(8, window.innerHeight - hudHeight - 8);
        return {
          x: Math.max(8, Math.min(prev.x, maxX)),
          y: Math.max(8, Math.min(prev.y, maxY)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button or touch
    if ((e.target as HTMLElement).closest('button')) return; // Avoid drag on button clicks
    if (!hudRef.current) return;

    const rect = hudRef.current.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };

    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !hudRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    let newX = dragStartRef.current.elX + deltaX;
    let newY = dragStartRef.current.elY + deltaY;

    const hudWidth = hudRef.current.offsetWidth || 240;
    const hudHeight = hudRef.current.offsetHeight || 180;
    const minX = 8;
    const maxX = Math.max(minX, window.innerWidth - hudWidth - 8);
    const minY = 8;
    const maxY = Math.max(minY, window.innerHeight - hudHeight - 8);

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (positionRef.current) {
      try {
        sessionStorage.setItem('ubicode_webcam_hud_pos', JSON.stringify(positionRef.current));
      } catch {}
    }
  };

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        try {
          const s = videoRef.current.srcObject as MediaStream;
          if (s && s.getTracks) {
            s.getTracks().forEach((track) => track.stop());
          }
        } catch {}
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  const initCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media unsupported');
      }

      // Stop any existing stream before starting a new one
      stopTracks();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Prevent race condition: if unmounted while getUserMedia was resolving, stop immediately
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Handle stream track ending / device disconnected
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (isMountedRef.current) {
            setHasStream(false);
            setErrorMsg('Camera stream ended');
            if (onCameraInterruptedRef.current) onCameraInterruptedRef.current();
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasStream(true);
      setErrorMsg(null);
    } catch (err: any) {
      console.warn('Live proctoring webcam initialization failed:', err);
      if (isMountedRef.current) {
        setHasStream(false);
        setErrorMsg('Camera offline');
        if (onCameraInterruptedRef.current) onCameraInterruptedRef.current();
      }
    }
  }, [stopTracks]);

  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.muted = true;
      el.defaultMuted = true;
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  // Ensure stream playback is always connected when hasStream is true
  useEffect(() => {
    if (hasStream && videoRef.current && streamRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [hasStream]);

  // Initialize camera strictly ONCE when component mounts
  useEffect(() => {
    isMountedRef.current = true;
    initCamera();

    const handleLeave = () => {
      stopTracks();
      stopAllActiveMediaTracks();
    };

    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('popstate', handleLeave);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleLeave);
      window.removeEventListener('pagehide', handleLeave);
      window.removeEventListener('popstate', handleLeave);
      stopTracks();
      stopAllActiveMediaTracks();
    };
  }, [initCamera, stopTracks]);

  const containerStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
        zIndex: 50,
      }
    : {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 50,
      };

  return (
    <div
      ref={hudRef}
      style={containerStyle}
      className={`select-none transition-shadow duration-150 ${
        isDragging ? 'shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-2 ring-ubi-500/70' : 'shadow-2xl'
      }`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden flex flex-col w-52 sm:w-60 shadow-xl">
        {/* Top Header Bar / Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`flex items-center justify-between px-2.5 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-xs font-semibold text-slate-200 select-none touch-none ${
            isDragging
              ? 'cursor-grabbing bg-slate-700/90'
              : 'cursor-grab hover:bg-slate-800 active:cursor-grabbing'
          }`}
          title="Drag to reposition webcam anywhere on screen"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <GripHorizontal size={14} className="text-slate-400 shrink-0" />
            {hasStream ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[11px] font-medium text-emerald-300 truncate">Live Proctor Active</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-[11px] font-medium text-rose-300 truncate">Camera Warning</span>
              </>
            )}
          </div>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors shrink-0 ml-1"
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
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
            onCanPlay={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
            className="w-full h-full object-cover bg-black"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!hasStream && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-2 text-center text-rose-300">
              <CameraOff size={24} className="mb-1 text-rose-400" />
              <span className="text-[11px] font-bold">{errorMsg || 'Camera Offline'}</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
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
