import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  CheckSquare, 
  Copy, 
  Check, 
  Play,
  Send,
  Clock
} from 'lucide-react';
import { RunCodeResponse, SubmitCodeResponse } from '../types';
import { Button } from './ui/Button';

interface OutputConsoleProps {
  output: RunCodeResponse | null;
  submissionOutput?: SubmitCodeResponse | null;
  isRunning: boolean;
  sampleInput?: string;
  sampleOutput?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRunCode?: () => void;
  onSubmitCode?: () => void;
  isSubmitting?: boolean;
  isQuestionLocked?: boolean;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  output,
  submissionOutput,
  isRunning,
  sampleInput,
  sampleOutput,
  isExpanded = false,
  onToggleExpand,
  onRunCode,
  onSubmitCode,
  isSubmitting = false,
  isQuestionLocked = false,
}) => {
  const [mainTab, setMainTab] = useState<'testcase' | 'testresult' | 'submission'>('testcase');
  const [activeCaseTab, setActiveCaseTab] = useState<number>(0);
  const [activeSampleTab, setActiveSampleTab] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Switch to 'testresult' automatically whenever new run output arrives
  useEffect(() => {
    if (output) {
      setMainTab('testresult');
      setActiveCaseTab(0);
    }
  }, [output]);

  // Switch to 'submission' automatically whenever submission is triggered/completed
  useEffect(() => {
    if (submissionOutput || isSubmitting) {
      setMainTab('submission');
    }
  }, [submissionOutput, isSubmitting]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const selectedResult = output?.results[activeCaseTab];

  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden transition-all duration-200">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs select-none gap-2 shrink-0 min-h-[44px]">
        {/* Left Tabs: Testcase, Test Result & Submission Result */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMainTab('testcase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              mainTab === 'testcase'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700/60'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
            }`}
          >
            <CheckSquare size={14} className={mainTab === 'testcase' ? 'text-ubi-800 dark:text-emerald-400' : 'text-slate-400'} />
            <span>Testcase</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('testresult')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              mainTab === 'testresult'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700/60'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
            }`}
          >
            <Terminal size={14} className={mainTab === 'testresult' ? 'text-ubi-800 dark:text-emerald-400' : 'text-slate-400'} />
            <span>Test Result</span>
            {output && (
              <span
                className={`w-2 h-2 rounded-full ${
                  output.all_passed ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}
          </button>

          {(submissionOutput || isSubmitting || mainTab === 'submission') && (
            <button
              type="button"
              onClick={() => setMainTab('submission')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                mainTab === 'submission'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
              }`}
            >
              <Send size={14} className={mainTab === 'submission' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              <span>Submission Result</span>
              {submissionOutput && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    submissionOutput.test_cases_passed === submissionOutput.total_test_cases ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              )}
            </button>
          )}
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onRunCode && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRunCode}
              isLoading={isRunning}
              disabled={isSubmitting || isQuestionLocked}
              className="gap-1.5 font-semibold text-xs py-1 px-2.5 h-7 whitespace-nowrap shrink-0"
            >
              <Play size={13} className="text-ubi-800 dark:text-ubi-400" />
              <span>Run Code</span>
            </Button>
          )}

          {onSubmitCode && (
            <Button
              variant="primary"
              size="sm"
              onClick={onSubmitCode}
              isLoading={isSubmitting}
              disabled={isRunning || isQuestionLocked}
              className="gap-1.5 font-semibold text-xs py-1 px-2.5 h-7 whitespace-nowrap shrink-0"
            >
              <Send size={13} />
              <span>Submit Solution</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Console Content Body */}
      <div className="flex-1 overflow-auto p-4 text-xs font-sans">
        {/* RUNNING / LOADING STATE */}
        {isRunning ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-slate-500 dark:text-slate-400 font-sans">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-ubi-800 dark:border-emerald-400"></div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Running test cases...</p>
          </div>
        ) : isSubmitting && mainTab === 'submission' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-slate-500 dark:text-slate-400 font-sans">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Evaluating submission against all hidden test cases...</p>
          </div>
        ) : mainTab === 'submission' ? (
          /* SUBMISSION RESULT TAB CONTENT */
          <div>
            {!submissionOutput ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-slate-400 font-sans">
                <Send size={24} className="opacity-30 text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Click "Submit Solution" to evaluate your solution.</p>
              </div>
            ) : (() => {
              const isAccepted = submissionOutput.test_cases_passed === submissionOutput.total_test_cases;
              const statusText = submissionOutput.status || (isAccepted ? 'Accepted' : 'Wrong Answer');
              const failedCases = submissionOutput.total_test_cases - submissionOutput.test_cases_passed;

              return (
                <div className="space-y-4 font-sans py-1">
                  {/* Title & Status Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {isAccepted ? (
                        <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={24} className="text-rose-500 shrink-0" />
                      )}
                      <h3
                        className={`text-2xl font-black tracking-tight ${
                          isAccepted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {statusText}
                      </h3>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full font-bold text-xs shrink-0 ${
                        isAccepted
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                      }`}
                    >
                      {submissionOutput.test_cases_passed} / {submissionOutput.total_test_cases} Test Cases Passed
                    </span>
                  </div>

                  {/* Minimal Metric Inline Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>Runtime: <strong className="font-mono text-slate-800 dark:text-slate-200">{submissionOutput.exec_time_ms ? `${submissionOutput.exec_time_ms.toFixed(1)} ms` : 'N/A'}</strong></span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Submitted:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-medium">
                        {submissionOutput.submitted_at
                          ? new Date(submissionOutput.submitted_at).toLocaleTimeString()
                          : 'Just now'}
                      </strong>
                    </div>
                  </div>

                  {/* Clean Status Callout Banner */}
                  {isAccepted ? (
                    <div className="border-l-3 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 rounded-r-xl space-y-1">
                      <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                        All {submissionOutput.total_test_cases} test cases passed!
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Your solution met all test case requirements and performance constraints. Your submission is recorded.
                      </p>
                    </div>
                  ) : (
                    <div className="border-l-3 border-rose-500 bg-rose-500/5 dark:bg-rose-500/10 p-3.5 rounded-r-xl space-y-1">
                      <p className="font-bold text-rose-950 dark:text-rose-200 text-xs">
                        Failed on {failedCases} of {submissionOutput.total_test_cases} test case{failedCases === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Your solution did not match the expected output for all test cases. Please review potential edge cases, boundary conditions, or time limits and try again.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : mainTab === 'testcase' ? (
          /* TESTCASE TAB CONTENT */
          <div className="space-y-4 font-sans">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSampleTab(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeSampleTab === 0
                    ? 'bg-ubi-800 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <CheckSquare size={13} className="text-white" />
                <span>Case 1</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Input</div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-xs">
                {sampleInput || 'No sample input provided.'}
                {sampleInput && (
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleInput, 'sample-in')}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
                    title="Copy input"
                  >
                    {copiedId === 'sample-in' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            {sampleOutput && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expected</div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-xs">
                  {sampleOutput}
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleOutput, 'sample-out')}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
                    title="Copy expected output"
                  >
                    {copiedId === 'sample-out' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TEST RESULT TAB CONTENT */
          <div>
            {!output ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-slate-400 font-sans">
                <Terminal size={26} className="opacity-30 text-ubi-800 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">You must run your code first to view Test Results.</p>
              </div>
            ) : output.compile_error ? (
              <div className="space-y-3 font-sans">
                <div className="flex items-center gap-2">
                  <XCircle size={22} className="text-rose-500 shrink-0" />
                  <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">Compile Error</h3>
                </div>
                <div className="bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {output.compile_error}
                </div>
              </div>
            ) : selectedResult ? (
              <div className="space-y-4 font-sans">
                {/* Status Banner & Execution Time */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {selectedResult.passed ? (
                      <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={24} className="text-rose-500 shrink-0" />
                    )}
                    <h3
                      className={`text-xl sm:text-2xl font-black tracking-tight ${
                        selectedResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {selectedResult.passed ? 'Accepted' : selectedResult.status || 'Wrong Answer'}
                    </h3>
                  </div>

                  {selectedResult.time_ms !== undefined && selectedResult.time_ms !== null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Runtime: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedResult.time_ms.toFixed(1)} ms</strong>
                    </span>
                  )}
                </div>

                {/* Case Selector Pills */}
                {output.results.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {output.results.map((res, idx) => {
                      const isActive = activeCaseTab === idx;
                      return (
                        <button
                          key={res.test_case_id || idx}
                          type="button"
                          onClick={() => setActiveCaseTab(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isActive
                              ? res.passed
                                ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 shadow-xs'
                                : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/30 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          {res.passed ? (
                            <CheckSquare size={13} className="text-emerald-500" />
                          ) : (
                            <XCircle size={13} className="text-rose-500" />
                          )}
                          <span>Case {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Input Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Input</div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-xs">
                    {selectedResult.input || '(empty)'}
                    {selectedResult.input && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedResult.input, `in-${activeCaseTab}`)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
                        title="Copy input"
                      >
                        {copiedId === `in-${activeCaseTab}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Output Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Output</div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 font-mono text-xs whitespace-pre-wrap relative group shadow-xs">
                    {selectedResult.actual_output ? (
                      <span className={selectedResult.passed ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                        {selectedResult.actual_output}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic font-sans font-normal">
                        (no output generated)
                      </span>
                    )}
                    {selectedResult.actual_output && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedResult.actual_output || '', `out-${activeCaseTab}`)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
                        title="Copy output"
                      >
                        {copiedId === `out-${activeCaseTab}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expected Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expected</div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-xs">
                    {selectedResult.expected_output || '(empty)'}
                    {selectedResult.expected_output && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedResult.expected_output, `exp-${activeCaseTab}`)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
                        title="Copy expected output"
                      >
                        {copiedId === `exp-${activeCaseTab}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Compilation Output if available */}
                {selectedResult.compile_output && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Compiler Output</div>
                    <div className="bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {selectedResult.compile_output}
                    </div>
                  </div>
                )}

                {/* Stderr if available */}
                {selectedResult.stderr && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Stderr / Runtime Error</div>
                    <div className="bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {selectedResult.stderr}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
