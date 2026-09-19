import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  Sparkles,
  Layers,
  Plus,
  X,
  Sliders,
  AlertTriangle,
  Filter,
} from 'lucide-react';

export const AdminCreateExamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [easyWeight, setEasyWeight] = useState(10);
  const [mediumWeight, setMediumWeight] = useState(20);
  const [hardWeight, setHardWeight] = useState(30);
  const [mcqWeight, setMcqWeight] = useState(2);
  const [mcqCount, setMcqCount] = useState(0);
  const [easyCount, setEasyCount] = useState(1);
  const [mediumCount, setMediumCount] = useState(2);
  const [hardCount, setHardCount] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'mcq'>('all');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available student groups
  const { data: groupsData } = useQuery({
    queryKey: ['adminStudentGroups'],
    queryFn: adminApi.listStudentGroups,
  });

  // Fetch available questions for pool selection
  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: adminApi.listQuestions,
  });

  const handleToggleGroup = (groupName: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupName) ? prev.filter((g) => g !== groupName) : [...prev, groupName]
    );
  };

  const handleAddCustomGroup = () => {
    const trimmed = customGroupInput.trim();
    if (trimmed && !selectedGroups.includes(trimmed)) {
      setSelectedGroups((prev) => [...prev, trimmed]);
      setCustomGroupInput('');
    }
  };

  // Helper: Convert local datetime-local string to ISO UTC
  const toISO = (localStr?: string) => {
    if (!localStr) return undefined;
    return new Date(localStr).toISOString();
  };

  // Helper: Format IST
  const formatIST = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return (
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date) + ' IST'
    );
  };

  // Auto-calculate end time when start time or duration changes
  const handleStartTimeChange = (newStartTime: string, duration: number = durationMinutes) => {
    setStartTime(newStartTime);
    if (newStartTime && duration > 0) {
      const startMs = new Date(newStartTime).getTime();
      if (!isNaN(startMs)) {
        const endMs = startMs + duration * 60000;
        const endDate = new Date(endMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        setEndTime(
          `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(
            endDate.getHours()
          )}:${pad(endDate.getMinutes())}`
        );
      }
    }
  };

  // Create Exam Mutation
  const createExamMutation = useMutation({
    mutationFn: adminApi.createExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminExams'] });
      navigate('/admin/exams');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to create assessment');
    },
  });

  const handleToggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllQuestions = () => {
    if (!questions) return;
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map((q) => q.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createExamMutation.mutate({
      title,
      duration_minutes: durationMinutes,
      easy_weight: easyWeight,
      medium_weight: mediumWeight,
      hard_weight: hardWeight,
      mcq_weight: mcqWeight,
      mcq_count: mcqCount,
      easy_count: easyCount,
      medium_count: mediumCount,
      hard_count: hardCount,
      is_published: true,
      target_groups: selectedGroups,
      question_ids: selectedQuestionIds,
      start_time: toISO(startTime),
      end_time: toISO(endTime),
    });
  };

  const selectedQuestions = questions?.filter((q) => selectedQuestionIds.includes(q.id)) || [];
  const poolEasyCount = selectedQuestions.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'easy').length;
  const poolMedCount = selectedQuestions.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'medium').length;
  const poolHardCount = selectedQuestions.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'hard').length;
  const poolMcqCount = selectedQuestions.filter((q) => q.question_type === 'mcq').length;

  const bankEasyCount = questions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'easy').length || 0;
  const bankMedCount = questions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'medium').length || 0;
  const bankHardCount = questions?.filter((q) => q.question_type !== 'mcq' && q.difficulty === 'hard').length || 0;
  const bankMcqCount = questions?.filter((q) => q.question_type === 'mcq').length || 0;

  const filteredQuestions = questions?.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (difficultyFilter === 'all') return true;
    if (difficultyFilter === 'mcq') return q.question_type === 'mcq';
    return q.question_type !== 'mcq' && q.difficulty === difficultyFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/exams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/90 hover:bg-ubi-800 hover:text-white dark:hover:bg-ubi-600 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs transition-all mb-2 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Assessment List</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-ubi-800 dark:text-ubi-400" size={24} />
            <span>Create New Assessment</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure assessment details, target candidate groups, timing window, scoring weights, and select questions for the pool.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
            1. Basic Assessment Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">
                Assessment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UsefulBI Senior Software Engineer Assessment"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">
                Duration (minutes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={5}
                required
                value={durationMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDurationMinutes(val);
                  if (startTime) handleStartTimeChange(startTime, val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>
          </div>
        </Card>

        {/* Question Pattern & Scoring Weights Card */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sliders size={16} className="text-ubi-800 dark:text-ubi-400" />
              <span>2. Question Pattern & Scoring Weights</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Candidate gets a randomized draw matching these counts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Easy Config */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Easy Questions
                </span>
                <span className="text-[10px] text-slate-500">Pool: {poolEasyCount} available</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Count / Candidate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={easyCount}
                    onChange={(e) => setEasyCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Weight (Marks)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={easyWeight}
                    onChange={(e) => setEasyWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
              {selectedQuestionIds.length > 0 && easyCount > poolEasyCount && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>Pool only has {poolEasyCount} Easy. Fallback will apply.</span>
                </div>
              )}
            </div>

            {/* Medium Config */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Medium Questions
                </span>
                <span className="text-[10px] text-slate-500">Pool: {poolMedCount} available</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Count / Candidate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mediumCount}
                    onChange={(e) => setMediumCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Weight (Marks)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={mediumWeight}
                    onChange={(e) => setMediumWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
              {selectedQuestionIds.length > 0 && mediumCount > poolMedCount && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>Pool only has {poolMedCount} Medium. Fallback will apply.</span>
                </div>
              )}
            </div>

            {/* Hard Config */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Hard Questions
                </span>
                <span className="text-[10px] text-slate-500">Pool: {poolHardCount} available</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Count / Candidate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hardCount}
                    onChange={(e) => setHardCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Weight (Marks)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={hardWeight}
                    onChange={(e) => setHardWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
              {selectedQuestionIds.length > 0 && hardCount > poolHardCount && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>Pool only has {poolHardCount} Hard. Fallback will apply.</span>
                </div>
              )}
            </div>

            {/* MCQ Config */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  MCQ Questions
                </span>
                <span className="text-[10px] text-slate-500">Pool: {poolMcqCount} available</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Count / Candidate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mcqCount}
                    onChange={(e) => setMcqCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                    Weight (Marks)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0.1}
                    value={mcqWeight}
                    onChange={(e) => setMcqWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>
              {selectedQuestionIds.length > 0 && mcqCount > poolMcqCount && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>Pool only has {poolMcqCount} MCQ(s). Fallback will apply.</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Draw Summary */}
          <div className="p-3 bg-ubi-50/80 dark:bg-ubi-950/40 border border-ubi-200 dark:border-ubi-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-ubi-900 dark:text-ubi-200 font-semibold">
              <Sparkles size={15} className="text-ubi-700 dark:text-ubi-400 shrink-0" />
              <span>
                Candidate Exam Draw: <strong>{easyCount} Easy</strong> + <strong>{mediumCount} Medium</strong> + <strong>{hardCount} Hard</strong> = <strong>{easyCount + mediumCount + hardCount} Coding Questions</strong>
                {mcqCount > 0 ? ` + ${mcqCount} Random MCQs (${mcqWeight}m each)` : ''}
              </span>
            </div>
            <div className="text-ubi-800 dark:text-ubi-300 font-bold self-end sm:self-auto shrink-0">
              Total Score: {easyCount * easyWeight + mediumCount * mediumWeight + hardCount * hardWeight + mcqCount * mcqWeight} pts
            </div>
          </div>
        </Card>

        {/* Candidate Group Access Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-ubi-800 dark:text-ubi-400" />
              <span>3. Candidate Group Access (Multi-Group Selection)</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {selectedGroups.length > 0 ? `${selectedGroups.length} group(s) selected` : 'Open to All Candidates'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select one or more candidate groups/batches eligible to attempt this online assessment. Leaving this empty makes the assessment available to all registered students.
          </p>

          {/* Quick toggle chips from enrolled batches */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
              Available Candidate Batches / Groups:
            </label>
            {groupsData?.groups && groupsData.groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groupsData.groups.map((grp) => {
                  const isSelected = selectedGroups.includes(grp);
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => handleToggleGroup(grp)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-ubi-800 text-white border-ubi-900 shadow-sm dark:bg-ubi-700 dark:border-ubi-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      <span>{grp}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                No candidate batches uploaded yet. You can type and add a group tag below.
              </p>
            )}
          </div>

          {/* Custom group tag input */}
          <div className="pt-1">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs mb-1">
              Add Custom or Upcoming Group Tag:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customGroupInput}
                onChange={(e) => setCustomGroupInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomGroup();
                  }
                }}
                placeholder="e.g. IIT Delhi 2026, Campus Drive 2"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomGroup}
                className="gap-1 font-semibold text-xs"
              >
                <Plus size={14} />
                <span>Add Group</span>
              </Button>
            </div>
          </div>

          {/* Currently selected groups summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Assigned Groups for this Assessment:
            </span>
            {selectedGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.map((grp) => (
                  <span
                    key={grp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 rounded-md text-xs font-semibold"
                  >
                    <span>{grp}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(grp)}
                      className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                None selected — this assessment will be accessible by all registered candidates.
              </span>
            )}
          </div>
        </Card>

        {/* Schedule Access Window Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-ubi-800 dark:text-ubi-400" />
              <span>4. Scheduled Access Window</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">Optional (Leave empty for flexible access)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs mb-1">
                Start Date & Time (Local / IST)
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs mb-1">
                End Date & Time (Local / IST)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>
          </div>

          {startTime && endTime && (
            <div className="p-3 bg-ubi-50/70 dark:bg-ubi-950/40 border border-ubi-200 dark:border-ubi-800 rounded-lg">
              <p className="text-xs text-ubi-900 dark:text-ubi-300 font-medium flex items-center gap-1.5">
                <Clock size={14} />
                <span>
                  Candidates can only access this test between <strong>{formatIST(new Date(startTime).toISOString())}</strong> and <strong>{formatIST(new Date(endTime).toISOString())}</strong>.
                </span>
              </p>
            </div>
          )}
        </Card>

        {/* Question Pool Selection Card */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-ubi-800 dark:text-ubi-400" />
                <span>5. Select Questions for Pool ({selectedQuestionIds.length} selected)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select questions from the bank. Candidates will receive random draws from this pool matching your configured pattern.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectAllQuestions}
              className="text-ubi-800 dark:text-ubi-400 hover:underline text-xs font-bold self-start sm:self-auto"
            >
              Toggle All Questions
            </button>
          </div>

          {/* Selected Pool Composition Badges */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Current Pool Composition:
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {selectedQuestionIds.length} Total Questions Selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-semibold ${
                poolEasyCount >= easyCount
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}>
                Easy in Pool: <strong>{poolEasyCount}</strong> / {easyCount} required
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-semibold ${
                poolMedCount >= mediumCount
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}>
                Medium in Pool: <strong>{poolMedCount}</strong> / {mediumCount} required
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-semibold ${
                poolHardCount >= hardCount
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}>
                Hard in Pool: <strong>{poolHardCount}</strong> / {hardCount} required
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                MCQs in Pool: <strong>{poolMcqCount}</strong> (all fixed)
              </span>
            </div>
          </div>

          {/* Search Filter & Difficulty Filter Tabs */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={12} /> Filter Bank:
              </span>
              {(['all', 'easy', 'medium', 'hard', 'mcq'] as const).map((filterKey) => {
                const count =
                  filterKey === 'all'
                    ? questions?.length || 0
                    : filterKey === 'easy'
                    ? bankEasyCount
                    : filterKey === 'medium'
                    ? bankMedCount
                    : filterKey === 'hard'
                    ? bankHardCount
                    : bankMcqCount;
                const isActive = difficultyFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setDifficultyFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition border ${
                      isActive
                        ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {filterKey} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search questions by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 space-y-1">
            {isLoadingQuestions ? (
              <div className="text-center py-6 text-xs text-slate-500">Loading question bank...</div>
            ) : filteredQuestions && filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => {
                const isChecked = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleQuestion(q.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-900 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {isChecked ? (
                        <CheckSquare size={18} className="text-ubi-800 dark:text-ubi-400 flex-shrink-0" />
                      ) : (
                        <Square size={18} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{q.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {q.question_type === 'mcq' ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                          MCQ ({mcqWeight}m)
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            q.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          Code ({q.difficulty})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                No questions found matching your filter/search.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              📌 Assessment Assignment Rules:
            </p>
            <p>
              • <strong>MCQ Questions:</strong> All selected MCQs ({poolMcqCount}) are included for <strong>every student</strong> taking this exam (fixed assignment).
            </p>
            <p>
              • <strong>Coding Questions:</strong> Each candidate receives a random draw matching the configured pattern (<strong>{easyCount} Easy</strong>, <strong>{mediumCount} Medium</strong>, <strong>{hardCount} Hard</strong> = <strong>{easyCount + mediumCount + hardCount} total</strong>) from this pool.
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/exams')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createExamMutation.isPending}
            className="font-semibold px-6"
          >
            Save & Publish Assessment
          </Button>
        </div>
      </form>
    </div>
  );
};
