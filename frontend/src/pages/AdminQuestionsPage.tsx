import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Question, QuestionDifficulty } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, Trash2, ListChecks, Eye, EyeOff } from 'lucide-react';

export const AdminQuestionsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState<Question | null>(null);

  // Question Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('easy');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(128000);
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');

  // Test Case Form State
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcWeight, setTcWeight] = useState(1.0);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: adminApi.listQuestions,
  });

  const createQuestionMutation = useMutation({
    mutationFn: adminApi.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      setIsCreateModalOpen(false);
      resetQuestionForm();
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: adminApi.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
    },
  });

  const addTestCaseMutation = useMutation({
    mutationFn: ({ qId, testCase }: { qId: number; testCase: any }) =>
      adminApi.addTestCase(qId, testCase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      setTcInput('');
      setTcExpected('');
      setTcIsHidden(false);
    },
  });

  const deleteTestCaseMutation = useMutation({
    mutationFn: adminApi.deleteTestCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
    },
  });

  const resetQuestionForm = () => {
    setTitle('');
    setDescription('');
    setDifficulty('easy');
    setTimeLimitMs(2000);
    setMemoryLimitKb(128000);
    setSampleInput('');
    setSampleOutput('');
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestionMutation.mutate({
      title,
      description,
      difficulty,
      time_limit_ms: timeLimitMs,
      memory_limit_kb: memoryLimitKb,
      sample_input: sampleInput,
      sample_output: sampleOutput,
    });
  };

  const handleAddTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionForTestCases) return;
    addTestCaseMutation.mutate({
      qId: selectedQuestionForTestCases.id,
      testCase: {
        input: tcInput,
        expected_output: tcExpected,
        is_hidden: tcIsHidden,
        weight: tcWeight,
      },
    });
  };

  // Keep selected question test cases in sync with fetched query data
  const currentActiveQuestion = questions?.find(
    (q) => q.id === selectedQuestionForTestCases?.id
  ) || selectedQuestionForTestCases;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Question Bank Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure coding problems, descriptions, limits, and sample/hidden test cases.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 self-start font-semibold">
          <Plus size={16} />
          <span>Add New Question</span>
        </Button>
      </div>

      {/* Questions Grid */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {questions.map((q) => (
            <Card key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <Badge variant={q.difficulty}>{q.difficulty}</Badge>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{q.title}</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{q.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span className="font-semibold">{q.test_cases?.length || 0} Test Cases</span>
                  <span>•</span>
                  <span>{q.time_limit_ms}ms</span>
                  <span>•</span>
                  <span>{Math.round(q.memory_limit_kb / 1024)}MB</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestionForTestCases(q)}
                  className="gap-1.5 font-semibold"
                >
                  <ListChecks size={14} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Test Cases ({q.test_cases?.length || 0})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Delete question "${q.title}"?`)) {
                      deleteQuestionMutation.mutate(q.id);
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-500 dark:text-slate-400">
          No questions in the question bank. Click "Add New Question" to create one.
        </Card>
      )}

      {/* Create Question Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Coding Question"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reverse Linked List"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-medium"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Time Limit (ms)
              </label>
              <input
                type="number"
                value={timeLimitMs}
                onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Memory (KB)
              </label>
              <input
                type="number"
                value={memoryLimitKb}
                onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description & Constraints
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State problem constraints, input format, and output format..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Sample Input
              </label>
              <textarea
                rows={2}
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                placeholder="e.g. 5\n1 2 3 4 5"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Sample Output
              </label>
              <textarea
                rows={2}
                value={sampleOutput}
                onChange={(e) => setSampleOutput(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={createQuestionMutation.isPending} className="font-semibold">
              Create Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Cases Manager Modal */}
      <Modal
        isOpen={!!selectedQuestionForTestCases}
        onClose={() => setSelectedQuestionForTestCases(null)}
        title={`Test Cases: ${currentActiveQuestion?.title || ''}`}
        maxWidth="xl"
      >
        <div className="space-y-5 text-xs">
          {/* Add New Test Case Form */}
          <form onSubmit={handleAddTestCase} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-200">Add Test Case</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Input Data</label>
                <textarea
                  required
                  rows={2}
                  value={tcInput}
                  onChange={(e) => setTcInput(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-900 dark:text-slate-200 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Expected Output</label>
                <textarea
                  required
                  rows={2}
                  value={tcExpected}
                  onChange={(e) => setTcExpected(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-900 dark:text-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={tcIsHidden}
                  onChange={(e) => setTcIsHidden(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-ubi-800 focus:ring-0"
                />
                <span>Hidden Test Case (Used for evaluation only, invisible to candidate)</span>
              </label>

              <Button type="submit" size="sm" isLoading={addTestCaseMutation.isPending} className="font-semibold">
                Add Case
              </Button>
            </div>
          </form>

          {/* Test Case List */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-300">
              Existing Test Cases ({currentActiveQuestion?.test_cases?.length || 0})
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {currentActiveQuestion?.test_cases && currentActiveQuestion.test_cases.length > 0 ? (
                currentActiveQuestion.test_cases.map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-300 font-mono">Case #{idx + 1}</span>
                        {tc.is_hidden ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 font-semibold">
                            <EyeOff size={11} /> Hidden Case
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                            <Eye size={11} /> Visible Sample
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Input:</span>
                          <span className="text-slate-800 dark:text-slate-300 truncate block">{tc.input}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Expected:</span>
                          <span className="text-slate-800 dark:text-slate-300 truncate block">{tc.expected_output}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTestCaseMutation.mutate(tc.id)}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      title="Delete Test Case"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No test cases added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
