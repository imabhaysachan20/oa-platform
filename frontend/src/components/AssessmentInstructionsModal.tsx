import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Terminal, ShieldAlert, Cpu, CheckCircle2, Check } from 'lucide-react';

export interface AssessmentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    id?: number | string;
    title?: string;
    duration_minutes?: number;
    questions?: any[];
    start_time?: string;
    end_time?: string;
    [key: string]: any;
  } | null;
  onConfirm: () => Promise<void> | void;
  isStarting?: boolean;
}

export const AssessmentInstructionsModal: React.FC<AssessmentInstructionsModalProps> = ({
  isOpen,
  onClose,
  exam,
  onConfirm,
  isStarting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'questions'>('instructions');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<'help' | 'env' | 'faq' | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !infoModalTab) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, infoModalTab, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setAgreedToTerms(false);
      setActiveTab('instructions');
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  if (!isOpen || !exam) return null;

  const duration = exam.duration_minutes || 45;
  const questionsList = exam.questions || [];
  const codingQuestions = questionsList.filter((q: any) => (q.question_type || 'coding') === 'coding');
  const mcqQuestions = questionsList.filter((q: any) => q.question_type === 'mcq');

  const patternEasy = exam.easy_count ?? 1;
  const patternMed = exam.medium_count ?? 2;
  const patternHard = exam.hard_count ?? 0;
  const patternCoding = patternEasy + patternMed + patternHard;
  const patternMcq = exam.mcq_count ?? 0;

  let codingCount = 0;
  let mcqCount = 0;
  let totalCount = 0;

  if (questionsList.length > 0) {
    codingCount = codingQuestions.length;
    mcqCount = mcqQuestions.length;
    totalCount = questionsList.length;
  } else {
    codingCount = patternCoding;
    mcqCount = patternMcq;
    totalCount = codingCount + mcqCount;
  }

  // Format question summary string
  let questionSummaryText = `${totalCount} question${totalCount > 1 ? 's' : ''}`;
  if (codingCount > 0 && mcqCount > 0) {
    questionSummaryText = `${totalCount} questions (${codingCount} Coding, ${mcqCount} MCQ)`;
  } else if (codingCount > 0) {
    questionSummaryText = `${codingCount} Coding Question${codingCount > 1 ? 's' : ''}`;
  } else if (mcqCount > 0) {
    questionSummaryText = `${mcqCount} MCQ Question${mcqCount > 1 ? 's' : ''}`;
  }

  const formatExamTitle = (rawTitle?: string) => {
    if (!rawTitle) return '';
    const trimmed = rawTitle.trim();
    return trimmed
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const examTitle = formatExamTitle(exam?.title) || exam?.title || 'Assessment';

  // Language display name mapping helper
  const formatLanguageName = (langKey: string): string => {
    const key = langKey.toLowerCase().trim();
    switch (key) {
      case 'python':
      case 'python3':
      case 'py':
        return 'Python';
      case 'cpp':
      case 'c++':
      case 'cpp14':
      case 'cpp17':
      case 'cpp20':
        return 'C++';
      case 'java':
      case 'java8':
      case 'java15':
      case 'java17':
        return 'Java';
      case 'javascript':
      case 'js':
      case 'node':
        return 'JavaScript';
      case 'typescript':
      case 'ts':
        return 'TypeScript';
      case 'c':
        return 'C';
      case 'csharp':
      case 'c#':
        return 'C#';
      case 'go':
      case 'golang':
        return 'Go';
      case 'rust':
        return 'Rust';
      case 'ruby':
        return 'Ruby';
      case 'kotlin':
        return 'Kotlin';
      case 'swift':
        return 'Swift';
      case 'php':
        return 'PHP';
      case 'sql':
        return 'SQL';
      default:
        return langKey.charAt(0).toUpperCase() + langKey.slice(1);
    }
  };

  const extractAllowedLanguages = (): string[] => {
    const rawSet = new Set<string>();
    if (exam && Array.isArray((exam as any).allowed_languages) && (exam as any).allowed_languages.length > 0) {
      (exam as any).allowed_languages.forEach((l: string) => rawSet.add(formatLanguageName(l)));
    }
    codingQuestions.forEach((q: any) => {
      if (Array.isArray(q.allowed_languages) && q.allowed_languages.length > 0) {
        q.allowed_languages.forEach((l: string) => rawSet.add(formatLanguageName(l)));
      } else if (q.starter_code && typeof q.starter_code === 'object') {
        Object.keys(q.starter_code).forEach((l) => rawSet.add(formatLanguageName(l)));
      }
    });
    if (rawSet.size === 0) {
      ['Python', 'C++', 'Java', 'JavaScript'].forEach((l) => rawSet.add(l));
    }
    return Array.from(rawSet);
  };

  const allowedLanguagesList = extractAllowedLanguages();
  const allowedLanguagesText = `${allowedLanguagesList.length} language${allowedLanguagesList.length > 1 ? 's' : ''} allowed: ${allowedLanguagesList.join(', ')}`;

  const handleProceed = async () => {
    if (!agreedToTerms || isStarting) return;
    await onConfirm();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* Main Modal Card */}
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col md:flex-row min-h-[540px] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          onClick={onClose}
          disabled={isStarting}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          title="Close Modal"
        >
          <X size={20} />
        </button>

        {/* LEFT COLUMN: Brand & Exam Meta */}
        <div className="w-full md:w-[38%] bg-white dark:bg-slate-900 p-6 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="space-y-8">
            {/* Exam Welcome & Title */}
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl text-slate-700 dark:text-slate-300 font-normal leading-snug">
                Welcome to
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ubi-900 dark:text-ubi-300 tracking-tight leading-tight">
                {examTitle}
              </h1>
            </div>

            {/* Meta Information */}
            <div className="flex items-center gap-10 pt-2">
              <div>
                <p className="text-xs text-slate-400 font-medium">Test duration</p>
                <p className="text-base sm:text-lg font-normal text-slate-800 dark:text-slate-200 mt-0.5">
                  {duration} mins
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">No. of questions</p>
                <p className="text-base sm:text-lg font-normal text-slate-800 dark:text-slate-200 mt-0.5">
                  {questionSummaryText}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Left Links */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 mt-6 md:mt-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <button
                onClick={() => setInfoModalTab('help')}
                className="hover:text-[#007a3d] dark:hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-700 transition"
              >
                Platform Help
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => setInfoModalTab('env')}
                className="hover:text-[#007a3d] dark:hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-700 transition"
              >
                Execution Environment
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => setInfoModalTab('faq')}
                className="hover:text-[#007a3d] dark:hover:text-emerald-400 underline decoration-slate-300 dark:decoration-slate-700 transition"
              >
                FAQ
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Instructions / Questions Tabs & Actions */}
        <div className="w-full md:w-[62%] bg-[#f4f7f6] dark:bg-slate-950 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          {/* Main Tab Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-normal text-slate-800 dark:text-slate-100">
                Instructions
              </h2>

              <ol className="list-decimal list-outside pl-5 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                <li>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Assessment Structure & Format:
                  </span>{' '}
                  This assessment consists of <strong>{totalCount} total question{totalCount > 1 ? 's' : ''}</strong> with an allocated duration of <strong>{duration} minutes</strong>.

                  {/* Dynamic Question Details (Flat Minimalist Text - No Box Containers) */}
                  <div className="mt-2 space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {codingCount > 0 && (
                      <p>
                        • <strong>Coding Questions ({codingCount}):</strong> {allowedLanguagesText}.
                      </p>
                    )}
                    {mcqCount > 0 && (
                      <p>
                        • <strong>Multiple Choice Questions ({mcqCount}):</strong> Evaluates core algorithmic understanding, logic, and code comprehension.
                      </p>
                    )}
                  </div>
                </li>
                <li>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Mandatory Full-Screen & Proctoring:
                  </span>{' '}
                  The assessment will open in full-screen mode. Navigating away from the test tab, switching windows, or pressing system keys is monitored and flagged in real-time.
                </li>
                <li>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Assessment Timer:
                  </span>{' '}
                  The countdown timer starts as soon as you click Continue. Closing or refreshing the page will not pause the clock. Your solution will auto-submit when the timer reaches 00:00:00.
                </li>
                <li>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Run Code vs Submit Solution:
                  </span>{' '}
                  Use <strong className="text-slate-900 dark:text-white">Run Code</strong> to verify visible test cases with no score penalty. Use <strong className="text-slate-900 dark:text-white">Submit Solution</strong> to evaluate your final code against hidden test cases.
                </li>
              </ol>
            </div>
          </div>

          {/* Bottom Controls Area */}
          <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800">
            {/* Acknowledgment checkbox */}
            <div className="flex items-start gap-2.5 mb-5">
              <input
                id="hr-instructions-ack"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#007a3d] focus:ring-[#007a3d] cursor-pointer"
              />
              <label
                htmlFor="hr-instructions-ack"
                className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none leading-snug"
              >
                I have carefully read all assessment instructions & proctoring guidelines.
              </label>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3">
              {/* Primary Continue Button */}
              <button
                onClick={handleProceed}
                disabled={!agreedToTerms || isStarting}
                className="px-7 py-2.5 bg-ubi-800 hover:bg-ubi-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md shadow-ubi-900/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isStarting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Starting...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              {/* Secondary Outline Button */}
              <button
                onClick={() => setActiveTab(activeTab === 'instructions' ? 'questions' : 'instructions')}
                className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-ubi-700 text-ubi-800 dark:border-ubi-400 dark:text-ubi-400 font-semibold text-sm rounded-xl hover:bg-ubi-50/60 dark:hover:bg-slate-800 transition-all font-mono tracking-wide cursor-pointer"
              >
                {activeTab === 'instructions' ? 'Try Sample Test' : 'View Instructions'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Help / Environment / FAQ Popup */}
      {infoModalTab && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setInfoModalTab(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {infoModalTab === 'help' && <HelpCircle size={18} className="text-[#007a3d]" />}
                {infoModalTab === 'env' && <Cpu size={18} className="text-[#007a3d]" />}
                {infoModalTab === 'faq' && <Terminal size={18} className="text-[#007a3d]" />}
                <span>
                  {infoModalTab === 'help' && 'Platform Help'}
                  {infoModalTab === 'env' && 'Execution Environment'}
                  {infoModalTab === 'faq' && 'Frequently Asked Questions'}
                </span>
              </h3>
              <button
                onClick={() => setInfoModalTab(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {infoModalTab === 'help' && (
                <>
                  <p>
                    <strong>Browser Requirements:</strong> We recommend Google Chrome, Mozilla Firefox, or Microsoft Edge. Please disable browser extensions (such as ad blockers or auto-fillers) before starting.
                  </p>
                  <p>
                    <strong>Network Connectivity:</strong> If your internet connection drops momentarily, your code in the editor is saved locally. Upon reconnecting, sync will resume automatically.
                  </p>
                  <p>
                    <strong>Technical Support:</strong> If you experience persistent platform glitches, notify your invigilator or recruitment coordinator immediately.
                  </p>
                </>
              )}

              {infoModalTab === 'env' && (
                <>
                  <p>
                    <strong>Compilers & Runtimes:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Python: 3.10.x</li>
                    <li>Node.js / JavaScript / TypeScript: v18.x</li>
                    <li>C / C++: GCC 11.2 (C++17 / C++20 standard)</li>
                    <li>Java: OpenJDK 17 LTS</li>
                  </ul>
                  <p>
                    <strong>Resource Limits:</strong> Max execution time: 2.0s per test case. Memory limit: 512 MB.
                  </p>
                </>
              )}

              {infoModalTab === 'faq' && (
                <>
                  <p>
                    <strong>Q: Can I run my code multiple times?</strong>
                    <br />
                    A: Yes! You can run your code using "Run Code" as many times as you like against visible sample cases without any penalty.
                  </p>
                  <p>
                    <strong>Q: What happens when time runs out?</strong>
                    <br />
                    A: Your session auto-submits your latest code automatically when the server timer hits zero.
                  </p>
                  <p>
                    <strong>Q: Is tab switching allowed?</strong>
                    <br />
                    A: No. Leaving the assessment window or switching tabs is recorded in your session audit log.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInfoModalTab(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
