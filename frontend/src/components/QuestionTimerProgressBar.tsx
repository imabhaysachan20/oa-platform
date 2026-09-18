import React from 'react';
import { Clock } from 'lucide-react';
import { QuestionTimerState } from '../hooks/useQuestionTimer';

interface QuestionTimerProgressBarProps {
  timer: QuestionTimerState;
  showLabel?: boolean;
  questionIndex?: number;
  heightClass?: string;
  className?: string;
}

export const QuestionTimerProgressBar: React.FC<QuestionTimerProgressBarProps> = ({
  timer,
  showLabel = false,
  questionIndex,
  heightClass = 'h-1.5',
  className = '',
}) => {
  if (!timer.hasTimer) return null;

  return (
    <div className={`w-full flex flex-col shrink-0 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] font-medium backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Clock
                size={12}
                className={timer.isExpiringSoon ? 'text-rose-500 animate-pulse' : 'text-slate-400'}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {questionIndex !== undefined ? `Q${questionIndex + 1} Timer:` : 'Question Timer:'}
              </span>
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                timer.hasExpired
                  ? 'text-rose-600 dark:text-rose-400'
                  : timer.isExpiringSoon
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {timer.hasExpired ? 'Time Expired' : `${timer.formattedTime} remaining`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {Math.round(timer.percentage)}%
            </span>
            {timer.hasExpired && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                Locked
              </span>
            )}
          </div>
        </div>
      )}

      {/* The 100% -> 0% Progress Bar */}
      <div className={`w-full bg-slate-200/80 dark:bg-slate-800/80 ${heightClass} relative overflow-hidden shrink-0`}>
        <div
          className={`h-full transition-all duration-500 ease-linear rounded-r-full ${timer.colorClass}`}
          style={{ width: `${timer.percentage}%` }}
        />
      </div>
    </div>
  );
};
