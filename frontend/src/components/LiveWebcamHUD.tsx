import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, ShieldCheck, GripHorizontal, AlertTriangle } from 'lucide-react';
import {
  analyzeFrameFaces,
  captureLocalSnapshot,
} from '../utils/faceMatcher';
import { getFaceDetector, getMonotonicTimestamp } from '../utils/faceDetection';
import { examsApi } from '../api/exams';

interface LiveWebcamHUDProps {
  onCameraInterrupted?: () => void;
  examId?: string | number;
  assignmentId?: number;
  attemptNumber?: number;
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

export const LiveWebcamHUD: React.FC<LiveWebcamHUDProps> = ({
  onCameraInterrupted,
  examId,
  assignmentId,
  attemptNumber = 1,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time camera warning state (shown only on HUD video, zero logs stored on client)
  const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);
  const lastAnomalyCaptureTimeRef = useRef<{ [reason: string]: number }>({});
  const isCheckingAnomalyRef = useRef(false);
  const consecutiveNoFaceCountRef = useRef(0);

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

  // Real-time anomaly detection loop (sampled every 1.2s - pure client-side)
  useEffect(() => {
    if (!hasStream || !examId) return;

    const intervalId = setInterval(async () => {
      if (isCheckingAnomalyRef.current || !videoRef.current) return;

      // Resume video playback if stream is attached but paused
      if (videoRef.current.paused && videoRef.current.srcObject) {
        videoRef.current.play().catch(() => {});
      }
      if (videoRef.current.readyState < 2) return;

      isCheckingAnomalyRef.current = true;
      try {
        const detector = await getFaceDetector();
        if (!detector) return;

        const timestamp = getMonotonicTimestamp();
        const result = detector.detectForVideo(videoRef.current, timestamp);
        const detections = result.detections || [];
        const now = Date.now();

        const vWidth = videoRef.current.videoWidth || 320;
        const vHeight = videoRef.current.videoHeight || 240;

        // Smart frame face analysis: separates primary candidate from secondary faces & ignores lab background people
        const { primaryFace, suspiciousExtraFaces } = analyzeFrameFaces(
          detections,
          vWidth,
          vHeight
        );

        const sendAnomalyLog = async (
          eventType: 'NO_FACE' | 'MULTIPLE_FACES',
          title: string,
          description: string,
          snapshot: string | null,
          extraMeta?: Record<string, any>
        ) => {
          if (!examId || !assignmentId) {
            console.warn('[Proctoring] Skipping anomaly log: examId or assignmentId missing', { examId, assignmentId });
            return;
          }

          let s3Key: string | null = null;
          if (snapshot) {
            try {
              console.log(`[Proctoring] Requesting S3 presigned upload URL for ${eventType}...`);
              const uploadRes = await examsApi.getPhotoUploadUrl(
                Number(examId),
                eventType.toLowerCase(),
                attemptNumber || 1,
                assignmentId
              );
              if (uploadRes?.upload_url && uploadRes?.s3_key) {
                console.log(`[Proctoring] Uploading snapshot directly to S3 (${uploadRes.s3_key})...`);
                await examsApi.uploadPhotoDirectToS3(uploadRes.upload_url, snapshot);
                s3Key = uploadRes.s3_key;
                console.log(`[Proctoring] Direct S3 upload successful for ${eventType}! Key: ${s3Key}`);
              }
            } catch (uploadErr) {
              console.warn(`[Proctoring] Direct S3 upload failed for ${eventType}:`, uploadErr);
            }
          }

          // GUARANTEED: Save proctoring log to FastAPI backend regardless of S3 direct upload status
          try {
            console.log(`[Proctoring] Saving ${eventType} log to backend database...`);
            await examsApi.saveProctoringLogs(Number(examId), assignmentId, [
              {
                event_type: eventType,
                title,
                description,
                occurred_at: new Date().toISOString(),
                meta_data: JSON.stringify({
                  s3_key: s3Key,
                  photo_url: s3Key,
                  ...extraMeta,
                }),
              },
            ]);
            console.log(`[Proctoring] Successfully saved ${eventType} log to backend database.`);
          } catch (logErr) {
            console.error(`[Proctoring] Failed to save ${eventType} log to backend:`, logErr);
          }
        };

        // 1. MULTIPLE PEOPLE DETECTED (Another person looking directly into camera/screen)
        if (suspiciousExtraFaces.length > 0) {
          setAnomalyWarning(`Multiple people detected looking into camera (${suspiciousExtraFaces.length + 1})`);
          const lastTime = lastAnomalyCaptureTimeRef.current['MULTIPLE_FACES'] || 0;
          if (now - lastTime > 6000) {
            lastAnomalyCaptureTimeRef.current['MULTIPLE_FACES'] = now;
            const snapshot = captureLocalSnapshot(videoRef.current);
            sendAnomalyLog(
              'MULTIPLE_FACES',
              'Additional Person Looking into Camera',
              `${suspiciousExtraFaces.length + 1} people detected looking directly into the camera. Distant background occupants were ignored.`,
              snapshot,
              { face_count: suspiciousExtraFaces.length + 1 }
            );
          }
        }
        // 2. CANDIDATE NOT IN FRAME (Camera covered or candidate stepped away)
        else if (!primaryFace) {
          consecutiveNoFaceCountRef.current++;
          // Immediately display warning on UI so candidate has instant, responsive feedback
          setAnomalyWarning('Candidate not visible in frame');
          const lastTime = lastAnomalyCaptureTimeRef.current['NO_FACE'] || 0;
          if (now - lastTime > 6000) {
            lastAnomalyCaptureTimeRef.current['NO_FACE'] = now;
            const snapshot = captureLocalSnapshot(videoRef.current);
            sendAnomalyLog(
              'NO_FACE',
              'Candidate Missing / Camera Covered',
              'Candidate face was not detected in front of the screen. Camera may be blocked or candidate stepped away.',
              snapshot
            );
          }
        }
        // 3. CANDIDATE PRESENT & NORMAL (Single face visible in frame)
        else {
          consecutiveNoFaceCountRef.current = 0;
          setAnomalyWarning(null);
        }
      } catch (err) {
        console.warn('Proctoring anomaly check warning:', err);
      } finally {
        isCheckingAnomalyRef.current = false;
      }
    }, 1200);

    return () => clearInterval(intervalId);
  }, [hasStream, examId, assignmentId, attemptNumber]);

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
                <span className="text-[11px] font-medium text-emerald-300 truncate">Live Proctor</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-[11px] font-medium text-rose-300 truncate">Camera Warning</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors shrink-0"
              title={isMinimized ? 'Expand camera' : 'Minimize camera'}
            >
              {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
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

          {/* Real-time anomaly warning pill on video */}
          {anomalyWarning && hasStream && !isMinimized && (
            <div className="absolute top-1.5 left-1.5 right-1.5 bg-rose-600/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow flex items-center justify-center gap-1 animate-pulse z-10">
              <AlertTriangle size={11} className="shrink-0 text-amber-300" />
              <span className="truncate">{anomalyWarning}</span>
            </div>
          )}

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

