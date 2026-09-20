import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  detectFace,
  captureCompressedPhoto,
  getFaceDetector,
  FaceDetectionResult,
} from '../utils/faceDetection';
import { extractFaceFeaturesFromDetection } from '../utils/faceMatcher';

interface WebcamVerificationCardProps {
  onPhotoCaptured: (photoDataUrl: string | null) => void;
  isResuming?: boolean;
}

export const WebcamVerificationCard: React.FC<WebcamVerificationCardProps> = ({
  onPhotoCaptured,
  isResuming = false,
}) => {
  type CamStatus = 'prompt' | 'requesting' | 'granted' | 'denied' | 'error';
  const [camStatus, setCamStatus] = useState<CamStatus>('prompt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastValidDetectionRef = useRef<any>(null);

  const [detection, setDetection] = useState<FaceDetectionResult>({
    detected: false,
    message: 'Initializing camera feed...',
  });

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedSizeKb, setCapturedSizeKb] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  // Stop camera tracks helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        if (s && s.getTracks) {
          s.getTracks().forEach((track) => track.stop());
        }
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  // Request user webcam access
  const requestCamera = useCallback(async () => {
    setCamStatus('requesting');
    setErrorMsg(null);

    // Stop any existing stream
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Prevent race condition: if unmounted while prompt was pending, stop immediately
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCamStatus('granted');
      setErrorMsg(null);

      // If video element is already mounted, attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play error:', err));
      }
    } catch (err: any) {
      console.warn('Webcam permission error:', err);
      if (isMountedRef.current) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCamStatus('denied');
          setErrorMsg('Camera permission was denied. Please allow camera access in browser settings and click Retry.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCamStatus('error');
          setErrorMsg('No web camera detected on this device. Please connect a working webcam.');
        } else {
          setCamStatus('error');
          setErrorMsg(err.message || 'Unable to access web camera.');
        }
      }
      stopStream();
    }
  }, [stopStream]);

  // Robust callback ref to attach stream the instant video mounts in DOM
  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch((err) => console.warn('Webcam play error on mount:', err));
    }
  }, []);

  // Request camera and preload AI detector automatically on mount
  useEffect(() => {
    isMountedRef.current = true;
    getFaceDetector().catch(() => {});
    requestCamera();

    const handleLeave = () => {
      stopStream();
    };

    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('popstate', handleLeave);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleLeave);
      window.removeEventListener('pagehide', handleLeave);
      window.removeEventListener('popstate', handleLeave);
      stopStream();
    };
  }, [requestCamera, stopStream]);

  // Ensure stream is bound whenever camStatus becomes 'granted'
  useEffect(() => {
    if (camStatus === 'granted' && streamRef.current && videoRef.current && !capturedPhoto) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [camStatus, capturedPhoto]);

  // Periodic Face Detection Loop
  useEffect(() => {
    if (camStatus !== 'granted' || capturedPhoto) return;

    let active = true;
    const interval = setInterval(async () => {
      if (!videoRef.current || !active) return;

      // If video has stream attached but is paused, resume playback
      if (videoRef.current.paused && videoRef.current.srcObject) {
        videoRef.current.play().catch(() => {});
      }

      if (videoRef.current.readyState < 2) {
        // Camera stream still buffering initial frames
        return;
      }

      const result = await detectFace(videoRef.current);
      if (active) {
        setDetection(result);
        if (result.detected && result.rawDetection) {
          lastValidDetectionRef.current = result.rawDetection;
        }
      }
    }, 400);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [camStatus, capturedPhoto]);

  // Capture compressed photo action
  const handleCapture = () => {
    if (!videoRef.current) return;

    const photoDataUrl = captureCompressedPhoto(videoRef.current);
    if (!photoDataUrl) {
      alert('Failed to capture photo. Please check camera.');
      return;
    }

    // Estimate size in KB from base64 string length
    const sizeInBytes = Math.round((photoDataUrl.length * 3) / 4);
    const sizeKb = Number((sizeInBytes / 1024).toFixed(1));

    // Extract and cache baseline biometric landmarks from active video stream synchronously before stopping camera
    if (lastValidDetectionRef.current && videoRef.current) {
      try {
        const feat = extractFaceFeaturesFromDetection(
          lastValidDetectionRef.current,
          videoRef.current,
          videoRef.current.videoWidth || 320,
          videoRef.current.videoHeight || 240
        );
        if (feat) {
          sessionStorage.setItem('ubicode_ref_features_latest', JSON.stringify(feat));
        }
      } catch (err) {
        console.warn('Failed to extract baseline features on capture:', err);
      }
    }
    try {
      sessionStorage.setItem('ubicode_ref_photo_latest', photoDataUrl);
    } catch {}

    setCapturedPhoto(photoDataUrl);
    setCapturedSizeKb(sizeKb);
    onPhotoCaptured(photoDataUrl);
    // Shut off camera stream to release webcam hardware once photo is taken
    stopStream();
  };

  // Retake photo action
  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedSizeKb(null);
    onPhotoCaptured(null);
    // Re-acquire camera stream for retake
    requestCamera();
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
        capturedPhoto
          ? 'bg-ubi-50/60 dark:bg-ubi-950/30 border-ubi-200 dark:border-ubi-800/80 border-l-4 border-l-ubi-700'
          : camStatus === 'denied'
          ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 border-l-4 border-l-rose-600'
          : camStatus === 'error'
          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 border-l-4 border-l-amber-600'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 border-l-4 border-l-ubi-700 dark:border-l-ubi-500'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon Badge */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
              capturedPhoto
                ? 'bg-ubi-100 text-ubi-800 dark:bg-ubi-900/60 dark:text-ubi-300'
                : camStatus === 'denied'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                : 'bg-ubi-100 text-ubi-800 dark:bg-ubi-900/60 dark:text-ubi-300'
            }`}
          >
            {capturedPhoto ? (
              <CheckCircle2 size={15} className="text-ubi-800 dark:text-ubi-400" />
            ) : camStatus === 'denied' ? (
              <CameraOff size={15} className="text-rose-600 dark:text-rose-400" />
            ) : (
              <Camera size={15} className="text-ubi-700 dark:text-ubi-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Facial Identity & Webcam Verification
              </h4>
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs ${
                  capturedPhoto
                    ? 'bg-ubi-100/90 text-ubi-900 border-ubi-300 dark:bg-ubi-950/80 dark:text-ubi-300 dark:border-ubi-800'
                    : camStatus === 'granted'
                    ? 'bg-sky-100/90 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800'
                    : camStatus === 'denied'
                    ? 'bg-rose-100/90 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                {capturedPhoto
                  ? '✓ Photo Verified'
                  : camStatus === 'granted'
                  ? 'Camera Active'
                  : camStatus === 'denied'
                  ? '✕ Blocked'
                  : 'Action Required'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate sm:mt-0 mt-0.5">
              {capturedPhoto
                ? 'Identity photo captured and ready for submission.'
                : camStatus === 'granted'
                ? 'Position your face inside the guide oval and click Take Verification Photo.'
                : 'Webcam verification required to start assessment.'}
            </p>
          </div>
        </div>

        {camStatus !== 'granted' && !capturedPhoto && (
          <button
            type="button"
            onClick={requestCamera}
            disabled={camStatus === 'requesting'}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-ubi-800 hover:bg-ubi-900 text-white transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={camStatus === 'requesting' ? 'animate-spin' : ''} />
            <span>{camStatus === 'denied' ? 'Retry Camera' : 'Enable Camera'}</span>
          </button>
        )}
      </div>

      {/* Permission Blocked / Error State */}
      {camStatus === 'denied' && (
        <div className="mt-2 p-3 rounded-xl bg-rose-100/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            {errorMsg ||
              'Camera access was denied. Please click the lock icon in your browser address bar to allow camera access, then click "Retry Camera".'}
          </span>
        </div>
      )}

      {/* Video / Photo Preview Container */}
      {camStatus === 'granted' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Live Video Feed or Captured Photo */}
          <div className="relative mx-auto w-full max-w-[280px] aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-700 dark:border-slate-800 shadow-md flex items-center justify-center">
            {!capturedPhoto ? (
              <>
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
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Face Guide Oval Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-[135px] h-[170px] rounded-[50%] border-2 border-dashed transition-all duration-300 ${
                      detection.detected
                        ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                        : 'border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    }`}
                  />
                </div>

                {/* Clean Top Status Overlay */}
                <div className="absolute top-0 inset-x-0 p-2 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-2 backdrop-blur-md border transition-all ${
                      detection.detected
                        ? 'bg-emerald-950/85 text-emerald-200 border-emerald-500/40 shadow-2xs'
                        : 'bg-slate-950/85 text-amber-200 border-amber-500/40 shadow-2xs'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        detection.detected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-center font-semibold leading-tight">
                      {detection.detected
                        ? '✓ Face Verified & Aligned'
                        : detection.message || 'Position face inside the oval'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Candidate Verification Snapshot"
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute bottom-2 left-2 right-2 bg-ubi-950/85 backdrop-blur-sm border border-ubi-500/40 text-ubi-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-center flex items-center justify-center gap-1.5 shadow-2xs">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Snapshot verified ({capturedSizeKb} KB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Action & Verification Status Details */}
          <div className="flex flex-col justify-center space-y-3">
            {!capturedPhoto ? (
              <>
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Instructions for Photo:
                  </h5>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed">
                    <li>Center your face inside the dashed oval</li>
                    <li>Ensure good ambient lighting without glare</li>
                    <li>Do not wear caps, dark glasses, or masks</li>
                  </ul>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!detection.detected}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      detection.detected
                        ? 'bg-ubi-800 hover:bg-ubi-900 text-white shadow-ubi-900/20 active:scale-95'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70 shadow-none'
                    }`}
                  >
                    <Camera size={15} />
                    <span>Take Verification Photo</span>
                  </button>
                  {!detection.detected && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                      Position your face inside the guide oval to enable photo capture.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Retake Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
