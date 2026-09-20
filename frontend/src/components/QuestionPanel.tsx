import React from 'react';
import { Badge } from './ui/Badge';
import { StudentQuestionView } from '../types';
import { Clock, HardDrive, CheckCircle2, Code2, AlignLeft, Lock } from 'lucide-react';
import { MarkdownRenderer } from './ui/RichTextEditor';

import { useQuestionTimer } from '../hooks/useQuestionTimer';

import { QuestionTabs } from './QuestionTabs';

interface QuestionPanelProps {
  userId?: number | null;
  examId?: number | null;
  assignmentId?: number | null;
  questions: StudentQuestionView[];
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
  lockedQuestionIds?: Set<number>;
  serverTime?: string | null;
  isSequentialTimedPhase?: boolean;
  activeTimedQuestionId?: number;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  userId,
  examId,
  assignmentId,
  questions,
  activeIndex,
  onSelectIndex,
  lockedQuestionIds,
  serverTime,
  isSequentialTimedPhase,
  activeTimedQuestionId,
}) => {
  const currentQ = questions[activeIndex];
  const timer = useQuestionTimer(userId, examId, currentQ, undefined, serverTime, assignmentId);

  if (!currentQ) {
    return (
      <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-center text-slate-500 dark:text-slate-400">
        No questions assigned.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Question Selection Tabs */}
      <QuestionTabs
        questions={questions}
        activeIndex={activeIndex}
        onSelectIndex={onSelectIndex}
        lockedQuestionIds={lockedQuestionIds}
      />

      {/* Question Body */}
      <div
        className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 select-none"
        onCopy={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Title & Limits Meta */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            {currentQ.question_type === 'mcq' ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold tracking-wide">
                  {currentQ.is_multi_select ? 'Multi-Select' : 'Single-Select'}
                </span>
                {currentQ.marks != null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                    +{currentQ.marks} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                )}
                {timer.hasTimer && (
                  <span
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      timer.hasExpired
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                        : timer.isExpiringSoon
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 animate-pulse'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Clock size={12} />
                    {timer.hasExpired ? 'Time Expired' : `${timer.formattedTime} left`}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  +{currentQ.marks ?? 10} {(currentQ.marks ?? 10) === 1 ? 'Mark' : 'Marks'}
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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {currentQ.title}
          </h2>
        </div>

        {/* Description */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <MarkdownRenderer content={currentQ.description} />
        </div>

        {/* Coding-only sections: Input Format, Method Signature, Sample Test Cases */}
        {currentQ.question_type !== 'mcq' && (
          <>
            {/* Input Format Section */}
            {currentQ.input_format && (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <AlignLeft size={13} className="text-ubi-700 dark:text-ubi-400" />
                  <span>Input Format</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <MarkdownRenderer content={currentQ.input_format} />
                </div>
              </div>
            )}



            {/* Sample Input / Output */}
            {(currentQ.sample_input || currentQ.sample_output) && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Sample Test Case
                </h3>
                {currentQ.sample_input && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                      Input
                    </span>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                      {currentQ.sample_input}
                    </div>
                  </div>
                )}
                {currentQ.sample_output && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                      Output
                    </span>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
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
  );
};
