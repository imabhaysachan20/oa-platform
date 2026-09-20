import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  detectFace,
  captureCompressedPhoto,
  getFaceDetector,
  FaceDetectionResult,
} from '../utils/faceDetection';

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
      className={`p-4 rounded-xl border transition-all ${
        capturedPhoto
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700'
          : camStatus === 'denied'
          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
          : camStatus === 'error'
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              capturedPhoto
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                : camStatus === 'denied'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            }`}
          >
            {capturedPhoto ? (
              <CheckCircle2 size={20} />
            ) : camStatus === 'denied' ? (
              <CameraOff size={20} />
            ) : (
              <Camera size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Facial Identity & Webcam Verification
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  capturedPhoto
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : camStatus === 'granted'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : camStatus === 'denied'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                }`}
              >
                {capturedPhoto
                  ? 'Photo Verified'
                  : camStatus === 'granted'
                  ? 'Camera Active'
                  : camStatus === 'denied'
                  ? 'Access Blocked'
                  : 'Action Required'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Institutional proctoring requires continuous webcam verification. Position your face
              within the frame and take a verification photo to {isResuming ? 'resume' : 'start'}{' '}
              your assessment.
            </p>
          </div>
        </div>

        {camStatus !== 'granted' && !capturedPhoto && (
          <button
            type="button"
            onClick={requestCamera}
            disabled={camStatus === 'requesting'}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={camStatus === 'requesting' ? 'animate-spin' : ''} />
            <span>{camStatus === 'denied' ? 'Retry Camera' : 'Enable Camera'}</span>
          </button>
        )}
      </div>

      {/* Permission Blocked / Error State */}
      {camStatus === 'denied' && (
        <div className="mt-2 p-3 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            {errorMsg ||
              'Camera access was denied. Please click the lock or camera icon in your browser address bar to allow camera access, then click "Retry Camera".'}
          </span>
        </div>
      )}

      {/* Video / Photo Preview Container */}
      {camStatus === 'granted' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Live Video Feed or Captured Photo */}
          <div className="relative mx-auto w-full max-w-[280px] aspect-[4/3] bg-black rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner flex items-center justify-center">
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
                <div
                  className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-all ${
                    detection.detected ? 'opacity-80' : 'opacity-100'
                  }`}
                >
                  <div
                    className={`w-[140px] h-[180px] rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                      detection.detected
                        ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                        : 'border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    }`}
                  />
                </div>

                {/* Live Status Badge Overlay */}
                <div className="absolute top-2 left-2 right-2 flex justify-center pointer-events-none">
                  <div
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-md transition-colors ${
                      detection.detected
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950/80 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        detection.detected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="truncate max-w-[200px]">{detection.message}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Candidate Verification Snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-emerald-950/85 backdrop-blur-sm border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold px-2 py-1 rounded text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Snapshot ready ({capturedSizeKb} KB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Action & Verification Status Details */}
          <div className="flex flex-col justify-center space-y-3">
            {!capturedPhoto ? (
              <>
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" />
                    Instructions for Photo:
                  </h5>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>Center your face inside the dashed oval</li>
                    <li>Ensure good ambient lighting without glare</li>
                    <li>Do not wear caps, dark glasses, or masks</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!detection.detected}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      detection.detected
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
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
              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <ShieldCheck size={16} />
                    <span>Identity Photo Verified</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Captured JPEG thumbnail ({capturedSizeKb} KB) will be securely uploaded to S3
                    proctoring storage upon entering the assessment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
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
