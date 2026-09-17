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
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available questions for pool selection
  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: adminApi.listQuestions,
  });

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
      is_published: true,
      question_ids: selectedQuestionIds,
      start_time: toISO(startTime),
      end_time: toISO(endTime),
    });
  };

  const filteredQuestions = questions?.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.difficulty.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Configure assessment details, timing window, scoring weights, and select questions for the pool.
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

          <div>
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">
                Easy Weight
              </label>
              <input
                type="number"
                step="any"
                value={easyWeight}
                onChange={(e) => setEasyWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">
                Medium Weight
              </label>
              <input
                type="number"
                step="any"
                value={mediumWeight}
                onChange={(e) => setMediumWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">
                Hard Weight
              </label>
              <input
                type="number"
                step="any"
                value={hardWeight}
                onChange={(e) => setHardWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>
          </div>
        </Card>

        {/* Schedule Access Window Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-ubi-800 dark:text-ubi-400" />
              <span>2. Scheduled Access Window</span>
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-ubi-800 dark:text-ubi-400" />
              <span>3. Select Questions for Pool ({selectedQuestionIds.length} selected)</span>
            </h2>
            <button
              type="button"
              onClick={handleSelectAllQuestions}
              className="text-ubi-800 dark:text-ubi-400 hover:underline text-xs font-bold self-start sm:self-auto"
            >
              Toggle All Questions
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search questions by title or difficulty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
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
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : q.difficulty === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                No questions found in question bank.
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Note: At exam start, questions will be randomly sampled from this pool per candidate.
          </p>
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
