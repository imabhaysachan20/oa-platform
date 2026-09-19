import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { submissionsApi } from '../api/submissions';
import { useExamStore, STARTER_CODE } from '../store/examStore';
import { useThemeStore } from '../store/themeStore';
import { QuestionPanel } from '../components/QuestionPanel';
import { MCQPanel } from '../components/MCQPanel';
import { CodeEditor } from '../components/CodeEditor';
import { OutputConsole } from '../components/OutputConsole';
import { Timer } from '../components/ui/Timer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Play, Send, CheckCircle, AlertTriangle, Sun, Moon, ShieldAlert, ShieldCheck, Maximize2, Minimize2, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useExamSecurity } from '../hooks/useExamSecurity';
import { useCandidateHeartbeat } from '../hooks/useCandidateHeartbeat';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { collectDeviceTelemetry } from '../utils/deviceInfo';

export const StudentExamWorkspacePage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);


  const { theme, toggleTheme } = useThemeStore();

  const {
    questions,
    activeQuestionIndex,
    codeDrafts,
    selectedLanguage,
    runOutputs,
    mcqSelections,
    isRunningCode,
    isSubmittingCode,
    deadlineAt,
    examTitle,
    setExamSession,
    setActiveQuestionIndex,
    setCodeDraft,
    setSelectedLanguage,
    setRunOutput,
    setMCQSelection,
    updateQuestionDeadline,
    setIsRunningCode,
    setIsSubmittingCode,
    resetExamState,
  } = useExamStore();

  // Mandatory Location & Device Verification Guard
  // Candidate must pass through /instructions to verify geolocation before entering or resuming workspace
  useEffect(() => {
    if (!id) return;
    const verifiedKey = `ubicode_verified_entry_${id}`;
    const isVerified = sessionStorage.getItem(verifiedKey);
    if (!isVerified) {
      navigate(`/exam/${id}/instructions`, { replace: true });
      return;
    }
  }, [id, navigate]);

  // When refreshing the browser page or closing the tab, clear the verification token so reload forces re-verifying
  useEffect(() => {
    if (!id) return;
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(`ubicode_verified_entry_${id}`);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id]);

  // Load exam questions & state (supports resume on reload)
  const { data: examData, isLoading, error, refetch } = useQuery({
    queryKey: ['myQuestions', id],
    queryFn: () => examsApi.getMyQuestions(id),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      navigate(`/exam/${id}/waiting-room`, { replace: true });
    }
  }, [error, id, navigate]);

  useEffect(() => {
    if (examData) {
      if (examData.status === 'submitted' || examData.status === 'auto_submitted') {
        navigate(`/exam/${id}/result`);
        return;
      }

      setExamSession(
        examData.exam_id,
        examData.assignment_id,
        examData.exam_title,
        examData.status,
        examData.started_at || '',
        examData.deadline_at || '',
        examData.questions
      );
    }
  }, [examData, id, navigate, setExamSession]);

  // Comprehensive Anti-Cheat & Proctoring Engine
  const {
    infractions,
    strikeCount,
    maxStrikes,
    isFullscreen,
    hasInitiatedFullscreen,
    fullscreenRequiredModal,
    activeWarning,
    enterFullscreen,
    logInfraction,
    dismissActiveWarning,
    flushLogs,
  } = useExamSecurity({
    enabled: !!examData && examData.status === 'in_progress',
    maxStrikes: 3,
    requireFullscreen: true,
    examId: id,
    assignmentId: examData?.assignment_id,
  });

  // Candidate Real-Time Heartbeat & Network Health Liveness Engine
  const { isOnline } = useCandidateHeartbeat({
    examId: id,
    assignmentId: examData?.assignment_id,
    enabled: !!examData && examData.status === 'in_progress',
    intervalMs: 10000,
  });

  // Warn on accidental tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Lock user on exam workspace: trap browser back/forward buttons and mouse back keys
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push state immediately to stay locked on current exam page
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Block keyboard back navigation (Alt+ArrowLeft, Alt+ArrowRight, Backspace outside input fields)
  useEffect(() => {
    const handleKeyNavigation = (e: KeyboardEvent) => {
      // Block Alt + ArrowLeft (Browser Back) and Alt + ArrowRight (Browser Forward)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Backspace outside text input/editor fields
      if (e.key === 'Backspace') {
        const activeEl = document.activeElement as HTMLElement | null;
        const isEditable =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable ||
            activeEl.closest('.cm-editor') ||
            activeEl.closest('.cm-content') ||
            activeEl.closest('.monaco-editor'));
        if (!isEditable) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyNavigation, true);
    return () => {
      window.removeEventListener('keydown', handleKeyNavigation, true);
    };
  }, []);

  const { user } = useAuthStore();
  const userId = user?.id;

  // Set of locked question IDs (strictly scoped to current user so candidates never share state)
  const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<number>>(() => {
    const set = new Set<number>();
    if (!userId) return set;
    try {
      const raw = localStorage.getItem(`u_${userId}_exam_${id}_locked_questions`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach((qId) => set.add(Number(qId)));
      }
    } catch {}
    return set;
  });

  const markQuestionLocked = (qId: number) => {
    setLockedQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(qId);
      if (userId) {
        try {
          localStorage.setItem(`u_${userId}_exam_${id}_locked_questions`, JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  };

  // Sync server-locked questions and reload when userId changes
  useEffect(() => {
    const set = new Set<number>();
    if (userId) {
      try {
        const raw = localStorage.getItem(`u_${userId}_exam_${id}_locked_questions`);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) arr.forEach((qId) => set.add(Number(qId)));
        }
      } catch {}
    }
    if (questions && questions.length > 0) {
      questions.forEach((q) => {
        if (q.is_mcq_locked) {
          set.add(q.id);
        }
      });
    }
    setLockedQuestionIds((prev) => {
      if (prev.size === set.size && [...set].every((qId) => prev.has(qId))) {
        return prev;
      }
      return set;
    });
  }, [questions, userId, id]);

  // Multi-tab real-time synchronization via StorageEvent
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !userId) return;

      // 1. Sync locked questions across tabs immediately
      if (e.key === `u_${userId}_exam_${id}_locked_questions`) {
        try {
          const arr = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(arr)) {
            setLockedQuestionIds((prev) => {
              const newSet = new Set(arr.map(Number));
              if (prev.size === newSet.size && [...newSet].every((qId) => prev.has(qId))) {
                return prev;
              }
              return newSet;
            });
          }
        } catch {}
      }

      // 2. Sync selection across tabs if student updated in another tab
      const prefix = `u_${userId}_exam_${id}_q_`;
      if (e.key.startsWith(prefix) && e.key.endsWith('_selection') && e.newValue) {
        try {
          const match = e.key.match(/_q_(\d+)_selection$/);
          if (match) {
            const qId = parseInt(match[1], 10);
            const val = JSON.parse(e.newValue);
            if (Array.isArray(val)) {
              setMCQSelection(qId, val);
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [id, userId, setMCQSelection]);

  // Hydration Auto-Recovery: Restore cached selections from localStorage ONCE on initial load
  const hasHydratedSelectionsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const sessionKey = `${userId}_${id}`;
    if (!questions || questions.length === 0 || !userId || hasHydratedSelectionsRef.current[sessionKey]) return;
    hasHydratedSelectionsRef.current[sessionKey] = true;

    questions.forEach((q) => {
      if (q.question_type === 'mcq') {
        try {
          const raw = localStorage.getItem(`u_${userId}_exam_${id}_q_${q.id}_selection`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMCQSelection(q.id, parsed);

              // If server has no recorded answer and question is not locked, sync in background
              const serverHasAnswer = q.selected_option_ids && q.selected_option_ids.length > 0;
              if (!serverHasAnswer && !q.is_mcq_locked && !lockedQuestionIds.has(q.id) && examData?.assignment_id) {
                submissionsApi.submitMCQ(examData.assignment_id, q.id, parsed).catch(() => {});
              }
            }
          }
        } catch {}
      }
    });
  }, [questions.length, id, userId, examData?.assignment_id, lockedQuestionIds, setMCQSelection]);

  const currentQ = questions[activeQuestionIndex];

  // Offline queue for resilience against intermittent Wi-Fi drops
  const offlineQueueRef = useRef<Array<{ assignId: number; qId: number; selectedOptionIds: string[] }>>([]);

  // Pending unsaved selection buffer for immediate flush on tab close/unload
  const pendingMCQSaveRef = useRef<{ assignId: number; qId: number; selectedOptionIds: string[] } | null>(null);

  // Flush any pending debounced change immediately (using fetch keepalive for guaranteed delivery on close)
  const flushPendingMCQ = useCallback(() => {
    if (!pendingMCQSaveRef.current) return;
    const { assignId, qId, selectedOptionIds } = pendingMCQSaveRef.current;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingMCQSaveRef.current = null;

    const token = localStorage.getItem('ubicode_token');
    const payload = JSON.stringify({
      assignment_id: assignId,
      question_id: qId,
      selected_option_ids: selectedOptionIds,
    });

    try {
      fetch('/api/submissions/mcq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        submissionsApi.submitMCQ(assignId, qId, selectedOptionIds).catch(() => {});
      });
    } catch {
      submissionsApi.submitMCQ(assignId, qId, selectedOptionIds).catch(() => {});
    }
  }, []);

  // Flush on beforeunload (tab close/refresh) and visibilitychange (minimizing/switching tab)
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingMCQ();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingMCQ();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      flushPendingMCQ();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingMCQ]);

  // Online event: Drain offline queue as soon as internet connection resumes
  useEffect(() => {
    const flushOfflineQueue = async () => {
      if (offlineQueueRef.current.length === 0) return;
      const queue = [...offlineQueueRef.current];
      offlineQueueRef.current = [];
      for (const item of queue) {
        try {
          await submissionsApi.submitMCQ(item.assignId, item.qId, item.selectedOptionIds);
        } catch {
          offlineQueueRef.current.push(item);
        }
      }
    };

    window.addEventListener('online', flushOfflineQueue);
    return () => window.removeEventListener('online', flushOfflineQueue);
  }, []);

  // Auto-advance & lock when individual question timer reaches zero
  const handleCurrentQuestionExpire = async () => {
    if (!currentQ) return;
    const qId = currentQ.id;

    // 1. Immediately flush any pending MCQ answer to backend
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingMCQSaveRef.current = null;

    const currentSelection = mcqSelections[qId] || currentQ.selected_option_ids || [];
    if (examData?.assignment_id && currentSelection.length > 0) {
      try {
        await submissionsApi.submitMCQ(examData.assignment_id, qId, currentSelection);
      } catch (err) {
        console.warn('Failed to flush expired question answer:', err);
      }
    }

    // 2. Mark this question as locked
    markQuestionLocked(qId);

    // 3. Auto-advance to next question if available
    if (activeQuestionIndex < questions.length - 1) {
      const nextIdx = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIdx);
      setSubmissionFeedback(`Time limit reached for ${currentQ.title}. Auto-advanced to next question.`);
    } else {
      setSubmissionFeedback(`Time limit reached for ${currentQ.title}. Assessment questions completed.`);
    }
  };

  const questionTimer = useQuestionTimer(userId, id, currentQ, handleCurrentQuestionExpire, examData?.server_time);

  const currentLang = currentQ ? selectedLanguage[currentQ.id] || 'python' : 'python';
  const currentStarter = currentQ?.starter_code?.[currentLang] || STARTER_CODE[currentLang] || '';
  const currentCode = currentQ
    ? codeDrafts[currentQ.id]?.[currentLang] || currentStarter
    : '';
  const currentOutput = currentQ ? runOutputs[currentQ.id] || null : null;

  // Track question view and start timer for MCQ questions (idempotent on server)
  useEffect(() => {
    if (!currentQ || currentQ.question_type !== 'mcq') return;

    let isMounted = true;
    examsApi
      .markQuestionViewed(id, currentQ.id)
      .then((res) => {
        if (isMounted && res?.question_deadline_at) {
          updateQuestionDeadline(currentQ.id, res.question_deadline_at);
        }
      })
      .catch((err) => {
        console.error('Failed to mark question viewed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentQ?.id, currentQ?.question_type, id, updateQuestionDeadline]);

  // MCQ Selection & Debounced Autosave with localStorage caching
  const [isSavingMCQ, setIsSavingMCQ] = useState(false);
  const [mcqSaveError, setMcqSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMCQSelectionChange = (newSelectedIds: string[]) => {
    if (!currentQ || !examData?.assignment_id) return;
    if (lockedQuestionIds.has(currentQ.id) || currentQ.is_mcq_locked) return;

    const qId = currentQ.id;
    const assignId = examData.assignment_id;

    // Update store state and localStorage immediately for snappy UI
    setMCQSelection(qId, newSelectedIds);
    setMcqSaveError(null);
    if (userId) {
      try {
        localStorage.setItem(`u_${userId}_exam_${id}_q_${qId}_selection`, JSON.stringify(newSelectedIds));
      } catch {}
    }

    // Buffer into pendingMCQSaveRef so any tab close/refresh flushes it instantly
    pendingMCQSaveRef.current = { assignId, qId, selectedOptionIds: newSelectedIds };

    // Debounce server submission by 300ms
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSavingMCQ(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await submissionsApi.submitMCQ(assignId, qId, newSelectedIds);
        if (pendingMCQSaveRef.current?.qId === qId) {
          pendingMCQSaveRef.current = null;
        }
        setIsSavingMCQ(false);
      } catch (err: any) {
        setIsSavingMCQ(false);
        // If network failure or offline, queue for replay
        if (!navigator.onLine || !err.response) {
          offlineQueueRef.current = offlineQueueRef.current.filter((item) => item.qId !== qId);
          offlineQueueRef.current.push({ assignId, qId, selectedOptionIds: newSelectedIds });
        }
        setMcqSaveError(err.response?.data?.detail || 'Failed to autosave answer');
      }
    }, 300);
  };

  // Clean up timeout on unmount and flush pending
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      flushPendingMCQ();
    };
  }, [flushPendingMCQ]);

  // Handle "Run Code" against visible sample cases
  const handleRunCode = async () => {
    if (!currentQ || isRunningCode) return;
    setIsRunningCode(true);
    setSubmissionFeedback(null);

    try {
      const res = await submissionsApi.run(currentQ.id, currentCode, currentLang);
      setRunOutput(currentQ.id, res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run code');
    } finally {
      setIsRunningCode(false);
    }
  };

  // Handle "Submit Solution" for current question against all test cases
  const handleSubmitCode = async () => {
    if (!currentQ || isSubmittingCode) return;
    setIsSubmittingCode(true);
    setSubmissionFeedback(null);

    try {
      const res = await submissionsApi.submit(id, currentQ.id, currentCode, currentLang);
      setSubmissionFeedback(
        `Question ${activeQuestionIndex + 1} Submitted: ${res.test_cases_passed}/${res.total_test_cases} test cases passed (${res.status})`
      );
      // Update question status in view
      currentQ.status = res.status;
      // Refresh backend session in background
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit solution');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Finish exam early
  const handleFinishExam = async () => {
    setIsSubmittingExam(true);
    try {
      if (flushLogs) {
        await flushLogs();
      }
      await examsApi.finish(id);
      setIsFinishModalOpen(false);
      resetExamState();
      navigate(`/exam/${id}/result`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to finish exam');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // Auto-submit callback triggered when Timer hits 00:00:00
  const handleTimeoutExpire = async () => {
    if (flushLogs) {
      try {
        await flushLogs();
      } catch {}
    }
    alert('Time limit reached! Your assessment has been automatically submitted.');
    resetExamState();
    navigate(`/exam/${id}/result`);
  };

  if (isLoading || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Loading assigned workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-150"
    >
      {/* Network Disconnection Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 flex items-center justify-center gap-2 text-xs shadow-md z-50 shrink-0 animate-pulse">
          <WifiOff size={16} />
          <span>Network connection lost! Your code is safely preserved locally. Reconnecting automatically...</span>
        </div>
      )}
      {/* Workspace Top Navigation Bar */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* UsefulBI Logo */}
          <div className="flex items-center">
            <img
              src="/UsefulBI_Logo_Main.webp"
              alt="UsefulBI"
              className="h-6 w-auto object-contain"
            />
          </div>

          <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {examTitle || 'Coding Assessment'}
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <span>Autosave Active</span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span>{isOnline ? 'Connected' : 'Offline'}</span>
              </span>
            </span>
          </div>
        </div>

        {/* Proctoring Status Badge, Server-Driven Countdown Timer, Theme Toggle & Finish Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Anti-Cheat Proctoring Status & Fullscreen Trigger */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={enterFullscreen}
              title={isFullscreen ? 'Full Screen Active' : 'Enter Full Screen'}
              className={`px-2.5 py-1 rounded-full transition border text-xs font-semibold flex items-center gap-1.5 ${
                isFullscreen
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800'
                  : 'text-amber-800 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800 animate-pulse'
              }`}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'Fullscreen Active' : 'Enable Fullscreen'}</span>
            </button>

            {strikeCount === 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Proctored (0/{maxStrikes} Strikes)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
                <span>{strikeCount}/{maxStrikes} Infractions</span>
              </span>
            )}
          </div>

          {deadlineAt && (
            <Timer deadlineAt={deadlineAt} onExpire={handleTimeoutExpire} />
          )}

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
          >
            {theme === 'dark' ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} className="text-ubi-800" />
            )}
          </button>

          <Button
            variant="success"
            size="sm"
            onClick={() => setIsFinishModalOpen(true)}
            className="gap-1.5 font-semibold"
          >
            <CheckCircle size={15} />
            <span>Finish Exam</span>
          </Button>
        </div>
      </div>

      {/* Submission Feedback Toast / Bar */}
      {submissionFeedback && (
        <div className="bg-ubi-50 border-b border-ubi-200 text-ubi-900 dark:bg-ubi-950/80 dark:border-ubi-800/60 dark:text-ubi-200 px-4 py-2 flex items-center justify-between text-xs font-semibold animate-fadeIn shrink-0">
          <span className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
            {submissionFeedback}
          </span>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-ubi-700 dark:text-ubi-400 hover:text-ubi-900 dark:hover:text-ubi-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
        {/* Left Column: Question Panel (5 cols on large) */}
        <div className="lg:col-span-5 h-full overflow-hidden">
          <QuestionPanel
            userId={userId}
            examId={id}
            questions={questions}
            activeIndex={activeQuestionIndex}
            onSelectIndex={(idx) => {
              const targetQ = questions[idx];
              if (
                targetQ &&
                targetQ.question_type === 'mcq' &&
                lockedQuestionIds.has(targetQ.id) &&
                idx !== activeQuestionIndex
              ) {
                setSubmissionFeedback(`Question ${idx + 1} is locked and cannot be reopened.`);
                return;
              }
              setActiveQuestionIndex(idx);
              setSubmissionFeedback(null);
            }}
            lockedQuestionIds={lockedQuestionIds}
            serverTime={examData?.server_time}
          />
        </div>

        {/* Right Column: Code Editor & Console OR MCQ Panel */}
        {currentQ.question_type === 'mcq' ? (
          <div className="lg:col-span-7 h-full overflow-hidden">
            <MCQPanel
              userId={userId}
              examId={id}
              question={currentQ}
              selectedOptionIds={mcqSelections[currentQ.id] || currentQ.selected_option_ids || []}
              onChangeSelection={handleMCQSelectionChange}
              isSaving={isSavingMCQ}
              saveError={mcqSaveError}
              onQuestionExpire={handleCurrentQuestionExpire}
              serverTime={examData?.server_time}
            />
          </div>
        ) : (
          <div className="lg:col-span-7 h-full flex flex-col gap-2.5 overflow-hidden min-h-0">
            {/* Editor Container */}
            <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-1' : 'flex-[3]'}`}>
              <CodeEditor
                value={currentCode}
                onChange={(val) => setCodeDraft(currentQ.id, currentLang, val)}
                language={currentLang}
                onLanguageChange={(lang) => setSelectedLanguage(currentQ.id, lang)}
                starterCode={currentStarter}
                onReset={() => currentQ && setCodeDraft(currentQ.id, currentLang, currentStarter)}
                onPasteAttempt={() => logInfraction('PASTE_ATTEMPT')}
              />
            </div>

            {/* Action Buttons Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shrink-0 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Proctored Exam</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunCode}
                  isLoading={isRunningCode}
                  disabled={isSubmittingCode}
                  className="gap-1.5 font-semibold"
                >
                  <Play size={14} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Run Code</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitCode}
                  isLoading={isSubmittingCode}
                  disabled={isRunningCode}
                  className="gap-1.5 font-semibold"
                >
                  <Send size={14} />
                  <span>Submit Solution</span>
                </Button>
              </div>
            </div>

            {/* Output & Test Cases Console */}
            <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-[3]' : 'flex-[2]'}`}>
              <OutputConsole
                output={currentOutput}
                isRunning={isRunningCode}
                sampleInput={currentQ?.sample_input}
                sampleOutput={currentQ?.sample_output}
                isExpanded={isConsoleExpanded}
                onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Finish Modal */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="Submit and Finish Assessment?"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300 rounded-xl text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>
              Are you sure you want to finish the exam? Once submitted, your scores will be finalized and you cannot submit further code.
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Question Submission Status:
            </p>
            {questions.map((q, idx) => {
              const isMCQ = q.question_type === 'mcq';
              const hasMCQAnswer = (mcqSelections[q.id]?.length || 0) > 0 || (q.selected_option_ids && q.selected_option_ids.length > 0);
              return (
                <div key={q.id} className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Question {idx + 1} ({isMCQ ? 'MCQ' : q.difficulty}):
                  </span>
                  <span
                    className={
                      isMCQ
                        ? hasMCQAnswer
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-400 font-medium'
                        : q.status && q.status !== 'unattempted'
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-400 font-medium'
                    }
                  >
                    {isMCQ
                      ? hasMCQAnswer
                        ? 'Answer Selected'
                        : 'Not Answered'
                      : q.status && q.status !== 'unattempted'
                      ? q.status
                      : 'Not Submitted'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFinishModalOpen(false)}
              disabled={isSubmittingExam}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleFinishExam}
              isLoading={isSubmittingExam}
              className="gap-1.5 font-semibold"
            >
              <CheckCircle size={15} />
              <span>Confirm & Submit Exam</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mandatory Full-Screen Start & Pause Lockout Gate */}
      {(!isFullscreen || fullscreenRequiredModal) && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {hasInitiatedFullscreen ? 'Assessment Suspended: Full Screen Exited' : 'Full Screen Required to Start'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {hasInitiatedFullscreen
                  ? 'You exited full-screen mode. Full-screen mode is strictly required. Your workspace and code editor are locked until full screen is restored.'
                  : 'This assessment is strictly proctored and cannot begin without full-screen mode enabled. The questions, timer, and editor will unlock once full screen is active.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 text-left space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">Strict Proctoring Guidelines:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>The exam must stay in full-screen mode until final submission.</li>
                <li>Switching tabs, minimizing, or clicking outside triggers security strikes.</li>
                <li>Copying questions and pasting external code are blocked and flagged.</li>
                <li>All infraction events are stored and provided to the recruiting committee.</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={enterFullscreen}
              className="w-full justify-center gap-2 font-bold py-3 text-base shadow-lg shadow-ubi-900/20"
            >
              <Maximize2 size={18} />
              <span>{hasInitiatedFullscreen ? 'Re-enter Full Screen to Resume' : 'Enter Full Screen & Start Assessment'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Security Infraction Alert Modal */}
      <Modal
        isOpen={!!activeWarning}
        onClose={dismissActiveWarning}
        title={strikeCount >= maxStrikes ? "⚠️ Security Infraction Limit Notice" : "⚠️ Security Infraction Detected"}
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800/80 dark:text-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100">
                <ShieldAlert size={20} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{activeWarning?.title}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                Infraction #{strikeCount}
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              {activeWarning?.description}
            </p>
          </div>

          {strikeCount >= maxStrikes && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Security Audit Threshold Reached</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                You have accumulated {strikeCount} security infractions. All incidents are logged with exact timestamps and will be submitted with your evaluation report. Please continue your assessment carefully.
              </p>
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-200">Strict Assessment Rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not leave full screen or switch browser tabs.</li>
              <li>Do not click outside the workspace or open background tools.</li>
              <li>Copying questions or pasting external solutions is prohibited.</li>
              <li>All infraction events are stored and provided to the recruiting team.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {strikeCount} total security flag{strikeCount === 1 ? '' : 's'} recorded
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={dismissActiveWarning}
              className="font-semibold"
            >
              I Understand & Resume Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
