import React from 'react';
import { StudentQuestionView } from '../types';
import { MarkdownRenderer } from './ui/RichTextEditor';
import { Clock, CheckCircle2, AlertCircle, CheckSquare, Square, ShieldAlert, HelpCircle } from 'lucide-react';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { QuestionTimerProgressBar } from './QuestionTimerProgressBar';

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
}

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
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <span>Select Your Answer</span>
          {selectedOptionIds.length > 0 && (
            <span className="text-ubi-700 dark:text-ubi-400 font-semibold lowercase tracking-normal">
              ({selectedOptionIds.length} selected)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Question-level countdown timer badge */}
          {timer.hasTimer && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition shadow-2xs ${
                timer.hasExpired
                  ? 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  : timer.isExpiringSoon
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                  : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
              }`}
            >
              <Clock size={13} className={timer.isExpiringSoon ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'} />
              <span>{timer.hasExpired ? 'Time Expired' : `${timer.formattedTime} left`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lock Notice if expired */}
      {timer.hasExpired && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-5 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200 shrink-0">
          <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>This question's individual timer has expired. Your response has been locked and submitted.</span>
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
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all select-none ${
                  isLocked
                    ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                    : isSelected
                    ? 'cursor-pointer bg-ubi-50/70 dark:bg-ubi-950/40 border-ubi-600 dark:border-ubi-500 shadow-sm ring-1 ring-ubi-600 dark:ring-ubi-500'
                    : 'cursor-pointer bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {/* Indicator Icon / Letter */}
                <div className="flex items-center gap-2.5 mt-0.5 shrink-0">
                  <span
                    className={`w-6 h-6 rounded-md text-xs font-extrabold flex items-center justify-center transition ${
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

      {/* Bottom Bar: Autosave state & Help hint */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <HelpCircle size={14} />
          <span className="hidden sm:inline">Responses are autosaved instantly. You can change your selection anytime before time expires.</span>
          <span className="sm:hidden">Responses autosaved.</span>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
};
