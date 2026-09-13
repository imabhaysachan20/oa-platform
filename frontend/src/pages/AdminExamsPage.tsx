import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Exam, Question } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Plus, Activity, Trash2, Clock, CheckSquare, Square } from 'lucide-react';

export const AdminExamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [easyWeight, setEasyWeight] = useState(10);
  const [mediumWeight, setMediumWeight] = useState(20);
  const [hardWeight, setHardWeight] = useState(30);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

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
  };

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
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Assessment Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create exams, manage question pools, and inspect live candidates.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 self-start">
          <Plus size={16} />
          <span>Create New Assessment</span>
        </Button>
      </div>

      {/* Exam List */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">{exam.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-md font-mono">
                    Pool: {exam.pool_count || 0} Questions
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {exam.duration_minutes} min
                  </span>
                  <span>•</span>
                  <span>Weights: Easy({exam.easy_weight}) Medium({exam.medium_weight}) Hard({exam.hard_weight})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/exams/${exam.id}/monitoring`)}
                  className="gap-1.5"
                >
                  <Activity size={14} className="text-indigo-400" />
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
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl text-slate-400">
          No assessments found. Click "Create New Assessment" to build one.
        </div>
      )}

      {/* Create Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Coding Assessment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExamSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UsefulBI Senior Software Engineer Test"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min={5}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Easy Weight
              </label>
              <input
                type="number"
                step="any"
                value={easyWeight}
                onChange={(e) => setEasyWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Medium Weight
              </label>
              <input
                type="number"
                step="any"
                value={mediumWeight}
                onChange={(e) => setMediumWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Hard Weight
              </label>
              <input
                type="number"
                step="any"
                value={hardWeight}
                onChange={(e) => setHardWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
              />
            </div>
          </div>

          {/* Question Pool Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">
                Select Questions for Pool ({selectedQuestionIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllQuestions}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
              >
                Toggle All
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1">
              {questions && questions.length > 0 ? (
                questions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-900 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-indigo-500" />
                        ) : (
                          <Square size={16} className="text-slate-600" />
                        )}
                        <span className="text-slate-200 font-medium">{q.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
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
            <p className="text-[11px] text-slate-400 mt-1">
              At exam start, 1 Easy + 2 Medium questions will be randomly sampled from this pool per student.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
            >
              Save Assessment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
