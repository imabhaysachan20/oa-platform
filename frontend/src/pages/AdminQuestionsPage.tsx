import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Question } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { MarkdownRenderer } from '../components/ui/RichTextEditor';
import { AdminPlaygroundModal } from '../components/AdminPlaygroundModal';
import {
  Plus,
  Trash2,
  ListChecks,
  Eye,
  EyeOff,
  Pencil,
  Clock,
  HardDrive,
  AlignLeft,
  Play,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const AdminQuestionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [playgroundQuestion, setPlaygroundQuestion] = useState<Question | null>(null);

  // Search, Filter, Sort, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'coding' | 'mcq'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [sortBy, setSortBy] = useState<'id_desc' | 'id_asc' | 'title_asc' | 'title_desc' | 'difficulty_asc' | 'difficulty_desc'>('id_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Test Case Form State
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcWeight, setTcWeight] = useState(1.0);

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['adminQuestions'],
    queryFn: () => adminApi.listQuestions(),
  });

  // Calculate counts for badges
  const counts = useMemo(() => {
    if (!questions) return { total: 0, coding: 0, mcq: 0, easy: 0, medium: 0, hard: 0 };
    return {
      total: questions.length,
      coding: questions.filter((q) => q.question_type !== 'mcq').length,
      mcq: questions.filter((q) => q.question_type === 'mcq').length,
      easy: questions.filter((q) => q.difficulty === 'easy').length,
      medium: questions.filter((q) => q.difficulty === 'medium').length,
      hard: questions.filter((q) => q.difficulty === 'hard').length,
    };
  }, [questions]);

  // Filter & Sort questions
  const filteredAndSortedQuestions = useMemo(() => {
    if (!questions) return [];
    let result = questions.filter((q) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesDesc = q.description ? q.description.toLowerCase().includes(query) : false;
        const matchesFn = q.function_name ? q.function_name.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc && !matchesFn) return false;
      }

      if (typeFilter === 'coding' && q.question_type === 'mcq') return false;
      if (typeFilter === 'mcq' && q.question_type !== 'mcq') return false;

      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'id_desc') return b.id - a.id;
      if (sortBy === 'id_asc') return a.id - b.id;
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
      if (sortBy === 'difficulty_asc') {
        const rank = { easy: 1, medium: 2, hard: 3 };
        const rA = rank[a.difficulty as keyof typeof rank] || 0;
        const rB = rank[b.difficulty as keyof typeof rank] || 0;
        if (rA !== rB) return rA - rB;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'difficulty_desc') {
        const rank = { easy: 1, medium: 2, hard: 3 };
        const rA = rank[a.difficulty as keyof typeof rank] || 0;
        const rB = rank[b.difficulty as keyof typeof rank] || 0;
        if (rA !== rB) return rB - rA;
        return a.title.localeCompare(b.title);
      }
      return b.id - a.id;
    });

    return result;
  }, [questions, searchQuery, typeFilter, difficultyFilter, sortBy]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedQuestions.slice(start, start + pageSize);
  }, [filteredAndSortedQuestions, currentPage, pageSize]);

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

      {/* Search, Filter & Sort Bar */}
      <Card className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by title, description, or function name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <ArrowUpDown size={14} className="text-slate-400" />
              <span className="font-medium text-[11px]">Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none cursor-pointer"
            >
              <option value="id_desc">Newest First</option>
              <option value="id_asc">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="difficulty_asc">Difficulty (Easy → Hard)</option>
              <option value="difficulty_desc">Difficulty (Hard → Easy)</option>
            </select>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Question Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Type:
            </span>
            {(
              [
                { id: 'all', label: `All (${counts.total})` },
                { id: 'coding', label: `Coding (${counts.coding})` },
                { id: 'mcq', label: `MCQ (${counts.mcq})` },
              ] as const
            ).map((t) => {
              const isActive = typeFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                    isActive
                      ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-400 dark:border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Difficulty:</span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'easy', label: `Easy (${counts.easy})` },
                { id: 'medium', label: `Med (${counts.medium})` },
                { id: 'hard', label: `Hard (${counts.hard})` },
              ] as const
            ).map((d) => {
              const isActive = difficultyFilter === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDifficultyFilter(d.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition border capitalize ${
                    isActive
                      ? 'bg-slate-800 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-400 dark:border-slate-800'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Questions Grid */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
        </div>
      ) : paginatedQuestions && paginatedQuestions.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {paginatedQuestions.map((q) => (
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

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAndSortedQuestions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
          />
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-500 dark:text-slate-400 space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No questions found.</p>
          <p className="text-xs">
            {searchQuery || typeFilter !== 'all' || difficultyFilter !== 'all'
              ? 'Try adjusting your search query or filters.'
              : 'Click "Add New Question" to create your first problem.'}
          </p>
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
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                    viewingQuestion.question_type === 'mcq'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {viewingQuestion.question_type === 'mcq' ? 'MCQ' : 'Coding'}
                </span>
                <Badge variant={viewingQuestion.difficulty}>{viewingQuestion.difficulty}</Badge>
                <span className="text-xs text-slate-500 font-mono font-semibold">ID: #{viewingQuestion.id}</span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                {viewingQuestion.question_type === 'mcq' ? (
                  <>
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      {viewingQuestion.mcq_options?.length || viewingQuestion.options?.length || 0} Options
                    </span>
                    <span>•</span>
                    <span>{viewingQuestion.marks ? `${viewingQuestion.marks} Marks` : 'Exam Weight'}</span>
                    {viewingQuestion.is_multi_select && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">Multi-select</span>
                      </>
                    )}
                    {viewingQuestion.mcq_time_limit_seconds ? (
                      <>
                        <span>•</span>
                        <span>{viewingQuestion.mcq_time_limit_seconds}s limit</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/* Main Problem Statement */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {viewingQuestion.question_type === 'mcq' ? 'Question Prompt' : 'Problem Statement'}
              </h4>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <MarkdownRenderer content={viewingQuestion.description} />
              </div>
            </div>

            {/* MCQ Options Display */}
            {viewingQuestion.question_type === 'mcq' && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-purple-600 dark:text-purple-400" />
                  <span>Configured Options ({viewingQuestion.mcq_options?.length || viewingQuestion.options?.length || 0})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(viewingQuestion.mcq_options || viewingQuestion.options || []).map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2.5 ${
                        opt.is_correct
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 font-medium'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            opt.is_correct
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="break-words">{opt.option_text}</span>
                      </div>
                      {opt.is_correct && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          Correct Answer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Format (Coding questions only) */}
            {viewingQuestion.question_type !== 'mcq' && viewingQuestion.input_format && (
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

            {/* Test Cases Summary (Coding questions only) */}
            {viewingQuestion.question_type !== 'mcq' && viewingQuestion.test_cases && viewingQuestion.test_cases.length > 0 && (
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
                {viewingQuestion.question_type !== 'mcq' && (
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
                )}
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
