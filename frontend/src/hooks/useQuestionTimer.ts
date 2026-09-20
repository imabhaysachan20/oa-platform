import { useState, useEffect, useRef, useMemo } from 'react';
import { StudentQuestionView } from '../types';

export interface QuestionTimerState {
  hasTimer: boolean;
  totalSeconds: number;
  secondsRemaining: number;
  percentage: number; // 100 down to 0
  hasExpired: boolean;
  isExpiringSoon: boolean; // <= 20% or < 30s
  formattedTime: string;
  colorClass: string;
}

interface StoredQuestionTimer {
  startedAt: number;
  expiresAt: number;
  durationSeconds: number;
  locked: boolean;
}

/**
 * LocalStorage-backed per-question timer hook.
 * Strictly respects each question's individual time frame (e.g. 45s, 60s, 90s).
 * Drives the UI countdown immediately with zero lag, survives page refreshes,
 * and notifies on expiration for auto-advance.
 */
export function useQuestionTimer(
  userId?: number | null,
  examId?: number | null,
  question?: StudentQuestionView | null,
  onExpire?: () => void,
  serverTime?: string | null,
  assignmentId?: number | null
): QuestionTimerState {
  // Compute clock skew between server wall-clock time and client Date.now()
  const serverSkewMs = useMemo(() => {
    if (!serverTime) return 0;
    try {
      const sTime = new Date(serverTime).getTime();
      if (!isNaN(sTime)) {
        return sTime - Date.now();
      }
    } catch {}
    return 0;
  }, [serverTime]);

  const getAuthoritativeNow = () => Date.now() + serverSkewMs;

  // A question has an individual timer if it has an assigned mcq_time_limit_seconds or question_deadline_at
  const hasTimer = Boolean(
    question &&
      (Boolean(question.mcq_time_limit_seconds && question.mcq_time_limit_seconds > 0) ||
        Boolean(question.question_deadline_at))
  );

  // Determine individual duration in seconds strictly for this specific question
  const individualDuration = useMemo(() => {
    if (!question) return 60;
    if (question.mcq_time_limit_seconds && question.mcq_time_limit_seconds > 0) {
      return question.mcq_time_limit_seconds;
    }
    if (question.question_started_at && question.question_deadline_at) {
      const diff = Math.round(
        (new Date(question.question_deadline_at).getTime() -
          new Date(question.question_started_at).getTime()) /
          1000
      );
      if (diff > 0) return diff;
    }
    return 60;
  }, [question?.mcq_time_limit_seconds, question?.question_started_at, question?.question_deadline_at]);

  const storageKey =
    userId && assignmentId && question?.id
      ? `u_${userId}_assign_${assignmentId}_q_${question.id}_timer`
      : userId && examId && question?.id
      ? `u_${userId}_exam_${examId}_q_${question.id}_timer`
      : examId && question?.id
      ? `exam_${examId}_q_${question.id}_timer`
      : null;

  // Helper to read from or initialize in localStorage
  const getOrInitTimer = (): StoredQuestionTimer | null => {
    if (!hasTimer || !storageKey) return null;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: StoredQuestionTimer = JSON.parse(raw);
        // Stale check: if server says question is NOT locked and has no active deadline,
        // any cached timer marked locked is from a previous expired attempt and must be discarded
        if (!question?.is_mcq_locked && !question?.question_deadline_at && parsed.locked) {
          // Discard stale lock from previous attempt
        } else {
          // If server provided deadline and it is earlier, sync to earlier deadline
          if (question?.question_deadline_at) {
            const serverExpires = new Date(question.question_deadline_at).getTime();
            if (serverExpires < parsed.expiresAt) {
              parsed.expiresAt = serverExpires;
            }
          }
          return parsed;
        }
      }
    } catch {}

    // First visit: initialize in localStorage immediately
    const now = getAuthoritativeNow();
    let expiresAt = now + individualDuration * 1000;
    if (question?.question_deadline_at) {
      const serverExpires = new Date(question.question_deadline_at).getTime();
      expiresAt = serverExpires;
    }

    const newTimer: StoredQuestionTimer = {
      startedAt: now,
      expiresAt,
      durationSeconds: individualDuration,
      locked: !!question?.is_mcq_locked || now >= expiresAt,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(newTimer));
    } catch {}

    return newTimer;
  };

  const initialTimer = getOrInitTimer();

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!initialTimer) return 0;
    const now = getAuthoritativeNow();
    if (initialTimer.locked || now >= initialTimer.expiresAt || question?.is_mcq_locked) {
      return 0;
    }
    return Math.max(0, Math.ceil((initialTimer.expiresAt - now) / 1000));
  });

  const [percentage, setPercentage] = useState<number>(() => {
    if (!initialTimer) return 0;
    const now = getAuthoritativeNow();
    if (initialTimer.locked || now >= initialTimer.expiresAt || question?.is_mcq_locked) {
      return 0;
    }
    const diff = initialTimer.expiresAt - now;
    return Math.max(0, Math.min(100, (diff / (initialTimer.durationSeconds * 1000)) * 100));
  });

  const [hasExpired, setHasExpired] = useState<boolean>(() => {
    if (!initialTimer) return false;
    const now = getAuthoritativeNow();
    return initialTimer.locked || now >= initialTimer.expiresAt || !!question?.is_mcq_locked;
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const hasTriggeredExpireRef = useRef(false);

  useEffect(() => {
    hasTriggeredExpireRef.current = false;

    if (!hasTimer || !storageKey) {
      setSecondsRemaining(0);
      setPercentage(0);
      setHasExpired(false);
      return;
    }

    const timerData = getOrInitTimer();
    if (!timerData) return;

    const currentNow = getAuthoritativeNow();
    if (timerData.locked || currentNow >= timerData.expiresAt || question?.is_mcq_locked) {
      setSecondsRemaining(0);
      setPercentage(0);
      setHasExpired(true);
      return;
    }

    setHasExpired(false);

    const interval = setInterval(() => {
      const now = getAuthoritativeNow();
      const diffMs = timerData.expiresAt - now;

      if (diffMs <= 0) {
        clearInterval(interval);
        setSecondsRemaining(0);
        setPercentage(0);
        setHasExpired(true);

        // Mark locked in localStorage
        try {
          const updated = { ...timerData, locked: true };
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}

        if (!hasTriggeredExpireRef.current) {
          hasTriggeredExpireRef.current = true;
          onExpireRef.current?.();
        }
      } else {
        const remainingSec = Math.ceil(diffMs / 1000);
        setSecondsRemaining(remainingSec);
        setPercentage(
          Math.max(0, Math.min(100, (diffMs / (timerData.durationSeconds * 1000)) * 100))
        );
      }
    }, 200);

    return () => clearInterval(interval);
  }, [
    question?.id,
    question?.question_deadline_at,
    question?.mcq_time_limit_seconds,
    question?.is_mcq_locked,
    hasTimer,
    storageKey,
    userId,
    individualDuration,
    serverSkewMs,
  ]);

  const isExpiringSoon = hasTimer && !hasExpired && (percentage <= 20 || secondsRemaining < 30);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsRemaining]);

  const colorClass = useMemo(() => {
    if (percentage > 30) {
      return 'bg-ubi-600 dark:bg-ubi-500';
    }
    if (percentage > 10) {
      return 'bg-amber-500 dark:bg-amber-400';
    }
    return 'bg-rose-600 dark:bg-rose-500 animate-pulse';
  }, [percentage]);

  return {
    hasTimer,
    totalSeconds: individualDuration,
    secondsRemaining,
    percentage,
    hasExpired,
    isExpiringSoon,
    formattedTime,
    colorClass,
  };
}
