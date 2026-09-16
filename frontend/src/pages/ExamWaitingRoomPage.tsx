import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Wifi,
  Eye,
  Laptop
} from 'lucide-react';

export const ExamWaitingRoomPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();
  const setExamSession = useExamStore((s) => s.setExamSession);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });

  const [isLive, setIsLive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const hasAutoStarted = useRef(false);

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['examDetails', id],
    queryFn: () => examsApi.get(id),
    enabled: !!id,
    refetchInterval: isLive ? false : 10000,
  });

  const startTestAndNavigate = useCallback(async () => {
    if (hasAutoStarted.current || isStarting) return;
    hasAutoStarted.current = true;
    setIsStarting(true);

    try {
      const res = await examsApi.start(id);
      setExamSession(
        res.exam_id,
        res.assignment_id,
        exam?.title || 'Exam in Progress',
        res.status,
        res.started_at,
        res.deadline_at,
        res.questions
      );
      navigate(`/exam/${id}/workspace`, { replace: true });
    } catch (err: any) {
      console.error('Failed to start exam:', err);
      // If server clock is slightly behind client clock, allow retry in 1.5 seconds
      setTimeout(() => {
        hasAutoStarted.current = false;
        setIsStarting(false);
      }, 1500);
    }
  }, [exam, id, isStarting, navigate, setExamSession]);

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
        // Automatically start the test when timer hits 0:00!
        startTestAndNavigate();
      } else {
        setIsLive(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          totalSeconds: Math.floor(diff / 1000),
        });
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [exam, startTestAndNavigate]);

  const formatIST = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date) + ' IST';
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <p className="text-sm text-slate-500 font-mono">Loading assessment details...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Top back action */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
      >
        <ArrowLeft size={14} />
        <span>Back to Assessments</span>
      </button>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-ubi-50/80 via-white to-slate-50 dark:from-ubi-950/60 dark:via-slate-900 dark:to-slate-900 border border-ubi-200/80 dark:border-ubi-800/50 rounded-2xl p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-ubi-100 dark:bg-ubi-900/60 text-ubi-900 dark:text-ubi-300 border border-ubi-200 dark:border-ubi-800 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={13} className="text-ubi-700 dark:text-ubi-400" />
          Assessment Countdown
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {exam.title}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Clock size={14} className="text-ubi-700 dark:text-ubi-400" />
            Duration: {exam.duration_minutes} minutes
          </span>
          {exam.start_time && (
            <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar size={14} className="text-ubi-700 dark:text-ubi-400" />
              Scheduled: {formatIST(exam.start_time)}
            </span>
          )}
        </div>

        {/* Live Countdown Area */}
        <div className="mt-8 max-w-lg mx-auto">
          {isExpired ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl">
              <AlertTriangle size={32} className="mx-auto text-rose-600 dark:text-rose-400 mb-2" />
              <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Assessment Window Expired</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                The scheduled time window for this assessment has concluded. Please contact your test administrator.
              </p>
            </div>
          ) : (isLive || isStarting) ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4 animate-scaleIn text-center">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                {isStarting ? (
                  <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle2 size={32} />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
                  {isStarting ? "Time's Up! Starting Assessment..." : "Assessment is Live!"}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {isStarting
                    ? "Setting up your workspace and starting test timer. Entering now..."
                    : "The scheduled start time has arrived. Entering workspace..."}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startTestAndNavigate}
                  isLoading={isStarting}
                  className="w-full sm:w-auto font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white px-8 shadow-md"
                >
                  {isStarting ? "Entering Workspace..." : "Start Assessment Now"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Assessment Starts In
              </p>
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
                {/* Days */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="text-2xl sm:text-4xl font-extrabold text-ubi-900 dark:text-ubi-300 font-mono">
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Days</div>
                </div>
                {/* Hours */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="text-2xl sm:text-4xl font-extrabold text-ubi-900 dark:text-ubi-300 font-mono">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Hours</div>
                </div>
                {/* Minutes */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="text-2xl sm:text-4xl font-extrabold text-ubi-900 dark:text-ubi-300 font-mono">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Mins</div>
                </div>
                {/* Seconds */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="text-2xl sm:text-4xl font-extrabold text-ubi-900 dark:text-ubi-300 font-mono animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Secs</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Stay on this page. When the countdown reaches 00:00, your assessment will automatically start and enter the workspace.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-Exam Preparation Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-start gap-3.5">
          <div className="p-2 bg-ubi-50 dark:bg-ubi-950 border border-ubi-200 dark:border-ubi-800 rounded-xl text-ubi-800 dark:text-ubi-400 shrink-0">
            <Wifi size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Check Your Network</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Ensure you are connected to high-speed, reliable internet. The server timer will continuously synchronize.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-3.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Eye size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Proctoring Ready</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Window focus, blur, and tab switching are monitored in real-time. Do not open other applications or tabs.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Laptop size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Workspace Setup</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Use a modern desktop browser (Chrome, Edge, Firefox). Ensure external monitors and browser extensions are closed.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
