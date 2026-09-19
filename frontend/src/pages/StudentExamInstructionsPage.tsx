import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

export const StudentExamInstructionsPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();
  const setExamSession = useExamStore((s) => s.setExamSession);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Countdown timer state for scheduled/upcoming assessments
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });

  const [isLive, setIsLive] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch Exam Base Details
  const { data: exam, isLoading: isExamLoading, error: examError } = useQuery({
    queryKey: ['examDetails', id],
    queryFn: () => examsApi.get(id),
    enabled: !!id,
    refetchInterval: isLive ? false : 5000,
  });

  // Attempt to Fetch Questions assigned to student (if assignment exists)
  const { data: myQuestionsData } = useQuery({
    queryKey: ['myQuestions', id],
    queryFn: () => examsApi.getMyQuestions(id),
    enabled: !!id && isLive,
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

  const handleProceed = async () => {
    if (!exam || !agreedToTerms || isStarting || !isLive || isExpired) return;

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
      const res = await examsApi.start(id);
      setExamSession(
        res.exam_id,
        res.assignment_id,
        exam.title || 'Exam in Progress',
        res.status,
        res.started_at,
        res.deadline_at,
        res.questions
      );
      navigate(`/exam/${id}/workspace`, { replace: true });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start assessment');
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
  
  // Extract questions array if available
  const questionsList = myQuestionsData?.questions || (exam as any).questions || [];
  const totalCount = questionsList.length || exam.pool_count || 3;
  
  const codingQuestions = questionsList.filter((q: any) => (q.question_type || 'coding') === 'coding');
  const mcqQuestions = questionsList.filter((q: any) => q.question_type === 'mcq');
  
  const codingCount = questionsList.length > 0 ? codingQuestions.length : totalCount;
  const mcqCount = questionsList.length > 0 ? mcqQuestions.length : 0;

  // Format question summary string
  let questionSummaryText = `${totalCount} question${totalCount > 1 ? 's' : ''}`;
  if (codingCount > 0 && mcqCount > 0) {
    questionSummaryText = `${totalCount} questions (${codingCount} Coding, ${mcqCount} MCQ)`;
  } else if (codingCount > 0) {
    questionSummaryText = `${codingCount} coding question${codingCount > 1 ? 's' : ''}`;
  } else if (mcqCount > 0) {
    questionSummaryText = `${mcqCount} multiple choice question${mcqCount > 1 ? 's' : ''}`;
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
    <div className="w-full min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] bg-[#f4f7f6] dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden animate-fadeIn">
      {/* LEFT PANEL: STATIC / NON-SCROLLING (INCREASED WIDTH ~40%) */}
      <div className="w-full md:w-[44%] lg:w-[40%] xl:w-[38%] bg-white dark:bg-slate-900 p-8 sm:p-12 md:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 shrink-0 h-auto md:h-[calc(100vh-64px)] overflow-hidden">
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
            onClick={() => navigate('/')}
            className="group inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Assessments</span>
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: INDEPENDENTLY SCROLLABLE WITH LIGHT GREY BG */}
      <div className="flex-1 bg-[#f4f7f6] dark:bg-slate-950 p-8 sm:p-12 md:p-14 flex flex-col justify-between min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] md:overflow-y-auto custom-scrollbar">
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

            {/* 7. Code Editor Clipboard Policy */}
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
              disabled={!agreedToTerms || isStarting || !isLive || isExpired}
              className="px-8 py-3 bg-[#007a3d] hover:bg-[#006331] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </>
              ) : isExpired ? (
                <span>Assessment Closed</span>
              ) : !isLive ? (
                <span>Waiting for Assessment Start...</span>
              ) : (
                <span>Proceed to Assessment</span>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
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
