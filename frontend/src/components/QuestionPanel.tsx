import React from 'react';
import { Badge } from './ui/Badge';
import { StudentQuestionView } from '../types';
import { Clock, HardDrive, CheckCircle } from 'lucide-react';

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
      <div className="h-full bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center text-slate-400">
        No questions assigned.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Question Selection Tabs */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-950/80 border-b border-slate-800 overflow-x-auto">
        {questions.map((q, idx) => {
          const isSelected = activeIndex === idx;
          const isSubmitted = q.status && q.status !== 'unattempted';

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Question {idx + 1}</span>
              <Badge
                variant={q.difficulty}
                className={`text-[10px] px-1.5 py-0 ${isSelected ? 'bg-indigo-700/50 text-indigo-100 border-indigo-400/40' : ''}`}
              >
                {q.difficulty}
              </Badge>
              {isSubmitted && (
                <CheckCircle size={13} className={isSelected ? 'text-white' : 'text-emerald-400'} />
              )}
            </button>
          );
        })}
      </div>

      {/* Question Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Title & Meta */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={currentQ.difficulty}>{currentQ.difficulty}</Badge>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {currentQ.time_limit_ms}ms limit
              </span>
              <span className="flex items-center gap-1">
                <HardDrive size={13} />
                {Math.round(currentQ.memory_limit_kb / 1024)}MB memory
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100">{currentQ.title}</h2>
        </div>

        {/* Description */}
        <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/80 pt-4">
          {currentQ.description}
        </div>

        {/* Sample Input / Output */}
        {(currentQ.sample_input || currentQ.sample_output) && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sample Test Case
            </h3>
            {currentQ.sample_input && (
              <div>
                <span className="text-[11px] font-medium text-slate-400 mb-1 block">Input</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                  {currentQ.sample_input}
                </div>
              </div>
            )}
            {currentQ.sample_output && (
              <div>
                <span className="text-[11px] font-medium text-slate-400 mb-1 block">Output</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                  {currentQ.sample_output}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
