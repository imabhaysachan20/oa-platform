import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { collectDeviceTelemetry } from '../utils/deviceInfo';
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  MapPin,
  MapPinOff,
  CheckCircle2,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { WebcamVerificationCard } from '../components/WebcamVerificationCard';
import { stopAllActiveMediaTracks } from '../components/LiveWebcamHUD';

export const StudentExamInstructionsPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();
  const setExamSession = useExamStore((s) => s.setExamSession);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);

  // Ensure any active camera tracks from verification card are cleaned up when unmounting
  useEffect(() => {
    return () => {
      stopAllActiveMediaTracks();
    };
  }, []);

  // Device Location Verification State
  type LocationStatus = 'prompt' | 'requesting' | 'granted' | 'denied' | 'error' | 'unsupported';
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('prompt');
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // Request high-accuracy geolocation from browser
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('requesting');
    setLocationErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Number(position.coords.accuracy.toFixed(1)),
        });
        setLocationStatus('granted');
        setLocationErrorMsg(null);
      },
      (err) => {
        console.warn('Geolocation acquisition error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationErrorMsg('Location access was denied. Please allow location permissions in your browser address bar/settings and click Retry.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationStatus('error');
          setLocationErrorMsg('Device location is currently unavailable. Please verify GPS or network connectivity.');
        } else if (err.code === err.TIMEOUT) {
          setLocationStatus('error');
          setLocationErrorMsg('Location request timed out. Please click Retry to re-request.');
        } else {
          setLocationStatus('error');
          setLocationErrorMsg(err.message || 'Failed to detect device location.');
        }
        setLocationCoords(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Automatically request/check location on instructions page load
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          requestLocation();
        } else if (permissionStatus.state === 'denied') {
          setLocationStatus('denied');
          setLocationErrorMsg('Location access is blocked in browser settings. Please enable location permissions for this site and click Retry.');
        } else {
          requestLocation();
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            requestLocation();
          } else if (permissionStatus.state === 'denied') {
            setLocationStatus('denied');
            setLocationCoords(null);
            setLocationErrorMsg('Location access blocked in browser settings.');
          }
        };
      }).catch(() => {
        requestLocation();
      });
    } else {
      requestLocation();
    }
  }, [requestLocation]);

  // Countdown timer state for scheduled/upcoming assessments
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });

  const [isLive, setIsLive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Load exam metadata
  const { data: exam, isLoading: isExamLoading, error: examError } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.get(id),
    enabled: !!id,
  });

  // Fetch student question assignment if already initiated (only when in_progress)
  const { data: myQuestionsData } = useQuery({
    queryKey: ['myQuestions', id],
    queryFn: () => examsApi.getMyQuestions(id),
    enabled: !!id && isLive && exam?.assignment_status === 'in_progress',
    retry: false,
  });

  // Check assessment start/end time countdown
  useEffect(() => {
    if (!exam || !exam.start_time) {
      setIsLive(true);
      return;
    }

    const checkTime = () => {
      const now = new Date().getTime();
      const startTime = new Date(exam.start_time!).getTime();
      const endTime = exam.end_time ? new Date(exam.end_time).getTime() : null;

      if (endTime && now > endTime) {
        setIsExpired(true);
        setIsLive(false);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
        return;
      }

      const diff = startTime - now;
      if (diff <= 0) {
        setIsLive(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
      } else {
        setIsLive(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, totalSeconds: Math.floor(diff / 1000) });
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const isLocationVerified = locationStatus === 'granted' && !!locationCoords;
  const isResuming = exam?.assignment_status === 'in_progress' || myQuestionsData?.status === 'in_progress';

  const handleProceed = async () => {
    if (
      !exam ||
      !agreedToTerms ||
      isStarting ||
      !isLive ||
      isExpired ||
      !isLocationVerified ||
      !locationCoords ||
      !verificationPhoto
    )
      return;

    // Request fullscreen immediately on candidate click gesture
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (fsErr) {
      console.warn('Fullscreen request prompt failed or declined:', fsErr);
    }

    setIsStarting(true);
    try {
      const telemetry = await collectDeviceTelemetry();
      // Ensure verified location coordinates are explicitly injected into telemetry
      telemetry.latitude = locationCoords.latitude;
      telemetry.longitude = locationCoords.longitude;
      telemetry.accuracy = locationCoords.accuracy;
      telemetry.location_status = 'granted';

      // Enterprise Scalable Direct-to-S3 Upload with Presigned PUT URL
      let uploadedS3Key: string | undefined = undefined;
      try {
        if (verificationPhoto) {
          const uploadInfo = await examsApi.getPhotoUploadUrl(id, 'start');
          await examsApi.uploadPhotoDirectToS3(uploadInfo.upload_url, verificationPhoto);
          uploadedS3Key = uploadInfo.s3_key;
        }
      } catch (uploadErr) {
        console.warn('Direct S3 upload failed; using server-side fallback:', uploadErr);
      }

      // If direct S3 upload succeeded, send uploadedS3Key (0-byte image proxy through FastAPI)
      // Otherwise, pass verificationPhoto base64 as resilient server fallback
      const res = await examsApi.start(
        id,
        telemetry,
        uploadedS3Key ? undefined : verificationPhoto,
        uploadedS3Key
      );
      setExamSession(
        res.exam_id,
        res.assignment_id,
        exam.title || 'Exam in Progress',
        res.status,
        res.started_at,
        res.deadline_at,
        res.questions
      );

      // Single-use authorization for workspace entry
      sessionStorage.setItem(`ubicode_verified_entry_${id}`, 'true');
      if (verificationPhoto) {
        try {
          sessionStorage.setItem(`ubicode_ref_photo_${id}`, verificationPhoto);
          const latestFeat = sessionStorage.getItem('ubicode_ref_features_latest');
          if (latestFeat) {
            sessionStorage.setItem(`ubicode_ref_features_${id}`, latestFeat);
          }
        } catch (e) {
          console.warn('Failed to store reference photo in sessionStorage:', e);
        }
      }
      // Release camera hardware tracks from verification card before switching to workspace live feed
      stopAllActiveMediaTracks();
      navigate(`/exam/${id}/workspace`, { replace: true });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start or resume assessment');
      setIsStarting(false);
    }
  };

  if (isExamLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <p className="text-sm text-slate-500 font-mono">Loading assessment details...</p>
        </div>
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Card className="space-y-4">
          <AlertTriangle size={40} className="mx-auto text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assessment Not Found</h2>
          <p className="text-sm text-slate-500">The requested assessment could not be loaded or is not currently active.</p>
          <Button variant="primary" onClick={() => navigate('/')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  // Format raw title dynamically from backend exam object
  const formatExamTitle = (rawTitle?: string) => {
    if (!rawTitle) return '';
    const trimmed = rawTitle.trim();
    return trimmed
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const displayTitle = formatExamTitle(exam?.title) || exam?.title || 'Assessment';

  // DYNAMIC CALCULATIONS BASED ON CODEBASE DATA
  const duration = exam.duration_minutes || 60;
  
  const questionsList = myQuestionsData?.questions || (exam as any).questions || [];
  const codingQuestions = questionsList.filter((q: any) => (q.question_type || 'coding') === 'coding');
  const mcqQuestions = questionsList.filter((q: any) => q.question_type === 'mcq');
  
  const patternEasy = exam.easy_count ?? 1;
  const patternMed = exam.medium_count ?? 2;
  const patternHard = exam.hard_count ?? 0;
  const patternCoding = patternEasy + patternMed + patternHard;
  const patternMcq = exam.mcq_count ?? 0;

  let codingCount = 0;
  let mcqCount = 0;
  let totalCount = 0;

  if (questionsList.length > 0) {
    codingCount = codingQuestions.length;
    mcqCount = mcqQuestions.length;
    totalCount = questionsList.length;
  } else {
    codingCount = patternCoding;
    mcqCount = patternMcq;
    totalCount = codingCount + mcqCount;
  }

  // Format question summary string
  let questionSummaryText = `${totalCount} question${totalCount > 1 ? 's' : ''}`;
  if (codingCount > 0 && mcqCount > 0) {
    questionSummaryText = `${totalCount} questions (${codingCount} Coding, ${mcqCount} MCQ)`;
  } else if (codingCount > 0) {
    questionSummaryText = `${codingCount} Coding Question${codingCount > 1 ? 's' : ''}`;
  } else if (mcqCount > 0) {
    questionSummaryText = `${mcqCount} MCQ Question${mcqCount > 1 ? 's' : ''}`;
  }

  // Language display name mapping helper
  const formatLanguageName = (langKey: string): string => {
    const key = langKey.toLowerCase().trim();
    switch (key) {
      case 'python':
      case 'python3':
      case 'py':
        return 'Python';
      case 'cpp':
      case 'c++':
      case 'cpp14':
      case 'cpp17':
      case 'cpp20':
        return 'C++';
      case 'java':
      case 'java8':
      case 'java15':
      case 'java17':
        return 'Java';
      case 'javascript':
      case 'js':
      case 'node':
        return 'JavaScript';
      case 'typescript':
      case 'ts':
        return 'TypeScript';
      case 'c':
        return 'C';
      case 'csharp':
      case 'c#':
        return 'C#';
      case 'go':
      case 'golang':
        return 'Go';
      case 'rust':
        return 'Rust';
      case 'ruby':
        return 'Ruby';
      case 'kotlin':
        return 'Kotlin';
      case 'swift':
        return 'Swift';
      case 'php':
        return 'PHP';
      case 'sql':
        return 'SQL';
      default:
        return langKey.charAt(0).toUpperCase() + langKey.slice(1);
    }
  };

  // Extract dynamic list of allowed languages for this exam
  const extractAllowedLanguages = (): string[] => {
    const rawSet = new Set<string>();

    // 1. Check exam-level allowed_languages if present
    if (exam && Array.isArray((exam as any).allowed_languages) && (exam as any).allowed_languages.length > 0) {
      (exam as any).allowed_languages.forEach((l: string) => rawSet.add(formatLanguageName(l)));
    }

    // 2. Check question-level starter_code keys or allowed_languages
    codingQuestions.forEach((q: any) => {
      if (Array.isArray(q.allowed_languages) && q.allowed_languages.length > 0) {
        q.allowed_languages.forEach((l: string) => rawSet.add(formatLanguageName(l)));
      } else if (q.starter_code && typeof q.starter_code === 'object') {
        Object.keys(q.starter_code).forEach((l) => rawSet.add(formatLanguageName(l)));
      }
    });

    // 3. Default fallback if no specific restricted list was configured on backend
    if (rawSet.size === 0) {
      ['Python', 'C++', 'Java', 'JavaScript'].forEach((l) => rawSet.add(l));
    }

    return Array.from(rawSet);
  };

  const allowedLanguagesList = extractAllowedLanguages();
  const allowedLanguagesText = `${allowedLanguagesList.length} language${allowedLanguagesList.length > 1 ? 's' : ''} allowed: ${allowedLanguagesList.join(', ')}`;

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#f4f7f6] dark:bg-slate-950 flex flex-col md:flex-row animate-fadeIn">
      {/* LEFT PANEL: FIXED / NON-SCROLLING BETWEEN NAVBAR & FOOTER */}
      <div className="w-full md:w-[44%] lg:w-[40%] xl:w-[38%] bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 shrink-0 md:sticky md:top-16 md:h-[calc(100vh-113px)] overflow-hidden">
        <div className="space-y-8">
          {/* Title Section */}
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl text-slate-500 dark:text-slate-400 font-light leading-snug">
              Welcome to
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ubi-900 dark:text-ubi-300 tracking-tight leading-tight">
              {displayTitle}
            </h1>
          </div>

          {/* Test Metadata (Always Visible) */}
          <div className="flex items-center gap-12 text-slate-700 dark:text-slate-300 pt-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">Test duration</p>
              <p className="text-base sm:text-lg font-normal text-slate-800 dark:text-slate-200 mt-0.5">
                {duration} mins
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-medium">No. of questions</p>
              <p className="text-base sm:text-lg font-normal text-slate-800 dark:text-slate-200 mt-0.5 capitalize">
                {questionSummaryText}
              </p>
            </div>
          </div>

          {/* Scheduled Countdown Timer (NO ORANGE COLOR, MINIMALIST PRODUCTION DIGITS) */}
          {!isLive && !isExpired && (
            <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock size={14} className="text-slate-400" />
                <span>Assessment Starts In</span>
              </div>

              {/* Minimalist Industrial Timer Display */}
              <div className="flex items-baseline gap-3 text-slate-900 dark:text-white font-mono pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase font-sans">d</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-lg">:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase font-sans">h</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-lg">:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase font-sans">m</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-lg">:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-ubi-800 dark:text-ubi-400 animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase font-sans">s</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The Proceed button will unlock automatically when the countdown completes.
              </p>
            </div>
          )}
        </div>

        {/* Back Link Button */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 mt-8">
          <button
            onClick={() => {
              stopAllActiveMediaTracks();
              navigate('/');
            }}
            className="group inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Assessments</span>
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: FULL HEIGHT WITH LIGHT GREY BG */}
      <div className="flex-1 bg-[#f4f7f6] dark:bg-slate-950 p-8 sm:p-12 md:p-14 flex flex-col justify-between">
        <div className="max-w-3xl space-y-8">
          <h2 className="text-3xl sm:text-4xl font-normal text-slate-800 dark:text-slate-100 tracking-tight">
            Instructions
          </h2>

          {/* DYNAMIC MINIMALIST INSTRUCTIONS LIST */}
          <ol className="list-decimal list-outside pl-5 space-y-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {/* 1. Assessment Structure & Format */}
            <li>
              <span className="font-semibold text-slate-900 dark:text-white">
                Assessment Structure & Format:
              </span>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                This assessment consists of <strong>{totalCount} total question{totalCount > 1 ? 's' : ''}</strong> with an allocated duration of <strong>{duration} minutes</strong>.
              </p>

              {/* Dynamic Question Details (Flat Minimalist Text - No Box Containers) */}
              <div className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {codingCount > 0 && (
                  <p>
                    • <strong>Coding Questions ({codingCount}):</strong> {allowedLanguagesText}.
                  </p>
                )}
                {mcqCount > 0 && (
                  <p>
                    • <strong>Multiple Choice Questions ({mcqCount}):</strong> Evaluates core algorithmic understanding, logic, and code comprehension.
                  </p>
                )}
              </div>
            </li>

            {/* 2. Server-Synchronized Timer & Auto-Submit */}
            <li>
              <span className="font-semibold text-slate-900 dark:text-white">Server-Synchronized Timer & Auto-Submit:</span>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                The test timer is set to <strong>{duration} minutes</strong> and is synchronized with server time. The clock starts immediately upon clicking <strong>Proceed to Assessment</strong>. Refreshing or closing the tab will not pause the timer. When the timer hits 00:00:00, all current code and answers will auto-submit.
              </p>
            </li>

            {/* 3. Coding Questions: Run Code vs Submit (If Coding Questions exist) */}
            {(codingCount > 0 || mcqCount === 0) && (
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Visible vs. Hidden Test Cases:</span>
                <div className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p>• <strong>Run Code (Visible Cases):</strong> Executes your code against visible sample test cases on screen with no penalty or attempt limit.</p>
                  <p>• <strong>Submit Solution (Hidden Cases):</strong> Evaluates your code against hidden test cases, edge cases, and performance constraints.</p>
                </div>
              </li>
            )}


            {/* 5. Multiple Choice Questions (If MCQ Questions exist) */}
            {mcqCount > 0 && (
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Multiple Choice Questions (MCQs):</span>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  For MCQ problems, read the prompt carefully and select your choice(s). Questions may be single-select or multi-select as specified. Your choices are saved automatically.
                </p>
              </li>
            )}

            {/* 6. Anti-Cheat Monitoring & Tab Switch Prohibition */}
            <li>
              <span className="font-semibold text-rose-800 dark:text-rose-400">Anti-Cheat Monitoring (DO NOT SWITCH TABS):</span>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Mandatory full-screen mode is enforced. Navigating away from the exam tab, minimizing windows, pressing system shortcut keys, or pasting external code is recorded on your session audit log and may lead to test invalidation.
              </p>
            </li>

            {/* 7. Single Session & Device/Location Audit */}
            <li>
              <span className="font-semibold text-slate-900 dark:text-white">Single Session & Device/Location Verification:</span>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Only one active session is permitted per candidate. Logging in from another device will immediately terminate your active session. Client hardware specifications and location coordinates are captured in the proctoring audit log each time you start or resume this assessment.
              </p>
            </li>

            {/* 8. Code Editor Clipboard Policy */}
            {(codingCount > 0 || mcqCount === 0) && (
              <li>
                <span className="font-semibold text-slate-900 dark:text-white">Code Editor Clipboard Policy:</span>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Copying, cutting, and duplicating code <em>within</em> the code editor is allowed. Pasting code from external sources outside the application is blocked and flagged.
                </p>
              </li>
            )}

            {/* 8. Question Navigation & Final Submission */}
            <li>
              <span className="font-semibold text-slate-900 dark:text-white">Question Navigation & Submission:</span>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                You can switch between assigned questions anytime using the question navigation panel. Click <strong>Submit Solution</strong> on each coding problem before finishing your assessment.
              </p>
            </li>
          </ol>
        </div>

        {/* SECTION 3: BOTTOM CONFIRMATION & PROCEED BUTTON */}
        <div className="max-w-3xl pt-8 mt-10 border-t border-slate-200/80 dark:border-slate-800 space-y-6 shrink-0">
          {/* Device Location Verification Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            locationStatus === 'granted'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
              : locationStatus === 'denied'
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
              : locationStatus === 'requesting'
              ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  locationStatus === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : locationStatus === 'denied'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                    : locationStatus === 'requesting'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                }`}>
                  {locationStatus === 'granted' ? (
                    <CheckCircle2 size={20} />
                  ) : locationStatus === 'denied' ? (
                    <MapPinOff size={20} />
                  ) : locationStatus === 'requesting' ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <MapPin size={20} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Device Location Verification
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      locationStatus === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : locationStatus === 'denied'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                        : locationStatus === 'requesting'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                      {locationStatus === 'granted'
                        ? 'Verified'
                        : locationStatus === 'denied'
                        ? 'Access Denied'
                        : locationStatus === 'requesting'
                        ? 'Requesting...'
                        : 'Required'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {locationStatus === 'granted' ? (
                      <span>
                        Device location verified: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{locationCoords?.latitude}°, {locationCoords?.longitude}°</strong> {locationCoords?.accuracy ? `(±${locationCoords.accuracy}m)` : ''}. Coordinates will be logged in proctoring records.
                      </span>
                    ) : locationStatus === 'denied' ? (
                      <span>
                        {locationErrorMsg || 'Browser location access was blocked. Institutional proctoring requires physical device location before starting or resuming.'}
                      </span>
                    ) : locationStatus === 'requesting' ? (
                      <span>
                        Requesting browser location permission. Please click <strong>&quot;Allow&quot;</strong> on the browser prompt to proceed.
                      </span>
                    ) : (
                      <span>
                        Institutional proctoring rules require physical device coordinates to {isResuming ? 'resume' : 'start'} this assessment.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {locationStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locationStatus === 'requesting'}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={locationStatus === 'requesting' ? 'animate-spin' : ''} />
                  <span>{locationStatus === 'denied' ? 'Retry Permission' : 'Grant Location'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Facial Identity & Webcam Verification Card */}
          <WebcamVerificationCard
            onPhotoCaptured={setVerificationPhoto}
            isResuming={isResuming}
          />

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="ack-instructions-page"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={!isLive || isExpired}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ubi-800 focus:ring-ubi-600 cursor-pointer disabled:opacity-50"
            />
            <label
              htmlFor="ack-instructions-page"
              className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer font-medium select-none leading-relaxed"
            >
              I have carefully read all assessment instructions & proctoring guidelines.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleProceed}
              disabled={!agreedToTerms || isStarting || !isLive || isExpired || !isLocationVerified || !verificationPhoto}
              className={`px-8 py-3 font-bold text-sm rounded shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                isResuming
                  ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:bg-amber-600/50 disabled:cursor-not-allowed'
                  : 'bg-[#007a3d] hover:bg-[#006331] text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isResuming ? 'Resuming...' : 'Starting...'}</span>
                </>
              ) : isExpired ? (
                <span>Assessment Closed</span>
              ) : !isLive ? (
                <span>Waiting for Assessment Start...</span>
              ) : !isLocationVerified ? (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} />
                  <span>Location Required to {isResuming ? 'Resume' : 'Start'}</span>
                </span>
              ) : !verificationPhoto ? (
                <span className="flex items-center gap-1.5">
                  <Camera size={15} />
                  <span>Photo Required to {isResuming ? 'Resume' : 'Start'}</span>
                </span>
              ) : isResuming ? (
                <span>Resume Assessment</span>
              ) : (
                <span>Proceed to Assessment</span>
              )}
            </button>

            <button
              onClick={() => {
                stopAllActiveMediaTracks();
                navigate('/');
              }}
              disabled={isStarting}
              className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
