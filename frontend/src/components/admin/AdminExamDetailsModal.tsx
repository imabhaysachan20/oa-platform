import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Exam, Question } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Clock,
  Calendar,
  Layers,
  Sliders,
  Sparkles,
  Pencil,
  Activity,
  Trophy,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Code,
  HelpCircle,
  CheckCircle2,
  FileCode,
  Users,
  BarChart2,
  Check,
  Zap,
} from 'lucide-react';

interface AdminExamDetailsModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (exam: Exam) => void;
}

export const AdminExamDetailsModal: React.FC<AdminExamDetailsModalProps> = ({
  exam,
  isOpen,
  onClose,
  onEdit,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pool' | 'schedule' | 'scoring'>('pool');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'mcq'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Fetch full exam question pool
  const { data: poolQuestions, isLoading: isPoolLoading } = useQuery({
    queryKey: ['adminExamPool', exam?.id],
    queryFn: () => (exam ? adminApi.getExamPool(exam.id) : Promise.resolve([])),
    enabled: !!exam && isOpen,
  });

  // Fetch live candidate monitoring for metrics
  const { data: monitoringData } = useQuery({
    queryKey: ['adminExamMonitoring', exam?.id],
    queryFn: () => (exam ? adminApi.getMonitoring(exam.id) : Promise.resolve([])),
    enabled: !!exam && isOpen,
  });

  if (!exam) return null;

  // Schedule status calculations
  const now = new Date().getTime();
  const hasSchedule = !!(exam.start_time && exam.end_time);
  const isUpcoming = hasSchedule && now < new Date(exam.start_time!).getTime();
  const isLive = hasSchedule && now >= new Date(exam.start_time!).getTime() && now <= new Date(exam.end_time!).getTime();
  const isExpired = hasSchedule && now > new Date(exam.end_time!).getTime();

  // Helper: Format IST
  const formatIST = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return (
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date) + ' IST'
    );
  };

  // Pattern & Score Metrics
  const easyCount = exam.easy_count ?? 1;
  const mediumCount = exam.medium_count ?? 2;
  const hardCount = exam.hard_count ?? 0;
  const mcqCount = exam.mcq_count ?? 0;

  const easyWeight = exam.easy_weight ?? 10;
  const mediumWeight = exam.medium_weight ?? 20;
  const hardWeight = exam.hard_weight ?? 30;
  const mcqWeight = exam.mcq_weight ?? 2;

  const totalCodingDraw = easyCount + mediumCount + hardCount;
  const totalDrawCount = totalCodingDraw + mcqCount;
  const maxPossibleScore =
    easyCount * easyWeight +
    mediumCount * mediumWeight +
    hardCount * hardWeight +
    mcqCount * mcqWeight;

  // Monitoring Metrics
  const totalAssigned = monitoringData?.length || 0;
  const completedCount = monitoringData?.filter((m) => m.status === 'submitted' || m.status === 'auto_submitted').length || 0;
  const activeCount = monitoringData?.filter((m) => m.status === 'in_progress').length || 0;
  const scores = monitoringData?.map((m) => m.current_score ?? m.raw_score ?? 0).filter((s) => s > 0) || [];
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
  const topScore = scores.length > 0 ? Math.max(...scores) : 'N/A';

  // Pool Question breakdown
  const poolCodingEasy = poolQuestions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'easy').length || 0;
  const poolCodingMed = poolQuestions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'medium').length || 0;
  const poolCodingHard = poolQuestions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'hard').length || 0;
  const poolMcqCount = poolQuestions?.filter((q) => q.question_type === 'mcq').length || 0;

  // Warnings
  const hasEasyDeficit = poolCodingEasy < easyCount;
  const hasMedDeficit = poolCodingMed < mediumCount;
  const hasHardDeficit = poolCodingHard < hardCount;
  const hasMcqDeficit = poolMcqCount < mcqCount;
  const hasAnyDeficit = hasEasyDeficit || hasMedDeficit || hasHardDeficit || hasMcqDeficit;

  // Filtered pool questions
  const filteredQuestions = poolQuestions?.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (difficultyFilter === 'all') return true;
    if (difficultyFilter === 'mcq') return q.question_type === 'mcq';
    return q.question_type !== 'mcq' && q.difficulty === difficultyFilter;
  });

  const toggleExpand = (id: number) => {
    setExpandedQuestionId((prev) => (prev === id ? null : id));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="6xl">
      <div className="space-y-6 text-slate-800 dark:text-slate-200">
        {/* TOP HEADER & ACTIONS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                EXAM ID #{exam.id}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {exam.title}
              </h2>
              {hasSchedule ? (
                isUpcoming ? (
                  <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 flex items-center gap-1">
                    <Clock size={12} /> Upcoming
                  </span>
                ) : isLive ? (
                  <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Window
                  </span>
                ) : (
                  <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                    Expired
                  </span>
                )
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Flexible / Always Open
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <span>Created: {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : 'N/A'}</span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Status: {exam.is_published ? 'Published & Active' : 'Draft'}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(exam);
              }}
              className="gap-1.5 font-semibold text-slate-700 dark:text-slate-200"
            >
              <Pencil size={14} />
              <span>Edit Exam</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/admin/exams/${exam.id}/monitoring`);
              }}
              className="gap-1.5 font-semibold"
            >
              <Activity size={14} className="text-ubi-800 dark:text-ubi-400" />
              <span>Live Monitoring</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/exam/${exam.id}/leaderboard`);
              }}
              className="gap-1.5 font-semibold text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Trophy size={14} />
              <span>Leaderboard</span>
            </Button>
          </div>
        </div>

        {/* SUMMARY CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Duration */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Clock size={12} className="text-ubi-700 dark:text-ubi-400" /> Duration
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {exam.duration_minutes} mins
            </span>
          </div>

          {/* Pool Count */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <FileCode size={12} className="text-purple-600 dark:text-purple-400" /> Question Pool
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {poolQuestions?.length || exam.pool_count || 0} Questions
            </span>
          </div>

          {/* Candidate Draw */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Sliders size={12} className="text-emerald-600 dark:text-emerald-400" /> Draw / Student
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {totalDrawCount} items ({totalCodingDraw}C + {mcqCount}M)
            </span>
          </div>

          {/* Max Score */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Zap size={12} className="text-amber-500" /> Max Score
            </span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              {maxPossibleScore} pts
            </span>
          </div>

          {/* Total Candidates */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Users size={12} className="text-blue-500" /> Assigned Students
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {totalAssigned} candidates
            </span>
          </div>

          {/* Completed / Avg */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <BarChart2 size={12} className="text-emerald-500" /> Submissions / Avg
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {completedCount} ({avgScore} avg)
            </span>
          </div>
        </div>

        {/* DEFICIT WARNING ALERT IF POOL INSUFFICIENT */}
        {hasAnyDeficit && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Question Pool Shortage Warning:</span>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                The current question pool contains fewer questions than required by the pattern:
                {hasEasyDeficit && ` Easy (${poolCodingEasy}/${easyCount}),`}
                {hasMedDeficit && ` Medium (${poolCodingMed}/${mediumCount}),`}
                {hasHardDeficit && ` Hard (${poolCodingHard}/${hardCount}),`}
                {hasMcqDeficit && ` MCQ (${poolMcqCount}/${mcqCount}).`}
                {' '}Students will receive all available questions from the pool with automatic fallback.
              </p>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('pool')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'pool'
                ? 'border-ubi-800 text-ubi-800 dark:border-ubi-400 dark:text-ubi-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode size={14} />
            <span>Question Pool ({poolQuestions?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-ubi-800 text-ubi-800 dark:border-ubi-400 dark:text-ubi-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={14} />
            <span>Schedule & Candidate Access</span>
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'scoring'
                ? 'border-ubi-800 text-ubi-800 dark:border-ubi-400 dark:text-ubi-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>Pattern & Scoring Rules</span>
          </button>
        </div>

        {/* TAB 1: QUESTION POOL & SELECTED QUESTIONS */}
        {activeTab === 'pool' && (
          <div className="space-y-4">
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Difficulty & Type filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'easy', 'medium', 'hard', 'mcq'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setDifficultyFilter(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition border ${
                      difficultyFilter === key
                        ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {key === 'all' ? 'All Questions' : key}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search questions in pool..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Questions List */}
            {isPoolLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Loading exam pool questions...
              </div>
            ) : filteredQuestions && filteredQuestions.length > 0 ? (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredQuestions.map((q) => {
                  const isExpanded = expandedQuestionId === q.id;
                  const isMcq = q.question_type === 'mcq';
                  const weight = isMcq
                    ? q.marks ?? mcqWeight
                    : q.difficulty === 'easy'
                    ? easyWeight
                    : q.difficulty === 'medium'
                    ? mediumWeight
                    : hardWeight;

                  return (
                    <div
                      key={q.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden transition shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Question Row Header */}
                      <div
                        onClick={() => toggleExpand(q.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/60 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* Icon badge */}
                          {isMcq ? (
                            <div className="p-1.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                              <HelpCircle size={15} />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-md bg-ubi-50 text-ubi-800 dark:bg-ubi-950 dark:text-ubi-300 border border-ubi-200 dark:border-ubi-800 shrink-0">
                              <Code size={15} />
                            </div>
                          )}

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {q.title}
                              </h4>
                              <span className="text-[10px] font-mono font-medium text-slate-400">
                                #Q{q.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {q.description?.replace(/<[^>]*>?/gm, '').slice(0, 100) || 'No description preview available.'}
                            </p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isMcq ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                              MCQ ({weight} pts)
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                q.difficulty === 'easy'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : q.difficulty === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              Coding {q.difficulty} ({weight} pts)
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Question Details */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-4 text-xs">
                          {/* Description */}
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                              Problem Statement
                            </span>
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed text-xs">
                              {q.description || 'No detailed description provided.'}
                            </div>
                          </div>

                          {/* CODING SPECIFIC DETAILS */}
                          {!isMcq && (
                            <div className="space-y-3">
                              {/* Function signature & specs */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Function Signature
                                  </span>
                                  <code className="text-[11px] text-ubi-700 dark:text-ubi-300 font-mono font-bold block truncate">
                                    {q.function_signature || `${q.function_name || 'solution'}(...) -> ${q.return_type || 'any'}`}
                                  </code>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Time Limit
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {q.time_limit_ms || 2000} ms
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Memory Limit
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {q.memory_limit_kb ? `${Math.round(q.memory_limit_kb / 1024)} MB` : '256 MB'}
                                  </span>
                                </div>
                              </div>

                              {/* Sample I/O */}
                              {(q.sample_input || q.sample_output) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                                      Sample Input
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                                      {q.sample_input || 'N/A'}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                                      Sample Output
                                    </span>
                                    <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                      {q.sample_output || 'N/A'}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Test Cases List */}
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                                  Test Cases ({q.test_cases?.length || 0} total)
                                </span>
                                {q.test_cases && q.test_cases.length > 0 ? (
                                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                          <th className="p-2 pl-3">#</th>
                                          <th className="p-2">Input</th>
                                          <th className="p-2">Expected Output</th>
                                          <th className="p-2">Visibility</th>
                                          <th className="p-2 text-right pr-3">Weight</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                                        {q.test_cases.map((tc, idx) => (
                                          <tr key={tc.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                                            <td className="p-2 pl-3 text-slate-400 font-semibold">{idx + 1}</td>
                                            <td className="p-2 text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                              {tc.input}
                                            </td>
                                            <td className="p-2 text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">
                                              {tc.expected_output}
                                            </td>
                                            <td className="p-2">
                                              {tc.is_hidden ? (
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                  Hidden
                                                </span>
                                              ) : (
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                  Public
                                                </span>
                                              )}
                                            </td>
                                            <td className="p-2 text-right pr-3 font-bold text-slate-700 dark:text-slate-300">
                                              {tc.weight ?? 1.0}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No test cases configured.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* MCQ SPECIFIC DETAILS */}
                          {isMcq && (
                            <div className="space-y-3">
                              {/* MCQ metadata */}
                              <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Clock size={12} className="text-purple-600" /> Time Limit: {q.mcq_time_limit_seconds || 60} seconds
                                </span>
                                <span>•</span>
                                <span className="font-semibold">
                                  Type: {q.is_multi_select ? 'Multi-Select MCQ' : 'Single-Choice MCQ'}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-purple-700 dark:text-purple-300">
                                  Marks: {weight} pts
                                </span>
                              </div>

                              {/* MCQ Choices / Options */}
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                                  MCQ Options & Correct Answer
                                </span>
                                {q.mcq_options || q.options ? (
                                  <div className="space-y-2">
                                    {(q.mcq_options || q.options || []).map((opt, idx) => {
                                      const letter = String.fromCharCode(65 + idx);
                                      const isCorrect = opt.is_correct;
                                      return (
                                        <div
                                          key={opt.id || idx}
                                          className={`p-2.5 rounded-lg border flex items-center justify-between transition ${
                                            isCorrect
                                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span
                                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                                isCorrect
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                              }`}
                                            >
                                              {letter}
                                            </span>
                                            <span className="font-medium">{opt.option_text}</span>
                                          </div>
                                          {isCorrect && (
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1">
                                              <Check size={11} /> Correct Answer
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No MCQ options found.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                No questions match your current search or filter criteria.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULE & CANDIDATE ACCESS */}
        {activeTab === 'schedule' && (
          <div className="space-y-5">
            {/* Schedule Window */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={15} className="text-ubi-700 dark:text-ubi-400" /> Access Schedule Window (IST)
                </h3>
                {hasSchedule ? (
                  isLive ? (
                    <Badge variant="success">Currently Live</Badge>
                  ) : isUpcoming ? (
                    <Badge variant="brand">Scheduled Upcoming</Badge>
                  ) : (
                    <Badge variant="neutral">Expired</Badge>
                  )
                ) : (
                  <Badge variant="neutral">Always Open</Badge>
                )}
              </div>

              {hasSchedule ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Window Start Time
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      {formatIST(exam.start_time)}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Window End Time
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      {formatIST(exam.end_time)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  This assessment has no fixed start or end date restrictor and can be taken at any time by targeted candidate groups.
                </p>
              )}
            </div>

            {/* Target Candidate Groups */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-ubi-700 dark:text-ubi-400" /> Target Candidate Groups Access
              </h3>

              {exam.target_groups && exam.target_groups.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Only candidates belonging to the following groups are authorized to view and start this assessment:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {exam.target_groups.map((grp) => (
                      <span
                        key={grp}
                        className="px-3 py-1 bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Users size={13} />
                        <span>{grp}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200 text-xs">
                  <span className="font-bold">Open to All Candidates:</span> No candidate group filters applied. All registered students can attempt this assessment.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PATTERN & SCORING RULES */}
        {activeTab === 'scoring' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={15} className="text-ubi-700 dark:text-ubi-400" /> Dynamic Question Draw & Weights Breakdown
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                When a candidate starts this assessment, the platform dynamically draws questions from the exam's pool according to the rules below:
              </p>

              {/* Matrix Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Easy */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                    Easy Coding
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Draw: <strong className="text-slate-900 dark:text-white">{easyCount} question(s)</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Weight: <strong className="text-emerald-700 dark:text-emerald-400">{easyWeight} pts each</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Subtotal: {easyCount * easyWeight} pts
                  </div>
                </div>

                {/* Medium */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900/50 space-y-1">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                    Medium Coding
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Draw: <strong className="text-slate-900 dark:text-white">{mediumCount} question(s)</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Weight: <strong className="text-amber-700 dark:text-amber-400">{mediumWeight} pts each</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Subtotal: {mediumCount * mediumWeight} pts
                  </div>
                </div>

                {/* Hard */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/50 space-y-1">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                    Hard Coding
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Draw: <strong className="text-slate-900 dark:text-white">{hardCount} question(s)</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Weight: <strong className="text-rose-700 dark:text-rose-400">{hardWeight} pts each</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Subtotal: {hardCount * hardWeight} pts
                  </div>
                </div>

                {/* MCQ */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900/50 space-y-1">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 block">
                    MCQs
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Draw: <strong className="text-slate-900 dark:text-white">{mcqCount} question(s)</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Weight: <strong className="text-purple-700 dark:text-purple-400">{mcqWeight} pts each</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Subtotal: {mcqCount * mcqWeight} pts
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-ubi-50 dark:bg-ubi-950/50 border border-ubi-200 dark:border-ubi-800 rounded-lg text-xs font-medium text-ubi-900 dark:text-ubi-200 flex items-center justify-between">
                <span>Total Candidate Test Draw: <strong>{totalDrawCount} total questions</strong></span>
                <span className="text-sm font-extrabold text-ubi-800 dark:text-ubi-300">
                  Maximum Score: {maxPossibleScore} Points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} className="font-semibold">
            Close Details
          </Button>
        </div>
      </div>
    </Modal>
  );
};
