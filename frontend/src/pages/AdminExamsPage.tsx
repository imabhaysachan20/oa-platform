import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Exam } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { AdminExamDetailsModal } from '../components/admin/AdminExamDetailsModal';
import {
  Plus,
  Activity,
  Trash2,
  Calendar,
  Clock,
  Search,
  Layers,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

export const AdminExamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId?: string }>();

  // Detail Modal state
  const [selectedDetailExam, setSelectedDetailExam] = useState<Exam | null>(null);

  // Delete Modal state
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);

  // Main Exam List Controls
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'expired' | 'flexible'>('all');
  const [examSortBy, setExamSortBy] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'duration_asc' | 'duration_desc' | 'pool_desc'>('newest');
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(6);

  // Fetch exams
  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ['adminExams'],
    queryFn: () => adminApi.listExams(),
  });

  // Sync route param with detail modal
  useEffect(() => {
    if (examId && exams) {
      const found = exams.find((e) => e.id === Number(examId));
      if (found) {
        setSelectedDetailExam(found);
      }
    } else if (!examId) {
      setSelectedDetailExam(null);
    }
  }, [examId, exams]);

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

  // Memoized filtered & sorted exams
  const filteredAndSortedExams = useMemo(() => {
    if (!exams) return [];
    const now = new Date().getTime();

    let result = exams.filter((exam) => {
      if (examSearchQuery.trim()) {
        const q = examSearchQuery.toLowerCase();
        const matchesTitle = exam.title.toLowerCase().includes(q);
        const matchesColleges = exam.target_colleges?.some((col) => col.toLowerCase().includes(q));
        const matchesGroups = exam.target_groups?.some((grp) => grp.toLowerCase().includes(q));
        if (!matchesTitle && !matchesColleges && !matchesGroups) return false;
      }

      if (examStatusFilter !== 'all') {
        const hasSchedule = !!(exam.start_time && exam.end_time);
        if (examStatusFilter === 'flexible') {
          if (hasSchedule) return false;
        } else if (examStatusFilter === 'live') {
          const isLive =
            hasSchedule &&
            now >= new Date(exam.start_time!).getTime() &&
            now <= new Date(exam.end_time!).getTime();
          if (!isLive) return false;
        } else if (examStatusFilter === 'upcoming') {
          const isUpcoming = hasSchedule && now < new Date(exam.start_time!).getTime();
          if (!isUpcoming) return false;
        } else if (examStatusFilter === 'expired') {
          const isExpired = hasSchedule && now > new Date(exam.end_time!).getTime();
          if (!isExpired) return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (examSortBy === 'newest') return b.id - a.id;
      if (examSortBy === 'oldest') return a.id - b.id;
      if (examSortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (examSortBy === 'title_desc') return b.title.localeCompare(a.title);
      if (examSortBy === 'duration_asc') return a.duration_minutes - b.duration_minutes;
      if (examSortBy === 'duration_desc') return b.duration_minutes - a.duration_minutes;
      if (examSortBy === 'pool_desc') return (b.pool_count || 0) - (a.pool_count || 0);
      return b.id - a.id;
    });

    return result;
  }, [exams, examSearchQuery, examStatusFilter, examSortBy]);

  const totalExamPages = Math.ceil(filteredAndSortedExams.length / examPageSize) || 1;
  const paginatedExams = useMemo(() => {
    const start = (examPage - 1) * examPageSize;
    return filteredAndSortedExams.slice(start, start + examPageSize);
  }, [filteredAndSortedExams, examPage, examPageSize]);

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

      {/* Filter, Search and Sorting Bar */}
      <Card className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search assessments by title or target group tag..."
              value={examSearchQuery}
              onChange={(e) => {
                setExamSearchQuery(e.target.value);
                setExamPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <ArrowUpDown size={14} className="text-slate-400" />
              <span className="font-medium text-[11px]">Sort:</span>
            </div>
            <select
              value={examSortBy}
              onChange={(e) => {
                setExamSortBy(e.target.value as any);
                setExamPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="duration_asc">Duration (Shortest)</option>
              <option value="duration_desc">Duration (Longest)</option>
              <option value="pool_desc">Most Questions in Pool</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} /> Status:
          </span>
          {(
            [
              { id: 'all', label: 'All Assessments' },
              { id: 'live', label: 'Live Window' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'expired', label: 'Expired' },
              { id: 'flexible', label: 'Flexible / Always Open' },
            ] as const
          ).map((st) => {
            const isActive = examStatusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setExamStatusFilter(st.id);
                  setExamPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border ${
                  isActive
                    ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Exam List */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
        </div>
      ) : paginatedExams.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            {paginatedExams.map((exam) => {
              const now = new Date().getTime();
              const hasSchedule = !!(exam.start_time && exam.end_time);
              const isUpcoming = hasSchedule && now < new Date(exam.start_time!).getTime();
              const isLive =
                hasSchedule &&
                now >= new Date(exam.start_time!).getTime() &&
                now <= new Date(exam.end_time!).getTime();
              const isExpired = hasSchedule && now > new Date(exam.end_time!).getTime();

              return (
                <Card
                  key={exam.id}
                  onClick={() => {
                    setSelectedDetailExam(exam);
                    navigate(`/admin/exams/${exam.id}`);
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700 transition cursor-pointer group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-ubi-800 dark:group-hover:text-ubi-400 transition">
                        {exam.title}
                      </h3>
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
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Pattern: <strong>{exam.easy_count ?? 1}E</strong> • <strong>{exam.medium_count ?? 2}M</strong> •{' '}
                        <strong>{exam.hard_count ?? 0}H</strong> (
                        {(exam.easy_count ?? 1) + (exam.medium_count ?? 2) + (exam.hard_count ?? 0)} coding)
                        {exam.mcq_count ? ` • ${exam.mcq_count} MCQ` : ''}
                      </span>
                      <span>•</span>
                      <span>
                        Weights: Easy({exam.easy_weight}) Med({exam.medium_weight}) Hard({exam.hard_weight}) MCQ(
                        {exam.mcq_weight ?? 2})
                      </span>
                    </div>

                    {/* Colleges & Groups Assigned */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      {/* Colleges */}
                      {exam.target_colleges && exam.target_colleges.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Colleges:</span>
                          <div className="flex flex-wrap gap-1">
                            {exam.target_colleges.map((col) => (
                              <Badge key={col} variant="brand" className="text-[9px]">
                                🏛️ {col}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Groups */}
                      <div className="flex items-center gap-1">
                        <Layers size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Groups:</span>
                        {exam.target_groups && exam.target_groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {exam.target_groups.map((grp) => (
                              <Badge key={grp} variant="neutral" className="text-[9px]">
                                {grp}
                              </Badge>
                            ))}
                          </div>
                        ) : !exam.target_colleges || exam.target_colleges.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Open to All Candidates</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">All batches in college</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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

          {/* Pagination Controls */}
          <Pagination
            currentPage={examPage}
            totalPages={totalExamPages}
            totalItems={filteredAndSortedExams.length}
            pageSize={examPageSize}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={(p) => setExamPage(p)}
            onPageSizeChange={(sz) => {
              setExamPageSize(sz);
              setExamPage(1);
            }}
            itemLabel="assessments"
          />
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-500 dark:text-slate-400 space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No assessments found.</p>
          <p className="text-xs text-slate-500">
            {examSearchQuery || examStatusFilter !== 'all'
              ? 'Try changing your search keywords or status filter.'
              : 'Click "Create New Assessment" to build one.'}
          </p>
        </Card>
      )}

      {/* Detail View Modal */}
      {selectedDetailExam && (
        <AdminExamDetailsModal
          exam={selectedDetailExam}
          isOpen={!!selectedDetailExam}
          onClose={() => {
            setSelectedDetailExam(null);
            if (examId) {
              navigate('/admin/exams');
            }
          }}
        />
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
