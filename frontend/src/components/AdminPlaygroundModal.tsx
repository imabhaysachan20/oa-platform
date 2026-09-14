import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { CodeEditor } from './CodeEditor';
import { OutputConsole } from './OutputConsole';
import { adminApi } from '../api/admin';
import { Play, CheckCircle } from 'lucide-react';
import { RunCodeResponse } from '../types';

interface AdminPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionData: {
    title: string;
    description: string;
    timeLimitMs: number;
    memoryLimitKb: number;
    sampleInput: string;
    sampleOutput: string;
  };
  onSaveQuestion: () => void;
  isSaving: boolean;
}

export const AdminPlaygroundModal: React.FC<AdminPlaygroundModalProps> = ({
  isOpen,
  onClose,
  questionData,
  onSaveQuestion,
  isSaving,
}) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunCodeResponse | null>(null);

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunOutput(null);

    try {
      const payload = {
        code,
        language,
        time_limit_ms: questionData.timeLimitMs,
        memory_limit_kb: questionData.memoryLimitKb,
        test_cases: [] as { input: string; expected_output: string }[],
      };

      if (questionData.sampleInput || questionData.sampleOutput) {
        payload.test_cases.push({
          input: questionData.sampleInput,
          expected_output: questionData.sampleOutput,
        });
      }

      const res = await adminApi.runPlaygroundCode(payload);
      setRunOutput(res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Playground: ${questionData.title || 'Untitled'}`} maxWidth="5xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px] overflow-hidden">
        {/* Left Side: Code Editor */}
        <div className="flex flex-col h-full gap-3 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shrink-0">
            <div className="text-xs text-slate-400">
              Test your solution against the sample input/output
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunCode}
              isLoading={isRunning}
              className="gap-1.5"
            >
              <Play size={14} className="text-indigo-400" />
              <span>Run Code</span>
            </Button>
          </div>
        </div>

        {/* Right Side: Output & Question Info */}
        <div className="flex flex-col h-full gap-3 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-[150px] shrink-0 text-sm">
            <h3 className="font-bold text-white mb-2">Description</h3>
            <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{questionData.description || 'No description provided.'}</p>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <OutputConsole output={runOutput} isRunning={isRunning} />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800 shrink-0">
            <Button
              variant="success"
              onClick={onSaveQuestion}
              isLoading={isSaving}
              className="gap-2"
            >
              <CheckCircle size={16} />
              <span>Save Question to Bank</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
