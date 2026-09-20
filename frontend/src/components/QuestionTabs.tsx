import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StudentQuestionView } from '../types';
import { Lock, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionTabsProps {
  questions: StudentQuestionView[];
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
  lockedQuestionIds?: Set<number>;
}

export const QuestionTabs: React.FC<QuestionTabsProps> = ({
  questions,
  activeIndex,
  onSelectIndex,
  lockedQuestionIds,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [questions, checkScroll]);

  useEffect(() => {
    if (scrollRef.current) {
      const selectedBtn = scrollRef.current.children[activeIndex] as HTMLElement;
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-1.5 shrink-0 gap-1">
      {/* Scroll Left Arrow Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          title="Scroll Left"
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition shrink-0 border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
        >
          <ChevronLeft size={15} />
        </button>
      )}

      {/* Scrollable Tabs Bar */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar scroll-smooth py-0.5 px-0.5 w-full select-none"
      >
        {questions.map((q, idx) => {
          const isSelected = activeIndex === idx;
          const isMCQ = q.question_type === 'mcq';
          const isLocked = isMCQ && (Boolean(lockedQuestionIds?.has(q.id)) || Boolean(q.is_mcq_locked));
          const isSubmitted = isMCQ
            ? Boolean(q.selected_option_ids && q.selected_option_ids.length > 0)
            : Boolean(q.status && q.status !== 'unattempted');

          return (
            <button
              key={q.id}
              disabled={isLocked && !isSelected}
              onClick={() => {
                if (isLocked && !isSelected) return;
                onSelectIndex(idx);
              }}
              title={isLocked && !isSelected ? 'This question is locked' : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isLocked && !isSelected
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 text-slate-400 border border-slate-200/50 dark:border-slate-800/50'
                  : isSelected
                  ? 'bg-ubi-800 text-white shadow-sm font-bold border border-ubi-800 dark:bg-ubi-600 dark:border-ubi-600'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              {/* Question Number & Type Badge */}
              <span className="flex items-center gap-1.5">
                <span>Q{idx + 1}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300'
                  }`}
                >
                  {isMCQ ? 'MCQ' : 'Code'}
                </span>
              </span>

              {/* Status Indicator */}
              {isLocked ? (
                <Lock size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
              ) : isSubmitted ? (
                <Check
                  size={13}
                  strokeWidth={3}
                  className={isSelected ? 'text-white/90' : 'text-ubi-700 dark:text-ubi-400'}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Arrow Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          title="Scroll Right"
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition shrink-0 border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
        >
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
};
