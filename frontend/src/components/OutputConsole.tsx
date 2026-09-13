import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Terminal, Cpu } from 'lucide-react';
import { RunCodeResponse } from '../types';

interface OutputConsoleProps {
  output: RunCodeResponse | null;
  isRunning: boolean;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({ output, isRunning }) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  if (isRunning) {
    return (
      <div className="h-56 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-sm text-slate-300 font-mono">Running code in Judge0 sandbox...</p>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="h-56 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Terminal size={24} className="opacity-40" />
        <p className="text-sm">Click "Run Code" to test against visible sample cases.</p>
      </div>
    );
  }

  const selectedResult = output.results[activeTab];

  return (
    <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {output.compile_error ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertTriangle size={15} />
              <span>Compilation / Syntax Error</span>
            </div>
          ) : output.all_passed ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={15} />
              <span>All Sample Cases Passed ({output.passed_count}/{output.total_count})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <XCircle size={15} />
              <span>Sample Cases Failed ({output.passed_count}/{output.total_count} Passed)</span>
            </div>
          )}
        </div>

        {/* Case Selector Tabs */}
        {output.results.length > 0 && !output.compile_error && (
          <div className="flex items-center gap-1">
            {output.results.map((res, idx) => (
              <button
                key={res.test_case_id || idx}
                onClick={() => setActiveTab(idx)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition flex items-center gap-1 ${
                  activeTab === idx
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Case {idx + 1}</span>
                {res.passed ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Console Content */}
      <div className="flex-1 overflow-auto p-4 text-xs font-mono">
        {output.compile_error ? (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3 text-rose-300 whitespace-pre-wrap">
            <p className="font-bold text-rose-400 mb-1">Compiler Error Output:</p>
            {output.compile_error}
          </div>
        ) : selectedResult ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                Status: <strong className={selectedResult.passed ? 'text-emerald-400' : 'text-rose-400'}>{selectedResult.status}</strong>
              </span>
              {selectedResult.time_ms !== null && selectedResult.time_ms !== undefined && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Cpu size={12} />
                  {selectedResult.time_ms.toFixed(1)} ms
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">Input:</p>
                <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 text-slate-200 whitespace-pre-wrap max-h-24 overflow-auto">
                  {selectedResult.input || '(empty)'}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">Expected Output:</p>
                <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 text-slate-200 whitespace-pre-wrap max-h-24 overflow-auto">
                  {selectedResult.expected_output || '(empty)'}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1">Your Output:</p>
              <div
                className={`rounded-lg p-2.5 border text-slate-200 whitespace-pre-wrap max-h-28 overflow-auto ${
                  selectedResult.passed
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                }`}
              >
                {selectedResult.actual_output || '(no output)'}
              </div>
            </div>

            {selectedResult.stderr && (
              <div>
                <p className="text-[11px] font-semibold text-rose-400 mb-1">Stderr:</p>
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-2 text-rose-300 whitespace-pre-wrap">
                  {selectedResult.stderr}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
