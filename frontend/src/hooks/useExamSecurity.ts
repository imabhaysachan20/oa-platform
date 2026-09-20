import { useState, useEffect, useCallback, useRef } from 'react';
import { examsApi } from '../api/exams';

export type InfractionType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'PASTE_ATTEMPT'
  | 'COPY_ATTEMPT'
  | 'DEVTOOLS_SHORTCUT'
  | 'PRINT_SAVE_SHORTCUT'
  | 'DEVTOOLS_DOCK_OPENED'
  | 'MOUSE_LEAVE'
  | 'CONTEXT_MENU'
  | 'CAMERA_INTERRUPTED';

export interface InfractionRecord {
  id: string;
  type: InfractionType;
  title: string;
  description: string;
  timestamp: Date;
}

interface UseExamSecurityOptions {
  enabled?: boolean;
  maxStrikes?: number;
  requireFullscreen?: boolean;
  onMaxStrikesReached?: (records: InfractionRecord[]) => void;
  onInfraction?: (record: InfractionRecord) => void;
  examId?: number;
  assignmentId?: number;
}

const INFRACTION_INFO: Record<InfractionType, { title: string; description: string }> = {
  CAMERA_INTERRUPTED: {
    title: 'Webcam Proctoring Stream Interrupted',
    description: 'The live webcam video stream was disconnected or disabled. Continuous camera monitoring is required.',
  },
  TAB_SWITCH: {
    title: 'Tab Switch Detected',
    description: 'You switched to another browser tab or minimized the window.',
  },
  WINDOW_BLUR: {
    title: 'Window Focus Lost',
    description: 'You clicked outside the assessment window or switched to another application.',
  },
  FULLSCREEN_EXIT: {
    title: 'Full Screen Mode Exited',
    description: 'You exited mandatory full-screen mode. Return to full screen immediately to continue.',
  },
  PASTE_ATTEMPT: {
    title: 'External Paste Blocked',
    description: 'Pasting code or text from external sources into the editor is strictly prohibited.',
  },
  COPY_ATTEMPT: {
    title: 'Copying Content Blocked',
    description: 'Copying questions, test cases, or assessment materials is strictly prohibited.',
  },
  DEVTOOLS_SHORTCUT: {
    title: 'Developer Tools Shortcut Blocked',
    description: 'Attempted to open browser developer tools or inspect page elements.',
  },
  PRINT_SAVE_SHORTCUT: {
    title: 'Print/Save Shortcut Blocked',
    description: 'Printing or saving offline copies of the assessment is prohibited.',
  },
  DEVTOOLS_DOCK_OPENED: {
    title: 'Developer Console Detected',
    description: 'A developer inspection pane appears to have been docked inside the browser window.',
  },
  MOUSE_LEAVE: {
    title: 'Cursor Left Assessment Area',
    description: 'Your mouse cursor moved outside the assessment screen boundary.',
  },
  CONTEXT_MENU: {
    title: 'Right-Click Context Menu Blocked',
    description: 'Context menu access is disabled during the assessment.',
  },
};

