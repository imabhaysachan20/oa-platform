import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { QuestionDifficulty, TestCase } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { AdminPlaygroundModal, QuestionFormData } from '../components/AdminPlaygroundModal';
import { ArrowLeft, Code2, Sparkles, Clock, HardDrive, ListChecks, Plus, Trash2, Eye, EyeOff, Pencil, AlertTriangle, X } from 'lucide-react';

export const AdminCreateQuestionPage: React.FC = () => {
  const { questionId } = useParams<{ questionId?: string }>();
  const isEditMode = !!questionId;
  const numericId = questionId ? Number(questionId) : null;

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('easy');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(128000);
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);

  // Test Case Form State (for Edit Mode)
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

    saveQuestionMutation.mutate({
      title,
      description,
      difficulty,
      time_limit_ms: timeLimitMs,
      memory_limit_kb: memoryLimitKb,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      input_format: inputFormat,
    });
  };

  const handleSaveFromPlayground = (formData: QuestionFormData) => {
    saveQuestionMutation.mutate({
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      time_limit_ms: formData.timeLimitMs,
      memory_limit_kb: formData.memoryLimitKb,
      sample_input: formData.sampleInput,
      sample_output: formData.sampleOutput,
      input_format: formData.inputFormat,
    });
  };

  const handleOpenPlayground = () => {
    setValidationError(null);
    if (!title.trim() && !description.trim()) {
      setValidationError('Please fill in both Question Title and Description before launching Playground.');
      return;
    }
    if (!title.trim()) {
      setValidationError('Please enter a Question Title before launching Playground.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please enter a Problem Description before launching Playground.');
      return;
    }
    setIsPlaygroundModalOpen(true);
  };

  const handleAddTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericId) return;
    if (!tcInput.trim() && !tcExpected.trim()) {
      setValidationError('Please provide input or expected output for the test case');
      return;
    }
    setValidationError(null);
    addTestCaseMutation.mutate({
      question_id: numericId,
      input: tcInput,
      expected_output: tcExpected,
      is_hidden: tcIsHidden,
      weight: 1.0,
    });
  };

  if (isEditMode && isFetchingQuestion) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/questions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/90 hover:bg-ubi-800 hover:text-white dark:hover:bg-ubi-600 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs transition-all mb-2 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Question Bank</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {isEditMode ? (
              <Pencil className="text-amber-600 dark:text-amber-400" size={20} />
            ) : (
              <Code2 className="text-ubi-800 dark:text-ubi-400" size={20} />
            )}
            <span>{isEditMode ? `Edit Question: ${title || 'Coding Problem'}` : 'Add New Coding Question'}</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? 'Modify coding problem statement, difficulty, runtime constraints, sample I/O format, and test cases.'
              : 'Configure coding problem statement, difficulty, runtime constraints, and sample I/O format.'}
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Validation Error UI Banner */}
        {validationError && (
          <div className="flex items-center justify-between p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-800 dark:text-rose-200 text-xs shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold">{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition"
              title="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <Card className="p-5 sm:p-6 space-y-6 divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs bg-white dark:bg-slate-900">
          {/* 1. Problem Identity & Limits */}
          <div className="space-y-3.5">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">1</span>
              <span>Problem Identity & Limits</span>
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Question Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reverse Linked List"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:border-ubi-800 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Difficulty <span className="text-rose-500">*</span>
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-1 focus:ring-ubi-800 focus:outline-none transition"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Time Limit (ms)</span>
                </label>
                <input
                  type="number"
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <HardDrive size={12} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Memory Limit (KB)</span>
                </label>
                <input
                  type="number"
                  value={memoryLimitKb}
                  onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* 2. Problem Description & Input Specifications */}
          <div className="pt-6 space-y-3.5">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">2</span>
              <span>Problem Description & Input Specifications</span>
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Description & Constraints (Rich Text) <span className="text-rose-500">*</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="State problem statement, constraints, notes... Supports bold, lists, and code blocks."
                rows={12}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                Input Format <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                placeholder="e.g. First line contains N integers representing nums. Second line contains target integer."
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div className="p-2.5 bg-ubi-50/50 dark:bg-ubi-950/20 border border-ubi-200/80 dark:border-ubi-800/50 rounded-lg space-y-0.5 text-xs">
              <h4 className="text-ubi-900 dark:text-ubi-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Sparkles size={12} /> Format Guidelines
              </h4>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 text-[11px] space-y-0.5">
                <li><strong>Strings:</strong> Provide raw strings without quotes.</li>
                <li><strong>Arrays / Lists:</strong> Use space-separated values (e.g. <code>1 2 3</code>). Avoid brackets like <code>[1, 2, 3]</code>.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Sample Input
                </label>
                <textarea
                  rows={2.5}
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  placeholder="e.g. 5\n1 2 3 4 5"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">
                  Sample Output
                </label>
                <textarea
                  rows={2.5}
                  value={sampleOutput}
                  onChange={(e) => setSampleOutput(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Test Cases Management (If Edit Mode) */}
          {isEditMode && existingQuestion && (
            <div className="pt-6 space-y-3.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">3</span>
                <ListChecks size={14} className="text-ubi-800 dark:text-ubi-400" />
                <span>Test Cases Management ({existingQuestion.test_cases?.length || 0})</span>
              </h2>

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
                      rows={1.5}
                      value={tcInput}
                      onChange={(e) => setTcInput(e.target.value)}
                      placeholder="Raw input data..."
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-[11px] font-mono focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-1">
                      Expected Output
                    </label>
                    <textarea
                      rows={1.5}
                      value={tcExpected}
                      onChange={(e) => setTcExpected(e.target.value)}
                      placeholder="Expected output..."
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

              {/* Existing Test Cases List */}
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Existing Test Cases ({existingQuestion.test_cases?.length || 0})
                </h3>
                {existingQuestion.test_cases && existingQuestion.test_cases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {existingQuestion.test_cases.map((tc: TestCase, idx: number) => (
                      <div
                        key={tc.id}
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
                          onClick={() => deleteTestCaseMutation.mutate(tc.id)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                          title="Delete Test Case"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                    No test cases added yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Action Bar inside card */}
          <div className="pt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/questions')}
            >
              Cancel
            </Button>

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
            title,
            description,
            difficulty,
            timeLimitMs,
            memoryLimitKb,
            sampleInput,
            sampleOutput,
            inputFormat,
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
          }}
          onSaveQuestion={handleSaveFromPlayground}
          isSaving={saveQuestionMutation.isPending}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
};
