import React from 'react';
import { StudentQuestionView } from '../types';
import { MarkdownRenderer } from './ui/RichTextEditor';
import { Clock, CheckCircle2, AlertCircle, CheckSquare, Square, Radio, HelpCircle, ShieldAlert } from 'lucide-react';

interface MCQPanelProps {
  userId?: number | null;
  examId?: number | null;
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
}

import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { QuestionTimerProgressBar } from './QuestionTimerProgressBar';

export const MCQPanel: React.FC<MCQPanelProps> = ({
  userId,
  examId,
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
}) => {
  const isMultiSelect = !!question.is_multi_select;
  const options = question.mcq_options || [];

  // Per-question timer state driven by localStorage and server question_deadline_at with serverTime skew compensation
  const timer = useQuestionTimer(userId, examId, question, onQuestionExpire, serverTime);
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Linear Top Progress Bar for this MCQ */}
      {timer.hasTimer && (
        <QuestionTimerProgressBar
          timer={timer}
          showLabel={false}
          heightClass="h-1.5"
          className="shrink-0 z-10"
        />
      )}

      {/* Top Banner: Question meta, Type badge & Server Countdown */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {isMultiSelect ? 'Multiple Choice (Select all that apply)' : 'Single Choice (Select one)'}
          </span>
          {question.marks != null && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              +{question.marks} Mark{question.marks === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Question-level countdown timer badge */}
        {timer.hasTimer && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
              timer.hasExpired
                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                : timer.isExpiringSoon
                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            <Clock size={14} />
            <span>
              {timer.hasExpired ? 'Time Expired' : `Question Time Left: ${timer.formattedTime}`}
            </span>
          </div>
        )}
      </div>

      {/* Sequential Timed Section Notice Banner */}
      {isTimedMCQ && !isLocked && (
        <div className="bg-purple-50/90 dark:bg-purple-950/50 border-b border-purple-200 dark:border-purple-800 px-6 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-medium">
            <Clock size={14} className="text-purple-700 dark:text-purple-400 shrink-0" />
            <span>
              <strong>Sequential Timed Mode:</strong> Complete questions in order. Advancing or timer expiry locks this question permanently.
            </span>
          </div>
          {onAdvanceTimedQuestion && (
            <button
              type="button"
              onClick={onAdvanceTimedQuestion}
              disabled={isAdvancing}
              className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors shrink-0 shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{hasMoreTimedMCQs ? 'Next Question →' : 'Complete Timed Section →'}</span>
            </button>
          )}
        </div>
      )}

      {/* Lock Notice if locked or expired */}
      {isLocked && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200 shrink-0">
          <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>This question is completed and locked. Responses are sealed and cannot be reopened.</span>
        </div>
      )}

      {/* Scrollable Question Content & Options */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {question.title}
          </h2>
        </div>

        {/* Description */}
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <MarkdownRenderer content={question.description} />
        </div>

        {/* Options List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Select Your Answer:</span>
            {selectedOptionIds.length > 0 && (
              <span className="text-ubi-700 dark:text-ubi-400 font-semibold lowercase">
                {selectedOptionIds.length} selected
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {options.map((option, index) => {
              const isSelected = selectedOptionIds.includes(option.id);
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...

              return (
                <div
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all select-none ${
                    isLocked
                      ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                      : isSelected
                      ? 'cursor-pointer bg-ubi-50/80 dark:bg-ubi-950/40 border-ubi-400 dark:border-ubi-600 shadow-sm ring-1 ring-ubi-400 dark:ring-ubi-600'
                      : 'cursor-pointer bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {/* Indicator Icon / Letter */}
                  <div className="flex items-center gap-2.5 mt-0.5 shrink-0">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-ubi-800 text-white dark:bg-ubi-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {optionLetter}
                    </span>

                    {isMultiSelect ? (
                      isSelected ? (
                        <CheckSquare size={18} className="text-ubi-800 dark:text-ubi-400" />
                      ) : (
                        <Square size={18} className="text-slate-400 dark:text-slate-600" />
                      )
                    ) : isSelected ? (
                      <div className="w-4 h-4 rounded-full border-2 border-ubi-800 dark:border-ubi-400 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-ubi-800 dark:bg-ubi-400" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    )}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 pt-0.5 leading-relaxed">
                    <MarkdownRenderer content={option.option_text} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Autosave state & Help hint */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <HelpCircle size={14} />
          <span>Responses are autosaved instantly. You can change your selection anytime before time expires.</span>
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
              <span>Saving answer...</span>
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

          {isTimedMCQ && !isLocked && onAdvanceTimedQuestion && (
            <button
              type="button"
              onClick={onAdvanceTimedQuestion}
              disabled={isAdvancing}
              className="px-4 py-2 rounded-lg font-bold text-xs bg-ubi-800 hover:bg-ubi-900 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ml-2"
            >
              <span>{hasMoreTimedMCQs ? 'Next Question →' : 'Complete Timed Section & Proceed →'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
