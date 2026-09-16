import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Exam } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Plus,
  Activity,
  Trash2,
  Clock,
  CheckSquare,
  Square,
  Calendar,
  Pencil
} from 'lucide-react';

export const AdminExamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [easyWeight, setEasyWeight] = useState(10);
  const [mediumWeight, setMediumWeight] = useState(20);
  const [hardWeight, setHardWeight] = useState(30);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Edit Modal state
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState(60);
  const [editEasyWeight, setEditEasyWeight] = useState(10);
  const [editMediumWeight, setEditMediumWeight] = useState(20);
  const [editHardWeight, setEditHardWeight] = useState(30);
  const [editSelectedQuestionIds, setEditSelectedQuestionIds] = useState<number[]>([]);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ['adminExams'],
    queryFn: adminApi.listExams,
  });

  // Fetch available questions for pool selection
  const { data: questions } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: adminApi.listQuestions,
  });

  // Helper: Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocalDatetimeInput = (isoStr?: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date) + ' IST';
  };

  // Auto-calculate end time when start time or duration changes in Create Modal
  const handleStartTimeChange = (newStartTime: string, duration: number = durationMinutes) => {
    setStartTime(newStartTime);
    if (newStartTime && duration > 0) {
      const startMs = new Date(newStartTime).getTime();
      if (!isNaN(startMs)) {
        const endMs = startMs + duration * 60000;
        const endDate = new Date(endMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        setEndTime(`${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`);
      }
    }
  };

  // Auto-calculate end time when start time or duration changes in Edit Modal
  const handleEditStartTimeChange = (newStartTime: string, duration: number = editDurationMinutes) => {
    setEditStartTime(newStartTime);
    if (newStartTime && duration > 0) {
      const startMs = new Date(newStartTime).getTime();
      if (!isNaN(startMs)) {
        const endMs = startMs + duration * 60000;
        const endDate = new Date(endMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        setEditEndTime(`${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`);
      }
    }
  };

  // Create Exam Mutation
  const createExamMutation = useMutation({
    mutationFn: adminApi.createExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminExams'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to create exam');
    },
  });

  // Update Exam Mutation
  const updateExamMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Exam> & { question_ids?: number[] } }) =>
      adminApi.updateExam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminExams'] });
      setEditingExam(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to update exam');
    },
  });

  // Delete Exam Mutation
  const deleteExamMutation = useMutation({
    mutationFn: adminApi.deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminExams'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDurationMinutes(60);
    setEasyWeight(10);
    setMediumWeight(20);
    setHardWeight(30);
    setSelectedQuestionIds([]);
    setStartTime('');
    setEndTime('');
  };

  const handleOpenEdit = async (exam: Exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDurationMinutes(exam.duration_minutes);
    setEditEasyWeight(exam.easy_weight);
    setEditMediumWeight(exam.medium_weight);
    setEditHardWeight(exam.hard_weight);
    setEditStartTime(toLocalDatetimeInput(exam.start_time));
    setEditEndTime(toLocalDatetimeInput(exam.end_time));

    try {
      const pool = await adminApi.getExamPool(exam.id);
      setEditSelectedQuestionIds(pool.map((q) => q.id));
    } catch {
      setEditSelectedQuestionIds([]);
    }
  };

  const handleToggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleEditQuestion = (id: number) => {
    setEditSelectedQuestionIds((prev) =>
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

  const handleSelectAllEditQuestions = () => {
    if (!questions) return;
    if (editSelectedQuestionIds.length === questions.length) {
      setEditSelectedQuestionIds([]);
    } else {
      setEditSelectedQuestionIds(questions.map((q) => q.id));
    }
  };

  const handleCreateExamSubmit = (e: React.FormEvent) => {
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

  const handleUpdateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !editTitle.trim()) return;

    updateExamMutation.mutate({
      id: editingExam.id,
      data: {
        title: editTitle,
        duration_minutes: editDurationMinutes,
        easy_weight: editEasyWeight,
        medium_weight: editMediumWeight,
        hard_weight: editHardWeight,
        is_published: true,
        question_ids: editSelectedQuestionIds,
        start_time: toISO(editStartTime),
        end_time: toISO(editEndTime),
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Assessment Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create scheduled assessments, configure question pools, and launch live monitoring.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 self-start font-semibold">
          <Plus size={16} />
          <span>Create New Assessment</span>
        </Button>
      </div>

      {/* Exam List */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {exams.map((exam) => {
            const now = new Date().getTime();
            const hasSchedule = !!(exam.start_time && exam.end_time);
            const isUpcoming = hasSchedule && now < new Date(exam.start_time!).getTime();
            const isLive = hasSchedule && now >= new Date(exam.start_time!).getTime() && now <= new Date(exam.end_time!).getTime();
            const isExpired = hasSchedule && now > new Date(exam.end_time!).getTime();

            return (
              <Card key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                    <span className="text-xs px-2.5 py-0.5 bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 rounded-md font-mono font-semibold">
                      Pool: {exam.pool_count || 0} Questions
                    </span>
                    {hasSchedule ? (
                      isUpcoming ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 flex items-center gap-1">
                          <Clock size={10} /> Upcoming
                        </span>
                      ) : isLive ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Window
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                          Expired
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Flexible / Always Open
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={13} /> {exam.duration_minutes} min
                    </span>
                    {hasSchedule && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-ubi-800 dark:text-ubi-300">
                          <Calendar size={13} />
                          {formatIST(exam.start_time)} – {formatIST(exam.end_time)}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Weights: Easy({exam.easy_weight}) Med({exam.medium_weight}) Hard({exam.hard_weight})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(exam)}
                    className="gap-1.5 font-semibold text-slate-700 dark:text-slate-200"
                    title="Edit Assessment & Schedule"
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/exams/${exam.id}/monitoring`)}
                    className="gap-1.5 font-semibold"
                  >
                    <Activity size={14} className="text-ubi-800 dark:text-ubi-400" />
                    <span>Live Monitoring</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Delete assessment "${exam.title}"?`)) {
                        deleteExamMutation.mutate(exam.id);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-500 dark:text-slate-400">
          No assessments created yet. Click "Create New Assessment" to build one.
        </Card>
      )}

      {/* Create Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Scheduled Assessment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExamSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UsefulBI Senior Software Engineer Assessment"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Duration (min)
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
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

          {/* Schedule Window Config */}
          <div className="p-3.5 bg-ubi-50/60 dark:bg-ubi-950/30 border border-ubi-200 dark:border-ubi-800/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ubi-900 dark:text-ubi-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-ubi-700 dark:text-ubi-400" />
                Scheduled Access Window (Local / IST)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>
            </div>

            {startTime && endTime && (
              <p className="text-[11px] text-ubi-800 dark:text-ubi-300 font-medium">
                Candidates can only access this test between {formatIST(new Date(startTime).toISOString())} and {formatIST(new Date(endTime).toISOString())}.
              </p>
            )}
          </div>

          {/* Question Pool Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Questions for Pool ({selectedQuestionIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllQuestions}
                className="text-ubi-800 dark:text-ubi-400 hover:underline text-xs font-bold"
              >
                Toggle All
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 space-y-1">
              {questions && questions.length > 0 ? (
                questions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-200/60 dark:hover:bg-slate-900 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-ubi-800 dark:text-ubi-400" />
                        ) : (
                          <Square size={16} className="text-slate-400 dark:text-slate-600" />
                        )}
                        <span className="text-slate-900 dark:text-slate-200 font-semibold">{q.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                        {q.difficulty}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-slate-500">
                  No questions in question bank yet.
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              At exam start, 1 Easy + 2 Medium questions will be randomly sampled from this pool per student.
            </p>
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
            <Button
              type="submit"
              size="sm"
              isLoading={createExamMutation.isPending}
              className="font-semibold"
            >
              Save Assessment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Exam Modal */}
      {editingExam && (
        <Modal
          isOpen={!!editingExam}
          onClose={() => setEditingExam(null)}
          title={`Edit Assessment: ${editingExam.title}`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateExamSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={5}
                  required
                  value={editDurationMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditDurationMinutes(val);
                    if (editStartTime) handleEditStartTimeChange(editStartTime, val);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Easy Weight
                </label>
                <input
                  type="number"
                  step="any"
                  value={editEasyWeight}
                  onChange={(e) => setEditEasyWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Medium Weight
                </label>
                <input
                  type="number"
                  step="any"
                  value={editMediumWeight}
                  onChange={(e) => setEditMediumWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Hard Weight
                </label>
                <input
                  type="number"
                  step="any"
                  value={editHardWeight}
                  onChange={(e) => setEditHardWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Schedule Window Config */}
            <div className="p-3.5 bg-ubi-50/60 dark:bg-ubi-950/30 border border-ubi-200 dark:border-ubi-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ubi-900 dark:text-ubi-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-ubi-700 dark:text-ubi-400" />
                  Scheduled Access Window (Local / IST)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Leave empty for flexible test</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => handleEditStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                  />
                </div>
              </div>

              {editStartTime && editEndTime && (
                <p className="text-[11px] text-ubi-800 dark:text-ubi-300 font-medium">
                  Candidates can only access this test between {formatIST(new Date(editStartTime).toISOString())} and {formatIST(new Date(editEndTime).toISOString())}.
                </p>
              )}
            </div>

            {/* Question Pool Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Questions for Pool ({editSelectedQuestionIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllEditQuestions}
                  className="text-ubi-800 dark:text-ubi-400 hover:underline text-xs font-bold"
                >
                  Toggle All
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 space-y-1">
                {questions && questions.length > 0 ? (
                  questions.map((q) => {
                    const isChecked = editSelectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleEditQuestion(q.id)}
                        className="flex items-center justify-between p-2 rounded hover:bg-slate-200/60 dark:hover:bg-slate-900 cursor-pointer transition text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-ubi-800 dark:text-ubi-400" />
                          ) : (
                            <Square size={16} className="text-slate-400 dark:text-slate-600" />
                          )}
                          <span className="text-slate-900 dark:text-slate-200 font-semibold">{q.title}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                          {q.difficulty}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-slate-500">
                    No questions in question bank yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingExam(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={updateExamMutation.isPending}
                className="font-semibold"
              >
                Update Assessment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
