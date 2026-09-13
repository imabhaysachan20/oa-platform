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
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
    : isWarning
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-medium text-sm transition-colors ${colorClass} ${className}`}
    >
      <Clock size={16} className={isUrgent ? 'animate-spin' : ''} />
      <span>{formattedTime}</span>
    </div>
  );
};
