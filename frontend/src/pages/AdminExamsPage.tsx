import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Exam } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  Activity,
  Trash2,
  Clock,
  CheckSquare,
  Square,
  Calendar,
  Pencil,
  Search,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';

export const AdminExamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Delete Modal state
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);

  // Edit Modal state
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState(60);
  const [editEasyWeight, setEditEasyWeight] = useState(10);
  const [editMediumWeight, setEditMediumWeight] = useState(20);
  const [editHardWeight, setEditHardWeight] = useState(30);
  const [editSelectedGroups, setEditSelectedGroups] = useState<string[]>([]);
  const [editCustomGroupInput, setEditCustomGroupInput] = useState('');
  const [editSelectedQuestionIds, setEditSelectedQuestionIds] = useState<number[]>([]);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSearchQuery, setEditSearchQuery] = useState('');

  // Fetch student groups
  const { data: groupsData } = useQuery({
    queryKey: ['adminStudentGroups'],
    queryFn: adminApi.listStudentGroups,
  });

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

  const filteredEditQuestions = questions?.filter((q) =>
    q.title.toLowerCase().includes(editSearchQuery.toLowerCase()) ||
    q.difficulty.toLowerCase().includes(editSearchQuery.toLowerCase())
  );

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
      setDeletingExam(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete assessment');
    },
  });

  const handleOpenEdit = async (exam: Exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDurationMinutes(exam.duration_minutes);
    setEditEasyWeight(exam.easy_weight);
    setEditMediumWeight(exam.medium_weight);
    setEditHardWeight(exam.hard_weight);
    setEditSelectedGroups(exam.target_groups || []);
    setEditCustomGroupInput('');
    setEditStartTime(toLocalDatetimeInput(exam.start_time));
    setEditEndTime(toLocalDatetimeInput(exam.end_time));
    setEditSearchQuery('');

    try {
      const pool = await adminApi.getExamPool(exam.id);
      setEditSelectedQuestionIds(pool.map((q) => q.id));
    } catch {
      setEditSelectedQuestionIds([]);
    }
  };

  const handleToggleEditGroup = (grp: string) => {
    setEditSelectedGroups((prev) =>
      prev.includes(grp) ? prev.filter((g) => g !== grp) : [...prev, grp]
    );
  };

  const handleAddEditCustomGroup = () => {
    const trimmed = editCustomGroupInput.trim();
    if (trimmed && !editSelectedGroups.includes(trimmed)) {
      setEditSelectedGroups((prev) => [...prev, trimmed]);
      setEditCustomGroupInput('');
    }
  };

  const handleToggleEditQuestion = (id: number) => {
    setEditSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEditQuestions = () => {
    if (!questions) return;
    if (editSelectedQuestionIds.length === questions.length) {
      setEditSelectedQuestionIds([]);
    } else {
      setEditSelectedQuestionIds(questions.map((q) => q.id));
    }
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
        target_groups: editSelectedGroups,
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
        <Link to="/admin/exams/create">
          <Button className="gap-2 self-start font-semibold">
            <Plus size={16} />
            <span>Create New Assessment</span>
          </Button>
        </Link>
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

                  {/* Groups Assigned */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    <Layers size={13} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Target Groups:</span>
                    {exam.target_groups && exam.target_groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {exam.target_groups.map((grp) => (
                          <Badge key={grp} variant="brand" className="text-[9px]">
                            {grp}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Open to All Groups</span>
                    )}
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
                    onClick={() => setDeletingExam(exam)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                    title="Delete Assessment"
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



      {/* Edit Exam Modal */}
      {editingExam && (
        <Modal
          isOpen={!!editingExam}
          onClose={() => setEditingExam(null)}
          title={`Edit Assessment: ${editingExam.title}`}
          maxWidth="4xl"
        >
          <form onSubmit={handleUpdateExamSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* LEFT COLUMN: Title, Duration/Weights, Candidate Groups, Schedule */}
              <div className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[11px]">
                    Assessment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                  />
                </div>

                {/* Duration & Weights */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[11px]">
                    Duration & Question Weights
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Duration (m)</span>
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
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Easy Wt</span>
                      <input
                        type="number"
                        step="any"
                        value={editEasyWeight}
                        onChange={(e) => setEditEasyWeight(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Med Wt</span>
                      <input
                        type="number"
                        step="any"
                        value={editMediumWeight}
                        onChange={(e) => setEditMediumWeight(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Hard Wt</span>
                      <input
                        type="number"
                        step="any"
                        value={editHardWeight}
                        onChange={(e) => setEditHardWeight(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Candidate Group Access Config */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                      <Layers size={13} className="text-ubi-700 dark:text-ubi-400" />
                      Candidate Group Access
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {editSelectedGroups.length > 0 ? `${editSelectedGroups.length} selected` : 'Open to All'}
                    </span>
                  </div>

                  {groupsData?.groups && groupsData.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {groupsData.groups.map((grp) => {
                        const isSelected = editSelectedGroups.includes(grp);
                        return (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => handleToggleEditGroup(grp)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition border ${
                              isSelected
                                ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                            }`}
                          >
                            {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                            <span>{grp}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Custom tag input in modal */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={editCustomGroupInput}
                      onChange={(e) => setEditCustomGroupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditCustomGroup();
                        }
                      }}
                      placeholder="Add custom group tag..."
                      className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-[11px] focus:ring-1 focus:ring-ubi-800 focus:outline-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEditCustomGroup}
                      className="text-[10px] py-1 px-2 gap-1 font-semibold"
                    >
                      <Plus size={11} />
                      <span>Add</span>
                    </Button>
                  </div>

                  {/* Selected badges */}
                  {editSelectedGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {editSelectedGroups.map((grp) => (
                        <span
                          key={grp}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-ubi-50 border border-ubi-200 text-ubi-800 dark:bg-ubi-950 dark:border-ubi-800 dark:text-ubi-300 rounded text-[10px] font-semibold"
                        >
                          <span>{grp}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleEditGroup(grp)}
                            className="hover:text-rose-600 dark:hover:text-rose-400"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      No groups selected (open to all candidates).
                    </p>
                  )}
                </div>

                {/* Schedule Window Config */}
                <div className="p-3 bg-ubi-50/60 dark:bg-ubi-950/30 border border-ubi-200 dark:border-ubi-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ubi-900 dark:text-ubi-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                      <Calendar size={13} className="text-ubi-700 dark:text-ubi-400" />
                      Schedule Access Window (IST)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Optional</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] mb-0.5">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editStartTime}
                        onChange={(e) => handleEditStartTimeChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-[11px] focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] mb-0.5">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-[11px] focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  {editStartTime && editEndTime && (
                    <p className="text-[10px] text-ubi-800 dark:text-ubi-300 font-medium leading-tight">
                      Access: {formatIST(new Date(editStartTime).toISOString())} – {formatIST(new Date(editEndTime).toISOString())}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Question Pool Selection */}
              <div className="space-y-2 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Select Questions ({editSelectedQuestionIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllEditQuestions}
                    className="text-ubi-800 dark:text-ubi-400 hover:underline text-[11px] font-bold"
                  >
                    Toggle All
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={editSearchQuery}
                    onChange={(e) => setEditSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-[11px] focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
                  />
                </div>

                {/* Question List */}
                <div className="max-h-[220px] overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-1.5 space-y-1">
                  {filteredEditQuestions && filteredEditQuestions.length > 0 ? (
                    filteredEditQuestions.map((q) => {
                      const isChecked = editSelectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleEditQuestion(q.id)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-900 cursor-pointer transition text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {isChecked ? (
                              <CheckSquare size={16} className="text-ubi-800 dark:text-ubi-400 flex-shrink-0" />
                            ) : (
                              <Square size={16} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                            )}
                            <span className="text-slate-900 dark:text-slate-200 font-semibold truncate" title={q.title}>
                              {q.title}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
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
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No questions found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
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
                className="font-semibold px-5"
              >
                Update Assessment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExam && (
        <Modal
          isOpen={!!deletingExam}
          onClose={() => setDeletingExam(null)}
          title="Delete Assessment"
          maxWidth="md"
        >
          <div className="space-y-5 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Delete "{deletingExam.title}"?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this assessment? All candidate attempts and associated data will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingExam(null)}
                className="text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={deleteExamMutation.isPending}
                onClick={() => deleteExamMutation.mutate(deletingExam.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4"
              >
                Delete Assessment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
