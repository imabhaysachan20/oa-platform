import React from 'react';
import { Badge } from './ui/Badge';
import { StudentQuestionView } from '../types';
import { Clock, HardDrive, CheckCircle2, Code2, AlignLeft } from 'lucide-react';
import { MarkdownRenderer } from './ui/RichTextEditor';

interface QuestionPanelProps {
  questions: StudentQuestionView[];
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  questions,
  activeIndex,
  onSelectIndex,
}) => {
  const currentQ = questions[activeIndex];

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
      <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {questions.map((q, idx) => {
          const isSelected = activeIndex === idx;
          const isMCQ = q.question_type === 'mcq';
          const isSubmitted = isMCQ
            ? (q.selected_option_ids && q.selected_option_ids.length > 0)
            : (q.status && q.status !== 'unattempted');

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-ubi-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isMCQ
                      ? isSelected
                        ? 'bg-purple-700 text-purple-100'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                      : isSelected
                      ? 'bg-ubi-900 text-ubi-100'
                      : 'bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {isMCQ ? 'MCQ' : 'Code'}
                </span>
                <span>Q{idx + 1}</span>
              </span>

              {isSubmitted && (
                <CheckCircle2
                  size={14}
                  className={isSelected ? 'text-emerald-300' : 'text-emerald-500'}
                />
              )}
            </button>
          );
        })}
      </div>

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
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold">
                  {currentQ.is_multi_select ? 'Multi-Select' : 'Single-Select'}
                </span>
                {currentQ.marks != null && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                    +{currentQ.marks} Marks
                  </span>
                )}
                {currentQ.mcq_time_limit_seconds != null && (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    <Clock size={12} />
                    {currentQ.mcq_time_limit_seconds}s timer
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Badge variant={currentQ.difficulty}>{currentQ.difficulty}</Badge>
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

            {/* LeetCode Style Method Signature & Automated I/O Info */}
            <div className="bg-ubi-50/70 dark:bg-ubi-950/40 border border-ubi-200/80 dark:border-ubi-800/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-ubi-900 dark:text-ubi-200">
                <Code2 size={15} className="text-ubi-700 dark:text-ubi-400" />
                <span>LeetCode Style Function Completion</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                Complete the solution function/method. Input ingestion and test assertions are handled automatically behind the scenes.
              </p>
              {currentQ.function_signature && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Method Signature
                  </span>
                  <div className="font-mono text-xs text-ubi-950 dark:text-ubi-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-ubi-200/60 dark:border-ubi-800/50">
                    {currentQ.function_signature}
                  </div>
                </div>
              )}
            </div>

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
