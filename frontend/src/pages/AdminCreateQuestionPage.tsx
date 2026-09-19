import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { QuestionDifficulty, ParameterDef, QuestionType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { AdminPlaygroundModal, TestCaseItem } from '../components/AdminPlaygroundModal';
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
  CheckCircle2, 
  AlertTriangle,
  CheckSquare,
  Square,
  Radio
} from 'lucide-react';
import { InfoTooltip } from '../components/ui/InfoTooltip';

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const isValidIdentifier = (name: string): boolean => IDENTIFIER_REGEX.test(name.trim());

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

  // Question Type: 'coding' vs 'mcq'
  const [questionType, setQuestionType] = useState<QuestionType>('coding');

  // MCQ-Specific Details
  const [mcqMarks, setMcqMarks] = useState<number>(10);
  const [mcqTimeLimitSeconds, setMcqTimeLimitSeconds] = useState<string>('');
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  const [mcqOptions, setMcqOptions] = useState<{ id?: string; option_text: string; is_correct: boolean }[]>([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

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

      if (existingQuestion.question_type) {
        setQuestionType(existingQuestion.question_type);
      }

      if (existingQuestion.marks !== undefined && existingQuestion.marks !== null) {
        setMcqMarks(existingQuestion.marks);
      }
      if (existingQuestion.mcq_time_limit_seconds !== undefined && existingQuestion.mcq_time_limit_seconds !== null) {
        setMcqTimeLimitSeconds(String(existingQuestion.mcq_time_limit_seconds));
      }
      if (existingQuestion.is_multi_select !== undefined) {
        setIsMultiSelect(existingQuestion.is_multi_select);
      }

      if (existingQuestion.mcq_options && existingQuestion.mcq_options.length > 0) {
        setMcqOptions(existingQuestion.mcq_options.map(o => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: !!o.is_correct
        })));
      }

      if (existingQuestion.function_name) {
        setFunctionName(existingQuestion.function_name);
        setParameters(existingQuestion.parameters || []);
        setReturnType(existingQuestion.return_type || 'void');
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

  // MCQ Handlers
  const handleAddMcqOption = () => {
    setMcqOptions([...mcqOptions, { option_text: '', is_correct: false }]);
  };

  const handleRemoveMcqOption = (index: number) => {
    if (mcqOptions.length <= 2) {
      setValidationError('MCQ questions require at least 2 options.');
      return;
    }
    const updated = mcqOptions.filter((_, i) => i !== index);
    if (!isMultiSelect && !updated.some(o => o.is_correct)) {
      updated[0].is_correct = true;
    }
    setMcqOptions(updated);
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...mcqOptions];
    updated[index].option_text = text;
    setMcqOptions(updated);
  };

  const handleToggleOptionCorrect = (index: number) => {
    if (isMultiSelect) {
      const updated = [...mcqOptions];
      updated[index].is_correct = !updated[index].is_correct;
      setMcqOptions(updated);
    } else {
      const updated = mcqOptions.map((opt, i) => ({
        ...opt,
        is_correct: i === index,
      }));
      setMcqOptions(updated);
    }
  };

  // Add Parameter Handler
  const handleAddParameter = () => {
    setParameters([...parameters, { name: `arg${parameters.length + 1}`, type: 'int' }]);
  };

  const handleRemoveParameter = (idx: number) => {
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  const handleParameterChange = (idx: number, field: 'name' | 'type', val: string) => {
    const next = [...parameters];
    next[idx] = { ...next[idx], [field]: val };
    setParameters(next);
  };

  // Auto-Generate Starter Code Templates
  const handleGenerateStarters = async () => {
    if (!functionName.trim()) {
      setValidationError('Please enter a function name before generating templates.');
      return;
    }
    if (!isValidIdentifier(functionName)) {
      setValidationError('Invalid function name. Spaces and special characters are not allowed. Please use standard identifier format like "isAnagram" or "twoSum".');
      return;
    }
    for (const p of parameters) {
      if (!p.name.trim() || !isValidIdentifier(p.name)) {
        setValidationError(`Invalid parameter name "${p.name}". Parameter names cannot contain spaces or special characters.`);
        return;
      }
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

    if (questionType === 'mcq') {
      if (mcqOptions.length < 2) {
        setValidationError('MCQ requires at least 2 options.');
        return;
      }
      const emptyOpt = mcqOptions.some(o => !o.option_text.trim());
      if (emptyOpt) {
        setValidationError('All options must have non-empty text.');
        return;
      }
      const correctCount = mcqOptions.filter(o => o.is_correct).length;
      if (!isMultiSelect && correctCount !== 1) {
        setValidationError('Single-select MCQ must have exactly one correct option.');
        return;
      }
      if (isMultiSelect && correctCount < 1) {
        setValidationError('Multi-select MCQ must have at least one correct option.');
        return;
      }
      if (!mcqMarks || Number(mcqMarks) <= 0) {
        setValidationError('Marks must be greater than 0.');
        return;
      }

      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        question_type: 'mcq',
        marks: Number(mcqMarks),
        mcq_time_limit_seconds: mcqTimeLimitSeconds && Number(mcqTimeLimitSeconds) > 0 ? Number(mcqTimeLimitSeconds) : null,
        is_multi_select: isMultiSelect,
        options: mcqOptions.map((opt, idx) => ({
          option_text: opt.option_text.trim(),
          is_correct: !!opt.is_correct,
          order_index: idx
        })),
        test_cases: []
      };

      saveQuestionMutation.mutate(payload);
      return;
    }

    // Coding question payload (LeetCode function format)
    if (!functionName.trim()) {
      setValidationError('Please enter a function name for the function signature.');
      return;
    }
    if (!isValidIdentifier(functionName)) {
      setValidationError('Function name must be a valid programming identifier without spaces (e.g. "isAnagram", "twoSum").');
      return;
    }
    for (const p of parameters) {
      if (!p.name.trim() || !isValidIdentifier(p.name)) {
        setValidationError(`Parameter name "${p.name}" is invalid. Parameter names must not contain spaces or special characters.`);
        return;
      }
    }

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      difficulty,
      question_type: 'coding',
      time_limit_ms: timeLimitMs,
      memory_limit_kb: memoryLimitKb,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      input_format: inputFormat,
      marks: null,
      mcq_time_limit_seconds: null,
      is_multi_select: false,
      options: [],
      function_name: functionName.trim(),
      parameters: parameters,
      return_type: returnType,
      starter_code: Object.keys(starterCode).length > 0 ? starterCode : undefined,
    };

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
              Configure coding problems with test cases, or multiple-choice questions (MCQs).
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
        {/* Question Type Selector Toggle */}
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              Question Type
            </label>
            <InfoTooltip
              title="Question Type"
              content="Choose between a Coding Problem (automated code evaluation against test cases via Judge0) or Multiple Choice Question (MCQ with selectable options, instant grading, and optional timer)."
              example="Select Coding for algorithms/data structures, or MCQ for conceptual questions."
              align="left"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuestionType('coding')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center gap-3 ${
                questionType === 'coding'
                  ? 'border-ubi-800 bg-ubi-50/60 dark:bg-ubi-950/40 dark:border-ubi-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${questionType === 'coding' ? 'bg-ubi-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                <Code2 size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Coding Problem
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Algorithm code submission evaluated against test cases via Judge0.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setQuestionType('mcq')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center gap-3 ${
                questionType === 'mcq'
                  ? 'border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 dark:border-purple-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${questionType === 'mcq' ? 'bg-purple-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                <ListChecks size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Multiple Choice (MCQ)</span>
                  <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-1.5 py-0.2 rounded-full font-bold">New</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Selectable options with single/multi-select, dedicated marks, and timers.
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* ==================== MCQ FORM ==================== */}
        {questionType === 'mcq' ? (
          <Card className="p-4 sm:p-5 space-y-5">
            {/* 1. Basic Problem Details */}
            <div className="space-y-3.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">1</span>
                <span>Question Information</span>
              </h2>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Question Title *
                  </label>
                  <InfoTooltip
                    title="MCQ Question Title"
                    content="A concise headline or prompt summary for this multiple choice question displayed in exam listings and candidate navigation."
                    example="e.g. 'Binary Search Tree Worst-Case Lookup' or 'HTTP Response Status Codes'"
                    align="left"
                  />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Which of the following data structures operates on a FIFO basis?"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Question Content / Prompt *
                  </label>
                  <InfoTooltip
                    title="MCQ Question Prompt"
                    content="The full problem statement or question text shown to candidates. Supports rich text formatting, lists, code snippets, and images."
                    example="e.g. 'Which data structure follows the First-In, First-Out (FIFO) principle?'"
                    align="left"
                  />
                </div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Difficulty Level
                    </label>
                    <InfoTooltip
                      title="Difficulty Rating"
                      content="Categorizes the complexity of the question. Useful for structuring assessments and candidate reporting."
                    />
                  </div>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Marks Awarded *
                    </label>
                    <InfoTooltip
                      title="Marks Awarded"
                      content="The total score points added to the candidate's total exam score when answered correctly."
                      example="e.g. 5, 10, or 20 marks."
                    />
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={mcqMarks}
                    onChange={(e) => setMcqMarks(parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Awarded if fully correct.</span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Time Limit (seconds, optional)
                    </label>
                    <InfoTooltip
                      title="Question Timer"
                      content="Optional dedicated countdown timer just for this question. If left empty, only the overall exam timer applies."
                      example="e.g. 60 for a 1-minute quick question, or blank for untimed."
                    />
                  </div>
                  <input
                    type="number"
                    min="5"
                    value={mcqTimeLimitSeconds}
                    onChange={(e) => setMcqTimeLimitSeconds(e.target.value)}
                    placeholder="No individual timer"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank for exam-level time.</span>
                </div>
              </div>
            </div>

            {/* 2. MCQ Options Builder */}
            <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">2</span>
                    <span>Answer Options ({mcqOptions.length})</span>
                    <InfoTooltip
                      title="Answer Choices"
                      content="Provide at least 2 choices. Click the circle/checkbox on the left to designate which option(s) are correct. Single-select requires exactly 1 correct answer."
                      example="Mark option B as correct if B is the answer."
                      align="left"
                    />
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define the choices. Mark the correct answer(s) using the radio/checkbox on the left.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Multi-Select Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isMultiSelect}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsMultiSelect(checked);
                        if (!checked) {
                          // Keep only the first correct option if switching to single select
                          let foundFirst = false;
                          const updated = mcqOptions.map(opt => {
                            if (opt.is_correct && !foundFirst) {
                              foundFirst = true;
                              return opt;
                            }
                            return { ...opt, is_correct: false };
                          });
                          if (!foundFirst && updated.length > 0) {
                            updated[0].is_correct = true;
                          }
                          setMcqOptions(updated);
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Allow Multi-Select (Multiple Answers)</span>
                    <InfoTooltip
                      title="Multi-Select Answers"
                      content="Enable if this question has more than one valid answer. Candidates will use checkboxes instead of radio buttons."
                      align="right"
                    />
                  </label>

                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={handleAddMcqOption}
                    className="gap-1 font-semibold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  >
                    <Plus size={13} />
                    <span>Add Option</span>
                  </Button>
                </div>
              </div>


              {/* Options List */}
              <div className="space-y-2.5">
                {mcqOptions.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D...
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border transition flex items-center gap-3 ${
                        opt.is_correct
                          ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Correct Answer Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleOptionCorrect(idx)}
                        className="flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-purple-600 transition shrink-0"
                        title={opt.is_correct ? 'Marked as Correct' : 'Click to mark as Correct answer'}
                      >
                        {isMultiSelect ? (
                          opt.is_correct ? (
                            <CheckSquare size={20} className="text-purple-600" />
                          ) : (
                            <Square size={20} className="text-slate-400 hover:text-purple-500" />
                          )
                        ) : (
                          opt.is_correct ? (
                            <div className="w-5 h-5 rounded-full border-2 border-purple-600 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-purple-400" />
                          )
                        )}
                      </button>

                      {/* Option Letter */}
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {letter}
                      </span>

                      {/* Option Input */}
                      <input
                        type="text"
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${letter} text...`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                      />

                      {/* Correct Answer Label */}
                      {opt.is_correct && (
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full shrink-0">
                          Correct Answer
                        </span>
                      )}

                      {/* Delete Option */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMcqOption(idx)}
                        disabled={mcqOptions.length <= 2}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
                        title="Delete option"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons for MCQ */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/admin/questions"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                size="sm"
                isLoading={saveQuestionMutation.isPending}
                className="font-semibold px-6 bg-purple-700 hover:bg-purple-800 text-white"
              >
                {isEditMode ? 'Update MCQ Question' : 'Save MCQ Question'}
              </Button>
            </div>
          </Card>
        ) : (
          /* ==================== CODING QUESTION FORM ==================== */
          <Card className="p-4 sm:p-5 space-y-5">
            {/* 1. Basic Problem Information */}
            <div className="space-y-3.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">1</span>
                <span>Problem Information</span>
              </h2>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Question Title *
                  </label>
                  <InfoTooltip
                    title="Problem Title"
                    content="Descriptive title of the programming problem shown in the problem catalog and workspace header."
                    example="e.g. 'Two Sum', 'Valid Anagram', 'Reverse Linked List'"
                    align="left"
                  />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Two Sum, Valid Anagram, Reverse Linked List"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Problem Description (Markdown / Rich Text) *
                  </label>
                  <InfoTooltip
                    title="Problem Description"
                    content="Full specification of the challenge. Include task background, requirements, mathematical formulas, and constraints (e.g. 1 <= N <= 10^5)."
                    example="State clearly what the candidate needs to compute, input ranges, and edge cases."
                    align="left"
                  />
                </div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Difficulty Level
                    </label>
                    <InfoTooltip
                      title="Difficulty Rating"
                      content="Easy (weight 1.0), Medium (weight 2.0), or Hard (weight 3.0). Determines scoring weight multiplier in assessments."
                    />
                  </div>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Time Limit (ms)
                    </label>
                    <InfoTooltip
                      title="Execution Time Limit"
                      content="Maximum CPU time allowed for a single test case before terminating with Time Limit Exceeded (TLE)."
                      example="Default: 2000 ms (2.0 seconds)."
                    />
                  </div>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Memory Limit (KB)
                    </label>
                    <InfoTooltip
                      title="Execution Memory Limit"
                      content="Maximum RAM memory allocation per test run before failing with Memory Limit Exceeded (MLE)."
                      example="Default: 128000 KB (~128 MB)."
                    />
                  </div>
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

            {/* 2. LeetCode Signature Builder */}
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
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                        Function Name *
                      </label>
                      <InfoTooltip
                        title="Function Name Rule"
                        content="Function name must be a valid programming language identifier (letters, numbers, underscores). Spaces and special characters are strictly prohibited. It cannot start with a digit."
                        example="e.g. 'isAnagram' (NOT 'is anagram'), 'twoSum', 'reverseList', 'maxSubArray'"
                        align="left"
                      />
                    </div>
                    <input
                      type="text"
                      value={functionName}
                      onChange={(e) => setFunctionName(e.target.value)}
                      placeholder="e.g. isAnagram, twoSum, reverseList"
                      className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border rounded-md text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none ${
                        functionName.length > 0 && !isValidIdentifier(functionName)
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-300 dark:border-slate-800 focus:ring-1 focus:ring-ubi-800'
                      }`}
                    />
                    {functionName.length > 0 && !isValidIdentifier(functionName) && (
                      <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>
                          Invalid format. Spaces and special characters are not allowed. Use an identifier like{' '}
                          <code className="bg-rose-100 dark:bg-rose-950/70 px-1 py-0.5 rounded font-mono text-[10px]">isAnagram</code>
                          {' '}or{' '}
                          <code className="bg-rose-100 dark:bg-rose-950/70 px-1 py-0.5 rounded font-mono text-[10px]">twoSum</code>.
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                        Return Type
                      </label>
                      <InfoTooltip
                        title="Return Data Type"
                        content="The data type returned by the function. Used to generate strongly typed stubs for Python, JS, C++, and Java."
                        example="e.g. 'bool' for anagram check, 'int[]' for indices, 'int' for count/sum."
                      />
                    </div>
                    <select
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                    >
                      {COMMON_DATA_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Parameters list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                        Parameters ({parameters.length})
                      </label>
                      <InfoTooltip
                        title="Function Parameters"
                        content="Specify the arguments passed into your function. Each parameter name must be a valid identifier without spaces (e.g. 's', 't', 'nums', 'target')."
                        example="isAnagram(s: string, t: string) -> bool"
                        align="left"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddParameter}
                      className="text-[11px] font-semibold text-ubi-800 dark:text-ubi-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Parameter
                    </button>
                  </div>

                  <div className="space-y-2">
                    {parameters.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleParameterChange(idx, 'name', e.target.value)}
                          placeholder="arg name (e.g. nums)"
                          className={`w-1/3 px-3 py-1 bg-slate-50 dark:bg-slate-950 border rounded text-xs font-mono focus:outline-none ${
                            p.name.length > 0 && !isValidIdentifier(p.name)
                              ? 'border-rose-400 dark:border-rose-600 focus:ring-1 focus:ring-rose-500'
                              : 'border-slate-300 dark:border-slate-800 focus:ring-1 focus:ring-ubi-800'
                          }`}
                        />
                        <select
                          value={p.type}
                          onChange={(e) => handleParameterChange(idx, 'type', e.target.value)}
                          className="w-1/2 px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono"
                        >
                          {COMMON_DATA_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveParameter(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Remove Parameter"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            {/* 3. Sample Input & Output */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                  3
                </span>
                <span>Sample Input & Format</span>
              </h2>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Input Format Explanation
                  </label>
                  <InfoTooltip
                    title="Input Format Guidance"
                    content="Briefly describe how inputs are organized line by line so candidates understand what to expect."
                    example="e.g. 'Line 1: string s, Line 2: string t' or 'Line 1: array nums, Line 2: integer target'"
                    align="left"
                  />
                </div>
                <textarea
                  rows={2}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="e.g. Line 1: nums (array), Line 2: target (integer)"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Sample Input
                    </label>
                    <InfoTooltip
                      title="Sample Input Example"
                      content="Example input passed into test case runners. For LeetCode mode, provide one line per parameter formatted as valid JSON or primitives."
                      example={`"anagram"\n"nagaram"  OR  [2,7,11,15]\n9`}
                      align="left"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    placeholder="[2,7,11,15]&#10;9"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                      Sample Expected Output
                    </label>
                    <InfoTooltip
                      title="Sample Expected Output"
                      content="The expected return value or output for the sample input. Evaluated with exact equality against student's return value."
                      example="true  OR  [0,1]"
                      align="left"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    placeholder="[0,1]"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Test Cases Management */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                    4
                  </span>
                  <ListChecks size={14} className="text-ubi-800 dark:text-ubi-400" />
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Test Cases Management ({activeTestCases.length})
                  </h2>
                  <InfoTooltip
                    title="Test Cases Management"
                    content="Add public sample cases and secret hidden evaluation test cases. Provide parameters on newline rows."
                    align="left"
                  />
                </div>
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
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider">
                        Input Data
                      </label>
                      <InfoTooltip
                        title="Test Case Input Data"
                        content="The raw arguments fed to the candidate's function. Each parameter on its own newline."
                        example={`"rat"\n"car"`}
                        align="left"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={tcInput}
                      onChange={(e) => setTcInput(e.target.value)}
                      placeholder="[3,2,4]&#10;6"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider">
                        Expected Output
                      </label>
                      <InfoTooltip
                        title="Expected Output Data"
                        content="The exact expected return value for this test case."
                        example="false"
                        align="left"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={tcExpected}
                      onChange={(e) => setTcExpected(e.target.value)}
                      placeholder="[1,2]"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tcIsHidden}
                      onChange={(e) => setTcIsHidden(e.target.checked)}
                      className="rounded text-ubi-800 focus:ring-ubi-800"
                    />
                    <span>Hidden Test Case (Evaluated only upon submission)</span>
                    <InfoTooltip
                      title="Hidden Test Case"
                      content="Hidden test cases prevent hardcoding and test edge cases. They are not visible to students during local test runs, only evaluated upon final submission."
                      align="left"
                    />
                  </label>

                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddTestCase}
                    isLoading={addTestCaseMutation.isPending}
                    className="gap-1 font-semibold"
                  >
                    <Plus size={13} />
                    <span>Add Test Case</span>
                  </Button>
                </div>
              </div>

              {/* Test Cases List */}
              {activeTestCases.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {activeTestCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1 flex-1 pr-2">
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

            {/* Action Buttons for Coding */}
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
        )}
      </form>

      {/* Admin Playground Modal (Only for Coding mode) */}
      {isPlaygroundModalOpen && questionType === 'coding' && (
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
            functionName: functionName,
            functionSignature: existingQuestion?.function_signature,
            parameters: parameters,
            returnType: returnType,
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
