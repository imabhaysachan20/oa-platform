import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { CodeEditor } from './CodeEditor';
import { OutputConsole } from './OutputConsole';
import { RichTextEditor } from './ui/RichTextEditor';
import { adminApi } from '../api/admin';
import { Play, CheckCircle, Terminal, FileEdit, Clock, HardDrive, ListChecks, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { RunCodeResponse, QuestionDifficulty, ParameterDef } from '../types';

export interface TestCaseItem {
  id?: number;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  weight?: number;
}

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
  functionName?: string;
  functionSignature?: string;
  parameters?: ParameterDef[];
  returnType?: string;
  starterCode?: Record<string, string>;
  driverCode?: Record<string, string>;
  testCases?: TestCaseItem[];
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
  const [formData, setFormData] = useState<QuestionFormData>(questionData);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunCodeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'testcases' | 'edit'>('console');

  // New test case drafting inside playground
  const [newTcInput, setNewTcInput] = useState('');
  const [newTcExpected, setNewTcExpected] = useState('');
  const [newTcIsHidden, setNewTcIsHidden] = useState(false);

  useEffect(() => {
    setFormData(questionData);
    if (questionData.starterCode?.[language]) {
      setCode(questionData.starterCode[language]);
    }
  }, [questionData]);

  // When language changes, if code matches previous starter or is empty, load new language starter
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (formData.starterCode?.[newLang]) {
      setCode(formData.starterCode[newLang]);
    }
  };

  const updateField = <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
  };

  const handleAddPlaygroundTestCase = () => {
    if (!newTcExpected.trim() && !newTcInput.trim()) return;
    const currentList = formData.testCases ? [...formData.testCases] : [];
    const newCase: TestCaseItem = {
      id: Date.now(),
      input: newTcInput,
      expected_output: newTcExpected,
      is_hidden: newTcIsHidden,
      weight: 1.0,
    };
    const updated = { ...formData, testCases: [...currentList, newCase] };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
    setNewTcInput('');
    setNewTcExpected('');
    setNewTcIsHidden(false);
  };

  const handleDeletePlaygroundTestCase = (idx: number) => {
    if (!formData.testCases) return;
    const updatedCases = formData.testCases.filter((_, i) => i !== idx);
    const updated = { ...formData, testCases: updatedCases };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunOutput(null);
    setActiveTab('console');

    try {
      const testCasesList: { id?: number; input: string; expected_output: string }[] = [];

      if (formData.testCases && formData.testCases.length > 0) {
        formData.testCases.forEach((tc, idx) => {
          testCasesList.push({
            id: tc.id || idx + 1,
            input: tc.input || '',
            expected_output: tc.expected_output || '',
          });
        });
      } else if (formData.sampleInput || formData.sampleOutput) {
        testCasesList.push({
          id: 1,
          input: formData.sampleInput || '',
          expected_output: formData.sampleOutput || '',
        });
      }

      const payload = {
        code,
        language,
        time_limit_ms: formData.timeLimitMs,
        memory_limit_kb: formData.memoryLimitKb,
        test_cases: testCasesList,
        title: formData.title,
        question_id: formData.id,
        function_name: formData.functionName,
        parameters: formData.parameters,
        return_type: formData.returnType,
        driver_code: formData.driverCode,
      };

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

  const testCaseCount = formData.testCases?.length || (formData.sampleInput || formData.sampleOutput ? 1 : 0);

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
              onLanguageChange={handleLanguageChange}
              allowPaste={true}
            />
          </div>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shrink-0 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <span>Running against</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{testCaseCount} test case{testCaseCount === 1 ? '' : 's'}</span>
              {formData.functionName && (
                <span className="px-1.5 py-0.5 rounded bg-ubi-50 dark:bg-ubi-950/60 text-ubi-700 dark:text-ubi-300 font-mono text-[10px] font-semibold border border-ubi-200 dark:border-ubi-800">
                  {formData.functionName}()
                </span>
              )}
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

        {/* Right Side: Tabbed Interface (Console vs Test Cases vs Edit Question) (5 columns) */}
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
                <span>Console</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('testcases')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'testcases'
                  ? 'bg-white dark:bg-slate-800 text-ubi-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListChecks size={13} />
                <span>Test Cases ({formData.testCases?.length || (formData.sampleInput ? 1 : 0)})</span>
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
                <span>Details</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Test Console */}
          {activeTab === 'console' && (
            <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
              <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shrink-0 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{formData.title || 'Untitled'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {formData.difficulty}
                  </span>
                </div>
                {formData.functionSignature ? (
                  <p className="text-[11px] text-ubi-700 dark:text-ubi-300 font-mono truncate">
                    <strong>Signature:</strong> {formData.functionSignature}
                  </p>
                ) : formData.inputFormat ? (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    <strong className="text-slate-800 dark:text-slate-200">Input:</strong> {formData.inputFormat}
                  </p>
                ) : null}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <OutputConsole output={runOutput} isRunning={isRunning} sampleInput={formData.sampleInput} sampleOutput={formData.sampleOutput} />
              </div>
            </div>
          )}

          {/* Tab 2: Test Cases Management */}
          {activeTab === 'testcases' && (
            <div className="flex-1 overflow-y-auto p-1 space-y-3 min-h-0 pr-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Add Test Case to Playground
                </h4>
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Input Data</label>
                    <textarea
                      rows={2}
                      value={newTcInput}
                      onChange={(e) => setNewTcInput(e.target.value)}
                      placeholder='e.g. [2,7,11,15]\n9'
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] font-mono focus:ring-1 focus:ring-ubi-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Expected Output</label>
                    <textarea
                      rows={1.5}
                      value={newTcExpected}
                      onChange={(e) => setNewTcExpected(e.target.value)}
                      placeholder='e.g. [0,1]'
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] font-mono focus:ring-1 focus:ring-ubi-800"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTcIsHidden}
                        onChange={(e) => setNewTcIsHidden(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-ubi-800 focus:ring-0"
                      />
                      <span>Hidden Case</span>
                    </label>
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleAddPlaygroundTestCase}
                      className="gap-1 font-semibold px-3 py-1"
                    >
                      <Plus size={13} />
                      <span>Add Case</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* List of existing test cases */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Configured Test Cases ({formData.testCases?.length || 0})
                </div>

                {formData.testCases && formData.testCases.length > 0 ? (
                  <div className="space-y-2">
                    {formData.testCases.map((tc, idx) => (
                      <div key={tc.id || idx} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start justify-between gap-2 text-xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[10px]">Case #{idx + 1}</span>
                            {tc.is_hidden ? (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 font-semibold">
                                <EyeOff size={10} /> Hidden
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-semibold">
                                <Eye size={10} /> Sample
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-0.5">
                            <div className="truncate bg-slate-50 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[8px] uppercase">Input:</span>
                              {tc.input || <span className="italic text-slate-400">Empty</span>}
                            </div>
                            <div className="truncate bg-slate-50 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[8px] uppercase">Output:</span>
                              {tc.expected_output || <span className="italic text-slate-400">Empty</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePlaygroundTestCase(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remove test case"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                    No custom test cases configured yet. Using sample input/output.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Edit Question & Format */}
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
                  placeholder="e.g. Line 1 contains array. Line 2 contains target."
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
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
