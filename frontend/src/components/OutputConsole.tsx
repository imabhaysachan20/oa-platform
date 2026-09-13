import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  Cpu, 
  SquareCode, 
  CheckSquare, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import { RunCodeResponse } from '../types';

interface OutputConsoleProps {
  output: RunCodeResponse | null;
  isRunning: boolean;
  sampleInput?: string;
  sampleOutput?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  output,
  isRunning,
  sampleInput,
  sampleOutput,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [mainTab, setMainTab] = useState<'testcase' | 'testresult'>('testcase');
  const [activeCaseTab, setActiveCaseTab] = useState<number>(0);
  const [activeSampleTab, setActiveSampleTab] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Switch to 'testresult' automatically whenever new execution output arrives
  useEffect(() => {
    if (output) {
      setMainTab('testresult');
      setActiveCaseTab(0);
    }
  }, [output]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const selectedResult = output?.results[activeCaseTab];

  return (
    <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl transition-all duration-200">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs select-none">
        {/* Left Tabs: Testcase & Test Result */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMainTab('testcase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainTab === 'testcase'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <CheckSquare size={14} className={mainTab === 'testcase' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Testcase</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('testresult')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainTab === 'testresult'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Terminal size={14} className={mainTab === 'testresult' ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Test Result</span>
            {output && (
              <span
                className={`w-2 h-2 rounded-full ${
                  output.all_passed ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-rose-400'
                }`}
              />
            )}
          </button>
        </div>

        {/* Right Header Action Icons */}
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
            title={isExpanded ? 'Collapse Console' : 'Expand Console'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </div>

      {/* Main Console Content Body */}
      <div className="flex-1 overflow-auto p-4 text-xs font-mono">
        {/* RUNNING / LOADING STATE */}
        {isRunning ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-slate-400">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-400"></div>
            <p className="text-xs font-medium text-slate-300">Running solution against Judge0 sandbox...</p>
          </div>
        ) : mainTab === 'testcase' ? (
          /* TESTCASE TAB CONTENT */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSampleTab(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeSampleTab === 0
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <CheckSquare size={13} className="text-emerald-400" />
                <span>Case 1</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Input</div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-inner">
                {sampleInput || 'No sample input provided.'}
                {sampleInput && (
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleInput, 'sample-in')}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                    title="Copy input"
                  >
                    {copiedId === 'sample-in' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            {sampleOutput && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Expected</div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-inner">
                  {sampleOutput}
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleOutput, 'sample-out')}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                    title="Copy expected output"
                  >
                    {copiedId === 'sample-out' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TEST RESULT TAB CONTENT */
          <div>
            {!output ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
                <Terminal size={26} className="opacity-30 text-indigo-400" />
                <p className="text-xs">You must run your code first to view Test Results.</p>
              </div>
            ) : output.compile_error ? (
              <div className="space-y-3">
                <div className="text-xl font-bold text-rose-400 tracking-tight">Compile Error</div>
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3.5 text-rose-300 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {output.compile_error}
                </div>
              </div>
            ) : selectedResult ? (
              <div className="space-y-4">
                {/* LeetCode Header: Status Banner & Execution Time */}
                <div className="flex items-baseline gap-3">
                  <h3
                    className={`text-2xl font-extrabold tracking-tight ${
                      selectedResult.passed ? 'text-emerald-400' : 'text-rose-500'
                    }`}
                  >
                    {selectedResult.passed ? 'Accepted' : selectedResult.status || 'Wrong Answer'}
                  </h3>

                  {selectedResult.time_ms !== undefined && selectedResult.time_ms !== null && (
                    <span className="text-xs text-slate-400 font-medium">
                      Runtime: <span className="font-mono text-slate-200">{selectedResult.time_ms.toFixed(1)} ms</span>
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isActive
                              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                              : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {res.passed ? (
                            <CheckSquare size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle size={13} className="text-rose-400 shrink-0" />
                          )}
                          <span>Case {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Input Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 tracking-wider">Input</div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-inner">
                    {selectedResult.input || '(empty)'}
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedResult.input, `in-${activeCaseTab}`)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                      title="Copy input"
                    >
                      {copiedId === `in-${activeCaseTab}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Output Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 tracking-wider">Output</div>
                  <div
                    className={`border rounded-xl p-3 font-mono text-xs whitespace-pre-wrap relative group shadow-inner ${
                      selectedResult.passed
                        ? 'bg-slate-950 border-slate-800/80 text-slate-100'
                        : 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                    }`}
                  >
                    {selectedResult.actual_output || '(no output)'}
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedResult.actual_output || '', `out-${activeCaseTab}`)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                      title="Copy output"
                    >
                      {copiedId === `out-${activeCaseTab}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Expected Card */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 tracking-wider">Expected</div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-100 font-mono text-xs whitespace-pre-wrap relative group shadow-inner">
                    {selectedResult.expected_output || '(empty)'}
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedResult.expected_output, `exp-${activeCaseTab}`)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                      title="Copy expected output"
                    >
                      {copiedId === `exp-${activeCaseTab}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Stderr if available */}
                {selectedResult.stderr && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-rose-400 tracking-wider">Stderr</div>
                    <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 text-rose-300 font-mono text-xs whitespace-pre-wrap">
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
