import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Scale,
  Eye,
  Terminal,
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
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['examDetails', id],
    queryFn: () => examsApi.get(id),
    enabled: !!id,
    refetchInterval: isLive ? false : 10000,
  });

  const handleStartConfirmed = async () => {
    if (!agreedToTerms || isStarting) return;
    setIsStarting(true);

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
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
      setIsGuidelinesModalOpen(false);
      navigate(`/exam/${id}/workspace`, { replace: true });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start exam');
      setIsStarting(false);
    }
  };

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
  }, [exam]);

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
                  onClick={() => setIsGuidelinesModalOpen(true)}
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
                Stay on this page. When the countdown completes, review the guidelines and click Start Assessment to enter your workspace.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Guidelines Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-ubi-50 dark:bg-ubi-950/70 text-ubi-800 dark:text-ubi-400 border border-ubi-200 dark:border-ubi-800">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Assessment Instructions & Proctoring Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review these essential guidelines before entering the workspace.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Proctored Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Full Screen & Anti-Cheat */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-200">
              <ShieldAlert size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Mandatory Full-Screen & Focus Lock</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              The test opens in full-screen mode. Switching tabs, minimizing, pressing the Windows key, or clicking outside is monitored in real-time.
            </p>
          </div>

          {/* 2. Run Code vs Submit Solution */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-200">
              <Terminal size={15} className="text-ubi-700 dark:text-ubi-400 shrink-0" />
              <span>Run Code vs. Submit Solution</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              <strong>Run Code</strong> tests against visible sample cases with no score penalty. <strong>Submit Solution</strong> grades against all hidden test cases.
            </p>
          </div>

          {/* 3. Partial Marking System */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-200">
              <Scale size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Proportional Partial Marking</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              Marks are awarded proportionately according to the number of test cases passed on your final submission for each problem.
            </p>
          </div>

          {/* 4. Code Editor Clipboard Rules */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-200">
              <FileCode2 size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Code Editor Clipboard Rules</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
              Copying, cutting, and duplicating code <em>within</em> the code editor is permitted. Pasting code from external sources is blocked and flagged.
            </p>
          </div>
        </div>
      </div>

      {/* Guidelines & Rules Confirmation Modal */}
      <Modal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
        title="Assessment Instructions & Proctoring Guidelines"
        maxWidth="3xl"
      >
        <div className="space-y-5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
          {/* Header info bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-ubi-50/70 border border-ubi-200 dark:bg-ubi-950/40 dark:border-ubi-800 rounded-xl">
            <div>
              <span className="text-[10px] uppercase font-bold text-ubi-800 dark:text-ubi-400 tracking-wider block">
                Assessment
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-base">
                {exam.title}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Clock size={15} className="text-ubi-700 dark:text-ubi-400" />
                {exam.duration_minutes} Minutes
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <FileCode2 size={15} className="text-ubi-700 dark:text-ubi-400" />
                3 Assigned Questions
              </span>
            </div>
          </div>

          {/* Instruction Items List */}
          <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
            {/* 1. Visible vs Hidden Test Cases */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Eye size={15} className="text-ubi-700 dark:text-ubi-400" />
                <span>1. Visible vs. Hidden Test Cases</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6 text-xs">
                • <strong>Run Code (Visible Cases):</strong> Executes your code against visible sample test cases without penalty.<br />
                • <strong>Submit Solution (Hidden Cases):</strong> Evaluates against comprehensive hidden test cases, edge cases, and performance limits.
              </p>
            </div>

            {/* 2. Partial Marking System */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Scale size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>2. Proportional Partial Marking System</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6 text-xs">
                • Marks are awarded proportionally to the number of test cases passed on your submitted solution.
              </p>
            </div>

            {/* 3. Timer & Auto-Submit */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Clock size={15} className="text-amber-600 dark:text-amber-400" />
                <span>3. Server-Synchronized Timer</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6 text-xs">
                • The countdown timer starts immediately upon entering the workspace and runs on server time.<br />
                • When the timer reaches 00:00:00, your assessment automatically concludes and submits your latest code.
              </p>
            </div>

            {/* 4. Strict Tab-Switch & Proctoring */}
            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                <ShieldAlert size={15} className="text-rose-600 dark:text-rose-400" />
                <span>4. Anti-Cheat Monitoring: Mandatory Full Screen</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300/90 leading-relaxed pl-6 text-xs">
                • Navigating away from the workspace, pressing the Windows key, minimizing, or switching windows will be flagged and recorded on your audit log.<br />
                • Copying and cutting your own code within the editor is allowed; pasting external code is blocked and flagged.
              </p>
            </div>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl flex items-start gap-3 shadow-sm">
            <input
              id="ack-rules-waiting-room"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ubi-700 focus:ring-ubi-500 cursor-pointer"
            />
            <label htmlFor="ack-rules-waiting-room" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-medium select-none">
              I have carefully read the assessment instructions above. I agree to adhere to all exam rules and understand that focus departures, tab switching, and external paste attempts are actively monitored.
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGuidelinesModalOpen(false)}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartConfirmed}
              disabled={!agreedToTerms || isStarting}
              isLoading={isStarting}
              className="font-semibold gap-1.5"
            >
              <ShieldCheck size={16} />
              <span>Proceed to Assessment</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
