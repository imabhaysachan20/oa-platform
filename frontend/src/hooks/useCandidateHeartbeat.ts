import { useState, useEffect, useRef, useCallback } from 'react';
import { examsApi } from '../api/exams';

interface UseCandidateHeartbeatOptions {
  examId?: number;
  assignmentId?: number;
  enabled?: boolean;
  intervalMs?: number;
  onConnectionStatusChange?: (isOnline: boolean) => void;
}

export const useCandidateHeartbeat = ({
  examId,
  assignmentId,
  enabled = true,
  intervalMs = 10000,
  onConnectionStatusChange,
}: UseCandidateHeartbeatOptions) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [disconnectedSince, setDisconnectedSince] = useState<Date | null>(null);

  const isPingingRef = useRef<boolean>(false);
  const intervalRef = useRef<any>(null);

  const sendPing = useCallback(async () => {
    if (!enabled || !examId || !assignmentId || isPingingRef.current) return;

    isPingingRef.current = true;
    try {
      await examsApi.sendHeartbeat(examId, assignmentId);
      setLastPingTime(new Date());
      setConsecutiveFailures(0);
      if (!isOnline) {
        setIsOnline(true);
        setDisconnectedSince(null);
        onConnectionStatusChange?.(true);
      }
    } catch (err) {
      setConsecutiveFailures((prev) => {
        const next = prev + 1;
        // If 2 or more consecutive pings fail, assume offline/unreachable
        if (next >= 2 && isOnline) {
          setIsOnline(false);
          if (!disconnectedSince) {
            setDisconnectedSince(new Date());
          }
          onConnectionStatusChange?.(false);
        }
        return next;
      });
    } finally {
      isPingingRef.current = false;
    }
  }, [enabled, examId, assignmentId, isOnline, disconnectedSince, onConnectionStatusChange]);

  // Window offline / online event listeners
  useEffect(() => {
    const handleBrowserOnline = () => {
      setIsOnline(true);
      setDisconnectedSince(null);
      onConnectionStatusChange?.(true);
      // Immediately send a ping when coming back online
      sendPing();
    };

    const handleBrowserOffline = () => {
      setIsOnline(false);
      setDisconnectedSince(new Date());
      onConnectionStatusChange?.(false);
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, [sendPing, onConnectionStatusChange]);

  // Periodic heartbeat timer
  useEffect(() => {
    if (!enabled || !examId || !assignmentId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Initial ping on mount/assignment ready
    sendPing();

    intervalRef.current = setInterval(() => {
      sendPing();
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, examId, assignmentId, intervalMs, sendPing]);

  return {
    isOnline,
    lastPingTime,
    consecutiveFailures,
    disconnectedSince,
    manualPing: sendPing,
  };
};
