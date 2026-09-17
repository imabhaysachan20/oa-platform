import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { QuestionDifficulty, TestCase, ParameterDef } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { AdminPlaygroundModal, QuestionFormData, TestCaseItem } from '../components/AdminPlaygroundModal';
import { 
  ArrowLeft, 
  Code2, 
  Sparkles, 
  Clock, 
  HardDrive, 
  ListChecks, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Layers, 
  FileCode2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

const COMMON_DATA_TYPES = [
  { value: 'int', label: 'int (Integer)' },
  { value: 'float', label: 'float (Decimal Number)' },
  { value: 'string', label: 'string (Text)' },
  { value: 'bool', label: 'bool (Boolean true/false)' },
  { value: 'int[]', label: 'int[] (1D Array of Integers)' },
  { value: 'float[]', label: 'float[] (1D Array of Floats)' },
  { value: 'string[]', label: 'string[] (1D Array of Strings)' },
  { value: 'int[][]', label: 'int[][] (2D Matrix of Integers)' },
  { value: 'string[][]', label: 'string[][] (2D Matrix of Strings)' },
  { value: 'ListNode', label: 'ListNode (Singly-Linked List)' },
  { value: 'TreeNode', label: 'TreeNode (Binary Tree)' },
  { value: 'void', label: 'void (In-place Mutation)' },
];

export const AdminCreateQuestionPage: React.FC = () => {
  const { questionId } = useParams<{ questionId?: string }>();
  const isEditMode = !!questionId;
  const numericId = questionId ? Number(questionId) : null;

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Mode: LeetCode style function vs Standard CP program
  const [questionMode, setQuestionMode] = useState<'leetcode' | 'standard'>('leetcode');

  // Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('easy');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(128000);
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');

  // LeetCode Signature Fields
  const [functionName, setFunctionName] = useState('');
  const [returnType, setReturnType] = useState('int[]');
  const [parameters, setParameters] = useState<ParameterDef[]>([
    { name: 'nums', type: 'int[]' },
    { name: 'target', type: 'int' },
  ]);
  const [starterCode, setStarterCode] = useState<Record<string, string>>({});
  const [activeLangTab, setActiveLangTab] = useState<'python' | 'javascript' | 'cpp' | 'java'>('python');
  const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);

  // Playground Modal State
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);

  // Test Case Management (Supports both Create and Edit mode)
  const [localTestCases, setLocalTestCases] = useState<TestCaseItem[]>([]);
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);

  // Validation Error state for clean inline UI warnings
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch Existing Question if Edit Mode
  const { data: existingQuestion, isLoading: isFetchingQuestion } = useQuery({
    queryKey: ['adminQuestion', numericId],
    queryFn: () => adminApi.getQuestion(numericId!),
    enabled: isEditMode && !!numericId,
  });

  useEffect(() => {
    if (existingQuestion) {
      setTitle(existingQuestion.title || '');
      setDescription(existingQuestion.description || '');
      setInputFormat(existingQuestion.input_format || '');
      setDifficulty(existingQuestion.difficulty || 'easy');
      setTimeLimitMs(existingQuestion.time_limit_ms || 2000);
      setMemoryLimitKb(existingQuestion.memory_limit_kb || 128000);
      setSampleInput(existingQuestion.sample_input || '');
      setSampleOutput(existingQuestion.sample_output || '');

      if (existingQuestion.function_name) {
        setQuestionMode('leetcode');
        setFunctionName(existingQuestion.function_name);
        setParameters(existingQuestion.parameters || []);
        setReturnType(existingQuestion.return_type || 'void');
      } else {
        setQuestionMode('standard');
      }

      if (existingQuestion.starter_code) {
        setStarterCode(existingQuestion.starter_code);
      }

      if (existingQuestion.test_cases && existingQuestion.test_cases.length > 0) {
        setLocalTestCases(existingQuestion.test_cases);
      }
    }
  }, [existingQuestion]);

  // Save Mutation (Create or Update)
  const saveQuestionMutation = useMutation({
    mutationFn: (data: any) =>
      isEditMode && numericId
        ? adminApi.updateQuestion(numericId, data)
        : adminApi.createQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      if (numericId) {
        queryClient.invalidateQueries({ queryKey: ['adminQuestion', numericId] });
      }
      navigate('/admin/questions');
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.detail || 'Failed to save question');
    },
  });

  // Test Case Mutations (for Edit Mode)
  const addTestCaseMutation = useMutation({
    mutationFn: (data: { question_id: number; input: string; expected_output: string; is_hidden: boolean; weight: number }) =>
      adminApi.addTestCase(data.question_id, {
        input: data.input,
        expected_output: data.expected_output,
        is_hidden: data.is_hidden,
        weight: data.weight,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestion', numericId] });
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      setTcInput('');
      setTcExpected('');
      setTcIsHidden(false);
      setValidationError(null);
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.detail || 'Failed to add test case');
    },
  });

  const deleteTestCaseMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTestCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestion', numericId] });
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.detail || 'Failed to delete test case');
    },
  });

  // Add Parameter Handler
  const handleAddParameter = () => {
    setParameters([...parameters, { name: `arg${parameters.length + 1}`, type: 'int' }]);
  };

  const handleRemoveParameter = (idx: number) => {
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  const handleParameterChange = (idx: number, field: 'name' | 'type', value: string) => {
    const updated = [...parameters];
    updated[idx] = { ...updated[idx], [field]: value };
    setParameters(updated);
  };

  // Generate Templates Handler
  const handleGenerateStarters = async () => {
    if (!functionName.trim()) {
      setValidationError('Please enter a function name before generating templates.');
      return;
    }
    setValidationError(null);
    setIsGeneratingStarters(true);
    try {
      const res = await adminApi.generateTemplates({
        function_name: functionName.trim(),
        parameters,
        return_type: returnType,
      });
      setStarterCode(res.starter);
    } catch (err: any) {
      setValidationError(err.response?.data?.detail || 'Failed to generate templates.');
    } finally {
      setIsGeneratingStarters(false);
    }
  };

  // Add Test Case Handler
  const handleAddTestCase = () => {
    if (!tcInput.trim() && !tcExpected.trim()) {
      setValidationError('Please enter at least an input or expected output for the test case.');
      return;
    }
    setValidationError(null);

    if (isEditMode && numericId) {
      addTestCaseMutation.mutate({
        question_id: numericId,
        input: tcInput,
        expected_output: tcExpected,
        is_hidden: tcIsHidden,
        weight: 1.0,
      });
    } else {
      // Local state for Create mode
      const newCase: TestCaseItem = {
        id: Date.now(),
        input: tcInput,
        expected_output: tcExpected,
        is_hidden: tcIsHidden,
        weight: 1.0,
      };
      setLocalTestCases([...localTestCases, newCase]);
      setTcInput('');
      setTcExpected('');
      setTcIsHidden(false);
    }
  };

  const handleDeleteTestCase = (tc: TestCaseItem, idx: number) => {
    if (isEditMode && tc.id && numericId) {
      deleteTestCaseMutation.mutate(tc.id);
    } else {
      setLocalTestCases(localTestCases.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!title.trim()) {
      setValidationError('Please enter a Question Title.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please enter a Problem Description.');
      return;
    }
    if (questionMode === 'leetcode' && !functionName.trim()) {
      setValidationError('Please enter a function name for the LeetCode signature.');
      return;
    }

    const payload: any = {
      title,
      description,
      difficulty,
      time_limit_ms: timeLimitMs,
      memory_limit_kb: memoryLimitKb,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      input_format: inputFormat,
    };

    if (questionMode === 'leetcode') {
      payload.function_name = functionName.trim();
      payload.parameters = parameters;
      payload.return_type = returnType;
      payload.starter_code = Object.keys(starterCode).length > 0 ? starterCode : undefined;
    } else {
      payload.function_name = null;
      payload.parameters = null;
      payload.return_type = null;
      payload.starter_code = null;
    }

    if (!isEditMode && localTestCases.length > 0) {
      payload.test_cases = localTestCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden || false,
        weight: tc.weight || 1.0,
      }));
    }

    saveQuestionMutation.mutate(payload);
  };

  const handleOpenPlayground = () => {
    if (!title.trim()) {
      setValidationError('Please enter a Question Title before launching Playground.');
      return;
    }
    setValidationError(null);
    setIsPlaygroundModalOpen(true);
  };

  const activeTestCases = isEditMode && existingQuestion?.test_cases 
    ? existingQuestion.test_cases 
    : localTestCases;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/questions"
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isEditMode ? 'Edit Question' : 'Create Question'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure question details, LeetCode signature, and test cases.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-500 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button type="button" onClick={() => setValidationError(null)} className="text-rose-400 hover:text-rose-600">
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 sm:p-5 space-y-5">
          {/* Question Mode Toggle */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              Execution Architecture
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setQuestionMode('leetcode')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  questionMode === 'leetcode'
                    ? 'border-ubi-800 bg-ubi-50/60 dark:bg-ubi-950/40 dark:border-ubi-700 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${questionMode === 'leetcode' ? 'bg-ubi-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>LeetCode Style (Function)</span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-bold">Recommended</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    Candidate completes a typed function. System automatically injects test harnesses for all 4 languages.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setQuestionMode('standard')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  questionMode === 'standard'
                    ? 'border-ubi-800 bg-ubi-50/60 dark:bg-ubi-950/40 dark:border-ubi-700 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${questionMode === 'standard' ? 'bg-ubi-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                  <Code2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Standard Program (stdin/stdout)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    Classic competitive programming. Candidate writes full standalone program reading stdin and printing to stdout.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Basic Problem Information */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">1</span>
              <span>Problem Information</span>
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Question Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum, Valid Anagram, Reverse Linked List"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Problem Description (Markdown / Rich Text) *
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                >
                  <option value="easy">Easy (Weight 1.0)</option>
                  <option value="medium">Medium (Weight 2.0)</option>
                  <option value="hard">Hard (Weight 3.0)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Time Limit (ms)
                </label>
                <input
                  type="number"
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                  step={500}
                  min={500}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Memory Limit (KB)
                </label>
                <input
                  type="number"
                  value={memoryLimitKb}
                  onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
                  step={16000}
                  min={16000}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. LeetCode Signature Builder (Shown only in LeetCode mode) */}
          {questionMode === 'leetcode' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">2</span>
                  <Layers size={14} className="text-ubi-800 dark:text-ubi-400" />
                  <span>LeetCode Function Signature</span>
                </h2>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={handleGenerateStarters}
                  isLoading={isGeneratingStarters}
                  className="gap-1 text-[11px] font-semibold"
                >
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Auto-Generate Templates</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                    Function Name *
                  </label>
                  <input
                    type="text"
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    placeholder="e.g. twoSum, isPalindrome, reverseList"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                    Return Type
                  </label>
                  <select
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  >
                    {COMMON_DATA_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parameters List */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Input Parameters ({parameters.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddParameter}
                    className="text-[11px] font-semibold text-ubi-700 dark:text-ubi-400 hover:text-ubi-900 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add Parameter</span>
                  </button>
                </div>

                {parameters.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-4">#{idx + 1}</span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleParameterChange(idx, 'name', e.target.value)}
                      placeholder="Param name (e.g. nums)"
                      className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:ring-1 focus:ring-ubi-800"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => handleParameterChange(idx, 'type', e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono focus:ring-1 focus:ring-ubi-800"
                    >
                      {COMMON_DATA_TYPES.filter(t => t.value !== 'void').map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveParameter(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove parameter"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Starter Templates Preview Tabs */}
              {Object.keys(starterCode).length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <FileCode2 size={13} />
                      <span>Starter Code Templates (Auto-Generated)</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold lowercase">
                      <CheckCircle2 size={11} /> 4 languages ready
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    {(['python', 'javascript', 'cpp', 'java'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLangTab(lang)}
                        className={`px-3 py-1 rounded text-xs font-mono font-bold capitalize transition ${
                          activeLangTab === lang
                            ? 'bg-white dark:bg-slate-800 text-ubi-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {lang === 'cpp' ? 'C++' : lang}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={6}
                    value={starterCode[activeLangTab] || ''}
                    onChange={(e) => setStarterCode({ ...starterCode, [activeLangTab]: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 text-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-ubi-800"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Sample Input & Output */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                {questionMode === 'leetcode' ? '3' : '2'}
              </span>
              <span>Sample Input & Format</span>
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Input Format Explanation
              </label>
              <textarea
                rows={2}
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                placeholder={questionMode === 'leetcode' ? 'e.g. Line 1: nums (array), Line 2: target (integer)' : 'e.g. First line contains N. Second line contains space-separated integers.'}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] focus:ring-1 focus:ring-ubi-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Sample Input
                </label>
                <textarea
                  rows={3}
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  placeholder={questionMode === 'leetcode' ? '[2,7,11,15]\n9' : '5\n1 2 3 4 5'}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Sample Expected Output
                </label>
                <textarea
                  rows={3}
                  value={sampleOutput}
                  onChange={(e) => setSampleOutput(e.target.value)}
                  placeholder={questionMode === 'leetcode' ? '[0,1]' : '15'}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Test Cases Management (ALWAYS visible for both Create and Edit) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                  {questionMode === 'leetcode' ? '4' : '3'}
                </span>
                <ListChecks size={14} className="text-ubi-800 dark:text-ubi-400" />
                <span>Test Cases Management ({activeTestCases.length})</span>
              </h2>
              <span className="text-[10px] text-slate-500 font-medium">
                Add evaluation and hidden cases right here
              </span>
            </div>

            {/* Add New Test Case Form */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Add New Test Case
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-1">
                    Input Data
                  </label>
                  <textarea
                    rows={2}
                    value={tcInput}
                    onChange={(e) => setTcInput(e.target.value)}
                    placeholder={questionMode === 'leetcode' ? '[3,2,4]\n6' : '10\n1 2 3...'}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-1">
                    Expected Output
                  </label>
                  <textarea
                    rows={2}
                    value={tcExpected}
                    onChange={(e) => setTcExpected(e.target.value)}
                    placeholder={questionMode === 'leetcode' ? '[1,2]' : '55'}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={tcIsHidden}
                    onChange={(e) => setTcIsHidden(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-ubi-800 focus:ring-0"
                  />
                  <span>Hidden Case (Used for evaluation only)</span>
                </label>
                <Button
                  type="button"
                  size="xs"
                  onClick={handleAddTestCase}
                  isLoading={addTestCaseMutation.isPending}
                  className="gap-1 font-semibold px-3 py-1"
                >
                  <Plus size={13} />
                  <span>Add Case</span>
                </Button>
              </div>
            </div>

            {/* Test Cases List */}
            <div className="space-y-1.5">
              {activeTestCases && activeTestCases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {activeTestCases.map((tc: TestCaseItem, idx: number) => (
                    <div
                      key={tc.id || idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start justify-between gap-2.5 text-xs"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-300 font-mono text-[10px]">Case #{idx + 1}</span>
                          {tc.is_hidden ? (
                            <span className="flex items-center gap-1 text-[9px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 font-semibold">
                              <EyeOff size={10} /> Hidden
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-semibold">
                              <Eye size={10} /> Sample
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono text-[10px]">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Input:</span>
                            <div className="p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 truncate">
                              {tc.input || <span className="italic text-slate-400">Empty</span>}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Expected:</span>
                            <div className="p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 truncate">
                              {tc.expected_output || <span className="italic text-slate-400">Empty</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTestCase(tc, idx)}
                        disabled={deleteTestCaseMutation.isPending}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition"
                        title="Delete test case"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                  No additional test cases added yet. Add sample and hidden evaluation test cases above.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/admin/questions"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </Link>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenPlayground}
              >
                Test in Playground
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={saveQuestionMutation.isPending}
                className="font-semibold px-5"
              >
                {isEditMode ? 'Update Question' : 'Save Question'}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {/* Admin Playground Modal */}
      {isPlaygroundModalOpen && (
        <AdminPlaygroundModal
          isOpen={isPlaygroundModalOpen}
          onClose={() => setIsPlaygroundModalOpen(false)}
          questionData={{
            id: numericId || undefined,
            title,
            description,
            difficulty,
            timeLimitMs,
            memoryLimitKb,
            sampleInput,
            sampleOutput,
            inputFormat,
            functionName: questionMode === 'leetcode' ? functionName : undefined,
            functionSignature: questionMode === 'leetcode' ? existingQuestion?.function_signature : undefined,
            parameters: questionMode === 'leetcode' ? parameters : undefined,
            returnType: questionMode === 'leetcode' ? returnType : undefined,
            starterCode,
            testCases: activeTestCases,
          }}
          onChangeQuestionData={(updated) => {
            setTitle(updated.title);
            setDescription(updated.description);
            setDifficulty(updated.difficulty);
            setTimeLimitMs(updated.timeLimitMs);
            setMemoryLimitKb(updated.memoryLimitKb);
            setSampleInput(updated.sampleInput);
            setSampleOutput(updated.sampleOutput);
            setInputFormat(updated.inputFormat || '');
            if (updated.testCases) {
              setLocalTestCases(updated.testCases);
            }
          }}
          onSaveQuestion={() => {}}
          isSaving={saveQuestionMutation.isPending}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
};
