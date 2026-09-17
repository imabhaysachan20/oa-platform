import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { CodeEditor } from './CodeEditor';
import { OutputConsole } from './OutputConsole';
import { RichTextEditor } from './ui/RichTextEditor';
import { adminApi } from '../api/admin';
import { Play, CheckCircle, Terminal, FileEdit, Clock, HardDrive } from 'lucide-react';
import { RunCodeResponse, QuestionDifficulty } from '../types';

export interface QuestionFormData {
  id?: number;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  timeLimitMs: number;
  memoryLimitKb: number;
  sampleInput: string;
  sampleOutput: string;
  inputFormat?: string;
}

interface AdminPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionData: QuestionFormData;
  onChangeQuestionData?: (data: QuestionFormData) => void;
  onSaveQuestion: (data: QuestionFormData) => void;
  isSaving: boolean;
  isEditMode?: boolean;
}

export const AdminPlaygroundModal: React.FC<AdminPlaygroundModalProps> = ({
  isOpen,
  onClose,
  questionData,
  onChangeQuestionData,
  onSaveQuestion,
  isSaving,
  isEditMode = false,
}) => {
  // Local editable copy of questionData so changes reflect instantly in playground
  const [formData, setFormData] = useState<QuestionFormData>(questionData);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunCodeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'edit'>('console');

  useEffect(() => {
    setFormData(questionData);
  }, [questionData]);

  const updateField = <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunOutput(null);
    setActiveTab('console'); // Automatically switch to console to see results

    try {
      const payload = {
        code,
        language,
        time_limit_ms: formData.timeLimitMs,
        memory_limit_kb: formData.memoryLimitKb,
        test_cases: [] as { input: string; expected_output: string }[],
      };

      if (formData.sampleInput || formData.sampleOutput) {
        payload.test_cases.push({
          input: formData.sampleInput,
          expected_output: formData.sampleOutput,
        });
      }

      const res = await adminApi.runPlaygroundCode(payload);
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        question_id: formData.id || 0,
        all_passed: false,
        passed_count: 0,
        total_count: 1,
        results: [
          {
            test_case_id: 0,
            input: formData.sampleInput || '',
            expected_output: formData.sampleOutput || '',
            actual_output: '',
            stderr: err.response?.data?.detail || 'Failed to run code in playground.',
            passed: false,
            status: 'Runtime Error',
          },
        ],
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Playground: ${formData.title || 'Untitled Problem'} ${isEditMode ? '(Editing)' : ''}`}
      maxWidth="7xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[80vh] min-h-[560px] max-h-[780px] overflow-hidden">
        {/* Left Side: Code Editor (7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-full gap-2.5 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shrink-0 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Run solution against current sample input & format
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunCode}
              isLoading={isRunning}
              className="gap-1.5 font-semibold"
            >
              <Play size={14} className="text-ubi-800 dark:text-ubi-400" />
              <span>Run Code</span>
            </Button>
          </div>
        </div>

        {/* Right Side: Tabbed Interface (Console vs Edit Question Format) (5 columns) */}
        <div className="lg:col-span-5 flex flex-col h-full gap-2.5 overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('console')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'console'
                  ? 'bg-white dark:bg-slate-800 text-ubi-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Terminal size={13} />
                <span>Test Console</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-800 text-ubi-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileEdit size={13} />
                <span>Edit Question Format</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Test Console */}
          {activeTab === 'console' && (
            <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
              {/* Question Summary Banner */}
              <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shrink-0 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{formData.title || 'Untitled'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {formData.difficulty}
                  </span>
                </div>
                {formData.inputFormat && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    <strong className="text-slate-800 dark:text-slate-200">Input:</strong> {formData.inputFormat}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <OutputConsole output={runOutput} isRunning={isRunning} sampleInput={formData.sampleInput} sampleOutput={formData.sampleOutput} />
              </div>
            </div>
          )}

          {/* Tab 2: Edit Question & Format */}
          {activeTab === 'edit' && (
            <div className="flex-1 overflow-y-auto p-1 space-y-3 min-h-0 pr-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description (Rich Text / Markdown)
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => updateField('description', val)}
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Input Format
                </label>
                <textarea
                  rows={2}
                  value={formData.inputFormat || ''}
                  onChange={(e) => updateField('inputFormat', e.target.value)}
                  placeholder="e.g. First line contains N. Second line contains space-separated integers."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-sans focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Sample Input
                  </label>
                  <textarea
                    rows={2}
                    value={formData.sampleInput}
                    onChange={(e) => updateField('sampleInput', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Sample Output
                  </label>
                  <textarea
                    rows={2}
                    value={formData.sampleOutput}
                    onChange={(e) => updateField('sampleOutput', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <Clock size={11} /> Time Limit (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimitMs}
                    onChange={(e) => updateField('timeLimitMs', Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    <HardDrive size={11} /> Memory (KB)
                  </label>
                  <input
                    type="number"
                    value={formData.memoryLimitKb}
                    onChange={(e) => updateField('memoryLimitKb', Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button: Save Question */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => onSaveQuestion(formData)}
              isLoading={isSaving}
              className="gap-2 font-semibold"
            >
              <CheckCircle size={15} />
              <span>{isEditMode ? 'Update Question' : 'Save Question to Bank'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
