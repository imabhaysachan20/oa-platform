import React from 'react';
import { StudentQuestionView } from '../types';
import { MarkdownRenderer } from './ui/RichTextEditor';
import { Clock, CheckCircle2, AlertCircle, CheckSquare, Square, ShieldAlert, HelpCircle } from 'lucide-react';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { QuestionTimerProgressBar } from './QuestionTimerProgressBar';

interface MCQPanelProps {
  userId?: number | null;
  examId?: number | null;
  assignmentId?: number | null;
  question: StudentQuestionView;
  selectedOptionIds: string[];
  onChangeSelection: (newSelectedIds: string[]) => void;
  isSaving: boolean;
  saveError: string | null;
  onQuestionExpire?: () => void;
  serverTime?: string | null;
  isTimedMCQ?: boolean;
  hasMoreTimedMCQs?: boolean;
  onAdvanceTimedQuestion?: () => void;
  isAdvancing?: boolean;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
}

export const MCQPanel: React.FC<MCQPanelProps> = ({
  userId,
  examId,
  assignmentId,
  question,
  selectedOptionIds,
  onChangeSelection,
  isSaving,
  saveError,
  onQuestionExpire,
  serverTime,
  isTimedMCQ,
  hasMoreTimedMCQs,
  onAdvanceTimedQuestion,
  isAdvancing,
  onNextQuestion,
  hasNextQuestion,
}) => {
  const isMultiSelect = !!question.is_multi_select;
  const options = question.mcq_options || [];

  // Per-question timer state driven by localStorage and server question_deadline_at with serverTime skew compensation
  const timer = useQuestionTimer(userId, examId, question, onQuestionExpire, serverTime, assignmentId);
  const isLocked = !!question.is_mcq_locked || timer.hasExpired;

  const handleToggleOption = (optionId: string) => {
    if (isLocked) return;

    if (isMultiSelect) {
      if (selectedOptionIds.includes(optionId)) {
        onChangeSelection(selectedOptionIds.filter((id) => id !== optionId));
      } else {
        onChangeSelection([...selectedOptionIds, optionId]);
      }
    } else {
      // Single select
      onChangeSelection([optionId]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* Linear Top Progress Bar for this MCQ */}
      {timer.hasTimer && (
        <QuestionTimerProgressBar
          timer={timer}
          showLabel={false}
          heightClass="h-1.5"
          className="shrink-0 z-10"
        />
      )}

      {/* Top Banner: Single Clean Options Header & Status */}
      <div className="h-12 px-5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <span>Select Your Answer</span>
          {selectedOptionIds.length > 0 && (
            <span className="text-ubi-700 dark:text-ubi-400 font-semibold lowercase tracking-normal">
              ({selectedOptionIds.length} selected)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Question-level countdown timer badge matching workspace header timer */}
          {timer.hasTimer && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs shadow-xs transition-colors ${
                timer.hasExpired
                  ? 'text-slate-500 bg-slate-200 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                  : 'text-slate-800 bg-slate-100 border-slate-200 dark:text-slate-100 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <Clock size={14} className="text-slate-500 dark:text-slate-400" />
              <span>{timer.hasExpired ? 'Time Expired' : timer.formattedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lock Notice if locked or expired */}
      {isLocked && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200 shrink-0">
          <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>This question is completed and locked. Responses are sealed and cannot be reopened.</span>
        </div>
      )}

      {/* Options Selection Area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
        <div className="space-y-2.5">
          {options.map((option, index) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...

            return (
              <div
                key={option.id}
                onClick={() => handleToggleOption(option.id)}
                className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all duration-150 select-none ${
                  isLocked
                    ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                    : isSelected
                    ? 'cursor-pointer bg-ubi-50/40 dark:bg-ubi-950/20 border-ubi-500/80 dark:border-ubi-500/70 shadow-2xs'
                    : 'cursor-pointer bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-900'
                }`}
              >
                {/* Selection Control (Checkbox/Radio) FIRST, then Option Letter Badge SECOND */}
                <div className="flex items-center gap-2.5 mt-0.5 shrink-0">
                  {isMultiSelect ? (
                    isSelected ? (
                      <CheckSquare size={18} className="text-ubi-700 dark:text-ubi-400" />
                    ) : (
                      <Square size={18} className="text-slate-400 dark:text-slate-600" />
                    )
                  ) : isSelected ? (
                    <div className="w-4 h-4 rounded-full border-2 border-ubi-700 dark:border-ubi-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-ubi-700 dark:bg-ubi-400" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                  )}

                  <span
                    className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-ubi-100 text-ubi-800 dark:bg-ubi-900/60 dark:text-ubi-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {optionLetter}
                  </span>
                </div>

                {/* Option Text */}
                <div className={`flex-1 text-sm pt-0.5 leading-relaxed transition-colors ${
                  isSelected
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : 'font-medium text-slate-700 dark:text-slate-300'
                }`}>
                  <MarkdownRenderer content={option.option_text} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar: Autosave state & Help hint & Single Footer Next Question Button */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <HelpCircle size={14} />
          <span className="hidden sm:inline">Responses are autosaved instantly. You can change your selection anytime before time expires.</span>
          <span className="sm:hidden">Responses autosaved.</span>
        </div>

        <div className="flex items-center gap-3">
          {saveError ? (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle size={14} />
              <span>Failed to save answer: {saveError}</span>
            </span>
          ) : isSaving ? (
            <span className="flex items-center gap-1.5 text-ubi-700 dark:text-ubi-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-ubi-600 animate-ping" />
              <span>Saving...</span>
            </span>
          ) : selectedOptionIds.length > 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={14} />
              <span>Answer saved</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              No option selected
            </span>
          )}

          {/* Single Footer Next Question Button (Supported for both Timed and Non-Timed MCQs) */}
          {isTimedMCQ && !isLocked ? (
            onAdvanceTimedQuestion && (
              <button
                type="button"
                onClick={onAdvanceTimedQuestion}
                disabled={isAdvancing}
                className="px-4 py-2 rounded-lg font-bold text-xs bg-ubi-800 hover:bg-ubi-900 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ml-2"
              >
                <span>{hasMoreTimedMCQs ? 'Next Question →' : 'Complete Timed Section & Proceed →'}</span>
              </button>
            )
          ) : (
            hasNextQuestion && onNextQuestion && (
              <button
                type="button"
                onClick={onNextQuestion}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-bold text-xs bg-ubi-800 hover:bg-ubi-900 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ml-2"
              >
                <span>Next Question →</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
