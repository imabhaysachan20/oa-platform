import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  deadlineAt: string; // ISO string from server
  onExpire?: () => void;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ deadlineAt, onExpire, className = '' }) => {
  const [timeLeftSec, setTimeLeftSec] = useState<number>(() => {
    const target = new Date(deadlineAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((target - now) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const target = new Date(deadlineAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeftSec(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineAt, onExpire]);

  const hours = Math.floor(timeLeftSec / 3600);
  const minutes = Math.floor((timeLeftSec % 3600) / 60);
  const seconds = timeLeftSec % 60;

  const formattedTime = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ]
    .filter(Boolean)
    .join(':');

  // Urgency styling
  const isUrgent = timeLeftSec < 180; // < 3 minutes
  const isWarning = timeLeftSec < 600 && !isUrgent; // < 10 minutes

  const colorClass = isUrgent
    ? 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/80 dark:border-rose-800 animate-pulse'
    : isWarning
    ? 'text-amber-800 bg-amber-50 border-amber-300 dark:text-amber-200 dark:bg-amber-950/80 dark:border-amber-800'
    : 'text-slate-800 bg-slate-100 border-slate-200 dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs shadow-xs transition-colors ${colorClass} ${className}`}
    >
      <Clock size={14} className={isUrgent ? 'animate-spin text-rose-600' : 'text-slate-500 dark:text-slate-400'} />
      <span>{formattedTime}</span>
    </div>
  );
};