export function useExamSecurity({
  enabled = true,
  maxStrikes = 3,
  requireFullscreen = true,
  onMaxStrikesReached,
  onInfraction,
  examId,
  assignmentId,
}: UseExamSecurityOptions = {}) {
  const [infractions, setInfractions] = useState<InfractionRecord[]>([]);
  const [activeWarning, setActiveWarning] = useState<InfractionRecord | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(!!document.fullscreenElement);
  const [hasInitiatedFullscreen, setHasInitiatedFullscreen] = useState<boolean>(!!document.fullscreenElement);
  const hasInitiatedFullscreenRef = useRef<boolean>(!!document.fullscreenElement);
  const [fullscreenRequiredModal, setFullscreenRequiredModal] = useState<boolean>(requireFullscreen && !document.fullscreenElement);

  const enabledRef = useRef(enabled);
  const maxStrikesRef = useRef(maxStrikes);
  const requireFullscreenRef = useRef(requireFullscreen);
  const onMaxStrikesReachedRef = useRef(onMaxStrikesReached);
  const onInfractionRef = useRef(onInfraction);
  const examIdRef = useRef(examId);
  const assignmentIdRef = useRef(assignmentId);

  // In-memory queue of logs pending synchronization with backend
  const pendingLogsRef = useRef<{
    event_type: string;
    title: string;
    description: string;
    occurred_at: string;
    meta_data?: string;
  }[]>([]);

  useEffect(() => {
    enabledRef.current = enabled;
    maxStrikesRef.current = maxStrikes;
    requireFullscreenRef.current = requireFullscreen;
    onMaxStrikesReachedRef.current = onMaxStrikesReached;
    onInfractionRef.current = onInfraction;
    examIdRef.current = examId;
    assignmentIdRef.current = assignmentId;
  }, [enabled, maxStrikes, requireFullscreen, onMaxStrikesReached, onInfraction, examId, assignmentId]);

  // Load any unsynced logs from localStorage on mount
  useEffect(() => {
    if (!assignmentId) return;
    try {
      const stored = localStorage.getItem(`pending_proctoring_logs_${assignmentId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          pendingLogsRef.current = parsed;
        }
      }
    } catch {}
  }, [assignmentId]);

  // Flush pending proctoring logs to backend in a single batch
  const flushLogs = useCallback(async (useBeacon = false) => {
    const currentExamId = examIdRef.current;
    const currentAssignId = assignmentIdRef.current;
    const logsToFlush = [...pendingLogsRef.current];

    if (!currentExamId || !currentAssignId || logsToFlush.length === 0) {
      return;
    }

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const payload = JSON.stringify({
          assignment_id: currentAssignId,
          logs: logsToFlush,
        });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`/api/exams/${currentExamId}/proctoring-logs`, blob);
        pendingLogsRef.current = [];
        localStorage.removeItem(`pending_proctoring_logs_${currentAssignId}`);
        return;
      } catch (err) {
        console.warn('sendBeacon failed, falling back to standard API', err);
      }
    }

    try {
      await examsApi.saveProctoringLogs(currentExamId, currentAssignId, logsToFlush);
      // Remove successfully sent items from queue
      pendingLogsRef.current = pendingLogsRef.current.slice(logsToFlush.length);
      if (pendingLogsRef.current.length === 0) {
        localStorage.removeItem(`pending_proctoring_logs_${currentAssignId}`);
      } else {
        localStorage.setItem(
          `pending_proctoring_logs_${currentAssignId}`,
          JSON.stringify(pendingLogsRef.current)
        );
      }
    } catch (err) {
      console.warn('Failed to flush proctoring logs (will retry in next interval):', err);
    }
  }, []);

  // Periodic batch sync every 45 seconds
  useEffect(() => {
    if (!enabled || !assignmentId || !examId) return;

    const interval = setInterval(() => {
      flushLogs(false);
    }, 45000);

    const handleBeforeUnload = () => {
      flushLogs(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, assignmentId, examId, flushLogs]);

  // Track infraction timestamps to throttle rapid triggers across all mouse and window events
  const lastInfractionTimesRef = useRef<Map<InfractionType, number>>(new Map());
  const lastGlobalInfractionTimeRef = useRef<number>(0);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logInfraction = useCallback((type: InfractionType, customDescription?: string) => {
    if (!enabledRef.current) return;

    const now = Date.now();
    const lastTime = lastInfractionTimesRef.current.get(type) || 0;
    const lastGlobalTime = lastGlobalInfractionTimeRef.current;

    // Strict 1.5s global throttle and per-type debounce
    if (now - lastTime < 1500 || now - lastGlobalTime < 1500) {
      return;
    }
    lastInfractionTimesRef.current.set(type, now);
    lastGlobalInfractionTimeRef.current = now;

    const baseInfo = INFRACTION_INFO[type];
    const timestamp = new Date();
    const record: InfractionRecord = {
      id: `${type}-${now}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      title: baseInfo.title,
      description: customDescription || baseInfo.description,
      timestamp,
    };

    // Add to pending batch queue and mirror to localStorage
    const logItem = {
      event_type: type,
      title: record.title,
      description: record.description,
      occurred_at: timestamp.toISOString(),
    };
    pendingLogsRef.current.push(logItem);
    if (assignmentIdRef.current) {
      try {
        localStorage.setItem(
          `pending_proctoring_logs_${assignmentIdRef.current}`,
          JSON.stringify(pendingLogsRef.current)
        );
      } catch {}
    }

    setInfractions((prev) => {
      const next = [...prev, record];
      if (onInfractionRef.current) {
        onInfractionRef.current(record);
      }
      if (next.length >= maxStrikesRef.current && onMaxStrikesReachedRef.current) {
        onMaxStrikesReachedRef.current(next);
      }
      return next;
    });

    setActiveWarning(record);
  }, []);

  // Request entering fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setHasInitiatedFullscreen(true);
      hasInitiatedFullscreenRef.current = true;
      setFullscreenRequiredModal(false);
      return true;
    } catch (err) {
      console.warn('Fullscreen request denied or not supported:', err);
      return false;
    }
  }, []);

  const dismissActiveWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  const resumeFromWarning = useCallback(async () => {
    setActiveWarning(null);
    if (!document.fullscreenElement && requireFullscreenRef.current) {
      await enterFullscreen();
    }
  }, [enterFullscreen]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Tab visibility (switching tabs, minimizing window)
    const handleVisibilityChange = () => {
      if (!hasInitiatedFullscreenRef.current) return;
      if (document.hidden) {
        logInfraction('TAB_SWITCH');
      }
    };

    // 2. Window blur & focus departure (clicking outside, start menu, taskbar, alt-tab)
    const handleWindowBlur = () => {
      if (!hasInitiatedFullscreenRef.current) return;
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      // Fast check (250ms) to detect window focus loss to external app, taskbar, or start menu
      blurTimeoutRef.current = setTimeout(() => {
        if (!document.hasFocus()) {
          logInfraction('WINDOW_BLUR', 'Assessment window lost focus to an external application, taskbar, or system menu.');
        }
      }, 250);
    };

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    // 3. Fullscreen change & enforcement
    const handleFullscreenChange = () => {
      const currentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(currentlyFullscreen);

      if (!currentlyFullscreen && requireFullscreenRef.current) {
        if (hasInitiatedFullscreenRef.current) {
          logInfraction('FULLSCREEN_EXIT');
        }
        setFullscreenRequiredModal(true);
      } else if (currentlyFullscreen) {
        setHasInitiatedFullscreen(true);
        hasInitiatedFullscreenRef.current = true;
        setFullscreenRequiredModal(false);
      }
    };

    // 4. Global Copy & Cut prevention on question and assessment content
    const handleCopy = (e: ClipboardEvent) => {
      // Allow candidates to freely copy their own code inside the code editor
      const target = e.target as HTMLElement | null;
      if (target?.closest('.cm-editor') || target?.closest('.cm-content')) {
        return;
      }
      e.preventDefault();
      logInfraction('COPY_ATTEMPT');
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Copying assessment questions is prohibited.');
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      // Allow candidates to freely cut their own code inside the code editor
      const target = e.target as HTMLElement | null;
      if (target?.closest('.cm-editor') || target?.closest('.cm-content')) {
        return;
      }
      e.preventDefault();
      logInfraction('COPY_ATTEMPT', 'Cutting question content is disabled.');
    };

    // 5. Global Keyboard shortcut blocking (DevTools, Source, Print, Save, System Start Key)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      // Windows / Meta / OS key (Start menu)
      if (e.key === 'Meta' || e.key === 'OS' || e.keyCode === 91 || e.keyCode === 92) {
        logInfraction('WINDOW_BLUR', 'System Start Menu key was activated.');
        return;
      }

      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        logInfraction('DEVTOOLS_SHORTCUT', 'F12 Developer Tools shortcut is disabled.');
        return;
      }

      // Ctrl+Shift+I / J / C (DevTools / Inspect Element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        logInfraction('DEVTOOLS_SHORTCUT', 'Developer inspection shortcut is disabled.');
        return;
      }

      // Ctrl+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && key === 'U') {
        e.preventDefault();
        e.stopPropagation();
        logInfraction('DEVTOOLS_SHORTCUT', 'View page source shortcut is disabled.');
        return;
      }

      // Ctrl+P (Print), Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && ['P', 'S'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        logInfraction('PRINT_SAVE_SHORTCUT', 'Print and Save shortcuts are disabled.');
        return;
      }
    };

    // 6. Right-Click Context Menu prevention (silently prevented without penalty or warning)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 7. DevTools dock detection heuristic (window size difference on resize - debounced by 1.5s)
    const handleResize = () => {
      if (!hasInitiatedFullscreenRef.current) return;
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        const widthDelta = window.outerWidth - window.innerWidth;
        const heightDelta = window.outerHeight - window.innerHeight;
        const threshold = 170;

        if (widthDelta > threshold || heightDelta > threshold) {
          logInfraction('DEVTOOLS_DOCK_OPENED');
        }
      }, 1500);
    };

    // 8. Mouse leaves document bounds (debounced by 1.5s)
    const handleMouseLeave = (e: MouseEvent) => {
      if (!hasInitiatedFullscreenRef.current) return;
      if (mouseLeaveTimeoutRef.current) clearTimeout(mouseLeaveTimeoutRef.current);
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          logInfraction('MOUSE_LEAVE');
        }
      }, 1500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focusout', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focusout', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (mouseLeaveTimeoutRef.current) clearTimeout(mouseLeaveTimeoutRef.current);
    };
  }, [enabled, logInfraction]);

  const strikeCount = infractions.length;
  const isMaxStrikesReached = strikeCount >= maxStrikes;

  return {
    infractions,
    strikeCount,
    maxStrikes,
    isMaxStrikesReached,
    isFullscreen,
    hasInitiatedFullscreen,
    fullscreenRequiredModal,
    activeWarning,
    enterFullscreen,
    logInfraction,
    dismissActiveWarning,
    resumeFromWarning,
    flushLogs,
  };
}
