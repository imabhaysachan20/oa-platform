import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title?: string;
  content: string | React.ReactNode;
  example?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  example,
  align = 'center',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const alignClasses =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowAlignClasses =
    align === 'left'
      ? 'left-3'
      : align === 'right'
      ? 'right-3'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={`relative inline-flex items-center align-middle ${className}`}
    >
      <div
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-ubi-700 hover:bg-ubi-50 dark:hover:text-ubi-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Field Guidance"
      >
        <Info size={13} className="stroke-[2.2]" />
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 bottom-full mb-2 w-64 sm:w-72 p-3 bg-white text-slate-800 border border-slate-200/90 shadow-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1.5 animate-fadeIn pointer-events-none ${alignClasses}`}
        >
          {/* Tooltip Arrow */}
          <div
            className={`absolute top-full -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white dark:border-t-slate-900 ${arrowAlignClasses}`}
          />

          {title && (
            <div className="font-bold text-ubi-700 dark:text-ubi-400 text-[11px] uppercase tracking-wider">
              {title}
            </div>
          )}

          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {content}
          </div>

          {example && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono break-all">
              <span className="text-slate-400 font-sans font-semibold">Example: </span>
              <span className="text-ubi-600 dark:text-amber-400 font-semibold">{example}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
