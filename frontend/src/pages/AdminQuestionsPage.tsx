import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Question } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { MarkdownRenderer } from '../components/ui/RichTextEditor';
import { AdminPlaygroundModal } from '../components/AdminPlaygroundModal';
import { Plus, Trash2, ListChecks, Eye, EyeOff, Pencil, Clock, HardDrive, AlignLeft, Play } from 'lucide-react';

export const AdminQuestionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [playgroundQuestion, setPlaygroundQuestion] = useState<Question | null>(null);

  // Test Case Form State
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcWeight, setTcWeight] = useState(1.0);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: adminApi.listQuestions,
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: adminApi.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      setDeletingQuestion(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete question');
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

  const handleAddTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    const qId = selectedQuestionForTestCases?.id;
    if (!qId) return;
    addTestCaseMutation.mutate({
      qId,
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
        <Link to="/admin/questions/create">
          <Button className="gap-2 self-start font-semibold">
            <Plus size={16} />
            <span>Add New Question</span>
          </Button>
        </Link>
      </div>

      {/* Questions Grid */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700 transition-all shadow-sm group">
              <div
                onClick={() => setViewingQuestion(q)}
                className="space-y-1.5 flex-1 min-w-0 cursor-pointer"
                title="Click to view full question details"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                    q.question_type === 'mcq'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {q.question_type === 'mcq' ? 'MCQ' : 'Coding'}
                  </span>
                  <Badge variant={q.difficulty}>{q.difficulty}</Badge>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-ubi-800 dark:group-hover:text-ubi-400 transition-colors truncate">
                    {q.title}
                  </h3>
                </div>
                {q.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {q.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {q.question_type === 'mcq' ? (
                    <>
                      <span>{q.mcq_options?.length || 0} Options</span>
                      <span>•</span>
                      <span>{q.marks ? `${q.marks} Marks` : 'Exam Weight'}</span>
                      {q.is_multi_select && <span>• <span className="text-purple-600 dark:text-purple-400 font-semibold">Multi-select</span></span>}
                      {q.mcq_time_limit_seconds ? (
                        <>
                          <span>•</span>
                          <span>{q.mcq_time_limit_seconds}s limit</span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span>{q.test_cases?.length || 0} Test Cases</span>
                      <span>•</span>
                      <span>{q.time_limit_ms}ms</span>
                      <span>•</span>
                      <span>{Math.round(q.memory_limit_kb / 1024)}MB</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap self-start sm:self-start flex-shrink-0 pt-0.5 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                {q.question_type !== 'mcq' && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaygroundQuestion(q);
                    }}
                    className="font-medium text-ubi-800 dark:text-ubi-400 hover:text-ubi-900 dark:hover:text-ubi-300"
                  >
                    <Play size={12} />
                    <span>Playground</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/questions/edit/${q.id}`);
                  }}
                  className="font-medium"
                >
                  <Pencil size={12} />
                  <span>Edit</span>
                </Button>
                {q.question_type !== 'mcq' && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQuestionForTestCases(q);
                    }}
                    className="font-medium"
                  >
                    <ListChecks size={12} className="text-ubi-800 dark:text-ubi-400" />
                    <span>Test Cases ({q.test_cases?.length || 0})</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingQuestion(q);
                  }}
                  className="font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
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



      {/* Test Cases Manager Modal */}
      <Modal
        isOpen={!!selectedQuestionForTestCases}
        onClose={() => setSelectedQuestionForTestCases(null)}
        title={`Test Cases: ${currentActiveQuestion?.title || ''}`}
        maxWidth="xl"
      >
        <div className="space-y-3.5 text-xs">
          {/* Add New Test Case Form */}
          <form onSubmit={handleAddTestCase} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 dark:text-slate-200">Add Test Case</h4>
            </div>
            
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-md p-1.5 text-indigo-300/90 text-[10px] leading-tight">
              <strong>Format Note:</strong> Space-separated values for vectors. Raw text without quotes for strings.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">Input Data</label>
                <textarea
                  required
                  rows={1.5}
                  value={tcInput}
                  onChange={(e) => setTcInput(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ubi-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">Expected Output</label>
                <textarea
                  required
                  rows={1.5}
                  value={tcExpected}
                  onChange={(e) => setTcExpected(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ubi-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={tcIsHidden}
                  onChange={(e) => setTcIsHidden(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-ubi-800 focus:ring-0"
                />
                <span>Hidden Case (Used for evaluation only)</span>
              </label>

              <Button type="submit" size="xs" isLoading={addTestCaseMutation.isPending} className="font-semibold px-3 py-1">
                Add Case
              </Button>
            </div>
          </form>

          {/* Test Case List */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 dark:text-slate-300">
              Existing Test Cases ({currentActiveQuestion?.test_cases?.length || 0})
            </h4>
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
              {currentActiveQuestion?.test_cases && currentActiveQuestion.test_cases.length > 0 ? (
                currentActiveQuestion.test_cases.map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-300 font-mono text-[10px]">Case #{idx + 1}</span>
                        {tc.is_hidden ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-500/20 font-semibold">
                            <EyeOff size={10} /> Hidden Case
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                            <Eye size={10} /> Visible Sample
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono text-[10px]">
                        <div className="truncate"><span className="text-slate-500 font-bold">Input:</span> {tc.input}</div>
                        <div className="truncate"><span className="text-slate-500 font-bold">Expected:</span> {tc.expected_output}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTestCaseMutation.mutate(tc.id)}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      title="Delete Test Case"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-500 text-xs">
                  No test cases added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <Modal
          isOpen={!!deletingQuestion}
          onClose={() => setDeletingQuestion(null)}
          title="Delete Question"
          maxWidth="md"
        >
          <div className="space-y-5 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Delete "{deletingQuestion.title}"?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this question? This will permanently remove it from the question bank and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingQuestion(null)}
                className="text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={deleteQuestionMutation.isPending}
                onClick={() => deleteQuestionMutation.mutate(deletingQuestion.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4"
              >
                Delete Question
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Question Details Modal */}
      {viewingQuestion && (
        <Modal
          isOpen={!!viewingQuestion}
          onClose={() => setViewingQuestion(null)}
          title={`Question: ${viewingQuestion.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-slate-800 dark:text-slate-200">
            {/* Header Metadata Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Badge variant={viewingQuestion.difficulty}>{viewingQuestion.difficulty}</Badge>
                <span className="text-xs text-slate-500 font-mono font-semibold">ID: #{viewingQuestion.id}</span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" />
                  {viewingQuestion.time_limit_ms}ms limit
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HardDrive size={13} className="text-slate-400" />
                  {Math.round(viewingQuestion.memory_limit_kb / 1024)}MB memory
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-ubi-800 dark:text-ubi-400">
                  <ListChecks size={13} />
                  {viewingQuestion.test_cases?.length || 0} Test Cases
                </span>
              </div>
            </div>

            {/* Main Problem Statement */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Problem Statement
              </h4>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <MarkdownRenderer content={viewingQuestion.description} />
              </div>
            </div>

            {/* Input Format */}
            {viewingQuestion.input_format && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <AlignLeft size={13} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Input Format</span>
                </h4>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <MarkdownRenderer content={viewingQuestion.input_format} />
                </div>
              </div>
            )}

            {/* Test Cases Summary */}
            {viewingQuestion.test_cases && viewingQuestion.test_cases.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Test Cases ({viewingQuestion.test_cases.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {viewingQuestion.test_cases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Case {idx + 1} {tc.is_hidden ? '(Hidden)' : '(Sample)'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Weight: {tc.weight}
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Input:</span>
                          <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 truncate">
                            {tc.input || <span className="italic text-slate-400">Empty</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Expected Output:</span>
                          <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 truncate">
                            {tc.expected_output || <span className="italic text-slate-400">Empty</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3.5 pb-0.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewingQuestion) {
                      const qId = viewingQuestion.id;
                      setViewingQuestion(null);
                      navigate(`/admin/questions/edit/${qId}`);
                    }
                  }}
                  className="gap-1.5 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800/60 font-semibold text-xs"
                >
                  <Pencil size={14} />
                  <span>Edit Question</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const qForTc = viewingQuestion;
                    setViewingQuestion(null);
                    setSelectedQuestionForTestCases(qForTc);
                  }}
                  className="gap-1.5 font-semibold text-xs"
                >
                  <ListChecks size={14} className="text-ubi-800 dark:text-ubi-400" />
                  <span>Manage Test Cases</span>
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingQuestion(null)}
                className="text-xs font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Playground Modal */}
      {playgroundQuestion && (
        <AdminPlaygroundModal
          isOpen={!!playgroundQuestion}
          onClose={() => setPlaygroundQuestion(null)}
          questionData={{
            id: playgroundQuestion.id,
            title: playgroundQuestion.title,
            description: playgroundQuestion.description,
            difficulty: playgroundQuestion.difficulty,
            timeLimitMs: playgroundQuestion.time_limit_ms,
            memoryLimitKb: playgroundQuestion.memory_limit_kb,
            sampleInput: playgroundQuestion.sample_input || '',
            sampleOutput: playgroundQuestion.sample_output || '',
            inputFormat: playgroundQuestion.input_format,
            functionName: playgroundQuestion.function_name,
            functionSignature: playgroundQuestion.function_signature,
            parameters: playgroundQuestion.parameters,
            returnType: playgroundQuestion.return_type,
            starterCode: playgroundQuestion.starter_code,
            driverCode: playgroundQuestion.driver_code,
            testCases: playgroundQuestion.test_cases?.map((tc) => ({
              id: tc.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden,
              weight: tc.weight,
            })),
          }}
        />
      )}
    </div>
  );
};
