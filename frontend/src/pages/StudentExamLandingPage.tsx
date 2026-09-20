import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useAuthStore } from '../store/authStore';
import {
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const StudentExamLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const candidateName = user?.name || (user as any)?.full_name || 'Candidate';

  const [activeTab, setActiveTab] = React.useState<'all' | 'active' | 'upcoming' | 'completed' | 'closed'>('all');

  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['availableExams'],
    queryFn: examsApi.list,
  });

  const formatScheduleIST = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    const dateFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(start);
    const startFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(start);

    if (end) {
      const endFormatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(end);
      return `${dateFormatted}, ${startFormatted} – ${endFormatted} IST`;
    }
    return `${dateFormatted} at ${startFormatted} IST`;
  };

  const handleOpenInstructions = (exam: any) => {
    const now = new Date().getTime();
    if (exam.start_time && now < new Date(exam.start_time).getTime()) {
      navigate(`/exam/${exam.id}/waiting-room`);
      return;
    }
    navigate(`/exam/${exam.id}/instructions`);
  };

  // Tab count calculations
  const allCount = exams?.length || 0;

  const activeCount = React.useMemo(() => {
    if (!exams) return 0;
    const now = new Date().getTime();
    return exams.filter((exam) => {
      const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
      const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';
      const isUpcoming = !isCompleted && (exam.is_upcoming || (exam.start_time && now < new Date(exam.start_time).getTime()));
      const isExpired = !isCompleted && !isInProgress && (exam.is_expired || (exam.end_time && now > new Date(exam.end_time).getTime()));
      return !isCompleted && !isExpired && !isUpcoming;
    }).length;
  }, [exams]);

  const upcomingCount = React.useMemo(() => {
    if (!exams) return 0;
    const now = new Date().getTime();
    return exams.filter((exam) => {
      const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
      const isUpcoming = !isCompleted && (exam.is_upcoming || (exam.start_time && now < new Date(exam.start_time).getTime()));
      return !isCompleted && isUpcoming;
    }).length;
  }, [exams]);

  const completedCount = React.useMemo(() => {
    if (!exams) return 0;
    return exams.filter((exam) => {
      return exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
    }).length;
  }, [exams]);

  const closedCount = React.useMemo(() => {
    if (!exams) return 0;
    const now = new Date().getTime();
    return exams.filter((exam) => {
      const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
      const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';
      return !isCompleted && !isInProgress && (exam.is_expired || (exam.end_time && now > new Date(exam.end_time).getTime()));
    }).length;
  }, [exams]);

  // Filtered exams based on tab and sorted by status priority for "all" tab
  const filteredExams = React.useMemo(() => {
    if (!exams) return [];
    const now = new Date().getTime();

    const getExamCategory = (exam: any): 'active' | 'upcoming' | 'completed' | 'closed' => {
      const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
      const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';
      const isUpcoming = !isCompleted && (exam.is_upcoming || (exam.start_time && now < new Date(exam.start_time).getTime()));
      const isExpired = !isCompleted && !isInProgress && (exam.is_expired || (exam.end_time && now > new Date(exam.end_time).getTime()));

      if (isCompleted) return 'completed';
      if (isExpired) return 'closed';
      if (isUpcoming) return 'upcoming';
      return 'active';
    };

    const categoryOrder: Record<string, number> = {
      active: 1,
      upcoming: 2,
      completed: 3,
      closed: 4,
    };

    const filtered = exams.filter((exam) => {
      const cat = getExamCategory(exam);
      if (activeTab === 'all') return true;
      return cat === activeTab;
    });

    if (activeTab === 'all') {
      return [...filtered].sort((a, b) => {
        const orderA = categoryOrder[getExamCategory(a)] || 99;
        const orderB = categoryOrder[getExamCategory(b)] || 99;
        return orderA - orderB;
      });
    }

    return filtered;
  }, [exams, activeTab]);

  return (
    <div className="bg-[#f4f7f6] dark:bg-slate-950 py-8 px-4 sm:px-8 lg:px-12 animate-fadeIn">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-2xs space-y-3">
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl text-slate-500 dark:text-slate-400 font-light leading-snug">
              Welcome back, <span className="font-semibold text-slate-900 dark:text-slate-100">{candidateName}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ubi-800 dark:text-ubi-300 tracking-tight leading-tight">
              UsefulBI Technical Assessments
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Select your assigned assessment from the portal list below. Upon clicking <strong>Start Assessment</strong>, you will review the test guidelines and proctoring instructions before initiating your timer.
          </p>
        </div>

        {/* Assessments Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Assigned Assessments</span>
            </h2>

            {/* Filter Tabs */}
            <div className="inline-flex items-center p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg text-xs font-medium self-start sm:self-auto border border-slate-300/50 dark:border-slate-700/50 flex-wrap gap-0.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-ubi-800 dark:text-ubi-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-ubi-50 dark:bg-ubi-950 text-ubi-800 dark:text-ubi-300 font-bold' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {allCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-white dark:bg-slate-900 text-ubi-800 dark:text-ubi-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Active</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-ubi-50 dark:bg-ubi-950 text-ubi-800 dark:text-ubi-300 font-bold' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {activeCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'upcoming'
                    ? 'bg-white dark:bg-slate-900 text-ubi-800 dark:text-ubi-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Upcoming</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'upcoming' ? 'bg-ubi-50 dark:bg-ubi-950 text-ubi-800 dark:text-ubi-300 font-bold' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {upcomingCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-white dark:bg-slate-900 text-ubi-800 dark:text-ubi-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Completed</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-ubi-50 dark:bg-ubi-950 text-ubi-800 dark:text-ubi-300 font-bold' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {completedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('closed')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'closed'
                    ? 'bg-white dark:bg-slate-900 text-ubi-800 dark:text-ubi-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Closed</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'closed' ? 'bg-ubi-50 dark:bg-ubi-950 text-ubi-800 dark:text-ubi-300 font-bold' : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {closedCount}
                </span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
              <p className="text-xs text-slate-500 font-mono">Fetching active assessments...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-medium">
              Failed to load available assessments. Please refresh the page.
            </div>
          ) : filteredExams && filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredExams.map((exam) => {
                const now = new Date().getTime();
                const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
                const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';
                const isUpcoming = !isCompleted && (exam.is_upcoming || (exam.start_time && now < new Date(exam.start_time).getTime()));
                const isExpired = !isCompleted && !isInProgress && (exam.is_expired || (exam.end_time && now > new Date(exam.end_time).getTime()));
                const isEntryClosed = !isCompleted && !isInProgress && !isExpired && !isUpcoming && Boolean(exam.is_entry_closed);

                const scheduleText = formatScheduleIST(exam.start_time, exam.end_time);

                return (
                  <div
                    key={exam.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-5 py-3.5 shadow-2xs hover:border-ubi-300 dark:hover:border-ubi-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                          {exam.title}
                        </h3>
                        {exam.attempt_number && exam.attempt_number > 1 && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800">
                            Attempt #{exam.attempt_number}
                          </span>
                        )}
                        {exam.duration_minutes <= (exam.late_entry_window_minutes || 15) && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800">
                            Flexible Entry
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock size={13} className="text-slate-400" />
                          Duration: {exam.duration_minutes} mins
                        </span>
                        {scheduleText && (
                          <span className="flex items-center gap-1.5 font-medium text-ubi-800 dark:text-ubi-300">
                            <Calendar size={13} className="text-ubi-700 dark:text-ubi-400" />
                            {scheduleText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                      {isCompleted ? (
                        <button
                          disabled
                          className="w-full sm:w-auto px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs rounded border border-slate-200 dark:border-slate-700 opacity-75 cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Completed</span>
                        </button>
                      ) : isInProgress ? (
                        <button
                          onClick={async () => {
                            if (!document.fullscreenElement) {
                              await document.documentElement.requestFullscreen().catch(() => { });
                            }
                            navigate(`/exam/${exam.id}/workspace`);
                          }}
                          className="w-full sm:w-auto px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Resume Assessment</span>
                        </button>
                      ) : isUpcoming ? (
                        <button
                          onClick={() => navigate(`/exam/${exam.id}/instructions`)}
                          className="w-full sm:w-auto px-4 py-1.5 bg-ubi-800 hover:bg-ubi-900 text-white font-bold text-xs rounded shadow-xs border border-ubi-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Start Assessment</span>
                        </button>
                      ) : isExpired ? (
                        <button
                          disabled
                          className="w-full sm:w-auto px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs rounded border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center"
                        >
                          <span>Closed</span>
                        </button>
                      ) : isEntryClosed ? (
                        <button
                          disabled
                          className="w-full sm:w-auto px-4 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded border border-rose-200 dark:border-rose-800 cursor-not-allowed flex items-center justify-center gap-1.5"
                          title="The entry window for this assessment has closed (15 minutes after start time). Late entry is not permitted."
                        >
                          <AlertTriangle size={13} />
                          <span>Entry Window Closed</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenInstructions(exam)}
                          className="w-full sm:w-auto px-4 py-1.5 bg-ubi-800 hover:bg-ubi-900 text-white font-bold text-xs rounded shadow-xs border border-ubi-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Start Assessment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center space-y-2 shadow-2xs">
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                {activeTab === 'all'
                  ? 'No assessments currently assigned.'
                  : activeTab === 'active'
                  ? 'No active assessments currently live.'
                  : activeTab === 'upcoming'
                  ? 'No upcoming assessments currently scheduled.'
                  : activeTab === 'completed'
                  ? 'No completed assessments found.'
                  : 'No closed assessments.'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

