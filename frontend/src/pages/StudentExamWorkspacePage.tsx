import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { submissionsApi } from '../api/submissions';
import { StudentQuestionView, getQuestionMarks } from '../types';
import { useExamStore, STARTER_CODE } from '../store/examStore';
import { useThemeStore } from '../store/themeStore';
import { QuestionPanel } from '../components/QuestionPanel';
import { MCQPanel } from '../components/MCQPanel';
import { QuestionTabs } from '../components/QuestionTabs';
import { MarkdownRenderer } from '../components/ui/RichTextEditor';
import { CodeEditor } from '../components/CodeEditor';
import { OutputConsole } from '../components/OutputConsole';
import { Timer } from '../components/ui/Timer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Play, Send, CheckCircle, AlertTriangle, Sun, Moon, ShieldAlert, ShieldCheck, Maximize2, WifiOff, Clock, HardDrive, Code2, AlignLeft } from 'lucide-react';
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
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Interactive Panel Resizing (Splitter handles like Antigravity IDE)
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(40); // 40% problem statement default (double-click target)
  const [editorHeightPercent, setEditorHeightPercent] = useState<number>(60); // 60% code editor, 40% output console
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  const horizontalContainerRef = useRef<HTMLDivElement | null>(null);
  const verticalContainerRef = useRef<HTMLDivElement | null>(null);

  const handleHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHorizontal(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!horizontalContainerRef.current) return;
      const rect = horizontalContainerRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      let newPercent = (relativeX / rect.width) * 100;
      if (newPercent < 33) newPercent = 33;
      if (newPercent > 67) newPercent = 67;
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingHorizontal(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleVerticalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingVertical(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!verticalContainerRef.current) return;
      const rect = verticalContainerRef.current.getBoundingClientRect();
      const relativeY = moveEvent.clientY - rect.top;
      let newPercent = (relativeY / rect.height) * 100;
      if (newPercent < 20) newPercent = 20;
      if (newPercent > 80) newPercent = 80;
      setEditorHeightPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingVertical(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };


  const { theme, toggleTheme } = useThemeStore();

  const {
    questions,
    activeQuestionIndex,
    codeDrafts,
    selectedLanguage,
    runOutputs,
    submissionOutputs,
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
    setSubmissionOutput,
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

      // Sort questions: Timed MCQs first, then Untimed MCQs, then Coding Questions
      const rawQuestions = examData.questions || [];
      const timedMCQs = rawQuestions.filter(
        (q) => q.question_type === 'mcq' && Boolean(q.mcq_time_limit_seconds && q.mcq_time_limit_seconds > 0)
      );
      const untimedMCQs = rawQuestions.filter(
        (q) => q.question_type === 'mcq' && (!q.mcq_time_limit_seconds || q.mcq_time_limit_seconds <= 0)
      );
      const codingQuestions = rawQuestions.filter((q) => q.question_type !== 'mcq');
      const sortedQuestions = [...timedMCQs, ...untimedMCQs, ...codingQuestions];

      setExamSession(
        examData.exam_id,
        examData.assignment_id,
        examData.exam_title,
        examData.status,
        examData.started_at || '',
        examData.deadline_at || '',
        sortedQuestions
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
    resumeFromWarning,
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
        if (
          q.is_mcq_locked ||
          (q.question_type !== 'mcq' && q.status?.toLowerCase() === 'accepted')
        ) {
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

  // Timed MCQ Sequential Flow Phase Detection
  const isTimedQuestion = useCallback((q?: StudentQuestionView | null) => {
    if (!q) return false;
    return q.question_type === 'mcq' && Boolean(q.mcq_time_limit_seconds && q.mcq_time_limit_seconds > 0);
  }, []);

  const timedMCQs = useMemo(
    () => questions.filter((q: StudentQuestionView) => isTimedQuestion(q)),
    [questions, isTimedQuestion]
  );

  const pendingTimedMCQs = useMemo(
    () => timedMCQs.filter((q: StudentQuestionView) => !lockedQuestionIds.has(q.id) && !q.is_mcq_locked),
    [timedMCQs, lockedQuestionIds]
  );

  const isSequentialTimedPhase = pendingTimedMCQs.length > 0;
  const activeTimedQuestion = isSequentialTimedPhase ? pendingTimedMCQs[0] : null;

  // Enforce candidate stays on active timed question until it is completed/locked
  useEffect(() => {
    if (!isSequentialTimedPhase || !activeTimedQuestion) return;
    const targetIdx = questions.findIndex((q) => q.id === activeTimedQuestion.id);
    if (targetIdx !== -1 && activeQuestionIndex !== targetIdx) {
      setActiveQuestionIndex(targetIdx);
    }
  }, [isSequentialTimedPhase, activeTimedQuestion?.id, questions, activeQuestionIndex, setActiveQuestionIndex]);

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

  // Advance timed MCQ: flushes response, seals/locks on backend & locally, and moves to next
  const [isAdvancingTimedMCQ, setIsAdvancingTimedMCQ] = useState(false);

  const handleAdvanceTimedMCQ = useCallback(async () => {
    if (!currentQ || isAdvancingTimedMCQ) return;
    const qId = currentQ.id;
    setIsAdvancingTimedMCQ(true);

    try {
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

      // 2. Explicitly lock question on backend
      try {
        await examsApi.lockQuestion(id, qId);
      } catch (err) {
        console.warn('Backend lock question failed:', err);
      }

      // 3. Mark this question as locked locally
      markQuestionLocked(qId);

      // 4. Determine next question
      const remainingPending = timedMCQs.filter(
        (q: StudentQuestionView) => q.id !== qId && !lockedQuestionIds.has(q.id) && !q.is_mcq_locked
      );

      if (remainingPending.length > 0) {
        const nextTimedQ = remainingPending[0];
        const nextIdx = questions.findIndex((q) => q.id === nextTimedQ.id);
        if (nextIdx !== -1) {
          setActiveQuestionIndex(nextIdx);
        }
      } else {
        // Transition to free navigation across all untimed MCQs and coding questions
        const firstUntimedIdx = questions.findIndex((q) => !isTimedQuestion(q));
        if (firstUntimedIdx !== -1) {
          setActiveQuestionIndex(firstUntimedIdx);
        } else if (activeQuestionIndex < questions.length - 1) {
          setActiveQuestionIndex(activeQuestionIndex + 1);
        }
      }
    } finally {
      setIsAdvancingTimedMCQ(false);
    }
  }, [
    currentQ,
    isAdvancingTimedMCQ,
    mcqSelections,
    examData?.assignment_id,
    id,
    markQuestionLocked,
    timedMCQs,
    lockedQuestionIds,
    questions,
    setActiveQuestionIndex,
    isTimedQuestion,
    activeQuestionIndex,
  ]);

  // Auto-advance & lock when individual question timer reaches zero
  const handleCurrentQuestionExpire = async () => {
    if (!currentQ) return;
    if (isTimedQuestion(currentQ)) {
      await handleAdvanceTimedMCQ();
    } else {
      markQuestionLocked(currentQ.id);
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
      setSubmissionFeedback(`Error: ${err.response?.data?.detail || 'Failed to run code'}`);
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
      setSubmissionOutput(currentQ.id, res);
      // Update question status in view
      currentQ.status = res.status;

      const isAccepted =
        res.status?.toLowerCase() === 'accepted' ||
        (res.test_cases_passed > 0 && res.test_cases_passed === res.total_test_cases);

      if (isAccepted) {
        markQuestionLocked(currentQ.id);
      }

      // Ensure console is visible by balancing vertical split height
      if (editorHeightPercent > 70) {
        setEditorHeightPercent(55);
      }
      // Refresh backend session in background
      refetch();
    } catch (err: any) {
      setSubmissionFeedback(`Error: ${err.response?.data?.detail || 'Failed to submit solution'}`);
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
      setSubmissionFeedback(`Error: ${err.response?.data?.detail || 'Failed to finish exam'}`);
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
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {examTitle || 'Coding Assessment'}
            </h1>
          </div>
        </div>

        {/* Server-Driven Countdown Timer, Theme Toggle & Finish Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
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
            variant="primary"
            size="sm"
            onClick={() => setIsFinishModalOpen(true)}
            className="gap-1.5 font-semibold"
          >
            <CheckCircle size={15} />
            <span>Finish Exam</span>
          </Button>
        </div>
      </div>

      {/* System Error Toast Bar */}
      {submissionFeedback && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800/60 dark:text-rose-200 px-4 py-2 flex items-center justify-between text-xs font-semibold animate-fadeIn shrink-0">
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
            {submissionFeedback}
          </span>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Container */}
      <div className="flex-1 p-3 overflow-hidden min-h-0">
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Top Question Tabs Bar (Shared across MCQ and Coding questions) */}
          <QuestionTabs
            questions={questions}
            activeIndex={activeQuestionIndex}
            onSelectIndex={(idx) => {
              if (isSequentialTimedPhase) {
                if (questions[idx]?.id !== activeTimedQuestion?.id) {
                  return;
                }
              }
              const targetQ = questions[idx];
              const isTargetLocked =
                targetQ &&
                (lockedQuestionIds.has(targetQ.id) ||
                  Boolean(targetQ.is_mcq_locked) ||
                  (targetQ.question_type !== 'mcq' && targetQ.status?.toLowerCase() === 'accepted'));

              if (targetQ && isTargetLocked && idx !== activeQuestionIndex) {
                return;
              }
              setIsEditorExpanded(false);
              setActiveQuestionIndex(idx);
              setSubmissionFeedback(null);
            }}
            lockedQuestionIds={lockedQuestionIds}
          />
          {/* Seamless Resizable Workspace Content */}
          <div
            ref={horizontalContainerRef}
            className={`flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative ${
              isDraggingHorizontal || isDraggingVertical ? 'select-none' : ''
            }`}
          >
            {/* Left Column: Problem Statement with Matching Top Header Bar */}
            <div
              style={{ flexBasis: `${leftWidthPercent}%`, width: `${leftWidthPercent}%` }}
              className="h-full bg-slate-50/70 dark:bg-slate-950/60 flex flex-col min-h-0 select-none shrink-0 overflow-hidden"
            >
              {/* Top Banner: Matching Header Bar for Left Panel */}
              <div className="h-12 px-5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                {currentQ.question_type === 'mcq' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 text-[11px] font-semibold tracking-wide">
                      {currentQ.is_multi_select ? 'Multi-Select' : 'Single-Select'}
                    </span>
                    {currentQ.marks != null && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 text-[11px] font-semibold">
                        +{currentQ.marks} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 text-[11px] font-semibold">
                      +{getQuestionMarks(currentQ)} {getQuestionMarks(currentQ) === 1 ? 'Mark' : 'Marks'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {currentQ.time_limit_ms}ms limit
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={13} className="text-slate-400" />
                      {Math.round(currentQ.memory_limit_kb / 1024)}MB memory
                    </span>
                  </div>
                )}
              </div>

              {/* Scrollable Problem Statement Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {currentQ.question_type === 'mcq' ? (
                  <>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {currentQ.title}
                    </h2>

                    <div className="border-t border-slate-200/70 dark:border-slate-800 pt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <MarkdownRenderer content={currentQ.description} />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {currentQ.title}
                    </h2>

                    <div className="border-t border-slate-200/70 dark:border-slate-800 pt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <MarkdownRenderer content={currentQ.description} />
                    </div>

                    {/* Input Format */}
                    {currentQ.input_format && (
                      <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          <AlignLeft size={13} className="text-ubi-700 dark:text-ubi-400" />
                          <span>Input Format</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          <MarkdownRenderer content={currentQ.input_format} />
                        </div>
                      </div>
                    )}

                    {/* Sample Test Case */}
                    {(currentQ.sample_input || currentQ.sample_output) && (
                      <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Sample Test Case
                        </h3>
                        {currentQ.sample_input && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                              Input
                            </span>
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                              {currentQ.sample_input}
                            </div>
                          </div>
                        )}
                        {currentQ.sample_output && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                              Output
                            </span>
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                              {currentQ.sample_output}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Horizontal Splitter Handle */}
            <div
              onMouseDown={handleHorizontalMouseDown}
              onDoubleClick={() => setLeftWidthPercent(40)}
              title="Drag to resize problem statement & editor panels (Double-click to reset)"
              className="w-1.5 bg-slate-200/50 hover:bg-slate-300 dark:bg-slate-800/50 dark:hover:bg-slate-700 cursor-col-resize flex items-center justify-center transition-colors shrink-0 group z-10 hidden lg:flex"
            >
              <div className="w-0.5 h-6 rounded-full bg-slate-400/50 group-hover:bg-slate-600 dark:bg-slate-600 dark:group-hover:bg-slate-300 transition-colors" />
            </div>

            {/* Right Column: Code Editor & Output Console OR MCQ View */}
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
              {currentQ.question_type === 'mcq' ? (
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
                  isTimedMCQ={isTimedQuestion ? isTimedQuestion(currentQ) : false}
                  hasMoreTimedMCQs={pendingTimedMCQs ? pendingTimedMCQs.filter((q: StudentQuestionView) => q.id !== currentQ.id).length > 0 : false}
                  onAdvanceTimedQuestion={handleAdvanceTimedMCQ}
                  isAdvancing={isAdvancingTimedMCQ}
                  onNextQuestion={() => {
                    if (activeQuestionIndex < questions.length - 1) {
                      const nextIdx = activeQuestionIndex + 1;
                      const targetQ = questions[nextIdx];
                      if (targetQ && (lockedQuestionIds.has(targetQ.id) || targetQ.is_mcq_locked)) {
                        return;
                      }
                      setIsEditorExpanded(false);
                      setActiveQuestionIndex(nextIdx);
                      setSubmissionFeedback(null);
                    }
                  }}
                  hasNextQuestion={activeQuestionIndex < questions.length - 1}
                />
              ) : (
                <div ref={verticalContainerRef} className="h-full flex flex-col overflow-hidden min-h-0 bg-white dark:bg-slate-900 relative">
                  {/* Editor Container */}
                  <div
                    style={{ height: `${editorHeightPercent}%` }}
                    className="min-h-0 overflow-hidden shrink-0"
                  >
                    <CodeEditor
                      value={currentCode}
                      onChange={(val) => setCodeDraft(currentQ.id, currentLang, val)}
                      language={currentLang}
                      onLanguageChange={(lang) => setSelectedLanguage(currentQ.id, lang)}
                      starterCode={currentStarter}
                      onReset={() => currentQ && setCodeDraft(currentQ.id, currentLang, currentStarter)}
                      onPasteAttempt={() => logInfraction('PASTE_ATTEMPT')}
                      readOnly={Boolean(
                        currentQ && (currentQ.status?.toLowerCase() === 'accepted' || lockedQuestionIds.has(currentQ.id))
                      )}
                    />
                  </div>

                  {/* Vertical Splitter Handle (Between Top Code Editor & Lower Output Console) */}
                  <div
                    onMouseDown={handleVerticalMouseDown}
                    onDoubleClick={() => setEditorHeightPercent(60)}
                    title="Drag to resize editor & console heights (Double-click to reset)"
                    className="h-1.5 bg-slate-200/50 hover:bg-slate-300 dark:bg-slate-800/50 dark:hover:bg-slate-700 cursor-row-resize flex items-center justify-center transition-colors shrink-0 group z-10"
                  >
                    <div className="h-0.5 w-6 rounded-full bg-slate-400/50 group-hover:bg-slate-600 dark:bg-slate-600 dark:group-hover:bg-slate-300 transition-colors" />
                  </div>

                  {/* Output & Test Cases Console */}
                  <div
                    style={{ height: `${100 - editorHeightPercent}%` }}
                    className="min-h-0 overflow-hidden shrink-0"
                  >
                    <OutputConsole
                      output={currentOutput}
                      submissionOutput={currentQ ? submissionOutputs[currentQ.id] : null}
                      isRunning={isRunningCode}
                      sampleInput={currentQ?.sample_input}
                      sampleOutput={currentQ?.sample_output}
                      onRunCode={handleRunCode}
                      onSubmitCode={handleSubmitCode}
                      isSubmitting={isSubmittingCode}
                      isQuestionLocked={Boolean(
                        currentQ && (currentQ.status?.toLowerCase() === 'accepted' || lockedQuestionIds.has(currentQ.id))
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Finish Modal */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="Submit and Finish Assessment?"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sans pt-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to finish the exam? Once submitted, your scores will be finalized and you cannot submit further code or answers.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Question Submission Status</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold lowercase">
                {
                  questions.filter((q) => {
                    if (q.question_type === 'mcq') {
                      return (mcqSelections[q.id]?.length || 0) > 0 || (q.selected_option_ids && q.selected_option_ids.length > 0);
                    }
                    return q.status && q.status !== 'unattempted';
                  }).length
                }{' '}
                of {questions.length} attempted
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              {questions.map((q, idx) => {
                const isMCQ = q.question_type === 'mcq';
                const hasMCQAnswer = (mcqSelections[q.id]?.length || 0) > 0 || (q.selected_option_ids && q.selected_option_ids.length > 0);
                const isCodingAttempted = !isMCQ && Boolean(q.status && q.status !== 'unattempted');
                const isAccepted = !isMCQ && q.status?.toLowerCase() === 'accepted';

                const statusColor = isMCQ
                  ? hasMCQAnswer
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-400 font-medium'
                  : !isCodingAttempted
                  ? 'text-slate-400 font-medium'
                  : isAccepted
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-rose-600 dark:text-rose-400 font-bold';

                return (
                  <div key={q.id} className="flex items-center justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Question {idx + 1} ({isMCQ ? 'MCQ' : `+${getQuestionMarks(q)} ${getQuestionMarks(q) === 1 ? 'Mark' : 'Marks'}`}):
                    </span>
                    <span className={statusColor}>
                      {isMCQ
                        ? hasMCQAnswer
                          ? 'Answer Selected'
                          : 'Not Answered'
                        : isCodingAttempted
                        ? q.status
                        : 'Not Submitted'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFinishModalOpen(false)}
              disabled={isSubmittingExam}
              className="text-xs font-semibold px-4"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinishExam}
              isLoading={isSubmittingExam}
              className="gap-1.5 font-bold text-xs px-4 shadow-sm"
            >
              <CheckCircle size={14} />
              <span>Confirm & Submit Exam</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mandatory Full-Screen Start & Pause Lockout Gate */}
      {!activeWarning && (!isFullscreen || fullscreenRequiredModal) && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Top Icon */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-400/20 blur-lg animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/20 dark:border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldAlert size={32} />
              </div>
            </div>

            {/* Header & Description */}
            <div className="space-y-2 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {hasInitiatedFullscreen ? 'Assessment Suspended' : 'Full Screen Required'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                {hasInitiatedFullscreen
                  ? 'You exited full-screen mode. Full-screen mode is strictly required. Your workspace and code editor are locked until full screen is restored.'
                  : 'This assessment is strictly proctored and cannot begin without full-screen mode enabled. The questions, timer, and editor will unlock once full screen is active.'}
              </p>
            </div>

            {/* Proctoring Rules (Clean borderless list) */}
            <div className="text-left space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">
                Strict Proctoring Guidelines:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>The exam must stay in full-screen mode until final submission.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>Switching tabs, minimizing, or clicking outside triggers security alerts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>Copying questions and pasting external code are blocked and flagged.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span>All infraction events are stored and provided to the recruiting committee.</span>
                </li>
              </ul>
            </div>

            {/* Action CTA */}
            <Button
              variant="primary"
              size="lg"
              onClick={enterFullscreen}
              className="w-full justify-center gap-2.5 font-extrabold py-3.5 text-base shadow-xl shadow-indigo-600/25 rounded-xl transition-all duration-200 hover:scale-[1.01]"
            >
              <Maximize2 size={19} />
              <span>{hasInitiatedFullscreen ? 'Re-enter Full Screen to Resume' : 'Enter Full Screen & Start Assessment'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Security Infraction Alert Modal */}
      <Modal
        isOpen={!!activeWarning}
        onClose={dismissActiveWarning}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Security Warning
              </h3>
            </div>
          </div>
        }
        maxWidth="md"
      >
        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 pt-1">
          {/* Main Warning Details */}
          <div className="space-y-2">
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {activeWarning?.title}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeWarning?.description}
            </p>
          </div>

          {/* Guidelines Section - Clean, Borderless List */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">
              Strict Assessment Rules:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span>Do not leave full screen or switch browser tabs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span>Do not click outside the workspace boundary or open background tools.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span>Copying questions or pasting external code is strictly prohibited.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span>All security infraction events are logged for proctoring evaluation.</span>
              </li>
            </ul>
          </div>

          {/* Action CTA */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={resumeFromWarning}
              className="w-full justify-center gap-2 font-extrabold py-3 text-sm sm:text-base shadow-lg shadow-indigo-600/20 rounded-xl transition-all"
            >
              <CheckCircle size={18} />
              <span>I Understand & Resume Test</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
